
import * as vscode from 'vscode';

import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
const exec = util.promisify(require("child_process").exec);

export async function wait(ms) {
    await new Promise(resolve => { setTimeout(resolve, ms); });
}

export function log(message: string, value?: any) {
    let stream = "Catkin Helpers: " + message;
    if (value) {
        stream += ": " + value;
    }
    else {
        stream += ".";
    }
    console.log(stream);
}

export function getPackageFromFilename() {
    const editor = vscode.window.activeTextEditor;
    let packagename = "";
    if (editor) {
        const document = editor.document;
        const filename = document.fileName;
        const name_splitters = filename.split("/");
        const src_index = name_splitters.lastIndexOf("src");
        const header_index = name_splitters.lastIndexOf("include");
        const test_index = name_splitters.lastIndexOf("test");
        const index = Math.max(src_index, header_index, test_index);
        if (index === -1) {
            console.log("Could not find (src|include) in filename.");
            vscode.window.showErrorMessage("Could not deduce package name from full filename: " + filename);
            return packagename;
        }
        packagename = name_splitters[index - 1];
    }
    return packagename;
};

export async function getBuildSpace() {
    let catkin_build_folder = "";
    try {
        const dirname = path.dirname(getFullFilename());
        exec("cd " + dirname + "&& catkin locate -b").then((stdout, stderr) => { catkin_build_folder = stdout.replace(/\r?\n|\r/g, ""); });
    }
    catch (err) {
        console.log("err: " + err);
    };
    return catkin_build_folder;
}

export function getBasenameFromFilename() {
    const editor = vscode.window.activeTextEditor;
    let basename = "";
    if (editor) {
        basename = path.basename(editor.document.fileName);
    }
    return basename;
}

export function getFullFilename() {
    const editor = vscode.window.activeTextEditor;
    let filename = "";
    if (editor) {
        filename = editor.document.fileName;
    }
    return filename;
}

export async function getFullTestExecutableName() {
    const build_space = await getBuildSpace();
    const package_name = getPackageFromFilename();
    const basename_no_ext = getBasenameFromFilename().split('.')[0];
    // let's try these guys, we prob. need to expand this list and/or do some enhanced test name matching, should be good for now
    const path_to_testfile1 = build_space + "/" + package_name + "/devel/lib/" + package_name + "/" + package_name + "_" + basename_no_ext;
    const path_to_testfile2 = build_space + "/" + package_name + "/devel/lib/" + package_name + "/" + basename_no_ext;
    return [path_to_testfile1, path_to_testfile2];
}


export function checkIfFileHoldsTests() {
    const editor = vscode.window.activeTextEditor;
    let has_tests = false;
    if (editor) {
        const content = fs.readFileSync(editor.document.fileName).toString();
        if (content.includes("TEST")) {
            has_tests = true;
        }
    }
    return has_tests;
}

export function getTestAtCursorPosition() {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        // search for the latest match on TEST[_FP] from the start of document until the current cursor position
        const cursor_position = editor.selection.active;
        const text = editor.document.getText(new vscode.Range(new vscode.Position(0, 0), cursor_position));
        const test_matches = text.match(/TEST(_F|_P)*\(\w*,\s*\w*\)/g);
        // this should have been checked before, anyways make sure we don't segfault here
        if (!test_matches) {
            return "";
        }
        else {
            // we should be able to match against the test name here, files w/o tests should have been caught before
            // the latest test should be closest to the cursor position
            const matched_test_names = test_matches[test_matches.length - 1].match(/TEST[_FP]*\((\w*),\s*(\w*)\)/);
            const full_test_name = matched_test_names[1] + "." + matched_test_names[2];
            return full_test_name;
        }
    }
    return "";
}

export function getTerminal() {
    const terminals = vscode.window.terminals;
    if (terminals.length === 0) {
        const term = vscode.window.createTerminal();
        term.show();
    }
    return vscode.window.terminals[0];
}

export function runCommand(command: string) {
    const terminal = getTerminal();
    terminal.show();
    terminal.sendText(command + "\n");
}
