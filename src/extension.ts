// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

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
}

export function deactivate() { }
