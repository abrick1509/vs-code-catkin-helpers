
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as convert from 'xml-js';

import * as utils from './utils';
import * as test_utils from './test_utils';
import * as shell_commands from './shell_commands';
import { Z_NO_FLUSH } from 'zlib';

export class TestCaseHandler {
    private controller: vscode.TestController = vscode.tests.createTestController("first_controller", "My test results");
    private test_executables: string[] = [];
    private test_cases: Map<string, string> = new Map();
    private watcher: vscode.FileSystemWatcher;
    private packagename: string;

    private clear() {
        this.test_executables = [];
        this.test_cases = new Map();
        if (this.watcher !== undefined) {
            this.watcher.dispose();
        }
        this.controller.items.replace([]);
    }

    private setFileWatcher() {
        const results_dir = test_utils.getTestResultsDir(this.packagename);
        if (this.watcher !== undefined) {
            this.watcher.dispose();
        }
        this.watcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(results_dir, '**/*.xml'));
        this.watcher.onDidCreate(() => {
            this.updateResults();
        });
    }

    private findTestExecutables(): boolean {
        try {
            // find all test executables from CTest Target
            const ctest_file = path.join(utils.getBuildSpace(), this.packagename, "CTestTestfile.cmake");
            const content = fs.readFileSync(ctest_file).toString().split('\n');
            content.forEach(line => {
                const res = line.match(/add_test\((\w*) "([\w\/]*)/);
                if (res !== null) {
                    const test_executable_path = res[2];
                    this.test_executables.push(test_executable_path);
                }
            });
        }
        catch (err) {
            vscode.window.showWarningMessage(`Catkin Helpers: Couldn't discover tests for package ${this.packagename}. Did you build your tests?`);
            return false;
        }
        return true;
    }

    private async findSingleTestCases() {
        // collect every test case and it's execution command into an internal map
        let main_name = "";
        const shelltype = shell_commands.getShellType();
        this.test_executables.forEach(executable => {
            const command = "source $(catkin locate -d)/setup." + shelltype + " && " + executable + " --gtest_list_tests 2> /dev/null";
            const result = shell_commands.runShellCommandSync(vscode.workspace.workspaceFolders[0].uri.fsPath, command).stdout.toString();
            result.split('\n').forEach(line => {
                if (line.includes("gmock_main")) {
                    return;
                }
                const match_main_name = line.match(/^[\w\/]*\./);
                if (match_main_name !== null) {
                    main_name = match_main_name.toString();
                }
                const match_sub_name = line.match(/ +([\w\/]*)/);
                if (match_sub_name !== null && main_name !== "") {
                    const sub_name = match_sub_name[1].toString();
                    const full_test_name = main_name + sub_name;
                    const full_test_name_command = executable + " --gtest_filter=" + full_test_name;
                    this.test_cases.set(full_test_name, full_test_name_command);
                }
            });
        });
    }

    private addTestCasesToController() {
        // add single test cases to controller
        for (const entry of this.test_cases.entries()) {
            const full_test_case_name = entry[0];
            const [main_name, sub_name] = full_test_case_name.split('.');
            let main_item = this.controller.items.get(main_name);
            if (main_item === undefined) {
                // we need to create the main item first
                main_item = this.controller.createTestItem(main_name, main_name);
                this.controller.items.add(main_item);
            }
            // now attach the single test cases to the main item
            let sub_item = this.controller.createTestItem(full_test_case_name, sub_name);
            main_item.children.add(sub_item);
        }
    }

    private createRunProfiles() {
        // create run profile for single tests
        this.controller.createRunProfile('Run', vscode.TestRunProfileKind.Run, request => {
            const run = this.controller.createTestRun(request, "Runner", false);
            request.include.forEach(test => {
                if (test.children.size === 0) {
                    // this is a single test case, lookup it's execution command
                    const test_name = test.id;
                    const execution_command = this.test_cases.get(test_name);
                    utils.runCommand(execution_command);
                }
                else {
                    // this is a test suite, run through all children
                    // TODO: run stuff in parallel here (appropriate gtest flag should allow for this)
                    test.children.forEach(child => {
                        const test_name = child.id;
                        const execution_command = this.test_cases.get(test_name);
                        utils.runCommand(execution_command);
                    });
                }
            });
            run.end();
        });
    }

    updateResults() {
        const packagename = utils.getPackageFromFilename();
        let most_recent_test_results = [];
        try {
            most_recent_test_results = test_utils.getTestResultXMLsForPackage(packagename);
        }
        catch (err) {
            vscode.window.showWarningMessage(`Catkin Helpers: Couldn't read test results for ${packagename}. Did you runner your tests before?`);
            return;
        }
        let run = this.controller.createTestRun(new vscode.TestRunRequest(), "ResultsPublisher", false);
        most_recent_test_results.forEach(file => {
            const content = fs.readFileSync(file);
            const result = JSON.parse(convert.xml2json(content.toString(), { compact: true }));
            test_utils.handleJSONArray(result.testsuites.testsuite, val => {
                const main_name = val._attributes.name;
                test_utils.handleJSONArray(val.testcase, val => {
                    const sub_name = val._attributes.name;
                    const full_name = main_name + "." + sub_name;
                    const sub_item = this.controller.items.get(main_name).children.get(full_name);
                    if (sub_item !== undefined) {
                        if (val._attributes.result === "completed" && !val.hasOwnProperty('failure')) {
                            run.passed(sub_item, val._attributes.time);
                        }
                        else {
                            run.failed(sub_item, new vscode.TestMessage("Failed"), val._attributes.time);
                        }
                    }
                });
            });
        });
        run.end();
    }

    async discoverTests() {
        // todo: fix notification window, doesn't work properly somehow
        // clear previous results
        this.clear();
        // cache package name of current file
        this.packagename = utils.getPackageFromFilename();
        // update file watcher
        this.setFileWatcher();
        // find all test executables of current package
        if (!this.findTestExecutables()) {
            return;
        }
        // find all single test cases in these test executables
        this.findSingleTestCases();
        // add these test cases to test controller
        this.addTestCasesToController();
        // create run profiles for the single test cases
        this.createRunProfiles();
        // read latest test results if available
        this.updateResults();
    }

    runTestsOfCurrentPackage() {
        const packagename = utils.getPackageFromFilename();
        const shelltype = shell_commands.getShellType();
        const command = "source $(catkin locate -d)/setup." + shelltype + " && make test -C $(catkin locate -b " + packagename + ")";
        utils.runCommand(command);
    }
}

