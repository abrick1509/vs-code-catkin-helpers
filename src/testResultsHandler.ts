
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as convert from 'xml-js';

import * as utils from './utils';
import * as test_utils from './test_utils';
import * as shell_commands from './shell_commands';
export class TestCaseHandler {
    private watched_package: string = "";
    private results_dir: string = "";
    private controller: vscode.TestController = vscode.tests.createTestController("first_controller", "My test results");

    private results_dir_watcher: vscode.FileSystemWatcher;

    constructor() {
        this.watched_package = utils.getPackageFromFilename();
        this.results_dir = test_utils.getTestResultsDir(this.watched_package);
        this.update(false);
        this.updateWatchedPackage(this.watched_package);
    }



    private updateWatchedPackage(package_to_watch: string): void {
        this.watched_package = package_to_watch;
        this.results_dir = test_utils.getTestResultsDir(this.watched_package);
        if (this.results_dir_watcher !== undefined) {
            this.results_dir_watcher.dispose();
        }
        this.results_dir_watcher = vscode.workspace.createFileSystemWatcher(path.join(this.results_dir, "*.xml").toString());
        this.results_dir_watcher.onDidCreate(() => {
            this.update();
        });

    }

    private update(focus_test_explorer = true) {
        this.controller.items.replace([]);
        let most_recent_test_results = [];
        try {
            most_recent_test_results = test_utils.getTestResultXMLsForPackage(this.watched_package);
        }
        catch (err) {
            vscode.window.showWarningMessage(`Catkin Helpers: Couldn't read test results for ${this.watched_package}. Did you run your tests before?`);
            return;
        }

        let run = this.controller.createTestRun(new vscode.TestRunRequest(), "TestRunner", false);
        vscode.window.withProgress({ location: vscode.ProgressLocation.Notification }, (progress) => {
            progress.report({ message: `Catkin Helpers: Parsing test results for package ${this.watched_package}.`, increment: 0 });
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

    runTestsOfCurrentPackage() {
        const packagename = utils.getPackageFromFilename();
        this.updateWatchedPackage(packagename);
        const shelltype = shell_commands.getShellType();
        const command = "source $(catkin locate -d)/setup." + shelltype + " && make test -C $(catkin locate -b " + packagename + ")";
        utils.runCommand(command);
    }
}

