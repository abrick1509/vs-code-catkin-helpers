// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
let path = require('path');
let fs = require('fs');

function getPackagePathOfFilename() {
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
			vscode.window.showErrorMessage("Could not deduce package name from in full filename: " + filename);
			return packagename;
		}
		packagename = name_splitters[index - 1];
	}
	return packagename;
};

function getBasenameOfFilename() {
	const editor = vscode.window.activeTextEditor;
	let basename = "";
	if (editor) {
		const document = editor.document;
		const filename = document.fileName;
		basename = path.basename(filename);
	}
	return basename;
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

function getTerminal() {
	const terminals = vscode.window.terminals;
	if (terminals.length === 0) {
		const term = vscode.window.createTerminal();
		const packagename = getPackagePathOfFilename();
		term.show();
		term.sendText("cd $(catkin locate -s " + packagename + ")\n");
	}
	return vscode.window.terminals[0];
}

function runCommandForFile(command: string) {
	const terminal = getTerminal();
	terminal.show();
	terminal.sendText(command + "\n");
}

export function activate(context: vscode.ExtensionContext) {
	console.log('Catkin helpers extension activated.');

	let catkin_build_command = vscode.commands.registerCommand('catkin-helpers.catkin_build', () => {
		const packagename = getPackagePathOfFilename();
		if (packagename.length !== 0) {
			const command = "catkin build " + packagename;
			runCommandForFile(command);
		}
	});
	context.subscriptions.push(catkin_build_command);

	let catkin_build_no_deps_command = vscode.commands.registerCommand('catkin-helpers.catkin_build_no_deps', () => {
		const packagename = getPackagePathOfFilename();
		if (packagename.length !== 0) {
			const command = "catkin build " + packagename + " --no-deps\n";
			runCommandForFile(command);
		}
	});
	context.subscriptions.push(catkin_build_no_deps_command);


	let make_command = vscode.commands.registerCommand('catkin-helpers.make', () => {
		const packagename = getPackagePathOfFilename();
		if (packagename.length !== 0) {
			const command = "make install -j20 -C $(catkin locate -b " + packagename + ")";
			runCommandForFile(command);
		}
	});
	context.subscriptions.push(make_command);

	let make_tests_command = vscode.commands.registerCommand('catkin-helpers.make_tests', () => {
		const packagename = getPackagePathOfFilename();
		if (packagename.length !== 0) {
			const command = "make tests -j20 -C $(catkin locate -b " + packagename + ")";
			runCommandForFile(command);
		}
	});
	context.subscriptions.push(make_tests_command);

	let run_tests_command = vscode.commands.registerCommand('catkin-helpers.run_tests', () => {
		const packagename = getPackagePathOfFilename();
		if (packagename.length !== 0) {
			const shelltype = vscode.workspace.getConfiguration('catkin-helpers').get('shellType')
			const command = "source $(catkin locate -d)/setup." + shelltype + " && make test -C $(catkin locate -b " + packagename + ")";
			runCommandForFile(command);
		}
	});
	context.subscriptions.push(run_tests_command);

	let run_tests_in_current_file_command = vscode.commands.registerCommand('catkin-helpers.run_tests_in_file', () => {
		const packagename = getPackagePathOfFilename();
		if (packagename.length !== 0) {
			const shelltype = vscode.workspace.getConfiguration('catkin-helpers').get('shellType');
			const basename = getBasenameOfFilename();
			// grep file for TEST, if yes 
			// search for compiled test executable and start shell process in current terminal 
			if (checkIfFileHoldsTests()) {
				const basename_no_ext = basename.split('.')[0]
				const command = "source $(catkin locate -d)/setup." + shelltype + // source stuff
					" && test_to_run=$(find $(catkin locate -b)/" + packagename + "/devel/lib/" + packagename + " -type f -executable -iname \"*" + basename_no_ext + "*\") " + // find the executable that contains the filename
					"&& if [[ -z $test_to_run ]]; then echo \"No test found containing " + basename_no_ext + ". Consider building your tests again.\"; else $test_to_run;fi";; // run exe if found
				runCommandForFile(command);
			}
			else {
				vscode.window.showWarningMessage("Current file: " + basename + " does NOT contain any tests. Nothing to do here.");
			}
		}
	});
	context.subscriptions.push(run_tests_in_current_file_command);
}

export function deactivate() { }
