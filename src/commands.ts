
import * as vscode from 'vscode';

import * as fs from 'fs';
import * as utils from './utils';
import * as shell_commands from './shell_commands';
import * as convert from 'xml-js';
import * as test_utils from './test_utils';

export function catkinBuildCurrentPackage() {
    const packagename = utils.getPackageFromFilename();
    const command = "catkin build " + packagename;
    utils.runCommand(command);
};


export function makeCurrentPackage() {
    const packagename = utils.getPackageFromFilename();
    const command = "make install -j20 -C $(catkin locate -b " + packagename + ")";
    utils.runCommand(command);
};

export function makeTestsCurrentPackage() {
    const packagename = utils.getPackageFromFilename();
    const command = "make tests -j20 -C $(catkin locate -b " + packagename + ")";
    utils.runCommand(command);
};

export function runTestsCurrentPackage() {
    const packagename = utils.getPackageFromFilename();
    const shelltype = shell_commands.getShellType();
    const command = "source $(catkin locate -d)/setup." + shelltype + " && make test -C $(catkin locate -b " + packagename + ")";
    utils.runCommand(command);
};

export async function runTestsInFile() {
    const basename = utils.getBasenameFromFilename();
    const shelltype = shell_commands.getShellType();
    if (utils.checkIfFileHoldsTests()) {
        const full_test_executable_names = await utils.getFullTestExecutableName();
        for (let test_exec of full_test_executable_names) {
            if (fs.existsSync(test_exec)) {
                const command = "source $(catkin locate -d)/setup." + shelltype +
                    " && " + test_exec;
                utils.runCommand(command);
                return;
            }
            // when reaching this, no test has been found/executed
            vscode.window.showWarningMessage("Test executable could not be found. Looking for " + full_test_executable_names + ". Please consider rebuilding your tests. If this still doesn't fix it, it's due to a current Known Limitation of this extension.");
        }
    }
    else {
        vscode.window.showWarningMessage("Current file: " + basename + " does NOT contain any tests. Nothing to do here.");
    }
};

export async function runTestUnderCursor() {
    const shelltype = shell_commands.getShellType();
    const basename = utils.getBasenameFromFilename();
    if (utils.checkIfFileHoldsTests()) {
        let test_at_cursor = utils.getTestAtCursorPosition();
        if (test_at_cursor === "") {
            vscode.window.showWarningMessage("No test under cursor found. Nothing do to here.");
            return;
        }
        test_at_cursor = test_at_cursor.replace(/Fixture/g, "");
        // we need to split the exact test name here and filter out some stuff, since gtest does some magic for naming test fixtures (sometimes it drops the Fixture, sometimes in adds in a Test)
        const test_at_cursor_splits = test_at_cursor.split('.');
        const test_under_cursor_to_run = test_at_cursor_splits[0] + "*." + test_at_cursor_splits[1];
        const full_test_executable_names = await utils.getFullTestExecutableName();
        for (let test_exec of full_test_executable_names) {
            if (fs.existsSync(test_exec)) {
                // again we need some globbing for the gtest_filter string here since we need to handle parameterized tests/tests fixtures as well
                const command = "source $(catkin locate -d)/setup." + shelltype +
                    " && " + test_exec + " --gtest_filter=\"*" + test_under_cursor_to_run +
                    ":*" + test_under_cursor_to_run + "/*\"";
                utils.runCommand(command);
                return;
            }
        }
        // when reaching this, no test has been found/executed
        vscode.window.showWarningMessage("Test executable could not be found. Looking for " + full_test_executable_names + ". Please consider rebuilding your tests. If this still doesn't fix it, it's due to a current Known Limitation of this extension.");
    }
    else {
        vscode.window.showWarningMessage("Current file: " + basename + " does NOT contain any tests. Nothing to do here.");
    }
};
