import * as vscode from 'vscode';
import { exec, ExecOptions } from 'child_process';

declare module './kratixCommon';

export const LARGE_BUFFER: ExecOptions = { maxBuffer: 1024 * 1024 * 10 };

export const kratixOutputChannel = vscode.window.createOutputChannel('Kratix Promises Explorer');

export function logAndExec(command: string, options: ExecOptions, callback: (err: any, stdout: string, stderr: string) => void) {
    kratixOutputChannel.appendLine(`[COMMAND] ${command}`);
    exec(command, options, (err, stdout, stderr) => {
        if (stdout) kratixOutputChannel.appendLine(`[STDOUT]\n${stdout}`);
        if (stderr) kratixOutputChannel.appendLine(`[STDERR]\n${stderr}`);
        if (err) kratixOutputChannel.appendLine(`[ERROR] ${err.message}`);
        callback(err, stdout, stderr);
    });
}
