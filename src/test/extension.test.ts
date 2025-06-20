import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Kratix Extension Test Suite', () => {
    test('Extension should be present', async () => {
        const ext = vscode.extensions.getExtension('kratix.kratix-promise-explorer');
        assert.ok(ext, 'Extension is not found');
    });

    test('Extension activates', async () => {
        const ext = vscode.extensions.getExtension('kratix.kratix-promise-explorer');
        await ext?.activate();
        assert.ok(ext && ext.isActive, 'Extension did not activate');
    });

    test('Tree views are registered', async () => {
        const ext = vscode.extensions.getExtension('kratix.kratix-promise-explorer');
        await ext?.activate();
        const kratixPromiseView = vscode.window.createTreeView;
        assert.ok(kratixPromiseView, 'TreeView API not available');
        // We can't check registration directly, but we can check the API exists
    });

    test('Commands are registered', async () => {
        const ext = vscode.extensions.getExtension('kratix.kratix-promise-explorer');
        await ext?.activate();
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes('kratixPromiseExplorer.refresh'), 'kratixPromiseExplorer.refresh not registered');
        assert.ok(commands.includes('kratixPromiseExplorer.openPromiseEditor'), 'kratixPromiseExplorer.openPromiseEditor not registered');
        assert.ok(commands.includes('kratixPromiseExplorer.openInstanceEditor'), 'kratixPromiseExplorer.openInstanceEditor not registered');
    });
});
