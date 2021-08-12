

import * as util from 'util';
const exec = util.promisify(require("child_process").exec);
import * as child_process from 'child_process';
import { log } from './utils';

class ShellCommandOutput {
    stdout: string;
    stderr: string;
    command: string;
    error?: Error;

}

// untested
export function runShellCommand(cwd: string, command: string, args?: string[]): Promise<ShellCommandOutput> {
    return new Promise<ShellCommandOutput>((resolve, reject) => {
        let options: child_process.ExecOptions = { cwd: cwd };
        let command_and_args = command + args.join(" ");
        let result = new ShellCommandOutput();
        result.command = command_and_args;
        log(`Running command: ${command_and_args}`);
        child_process.exec(command_and_args, options, (error, stdout, stderr) => {
            if (error) {
                result.error = error;
                reject(result);
            }
            else {
                result.stdout = stdout;
                result.stderr = stderr;
                resolve(result);
            }
        });
    });
}

export function runShellCommandSync(cwd: string, command: string, args?: string[]): ShellCommandOutput {
    let result = new ShellCommandOutput();
    result.command = command;
    try {
        let options: child_process.ExecOptions = { cwd: cwd };
        let command_and_args = command;
        if (args) {
            command_and_args += args.join(" ");
        }
        result.command = command_and_args;
        log("Running command: " + command_and_args);
        result.stdout = child_process.execSync(command_and_args, options).toString();
        child_process.execSync(command_and_args, options).toString();
    }
    catch (err) {
        console.log("err: " + err);
    }
    return result;
}
