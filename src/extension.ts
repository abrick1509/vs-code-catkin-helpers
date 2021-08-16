// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import * as commands from './commands';
import * as utils from './utils';
import * as workspacehandler from './workspacehandler';
import * as testhandler from './testResultsHandler';

// load all packages in workspace
const workspaceHandler = new workspacehandler.WorkspaceHandler();

// handle test results 
const testHandler = new testhandler.TestCaseHandler();

export async function activate(context: vscode.ExtensionContext) {
	utils.log('Catkin helpers extension activated.');

	if (!workspaceHandler.isCatkinWorkspace()) {
		utils.log("Not in catkin workspace. Not registering any functions");
		return;
	}

	context.subscriptions.push(vscode.commands.registerCommand('catkin-helpers.catkin_build', commands.catkinBuildCurrentPackage));

	context.subscriptions.push(vscode.commands.registerCommand('catkin-helpers.make', commands.makeCurrentPackage));

	context.subscriptions.push(vscode.commands.registerCommand('catkin-helpers.make_tests', commands.makeTestsCurrentPackage));

	context.subscriptions.push(vscode.commands.registerCommand('catkin-helpers.run_tests', commands.runTestsCurrentPackage));

	context.subscriptions.push(vscode.commands.registerCommand('catkin-helpers.run_tests_in_file', commands.runTestsInFile));

	context.subscriptions.push(vscode.commands.registerCommand('catkin-helpers.run_test_under_cursor', commands.runTestUnderCursor));

	context.subscriptions.push(vscode.commands.registerCommand('catkin-helpers.catkin_build_package_from_list', () => { return workspaceHandler.catkinBuildPackageFromList(); }));

	context.subscriptions.push(vscode.commands.registerCommand('catkin-helpers.make_package_from_list', () => { return workspaceHandler.makePackageFromList(); }));

	context.subscriptions.push(vscode.commands.registerCommand('catkin-helpers.update_caches', () => { return workspaceHandler.updateCaches(); }));

	context.subscriptions.push(vscode.commands.registerCommand('catkin-helpers.load_test_results', () => { return testHandler.update(); }));
};

export function deactivate() { }
