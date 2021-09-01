
import * as vscode from 'vscode';

import * as fs from 'fs';
import * as path from 'path';
import * as shell_commands from './shell_commands';

export async function wait(ms) {
    await new Promise(resolve => { setTimeout(resolve, ms); });
}

export function log(message: string, value?: any) {
    let stream = "Catkin Helpers: " + message;
    if (value) {
        stream += ": " + JSON.stringify(value);
    }
    else {
        stream += ".";
    }
    console.log(stream);
}

function getFilename() {
    return vscode.window.activeTextEditor.document.fileName;
}

function getPackageNameFromPackageXml(package_xml_path: string) {
    const command = "sed -n -E 's#<name>(.*)<\/name>#\\1#p' " + package_xml_path;
    const package_name = shell_commands.runShellCommandSync(vscode.workspace.workspaceFolders[0].uri.fsPath, command);
    return package_name.stdout.trim();
}

function getPackageXmlFromFilename() {
    const filename = getFilename();
    const command = 'dir=$(dirname ' + filename + '); while [[ ! -f "${dir}/package.xml" ]] && [[ "${dir}" != "/" ]]; do dir=$(dirname $dir); done; echo $dir';
    const package_dir = shell_commands.runShellCommandSync(vscode.workspace.workspaceFolders[0].uri.fsPath, command);
    return path.join(package_dir.stdout.trim(), "/package.xml");
}

export function getPackageFromFilename() {
    const package_xml = getPackageXmlFromFilename();
    return getPackageNameFromPackageXml(package_xml);
};

export function getBuildSpace() {
    const command = "catkin locate -b";
    const build_space = shell_commands.runShellCommandSync(vscode.workspace.workspaceFolders[0].uri.fsPath, command);
    return build_space.stdout.trim();
}

export function getBasenameFromFilename() {
    return path.basename(getFilename());
}

export async function getFullTestExecutableName() {
    const build_space = getBuildSpace();
    const package_name = getPackageFromFilename();
    const basename_no_ext = getBasenameFromFilename().split('.')[0];
    // let's try these guys, we prob. need to expand this list and/or do some enhanced test name matching, should be good for now
    const path_to_testfile1 = build_space + "/" + package_name + "/devel/lib/" + package_name + "/" + package_name + "_" + basename_no_ext;
    const path_to_testfile2 = build_space + "/" + package_name + "/devel/lib/" + package_name + "/" + basename_no_ext;
    return [path_to_testfile1, path_to_testfile2];
}


export function checkIfFileHoldsTests() {
    const content = fs.readFileSync(getFilename()).toString();
    return content.includes("TEST") ? true : false;
}

export function getTestAtCursorPosition() {
    // search for the latest match on TEST[_FP] from the start of document until the current cursor position
    const editor = vscode.window.activeTextEditor;
    const cursor_position = editor.selection.active;
    const text = editor.document.getText(new vscode.Range(new vscode.Position(0, 0), cursor_position));
    const test_matches = text.match(/TEST(_F|_P)*\(\w*,\s*\w*\)/g);
    // we should be able to match against the test name here, files w/o tests should have been caught before
    // the latest test should be closest to the cursor position
    const matched_test_names = test_matches[test_matches.length - 1].match(/TEST[_FP]*\((\w*),\s*(\w*)\)/);
    const full_test_name = matched_test_names[1] + "." + matched_test_names[2];
    return full_test_name;
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
