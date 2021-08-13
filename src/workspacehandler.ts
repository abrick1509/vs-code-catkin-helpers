
import * as vscode from 'vscode';

import * as utils from './utils';
import * as shell_commands from './shell_commands';

export class WorkspaceHandler {
    private catkin_packages: string[] = [];
    private build_packages: string[] = [];
    private caching_done = false;
    private in_catkin_workspace = false;


    constructor() {
        // 1. check if we are in a catkin workspace (this is the main requirement for this extension)
        // 1.1 check if there is a workspace at all or if it's just single files
        if (vscode.workspace.workspaceFolders[0] === undefined) {
            this.in_catkin_workspace = false;
            return;
        }
        // 1.2 actually check if this is a catkin workspace
        try {
            const workspace_folder_path = vscode.workspace.workspaceFolders[0].uri.fsPath;
            shell_commands.runShellCommandSync(workspace_folder_path, "catkin locate -s");
            this.in_catkin_workspace = true;
        }
        catch (err) {
            this.in_catkin_workspace = false;
            return;
        }

        if (this.isCatkinWorkspace()) {
            // 2. cache all catkin packages and build folder
            let workers = [];
            workers.push(this.cacheCatkinPackages());
            workers.push(this.cacheBuildPackages());
            Promise.all(workers).then(() => {
                this.caching_done = true;
            });
        }
    }

    isCatkinWorkspace(): boolean {
        return this.in_catkin_workspace;
    }

    private async cacheCatkinPackages() {
        try {
            // find all catkin packages under /src                
            return vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, cancellable: false }, (progress) => {
                progress.report({ message: "Catkin Helpers: Caching catkin packages..." });
                const command = "find $(catkin locate -s)/planning/trajectory -type f -name \"package.xml\" | xargs -I{} sed -n -E \'s#<name>(.*)<\/name>#\\1#p\' {}";
                return shell_commands.runShellCommand(vscode.workspace.workspaceFolders[0].uri.path, command);
            }).then(result => {
                this.catkin_packages = result.stdout.split('\n').filter(val => val !== "");
            });
        } catch (err) {
            vscode.window.showErrorMessage("Couldn't cache all packages in workspace: " + err);
        }
    }

    private async cacheBuildPackages() {
        try {
            // find all packages under ../build
            return vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, cancellable: false }, (progress) => {
                progress.report({ message: "Catkin Helpers: Caching build packages..." });
                return shell_commands.runShellCommand(vscode.workspace.workspaceFolders[0].uri.path, "find $(catkin locate -b) -maxdepth 1 -mindepth 1 -type d | sed -E -n \'s#.*/(.*)#\\1#p\'");
            }).then(result => {
                this.build_packages = result.stdout.split('\n').filter(val => val !== "");
            });
        } catch (err) {
            vscode.window.showErrorMessage("Couldn't parse build folder: " + err);
        }
    }

    private cachingDone() {
        if (!this.caching_done) {
            vscode.window.showInformationMessage("Please wait for package caching to finish.");
            return false;
        }
        return true;
    }

    async catkinBuildPackageFromList() {
        try {
            if (!this.cachingDone()) {
                return;
            }
            const selection = await vscode.window.showQuickPick(this.catkin_packages, { canPickMany: false, title: "Select package to build:" });
            if (selection !== undefined) {
                const command = "catkin build " + selection.valueOf();
                utils.runCommand(command);
            }
        }
        catch (err) {
            console.log("err: " + err);
        }
    }

    async makePackageFromList() {
        try {
            if (!this.cachingDone()) {
                return;
            }
            const selection = await vscode.window.showQuickPick(this.build_packages, { canPickMany: false, title: "Select package to build:" });
            if (selection !== undefined) {
                const command = "make install -j20 -C $(catkin locate -b " + selection.valueOf() + ")";
                utils.runCommand(command);
            }
        }
        catch (err) {
            console.log("err: " + err);
        }
    }
}
