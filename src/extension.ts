// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import * as commands from './commands';
import * as workspacehandler from './workspacehandler';

let workspaceHandler = new workspacehandler.WorkspaceHandler();


export async function activate(context: vscode.ExtensionContext) {
	// load all packages in workspace
	console.log('Catkin helpers extension activated.');

	context.subscriptions.push(vscode.commands.registerCommand('catkin-helpers.catkin_build', commands.catkinBuildCurrentPackage));

	context.subscriptions.push(vscode.commands.registerCommand('catkin-helpers.make', commands.makeCurrentPackage));

	context.subscriptions.push(vscode.commands.registerCommand('catkin-helpers.make_tests', commands.makeTestsCurrentPackage));

	context.subscriptions.push(vscode.commands.registerCommand('catkin-helpers.run_tests', commands.runTestsCurrentPackage));

	context.subscriptions.push(vscode.commands.registerCommand('catkin-helpers.run_tests_in_file', commands.runTestsInFile));

	context.subscriptions.push(vscode.commands.registerCommand('catkin-helpers.run_test_under_cursor', commands.runTestUnderCursor));

	context.subscriptions.push(vscode.commands.registerCommand('catkin-helpers.catkin_build_package_from_list', () => { return workspaceHandler.catkinBuildPackageFromList(); }));

	context.subscriptions.push(vscode.commands.registerCommand('catkin-helpers.make_package_from_list', () => { return workspaceHandler.catkinBuildPackageFromList(); }));
}

export function deactivate() { }
