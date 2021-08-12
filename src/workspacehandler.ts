
import * as vscode from 'vscode';

import * as util from 'util';
const exec = util.promisify(require("child_process").exec);
import * as utils from './utils';


export class WorkspaceHandler {
    private catkin_packages: string[] = [];
    private build_packages: string[] = [];
    private caching_done = false;


    constructor() {
        let workers = [];
        workers.push(this.cacheCatkinPackages());
        workers.push(this.cacheBuildPackages());
        Promise.all(workers).then(() => {
            this.caching_done = true;
        });
    }

    private async cacheCatkinPackages() {
        // todo: check if we are in a catkin workspace
        if (vscode.workspace.workspaceFolders[0] !== undefined) {
            try {
                // find all catkin packages under /src
                return vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, cancellable: false }, (progress) => {
                    progress.report({ message: "Catkin Helpers: Caching catkin packages..." });
                    return exec("cd " + vscode.workspace.workspaceFolders[0].uri.path + "&& find $(catkin locate -s) -type f -name \"package.xml\" | xargs -I{} sed -n -E \'s#<name>(.*)<\/name>#\\1#p\' {}");
                }).then(result => {
                    this.catkin_packages = result["stdout"].split('\n').filter(val => val !== "");
                });
            } catch (err) {
                vscode.window.showErrorMessage("Couldn't cache all packages in workspace: " + err);
            }
        }
    }

    private async cacheBuildPackages() {
        // todo: check if we are in a catkin workspace
        if (vscode.workspace.workspaceFolders[0] !== undefined) {
            try {
                // find all packages under ../build
                return vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, cancellable: false }, (progress) => {
                    progress.report({ message: "Catkin Helpers: Caching build packages..." });
                    return exec("cd " + vscode.workspace.workspaceFolders[0].uri.path + "&& find $(catkin locate -b) -maxdepth 1 -mindepth 1 -type d | sed -E -n \'s#.*/(.*)#\\1#p\'");
                }).then(result => {
                    this.build_packages = result["stdout"].split('\n').filter(val => val !== "");
                });
            } catch (err) {
                vscode.window.showErrorMessage("Couldn't parse build folder: " + err);
            }
        }
    }

    async catkinBuildPackageFromList() {
        try {
            if (!this.caching_done) {
                vscode.window.showInformationMessage("Please wait for package caching to finish.");
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
            if (!this.caching_done) {
                vscode.window.showInformationMessage("Please wait for caching of build folder to finish.");
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
