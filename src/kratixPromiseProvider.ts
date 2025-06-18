import * as vscode from 'vscode';
import { logAndExec, LARGE_BUFFER } from './kratixCommon';

export class PromiseTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly promiseName?: string,
        public readonly instance?: boolean
    ) {
        super(label, collapsibleState);
        this.contextValue = instance ? 'instance' : 'promise';
    }
}

export class KratixPromiseProvider implements vscode.TreeDataProvider<PromiseTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PromiseTreeItem | undefined | void> = new vscode.EventEmitter<PromiseTreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<PromiseTreeItem | undefined | void> = this._onDidChangeTreeData.event;

    private promises: string[] = [];
    private instances: Record<string, string[]> = {};
    private promiseStatuses: Record<string, string> = {};
    private resourceTypes: Record<string, string> = {};

    private context: string | undefined;
    private availableContexts: string[] = [];
    private contextChangeCallback?: () => void;

    constructor(contextChangeCallback?: () => void) {
        this.contextChangeCallback = contextChangeCallback;
        this.loadContexts();
    }

    private loadContexts() {
        logAndExec('kubectl config current-context', {}, (err: any, stdout: string) => {
            const currentContext = (!err && stdout.trim()) ? stdout.trim() : undefined;
            logAndExec('kubectl config get-contexts -o name', {}, (err2: any, stdout2: string) => {
                if (!err2) {
                    this.availableContexts = stdout2.trim().split(/\s+/).filter(Boolean);
                    if (!this.context && currentContext && this.availableContexts.includes(currentContext)) {
                        this.context = currentContext;
                    } else if (!this.context && this.availableContexts.length > 0) {
                        this.context = this.availableContexts[0];
                    }
                    if (this.contextChangeCallback) {
                        this.contextChangeCallback();
                    }
                    // Trigger initial loading of promises after context is set
                    this.refresh();
                }
            });
        });
    }

    setContext(context: string) {
        this.context = context;
        this.refresh();
    }

    getCurrentContext(): string | undefined {
        return this.context;
    }

    getAvailableContexts(): string[] {
        return this.availableContexts;
    }

    refresh(): void {
        this.getPromisesFromKubectl();
    }

    getTreeItem(element: PromiseTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: PromiseTreeItem): Thenable<PromiseTreeItem[]> {
        if (!element) {
            const promiseItems = this.promises.map(p => {
                const item = new PromiseTreeItem(p, vscode.TreeItemCollapsibleState.None, p);
                item.command = {
                    command: 'kratixPromiseExplorer.showInstances',
                    title: 'Show Instances',
                    arguments: [p]
                };
                item.contextValue = 'promise';
                const status = this.promiseStatuses[p] || 'unknown';
                if (status === 'Available' || status === 'available') {
                    item.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
                } else if (status === 'Unavailable' || status === 'unavailable') {
                    item.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('testing.iconFailed'));
                } else if (status === 'Pending' || status === 'pending') {
                    item.iconPath = new vscode.ThemeIcon('clock', new vscode.ThemeColor('testing.iconQueued'));
                } else {
                    item.iconPath = new vscode.ThemeIcon('question');
                }
                return item;
            });
            return Promise.resolve(promiseItems);
        }
        return Promise.resolve([]);
    }

    private getPromisesFromKubectl() {
        const ctx = this.context ? `--context ${this.context}` : '';
        logAndExec(`kubectl ${ctx} get promises -o json`, LARGE_BUFFER, (err: any, stdout: string) => {
            if (err) {
                vscode.window.showErrorMessage('Failed to get promises: ' + err.message);
                return;
            }
            try {
                const data = JSON.parse(stdout);
                this.promises = data.items.map((item: any) => item.metadata.name);
                this.promiseStatuses = {};
                data.items.forEach((item: any) => {
                    this.promiseStatuses[item.metadata.name] = (item.status && item.status.status) ? item.status.status : 'unknown';
                });
            } catch (e) {
                this.promises = [];
                this.promiseStatuses = {};
            }
            this.instances = {};
            this.promises.forEach(promise => {
                this.getInstancesForPromise(promise);
            });
            this._onDidChangeTreeData.fire();
        });
    }

    getInstancesForPromise(promise: string): string[] {
        return this.instances[promise] || [];
    }

    async fetchInstancesForPromise(promise: string): Promise<string[]> {
        return new Promise((resolve) => {
            const ctx = this.context ? `--context ${this.context}` : '';
            // First, fetch the promise object to get the CRD info
            logAndExec(`kubectl ${ctx} get promise ${promise} -o json`, LARGE_BUFFER, (err: any, stdout: string) => {
                if (err) {
                    resolve([]);
                    return;
                }
                try {
                    const promiseObj = JSON.parse(stdout);
                    const apiSpec = promiseObj.spec && promiseObj.spec.api && promiseObj.spec.api.spec;
                    if (!apiSpec || !apiSpec.group || !apiSpec.names || !apiSpec.names.plural) {
                        resolve([]);
                        return;
                    }
                    const group = apiSpec.group;
                    const plural = apiSpec.names.plural;
                    const resourceType = `${plural}.${group}`;
                    this.resourceTypes[promise] = resourceType;
                    // Use the correct resource type: plural.group
                    logAndExec(`kubectl ${ctx} get ${resourceType} -o jsonpath="{.items[*].metadata.name}"`, LARGE_BUFFER, (err2: any, stdout2: string) => {
                        if (!err2) {
                            const instances = stdout2.trim().split(/\s+/).filter(Boolean);
                            this.instances[promise] = instances;
                            resolve(instances);
                        } else {
                            resolve([]);
                        }
                    });
                } catch (e) {
                    resolve([]);
                }
            });
        });
    }

    getResourceTypeForPromise(promise: string): string | undefined {
        return this.resourceTypes[promise];
    }

    async getPromiseYaml(promise: string): Promise<string> {
        return new Promise((resolve) => {
            const ctx = this.context ? `--context ${this.context}` : '';
            logAndExec(`kubectl ${ctx} get promise ${promise} -o yaml`, LARGE_BUFFER, (err: any, stdout: string) => {
                if (!err) {
                    resolve(stdout);
                } else {
                    resolve(`# Error fetching YAML: ${err.message}`);
                }
            });
        });
    }
}
