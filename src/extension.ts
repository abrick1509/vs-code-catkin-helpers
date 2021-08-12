// Import the module and reference it with the alias vscode in your code below
let fast_glob = require('fast-glob');
import * as vscode from 'vscode';
let path = require('path');
let fs = require('fs');
const util = require('util');
const exec = util.promisify(require("child_process").exec);

async function wait(ms) {
	await new Promise(resolve => { setTimeout(resolve, ms); });
}

// todo: export all these functions into separate files
function getPackageFromFilename() {
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

async function getBuildSpace() {
	let catkin_build_folder = "";
	try {
		const dirname = path.dirname(getFullFilename());
		const { stdout, stderr } = await exec("cd " + dirname + "&& catkin locate -b");
		catkin_build_folder = stdout;
		// remove newline
		catkin_build_folder = catkin_build_folder.replace(/\r?\n|\r/g, "");
	}
	catch (err) {
		console.log("err: " + err);
	};
	return catkin_build_folder;
}
function getBasenameFromFilename() {
	const editor = vscode.window.activeTextEditor;
	let basename = "";
	if (editor) {
		const document = editor.document;
		const filename = document.fileName;
		basename = path.basename(filename);
	}
	return basename;
}

function getFullFilename() {
	const editor = vscode.window.activeTextEditor;
	let filename = "";
	if (editor) {
		const document = editor.document;
		filename = document.fileName;
	}
	return filename;
}

async function getFullTestExecutableName() {
	const build_space = await getBuildSpace();
	const package_name = getPackageFromFilename();
	const basename_no_ext = getBasenameFromFilename().split('.')[0];
	// let's try these guys, we prob. need to expand this list and/or do some enhanced test name matching, should be good for now
	const path_to_testfile1 = build_space + "/" + package_name + "/devel/lib/" + package_name + "/" + package_name + "_" + basename_no_ext;
	const path_to_testfile2 = build_space + "/" + package_name + "/devel/lib/" + package_name + "/" + basename_no_ext;
	return [path_to_testfile1, path_to_testfile2];
}


function checkIfFileHoldsTests() {
	const editor = vscode.window.activeTextEditor;
	let has_tests = false;
	if (editor) {
		const document = editor.document;
		const filename = document.fileName;
		const content = fs.readFileSync(filename).toString();
		if (content.includes("TEST")) {
			has_tests = true;
		}
	}
	return has_tests;
}

function getTestAtCursorPosition() {
	const editor = vscode.window.activeTextEditor;
	if (editor) {
		// search for the latest match on TEST[_FP] from the start of document until the current cursor position
		const cursor_position = editor.selection.active;
		const document = editor.document;
		const text = document.getText(new vscode.Range(new vscode.Position(0, 0), cursor_position));
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

// todo: check if in catkin workspace
function getTerminal() {
	const terminals = vscode.window.terminals;
	if (terminals.length === 0) {
		const term = vscode.window.createTerminal();
		term.show();
		term.sendText("cd $(catkin locate -s)\n");
	}
	return vscode.window.terminals[0];
}

function runCommand(command: string) {
	const terminal = getTerminal();
	terminal.show();
	terminal.sendText(command + "\n");
}

export async function activate(context: vscode.ExtensionContext) {
	console.log('Catkin helpers extension activated.');

	let catkin_build_command = vscode.commands.registerCommand('catkin-helpers.catkin_build', () => {
		const packagename = getPackageFromFilename();
		if (packagename.length !== 0) {
			const command = "catkin build " + packagename;
			runCommand(command);
		}
	});
	context.subscriptions.push(catkin_build_command);

	let make_command = vscode.commands.registerCommand('catkin-helpers.make', () => {
		const packagename = getPackageFromFilename();
		if (packagename.length !== 0) {
			const command = "make install -j20 -C $(catkin locate -b " + packagename + ")";
			runCommand(command);
		}
	});
	context.subscriptions.push(make_command);

	let make_tests_command = vscode.commands.registerCommand('catkin-helpers.make_tests', () => {
		const packagename = getPackageFromFilename();
		if (packagename.length !== 0) {
			const command = "make tests -j20 -C $(catkin locate -b " + packagename + ")";
			runCommand(command);
		}
	});
	context.subscriptions.push(make_tests_command);

	let run_tests_command = vscode.commands.registerCommand('catkin-helpers.run_tests', () => {
		const packagename = getPackageFromFilename();
		if (packagename.length !== 0) {
			const shelltype = vscode.workspace.getConfiguration('catkin-helpers').get('shellType')
			const command = "source $(catkin locate -d)/setup." + shelltype + " && make test -C $(catkin locate -b " + packagename + ")";
			runCommand(command);
		}
	});
	context.subscriptions.push(run_tests_command);

	let run_tests_in_current_file_command = vscode.commands.registerCommand('catkin-helpers.run_tests_in_file', async () => {
		const packagename = getPackageFromFilename();
		if (packagename.length !== 0) {
			const shelltype = vscode.workspace.getConfiguration('catkin-helpers').get('shellType');
			const basename = getBasenameFromFilename();
			if (checkIfFileHoldsTests()) {
				const full_test_executable_names = await getFullTestExecutableName();
				for (let test_exec of full_test_executable_names) {
					if (await fs.existsSync(test_exec)) {
						const command = "source $(catkin locate -d)/setup." + shelltype +
							" && " + test_exec;
						runCommand(command);
						return;
					}
				}
				// when reaching this, no test has been found/executed
				vscode.window.showWarningMessage("Test executable could not be found. Looking for " + full_test_executable_names + ". Please consider rebuilding your tests. If this still doesn't fix it, it's due to a current Known Limitation of this extension.");
			}
			else {
				vscode.window.showWarningMessage("Current file: " + basename + " does NOT contain any tests. Nothing to do here.");
			}
		}
	});
	context.subscriptions.push(run_tests_in_current_file_command);

	let run_test_under_cursor = vscode.commands.registerCommand('catkin-helpers.run_test_under_cursor', async () => {
		const packagename = getPackageFromFilename();
		if (packagename.length !== 0) {
			const shelltype = vscode.workspace.getConfiguration('catkin-helpers').get('shellType');
			const basename = getBasenameFromFilename();
			if (checkIfFileHoldsTests()) {
				let test_at_cursor = getTestAtCursorPosition();
				if (test_at_cursor === "") {
					vscode.window.showWarningMessage("No test under cursor found. Nothing do to here.");
					return;
				}
				test_at_cursor = test_at_cursor.replace(/Fixture/g, "");
				// we need to split the exact test name here and filter out some stuff, since gtest does some magic for naming test fixtures (sometimes it drops the Fixture, sometimes in adds in a Test)
				const test_at_cursor_splits = test_at_cursor.split('.');
				const test_under_cursor_to_run = test_at_cursor_splits[0] + "*." + test_at_cursor_splits[1];
				const full_test_executable_names = await getFullTestExecutableName();
				for (let test_exec of full_test_executable_names) {
					if (await fs.existsSync(test_exec)) {
						// again we need some globbing for the gtest_filter string here since we need to handle parameterized tests/tests fixtures as well
						const command = "source $(catkin locate -d)/setup." + shelltype +
							" && " + test_exec + " --gtest_filter=\"*" + test_under_cursor_to_run +
							":*" + test_under_cursor_to_run + "/*\"";
						runCommand(command);
						return;
					}
				}
				// when reaching this, no test has been found/executed
				vscode.window.showWarningMessage("Test executable could not be found. Looking for " + full_test_executable_names + ". Please consider rebuilding your tests. If this still doesn't fix it, it's due to a current Known Limitation of this extension.");
			}
			else {
				vscode.window.showWarningMessage("Current file: " + basename + " does NOT contain any tests. Nothing to do here.");
			}
		}
	});
	context.subscriptions.push(run_test_under_cursor);

	let catkin_build_package_from_list = vscode.commands.registerCommand('catkin-helpers.catkin_build_package_from_list', async () => {
		if (catkin_packages.length === 0) {
			vscode.window.showInformationMessage("Please wait for package caching to finish.");
			return;
		}
		const selection = await vscode.window.showQuickPick(catkin_packages, { canPickMany: false, title: "Select package to build:" });
		if (selection !== undefined) {
			const command = "catkin build " + selection.valueOf();
			runCommand(command);
		}
	});
	context.subscriptions.push(catkin_build_package_from_list);

	let make_package_from_list = vscode.commands.registerCommand('catkin-helpers.make_package_from_list', async () => {
		if (build_packages.length === 0) {
			vscode.window.showInformationMessage("Please wait for caching of build folder to finish.");
			return;
		}
		const selection = await vscode.window.showQuickPick(build_packages, { canPickMany: false, title: "Select package to build:" });
		if (selection !== undefined) {
			const command = "make install -j20 -C $(catkin locate -b " + selection.valueOf() + ")";
			runCommand(command);
		}
	});
	context.subscriptions.push(make_package_from_list);

	// load all packages in workspace
	let catkin_packages: string[] = [];
	let build_packages: string[] = [];
	// todo: check if we are in a catkin workspace
	if (vscode.workspace.workspaceFolders[0] !== undefined) {
		try {
			// find all catkin packages under /src
			const catkin_package_cache_promise = vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, cancellable: false }, (progress) => {
				progress.report({ message: "Catkin Helpers: Caching catkin packages..." });
				return exec("cd " + vscode.workspace.workspaceFolders[0].uri.path + "&& find $(catkin locate -s) -type f -name \"package.xml\" | xargs -I{} sed -n -E \'s#<name>(.*)<\/name>#\\1#p\' {}");
			});
			catkin_package_cache_promise.then(result => {
				catkin_packages = result["stdout"].split('\n').filter(val => val !== "");
			});

			// find all packages under ../build
			const build_package_cache_promise = vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, cancellable: false }, (progress) => {
				progress.report({ message: "Catkin Helpers: Caching build packages..." });
				return exec("cd " + vscode.workspace.workspaceFolders[0].uri.path + "&& find $(catkin locate -b) -maxdepth 1 -mindepth 1 -type d | sed -E -n \'s#.*/(.*)#\\1#p\'");
			});
			build_package_cache_promise.then(result => {
				build_packages = result["stdout"].split('\n').filter(val => val !== "");
			});
		} catch (err) {
			vscode.window.showErrorMessage("Couldn't resolve all packages in workspace: " + err);
		}
	}
}

export function deactivate() { }
