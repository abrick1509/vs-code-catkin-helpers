
import * as vscode from 'vscode';

import * as fs from 'fs';
import * as utils from './utils';
import * as test_utils from './test_utils';
import * as convert from 'xml-js';

export class TestCaseHandler {
    private current_package: string = "";
    private controller: vscode.TestController = vscode.tests.createTestController("first_controller", "My test results");

    constructor() {
        this.update(false);
    }

    update(focus_test_explorer = true) {
        this.controller.items.replace([]);
        let most_recent_test_results = [];
        try {
            this.current_package = utils.getPackageFromFilename();
            most_recent_test_results = test_utils.getTestResultXMLsForPackage();
        }
        catch (err) {
            console.error("err: " + err);
            vscode.window.showWarningMessage("Catkin Helpers: Couldn't read test results. Did you run your tests before?");
            return;
        }

        let run = this.controller.createTestRun(new vscode.TestRunRequest(), "TestRunner", false);
        most_recent_test_results.forEach(file => {
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
    }
}

