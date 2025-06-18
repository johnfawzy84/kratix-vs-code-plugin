import * as vscode from 'vscode';
import * as yaml from 'js-yaml';

class StatusTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly children: StatusTreeItem[] = []
    ) {
        super(label, collapsibleState);
    }
}

export class KratixInstanceStatusProvider implements vscode.TreeDataProvider<StatusTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<StatusTreeItem | undefined | void> = new vscode.EventEmitter<StatusTreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<StatusTreeItem | undefined | void> = this._onDidChangeTreeData.event;

    private describeOutput: string = '';

    setDescribeText(text: string) {
        this.describeOutput = text;
        this._onDidChangeTreeData.fire();
    }

    clear() {
        this.describeOutput = '';
        this._onDidChangeTreeData.fire();
    }

    getChildren(element?: StatusTreeItem): Thenable<StatusTreeItem[]> {
        if (!this.describeOutput) {
            return Promise.resolve([]);
        }
        if (!element) {
            // Top-level: parse describe output into sections
            const sections = extractSections(this.describeOutput);
            return Promise.resolve(sections);
        } else {
            // Children: return the children of the element
            return Promise.resolve(element.children);
        }
    }

    getTreeItem(element: StatusTreeItem): vscode.TreeItem {
        return element;
    }
}

function extractSections(describeOutput: string): StatusTreeItem[] {
    // Split describe output into sections: Spec, Status, Events
    const lines = describeOutput.split('\n');
    const sectionNames = ['SPEC', 'STATUS', 'EVENTS'];
    const sectionIndices: Record<string, number> = {};
    for (let i = 0; i < lines.length; i++) {
        const upper = lines[i].trim().toUpperCase();
        if (sectionNames.includes(upper.replace(':', ''))) {
            sectionIndices[upper.replace(':', '')] = i;
        }
    }
    const result: StatusTreeItem[] = [];
    for (const section of sectionNames) {
        const idx = sectionIndices[section];
        if (idx !== undefined) {
            let endIdx = lines.length;
            // Find the next section
            for (const nextSection of sectionNames) {
                if (nextSection !== section && sectionIndices[nextSection] !== undefined && sectionIndices[nextSection] > idx) {
                    endIdx = Math.min(endIdx, sectionIndices[nextSection]);
                }
            }
            const sectionLines = lines.slice(idx + 1, endIdx).filter(l => l.trim().length > 0);
            if (section === 'SPEC' || section === 'STATUS') {
                // Parse as YAML tree
                const yamlText = sectionLines.join('\n');
                let parsed: any = undefined;
                try {
                    parsed = yaml.load(yamlText);
                } catch {
                    parsed = undefined;
                }
                if (parsed && typeof parsed === 'object') {
                    result.push(new StatusTreeItem(section.charAt(0) + section.slice(1).toLowerCase(), vscode.TreeItemCollapsibleState.Collapsed, yamlToTree(parsed)));
                } else {
                    // Fallback: show as flat lines
                    const children = sectionLines.map(l => new StatusTreeItem(l.trim(), vscode.TreeItemCollapsibleState.None));
                    result.push(new StatusTreeItem(section.charAt(0) + section.slice(1).toLowerCase(), vscode.TreeItemCollapsibleState.Collapsed, children));
                }
            } else if (section === 'EVENTS') {
                const children = sectionLines.map(l => new StatusTreeItem(l.trim(), vscode.TreeItemCollapsibleState.None));
                result.push(new StatusTreeItem('Events', vscode.TreeItemCollapsibleState.Collapsed, children));
            }
        }
    }
    return result;
}

function yamlToTree(obj: any): StatusTreeItem[] {
    if (typeof obj !== 'object' || obj === null) {
        return [new StatusTreeItem(String(obj), vscode.TreeItemCollapsibleState.None)];
    }
    if (Array.isArray(obj)) {
        return obj.map((item, idx) => new StatusTreeItem(`-`, Array.isArray(item) || typeof item === 'object' ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None, yamlToTree(item)));
    }
    return Object.entries(obj).map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
            return new StatusTreeItem(String(key), vscode.TreeItemCollapsibleState.Collapsed, yamlToTree(value));
        } else {
            return new StatusTreeItem(`${key}: ${value}`, vscode.TreeItemCollapsibleState.None);
        }
    });
}
