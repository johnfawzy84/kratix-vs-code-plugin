import * as vscode from 'vscode';

export class KratixInstancesProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData: vscode.Event<void> = this._onDidChangeTreeData.event;
    private instances: { name: string, namespace: string }[] = [];
    private parentPromise: string | undefined;

    setInstances(instances: { name: string, namespace: string }[], parentPromise?: string) {
        this.instances = instances;
        this.parentPromise = parentPromise;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): Thenable<vscode.TreeItem[]> {
        return Promise.resolve(this.instances.map(i => {
            const item = new vscode.TreeItem(i.name);
            item.description = i.namespace;
            item.contextValue = 'instance';
            // Optionally, show namespace in label: item.label = `${i.name} (${i.namespace})`;
            return item;
        }));
    }

    getParentPromise(): string | undefined {
        return this.parentPromise;
    }
}
