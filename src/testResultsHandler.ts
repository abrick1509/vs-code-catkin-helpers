
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as convert from 'xml-js';

import * as utils from './utils';
import * as test_utils from './test_utils';
import * as shell_commands from './shell_commands';
export class TestCaseHandler {
    private controller: vscode.TestController = vscode.tests.createTestController("first_controller", "My test results");

    update(focus_test_explorer = true) {
        const packagename = utils.getPackageFromFilename();
        this.controller.items.replace([]);
        let most_recent_test_results = [];
        try {
            most_recent_test_results = test_utils.getTestResultXMLsForPackage(packagename);
        }
        catch (err) {
            vscode.window.showWarningMessage(`Catkin Helpers: Couldn't read test results for ${packagename}. Did you run your tests before?`);
            return;
        }

        let run = this.controller.createTestRun(new vscode.TestRunRequest(), "TestRunner", false);
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

    runTestsOfCurrentPackage() {
        const packagename = utils.getPackageFromFilename();
        const shelltype = shell_commands.getShellType();
        const command = "source $(catkin locate -d)/setup." + shelltype + " && make test -C $(catkin locate -b " + packagename + ")";
        utils.runCommand(command);
    }
}

