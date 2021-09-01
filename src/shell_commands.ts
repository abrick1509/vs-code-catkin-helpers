
import * as vscode from 'vscode';
import * as child_process from 'child_process';
import { log } from './utils';

class ShellCommandOutput {
    stdout: string;
    stderr: string;
    command: string;
    error?: Error;

}

export function runShellCommand(cwd: string, command: string, args?: string[]): Promise<ShellCommandOutput> {
    return new Promise<ShellCommandOutput>((resolve, reject) => {
        let options: child_process.ExecOptions = { cwd: cwd, shell: getShellType() };
        let command_and_args = command
        if (args) {
            command_and_args += args.join(" ");
        }
        let result = new ShellCommandOutput();
        result.command = command_and_args;
        log("Running command: ", command_and_args);
        child_process.exec(command_and_args, options, (error, stdout, stderr) => {
            result.error = error;
            result.stdout = stdout;
            result.stderr = stderr;
            if (error) {
                reject(result);
            }
            else {
                resolve(result);
            }
        });
    });
}

export function runShellCommandSync(cwd: string, command: string, args?: string[]): ShellCommandOutput {
    let result = new ShellCommandOutput();
    result.command = command;
    try {
        let options: child_process.ExecOptions = { cwd: cwd, shell: getShellType() };
        let command_and_args = command;
        if (args) {
            command_and_args += args.join(" ");
        }
        result.command = command_and_args;
        log("Running command: ", command_and_args);
        result.stdout = child_process.execSync(command_and_args, options).toString();
    }
    catch (err) {
        log("err: ", err);
    }
    return result;
}

export function getShellType(): string {
    const shelltype = vscode.workspace.getConfiguration('catkin-helpers').get('shelltype') as string;
    return shelltype;
}
