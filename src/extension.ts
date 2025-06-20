// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { KratixPromiseProvider, PromiseTreeItem } from './kratixPromiseProvider';
import { KratixInstancesProvider } from './kratixInstancesProvider';
import { KratixInstanceStatusProvider } from './kratixInstanceStatusProvider';
import { logAndExec, LARGE_BUFFER, kratixOutputChannel } from './kratixCommon';


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    console.log('[Kratix] Activating extension');

    // Register all commands ONCE at the top level
    console.log('[Kratix] Registering kratixPromiseExplorer.applyPromiseYaml command');
    context.subscriptions.push(
        vscode.commands.registerCommand('kratixPromiseExplorer.applyPromiseYaml', async (args?: { mode?: 'create' | 'edit' }) => {
            if (vscode.window.activeTextEditor) {
                const text = vscode.window.activeTextEditor.document.getText();
                const tmp = require('os').tmpdir() + `/kratix-edit-${Date.now()}.yaml`;
                const fs = require('fs');
                fs.writeFileSync(tmp, text);
                let mode = args && args.mode ? args.mode : 'edit';
                let useApply = mode === 'create';
                let resourceKind = '';
                let resourceName = '';
                let resourceNamespace = '';
                try {
                    const yaml = require('js-yaml');
                    const doc = yaml.load(text);
                    resourceKind = doc && doc.kind ? doc.kind : '';
                    resourceName = doc && doc.metadata && doc.metadata.name ? doc.metadata.name : '';
                    resourceNamespace = doc && doc.metadata && doc.metadata.namespace ? doc.metadata.namespace : '';
                    const annotations = doc && doc.metadata && doc.metadata.annotations ? doc.metadata.annotations : {};
                    if (!useApply && !annotations['kubectl.kubernetes.io/last-applied-configuration']) {
                        useApply = true;
                    }
                } catch (e) {
                    useApply = true;
                }
                const ctx = kratixProvider.getCurrentContext() ? `--context ${kratixProvider.getCurrentContext()}` : '';
                async function runKubectl(command: string): Promise<{ err: any, stdout: string, stderr: string }> {
                    return new Promise(resolve => {
                        logAndExec(command, LARGE_BUFFER, (err, stdout, stderr) => {
                            resolve({ err, stdout, stderr });
                        });
                    });
                }
                vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: `Applying changes to cluster` }, async () => {
                    let command = useApply
                        ? `kubectl ${ctx} apply -f ${tmp}`
                        : `kubectl ${ctx} replace -f ${tmp}`;
                    let { err, stdout, stderr } = await runKubectl(command);
                    if (err && !useApply && stderr && stderr.includes('NotFound')) {
                        // fallback to apply if replace fails with NotFound
                        command = `kubectl ${ctx} apply -f ${tmp}`;
                        ({ err, stdout, stderr } = await runKubectl(command));
                    }
                    if (err) {
                        vscode.window.showErrorMessage(`Failed to apply changes: ${stderr || err.message}`);
                    } else {
                        vscode.window.showInformationMessage(`Resource updated successfully.`);
                        kratixProvider.refresh();
                        vscode.commands.executeCommand('workbench.action.closeActiveEditor');
                    }
                    fs.unlinkSync(tmp);
                });
            }
        })
    );
    console.log('[Kratix] Registering kratixPromiseExplorer.selectContext command');
    context.subscriptions.push(
        vscode.commands.registerCommand('kratixPromiseExplorer.selectContext', showContextQuickPick)
    );

    let kratixProvider: KratixPromiseProvider;
    let instancesProvider = new KratixInstancesProvider();
    let instanceStatusProvider = new KratixInstanceStatusProvider();
    let contextQuickPickDisposable: vscode.Disposable | undefined;

    function showContextQuickPick() {
        const contexts = kratixProvider.getAvailableContexts();
        vscode.window.showQuickPick(contexts, {
            placeHolder: 'Select kubectl context',
        }).then(selected => {
            if (selected) {
                kratixProvider.setContext(selected);
                vscode.window.showInformationMessage(`Switched to context: ${selected}`);
            }
        });
    }

    // Remove duplicate registration of selectContext command from contextChangeCallback
    kratixProvider = new KratixPromiseProvider();

    vscode.window.registerTreeDataProvider('kratixPromiseExplorer', kratixProvider);
    vscode.window.registerTreeDataProvider('kratixInstancesExplorer', instancesProvider);
    vscode.window.registerTreeDataProvider('kratixInstanceStatusExplorer', instanceStatusProvider);
    context.subscriptions.push(
        vscode.commands.registerCommand('kratixPromiseExplorer.refresh', () => kratixProvider.refresh())
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('kratixPromiseExplorer.showInstances', async (promise: string) => {
            const instances = await kratixProvider.fetchInstancesForPromise(promise);
            instancesProvider.setInstances(instances, promise);
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('kratixPromiseExplorer.openPromiseEditor', async (promise: string | PromiseTreeItem) => {
            // Always use 'promise' as the resource type for the Edit... action
            const name = typeof promise === 'string' ? promise : promise.label;
            const ctx = kratixProvider.getCurrentContext() ? `--context ${kratixProvider.getCurrentContext()}` : '';
            logAndExec(`kubectl ${ctx} get promise ${name} -o yaml`, LARGE_BUFFER, async (err, stdout) => {
                let yaml = '';
                if (!err) {
                    yaml = stdout;
                } else {
                    yaml = `# Error fetching YAML: ${err.message}`;
                }
                const doc = await vscode.workspace.openTextDocument({ content: yaml, language: 'yaml' });
                await vscode.window.showTextDocument(doc, { preview: false });
                // Listen for document changes and add a CodeLens or command to apply
                const applyCommand = 'kratixPromiseExplorer.applyPromiseYaml';
                // Only add CodeLens, do NOT register the command again here!
                const emitter = new vscode.EventEmitter<void>();
                const codeLensProvider = {
                    provideCodeLenses(document: vscode.TextDocument) {
                        if (document.uri.toString() === doc.uri.toString()) {
                            return [
                                new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
                                    title: 'Apply changes to cluster',
                                    command: applyCommand,
                                    arguments: [{ mode: 'edit' }]
                                })
                            ];
                        }
                        return [];
                    },
                    onDidChangeCodeLenses: emitter.event
                };
                if (!(globalThis as any)._kratixCodeLensDisposables) {
                    (globalThis as any)._kratixCodeLensDisposables = new Map();
                }
                const codeLensDisposable = vscode.languages.registerCodeLensProvider({ pattern: doc.uri.fsPath || '**/*', scheme: doc.uri.scheme, language: 'yaml' }, codeLensProvider);
                const disposablesMap = (globalThis as any)._kratixCodeLensDisposables;
                const prev = disposablesMap.get(doc.uri.toString());
                if (prev) { prev.dispose(); }
                disposablesMap.set(doc.uri.toString(), codeLensDisposable);
                context.subscriptions.push(codeLensDisposable);
            });
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('kratixPromiseExplorer.openInstanceEditor', async (instance: vscode.TreeItem) => {
            const parentPromise = instancesProvider.getParentPromise();
            if (!parentPromise) {
                vscode.window.showErrorMessage('Parent promise not found for this instance.');
                return;
            }
            const name = instance.label;
            const namespace = instance.description;
            const resourceType = kratixProvider.getResourceTypeForPromise(parentPromise);
            if (!resourceType) {
                vscode.window.showErrorMessage('Resource type for this promise could not be determined.');
                return;
            }
            const nsArg = namespace ? `-n ${namespace}` : '';
            const ctx = kratixProvider.getCurrentContext() ? `--context ${kratixProvider.getCurrentContext()}` : '';
            logAndExec(`kubectl ${ctx} get ${resourceType} ${name} ${nsArg} -o yaml`, LARGE_BUFFER, async (err, stdout) => {
                let yaml = '';
                if (!err) {
                    yaml = stdout;
                } else {
                    yaml = `# Error fetching YAML: ${err.message}`;
                }
                const doc = await vscode.workspace.openTextDocument({ content: yaml, language: 'yaml' });
                await vscode.window.showTextDocument(doc, { preview: false });
                // Add CodeLens for apply, same as for promises
                const applyCommand = 'kratixPromiseExplorer.applyPromiseYaml';
                const emitter = new vscode.EventEmitter<void>();
                const codeLensProvider = {
                    provideCodeLenses(document: vscode.TextDocument) {
                        if (document.uri.toString() === doc.uri.toString()) {
                            return [
                                new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
                                    title: 'Apply changes to cluster',
                                    command: applyCommand,
                                    arguments: [{ mode: 'edit' }]
                                })
                            ];
                        }
                        return [];
                    },
                    onDidChangeCodeLenses: emitter.event
                };
                if (!(globalThis as any)._kratixCodeLensDisposables) {
                    (globalThis as any)._kratixCodeLensDisposables = new Map();
                }
                const codeLensDisposable = vscode.languages.registerCodeLensProvider({ pattern: doc.uri.fsPath || '**/*', scheme: doc.uri.scheme, language: 'yaml' }, codeLensProvider);
                const disposablesMap = (globalThis as any)._kratixCodeLensDisposables;
                const prev = disposablesMap.get(doc.uri.toString());
                if (prev) { prev.dispose(); }
                disposablesMap.set(doc.uri.toString(), codeLensDisposable);
                context.subscriptions.push(codeLensDisposable);
            });
        })
    );
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor && editor.document.uri.scheme === 'kratix-promise') {
                const promise = editor.document.uri.path.replace(/^\//, '');
                vscode.commands.executeCommand('kratixPromiseExplorer.openPromiseEditor', promise);
            }
        })
    );

    const kratixTreeView = vscode.window.createTreeView('kratixPromiseExplorer', {
        treeDataProvider: kratixProvider,
    });
    let lastSelected: string | undefined;
    let lastSelectTime = 0;
    // Update instance status logic to use correct resource type
    kratixTreeView.onDidChangeSelection(async (e) => {
        const selected = e.selection[0];
        if (selected && selected.promiseName) {
            const now = Date.now();
            if (lastSelected === selected.promiseName && now - lastSelectTime < 500) {
                // Double-click detected
                vscode.commands.executeCommand('kratixPromiseExplorer.openPromiseEditor', selected.promiseName);
            }
            lastSelected = selected.promiseName;
            lastSelectTime = now;
            instanceStatusProvider.clear();
        } else if (selected && selected.contextValue === 'instance') {
            const parentPromise = instancesProvider.getParentPromise();
            if (parentPromise) {
                const resourceType = kratixProvider.getResourceTypeForPromise(parentPromise);
                if (!resourceType) {
                    instanceStatusProvider.clear();
                    return;
                }
                const name = selected.label;
                const namespace = selected.description;
                const nsArg = namespace ? `-n ${namespace}` : '';
                const ctx = kratixProvider.getCurrentContext() ? `--context ${kratixProvider.getCurrentContext()}` : '';
                logAndExec(`kubectl ${ctx} describe ${resourceType} ${name} ${nsArg}`, LARGE_BUFFER, (err, stdout) => {
                    if (!err) {
                        instanceStatusProvider.setDescribeText(stdout);
                    } else {
                        instanceStatusProvider.setDescribeText(`# Error: ${err.message}`);
                    }
                });
            } else {
                instanceStatusProvider.clear();
            }
        } else {
            instanceStatusProvider.clear();
        }
    });
    // Register the kratixInstancesExplorer tree view and its selection handler
    const kratixInstancesTreeView = vscode.window.createTreeView('kratixInstancesExplorer', {
        treeDataProvider: instancesProvider,
    });
    kratixInstancesTreeView.onDidChangeSelection(async (e) => {
        const selected = e.selection[0];
        if (selected && selected.label) {
            const parentPromise = instancesProvider.getParentPromise();
            if (parentPromise) {
                const resourceType = kratixProvider.getResourceTypeForPromise(parentPromise);
                if (!resourceType) {
                    instanceStatusProvider.clear();
                    return;
                }
                const name = selected.label;
                const namespace = selected.description;
                const nsArg = namespace ? `-n ${namespace}` : '';
                const ctx = kratixProvider.getCurrentContext() ? `--context ${kratixProvider.getCurrentContext()}` : '';
                logAndExec(`kubectl ${ctx} describe ${resourceType} ${name} ${nsArg}`, LARGE_BUFFER, (err, stdout) => {
                    if (!err) {
                        instanceStatusProvider.setDescribeText(stdout);
                    } else {
                        instanceStatusProvider.setDescribeText(`# Error: ${err.message}`);
                    }
                });
            } else {
                instanceStatusProvider.clear();
            }
        } else {
            instanceStatusProvider.clear();
        }
    });
    context.subscriptions.push(
        vscode.commands.registerCommand('kratixInstancesExplorer.refresh', () => {
            // Refresh the currently selected promise's instances
            const parentPromise = instancesProvider.getParentPromise();
            if (parentPromise) {
                kratixProvider.fetchInstancesForPromise(parentPromise).then(instances => {
                    instancesProvider.setInstances(instances, parentPromise);
                });
            } else {
                // If no parent promise, just clear the instances view
                instancesProvider.setInstances([], undefined);
            }
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('kratixPromiseExplorer.createInstance', async (promiseItem: PromiseTreeItem) => {
            const promiseName = promiseItem.promiseName || promiseItem.label;
            const ctx = kratixProvider.getCurrentContext() ? `--context ${kratixProvider.getCurrentContext()}` : '';
            logAndExec(`kubectl ${ctx} get promise ${promiseName} -o json`, LARGE_BUFFER, async (err, stdout) => {
                if (err) {
                    vscode.window.showErrorMessage(`Failed to fetch promise definition: ${err.message}`);
                    return;
                }
                let openAPISchema, version, group, kind;
                try {
                    const promiseObj = JSON.parse(stdout);
                    const apiSpec = promiseObj.spec.api.spec;
                    const versionObj = apiSpec.versions && apiSpec.versions[0];
                    openAPISchema = versionObj.schema.openAPIV3Schema.properties.spec;
                    version = versionObj.name;
                    group = apiSpec.group;
                    kind = apiSpec.names && apiSpec.names.kind ? apiSpec.names.kind : promiseName;
                } catch (e) {
                    vscode.window.showErrorMessage('Failed to parse OpenAPI schema from promise.');
                    return;
                }
                const yaml = generateInstanceYaml(group, version, kind, openAPISchema);
                const doc = await vscode.workspace.openTextDocument({ content: yaml, language: 'yaml' });
                await vscode.window.showTextDocument(doc, { preview: false });
                // Add CodeLens for Apply to cluster
                const applyCommand = 'kratixPromiseExplorer.applyPromiseYaml';
                const emitter = new vscode.EventEmitter<void>();
                const codeLensProvider = {
                    provideCodeLenses(document: vscode.TextDocument) {
                        if (document.uri.toString() === doc.uri.toString()) {
                            return [
                                new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
                                    title: 'Apply to cluster',
                                    command: applyCommand,
                                    arguments: [{ mode: 'create' }]
                                })
                            ];
                        }
                        return [];
                    },
                    onDidChangeCodeLenses: emitter.event
                };
                if (!(globalThis as any)._kratixCodeLensDisposables) {
                    (globalThis as any)._kratixCodeLensDisposables = new Map();
                }
                const codeLensDisposable = vscode.languages.registerCodeLensProvider({ pattern: doc.uri.fsPath || '**/*', scheme: doc.uri.scheme, language: 'yaml' }, codeLensProvider);
                const disposablesMap = (globalThis as any)._kratixCodeLensDisposables;
                const prev = disposablesMap.get(doc.uri.toString());
                if (prev) { prev.dispose(); }
                disposablesMap.set(doc.uri.toString(), codeLensDisposable);
                context.subscriptions.push(codeLensDisposable);
            });
        })
    );
    // Add a command to show the output channel
    context.subscriptions.push(
        vscode.commands.registerCommand('kratixPromiseExplorer.showOutput', () => {
            kratixOutputChannel.show();
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('kratixPromiseExplorer.showInstanceStatus', async (instance: vscode.TreeItem) => {
            const parentPromise = instancesProvider.getParentPromise();
            if (!parentPromise) {
                vscode.window.showErrorMessage('Parent promise not found for this instance.');
                return;
            }
            const name = instance.label;
            const namespace = instance.description;
            const ctx = kratixProvider.getCurrentContext() ? `--context ${kratixProvider.getCurrentContext()}` : '';
            const nsArg = namespace ? `-n ${namespace}` : '';
            logAndExec(`kubectl ${ctx} get ${parentPromise} ${name} ${nsArg} -o json`, LARGE_BUFFER, async (err, stdout) => {
                if (err) {
                    vscode.window.showErrorMessage(`Failed to fetch instance status: ${err.message}`);
                    return;
                }
                let statusObj = {};
                try {
                    const obj = JSON.parse(stdout);
                    statusObj = obj.status || {};
                } catch (e) {
                    vscode.window.showErrorMessage('Failed to parse instance status.');
                    return;
                }
                // Render status as a table in a webview
                const panel = vscode.window.createWebviewPanel(
                    'kratixInstanceStatus',
                    `Instance Status: ${name}`,
                    vscode.ViewColumn.Beside,
                    { enableScripts: false }
                );
                panel.webview.html = getInstanceStatusWebviewContent(statusObj);
            });
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('kratixInstanceStatusExplorer.copyStatus', async (item: vscode.TreeItem) => {
            let text = '';
            if (item.label && item.description) {
                text = `${item.label}: ${item.description}`;
            } else if (item.label) {
                text = String(item.label);
            } else if (item.description) {
                text = String(item.description);
            }
            if (text) {
                await vscode.env.clipboard.writeText(text);
                vscode.window.showInformationMessage('Copied to clipboard!');
            } else {
                vscode.window.showWarningMessage('Nothing to copy.');
            }
        })
    );

    // Register delete command for promises
    context.subscriptions.push(
        vscode.commands.registerCommand('kratixPromiseExplorer.deletePromise', async (promise: string | PromiseTreeItem) => {
            const name = typeof promise === 'string' ? promise : promise.label;
            const ctx = kratixProvider.getCurrentContext() ? `--context ${kratixProvider.getCurrentContext()}` : '';
            const confirm = await vscode.window.showWarningMessage(`Are you sure you want to delete promise '${name}'?`, { modal: true }, 'Delete');
            if (confirm === 'Delete') {
                const cmd = `kubectl ${ctx} delete promise ${name}`;
                kratixOutputChannel.appendLine(`[deletePromise] $ ${cmd}`);
                logAndExec(cmd, LARGE_BUFFER, (err, stdout, stderr) => {
                    kratixOutputChannel.appendLine(stdout || '');
                    kratixOutputChannel.appendLine(stderr || '');
                    if (err) {
                        vscode.window.showErrorMessage(`Failed to delete promise: ${stderr || err.message}`);
                    } else {
                        vscode.window.showInformationMessage(`Promise '${name}' deleted.`);
                        kratixProvider.refresh();
                    }
                });
            }
        })
    );

    // Register delete command for instances
    context.subscriptions.push(
        vscode.commands.registerCommand('kratixPromiseExplorer.deleteInstance', async (instance: vscode.TreeItem) => {
            const parentPromise = instancesProvider.getParentPromise();
            if (!parentPromise) {
                vscode.window.showErrorMessage('Parent promise not found for this instance.');
                return;
            }
            const name = instance.label;
            const namespace = instance.description;
            const resourceType = kratixProvider.getResourceTypeForPromise(parentPromise);
            if (!resourceType) {
                vscode.window.showErrorMessage('Resource type for this promise could not be determined.');
                return;
            }
            const nsArg = namespace ? `-n ${namespace}` : '';
            const ctx = kratixProvider.getCurrentContext() ? `--context ${kratixProvider.getCurrentContext()}` : '';
            const confirm = await vscode.window.showWarningMessage(`Are you sure you want to delete instance '${name}' in namespace '${namespace}'?`, { modal: true }, 'Delete');
            if (confirm === 'Delete') {
                const cmd = `kubectl ${ctx} delete ${resourceType} ${name} ${nsArg}`;
                kratixOutputChannel.appendLine(`[deleteInstance] $ ${cmd}`);
                logAndExec(cmd, LARGE_BUFFER, (err, stdout, stderr) => {
                    kratixOutputChannel.appendLine(stdout || '');
                    kratixOutputChannel.appendLine(stderr || '');
                    if (err) {
                        vscode.window.showErrorMessage(`Failed to delete instance: ${stderr || err.message}`);
                    } else {
                        vscode.window.showInformationMessage(`Instance '${name}' in namespace '${namespace}' deleted.`);
                        vscode.commands.executeCommand('kratixInstancesExplorer.refresh');
                    }
                });
            }
        })
    );
}

// This method is called when your extension is deactivated
export function deactivate() { }

function getWebviewContent(instances: string[]): string {
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Instances</title>
    </head>
    <body>
        <h1>Instances</h1>
        <ul>
            ${instances.map(instance => `<li>${instance}</li>`).join('')}
        </ul>
    </body>
    </html>`;
}

function getInstanceStatusWebviewContent(statusObj: any): string {
    const rows = Object.entries(statusObj).map(([key, value]) =>
        `<tr><td style='font-weight:bold;'>${key}</td><td><pre>${JSON.stringify(value, null, 2)}</pre></td></tr>`
    ).join('');
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Instance Status</title>
    <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ccc; padding: 6px; }
        th { background: #f3f3f3; }
        pre { margin: 0; font-size: 13px; }
    </style>
</head>
<body>
    <h2>Instance Status</h2>
    <table>
        <thead><tr><th>Field</th><th>Value</th></tr></thead>
        <tbody>${rows}</tbody>
    </table>
</body>
</html>`;
}

function generateInstanceYaml(group: string, version: string, kind: string, schema: any): string {
    const specProps = schema && schema.properties ? schema.properties : schema;
    function walkProperties(props: any, indent = '  '): string {
        let out = '';
        for (const key in props) {
            const prop = props[key];
            if (prop.type === 'object' && prop.properties) {
                out += `${indent}${key}:
`;
                out += walkProperties(prop.properties, indent + '  ');
            } else if (prop.type === 'array' && prop.items) {
                out += `${indent}${key}:
${indent}  - # ${prop.items.type || 'object'}
`;
            } else {
                out += `${indent}${key}: # ${prop.type || ''}
`;
            }
        }
        return out;
    }
    return `apiVersion: ${group}/${version}\nkind: ${kind}\nmetadata:\n  name: <instance-name>\n  namespace: <instance-namespace>\nspec:\n${walkProperties(specProps)}\n`;
}

