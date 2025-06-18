import * as vscode from 'vscode';

export class KratixInstancesProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData: vscode.Event<void> = this._onDidChangeTreeData.event;
    private instances: string[] = [];
    private parentPromise: string | undefined;

    setInstances(instances: string[], parentPromise?: string) {
        this.instances = instances;
        this.parentPromise = parentPromise;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): Thenable<vscode.TreeItem[]> {
        return Promise.resolve(this.instances.map(i => {
            const item = new vscode.TreeItem(i);
            item.contextValue = 'instance';
            return item;
        }));
    }

    getParentPromise(): string | undefined {
        return this.parentPromise;
    }
}
