
import * as vscode from 'vscode';

import * as fs from 'fs';
import * as path from 'path';
import * as utils from './utils';

export function getTestResultsDir(package_name: string): string {
    const build_space = utils.getBuildSpace();
    return path.join(build_space, package_name, "test_results", package_name);
}


export function getTestResultXMLsForPackage(package_name: string) {
    const test_results_dir = getTestResultsDir(package_name);
    const files = fs.readdirSync(test_results_dir);
    let most_recent_test_results = [];
    files.forEach(file => {
        // get all result files for same test (they are increment by a trailing number in the filename)
        const filename_wo_number = file.replace(/_\d+/, "").replace(/\.xml/, "");
        const files_same_test = files.filter(val => {
            return val.includes(filename_wo_number);
        });
        // iterate over those files and get the most recent one (wrt. modification time)
        let last_modified_time = 0.;
        let last_modified_file = "";
        files_same_test.forEach(file => {
            const stats = fs.statSync(path.join(test_results_dir, file));
            if (stats.mtimeMs > last_modified_time) {
                last_modified_file = file;
                last_modified_time = stats.mtimeMs;
            }
        });
        // save this into the most_recent_test_results (and yes this will do redundant work, todo: find a better solution)
        if (most_recent_test_results.indexOf(last_modified_file) === -1 && last_modified_file !== "") {
            most_recent_test_results.push(last_modified_file);
        }
    });
    // append full path to result
    most_recent_test_results = most_recent_test_results.map(val => {
        return path.join(test_results_dir, val);
    });
    return most_recent_test_results;
}

// depending on the test setup, the xml-parsing sometimes returns an array of test-suites/test-cases and sometimes single value, 
// this is a simple helper function to programmatically handle these cases
export function handleJSONArray(pseudo_array, func, ...args): void {
    Array.isArray(pseudo_array).valueOf() ? pseudo_array.forEach(val => { func(val, ...args); }) : func(pseudo_array, ...args);
}

// Add the result of a test-case (passed/failed) to a given parent, the parent should be assigned to the controllers 
// items-collection in order to show up in the GUI
function addTestCaseItem(test_case, test_suite_item: vscode.TestItem, controller: vscode.TestController, test_run: vscode.TestRun): void {
    const test_case_item = controller.createTestItem(test_case._attributes.name, test_case._attributes.name);
    test_suite_item.children.add(test_case_item);
    if (test_case._attributes.result === "completed") {
        if (test_case.hasOwnProperty('failure')) {
            test_run.failed(test_case_item, new vscode.TestMessage("Failed"), test_case._attributes.time);
        }
        else {
            test_run.passed(test_case_item, test_case._attributes.time);
        }
    }
    else {
        test_run.failed(test_case_item, new vscode.TestMessage("Failed"), test_case._attributes.time);
    }
}

// Add a top-level test-suite to the controller's item collection, this internally parses all test-cases belonging to this test-suite
export function addTestSuiteItem(test_suite, controller: vscode.TestController, test_run: vscode.TestRun): void {
    const test_suite_name = test_suite._attributes.name;
    const test_suite_item = controller.createTestItem(test_suite_name, test_suite_name);
    controller.items.add(test_suite_item);
    handleJSONArray(test_suite.testcase, addTestCaseItem, test_suite_item, controller, test_run);
}