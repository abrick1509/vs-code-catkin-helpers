
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as convert from 'xml-js';

import * as utils from './utils';
import * as test_utils from './test_utils';
import * as shell_commands from './shell_commands';

class TestFileResults {
    filename: string;
    results_file: string;
    constructor(filename: string, results_file: string) {
        this.filename = filename;
        this.results_file = results_file;
    }
}
export class TestCaseHandler {
    private controller: vscode.TestController = vscode.tests.createTestController("first_controller", "My test results");
    private test_files: TestFileResults[] = [];
    private test_cases: Map<string, string> = new Map();

    updateResults(focus_test_explorer = true) {
        const packagename = utils.getPackageFromFilename();
        this.controller.items.replace([]);
        let most_recent_test_results = [];
        try {
            most_recent_test_results = test_utils.getTestResultXMLsForPackage(packagename);
        }
        catch (err) {
            vscode.window.showWarningMessage(`Catkin Helpers: Couldn't read test results for ${packagename}. Did you runner your tests before?`);
            return;
        }
        let run = this.controller.createTestRun(new vscode.TestRunRequest(), "TestRunner");

        vscode.window.withProgress({ location: vscode.ProgressLocation.Notification }, (progress) => {
            progress.report({ message: `Catkin Helpers: Parsing test results for package ${packagename}.`, increment: 0 });
            const n_files = most_recent_test_results.length;
            const increment = Math.floor(100. / n_files);
            return new Promise<void>((resolve) => {
                most_recent_test_results.forEach(file => {
                    progress.report({ message: "Catkin Helper: Reading " + path.basename(file), increment: increment });
                    const content = fs.readFileSync(file);
                    const result = JSON.parse(convert.xml2json(content.toString(), { compact: true }));
                    // traverse all testsuites items and add there test-cases to the controller's item collection (this is required for GUI interaction)
                    test_utils.handleJSONArray(result.testsuites.testsuite, test_utils.addTestSuiteItem, this.controller, run);
                });
                run.end();
                // focus test explorer
                if (focus_test_explorer) {
                    vscode.commands.executeCommand('test-explorer.focus');
                }
                resolve();
            });
        });
    }

    discoverTestResults() {
        const packagename = utils.getPackageFromFilename();
        let most_recent_test_results = [];
        try {
            most_recent_test_results = test_utils.getTestResultXMLsForPackage(packagename);
        }
        catch (err) {
            vscode.window.showWarningMessage(`Catkin Helpers: Couldn't read test results for ${packagename}. Did you runner your tests before?`);
            return;
        }
        most_recent_test_results.forEach(file => {
            const content = fs.readFileSync(file);
            const result = JSON.parse(convert.xml2json(content.toString(), { compact: true }));
            // traverse all testsuites items and add there test-cases to the controller's item collection (this is required for GUI interaction)
            test_utils.handleJSONArray(result.testsuites.testsuite, test_utils.addTestSuiteItem, this.controller, run);
            const main_name = result.testsuites.testsuite
        });

    }

    discoverTests() {
        const packagename = utils.getPackageFromFilename();
        // find all test executables from CTest Target
        const ctest_file = path.join(utils.getBuildSpace(), packagename, "CTestTestfile.cmake");
        const content = fs.readFileSync(ctest_file).toString();
        content.split('\n').forEach(line => {
            const res = line.match(/add_test\((\w*) "([\w\/]*)" "--gtest_output=xml:([\w\/]*)/);
            if (res !== null) {
                const test_executable_name = res[1];
                const test_executable_path = res[2];
                const test_results_dir = res[3];
                const test_results_path = path.join(test_results_dir, test_executable_name + ".xml");
                this.test_files.push(new TestFileResults(test_executable_path, test_results_path));;
            }
        });
        // collect every test case and it's execution command into an internal map
        let main_name = "";
        this.test_files.forEach(element => {
            const command = element.filename + " --gtest_list_tests 2> /dev/null";
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
                    const full_test_name_command = element.filename + " --gtest_filter=" + full_test_name;
                    this.test_cases.set(full_test_name, full_test_name_command);
                }
            });
        });

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
            const sub_item = this.controller.createTestItem(full_test_case_name, sub_name);
            main_item.children.add(sub_item);
        }

        // create run profile for single tests
        this.controller.createRunProfile('Run', vscode.TestRunProfileKind.Run, (request, token) => {
            const run = this.controller.createTestRun(request);
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

    runTestsOfCurrentPackage() {
        const packagename = utils.getPackageFromFilename();
        const shelltype = shell_commands.getShellType();
        const command = "source $(catkin locate -d)/setup." + shelltype + " && make test -C $(catkin locate -b " + packagename + ")";
        utils.runCommand(command);
    }
}

