import * as assert from 'assert';
import { formatInstanceLabel, Instance } from '../kratixInstancesLogic';

describe('kratixInstancesLogic', () => {
    it('formats instance label correctly', () => {
        const instance: Instance = { name: 'foo', namespace: 'bar' };
        const label = formatInstanceLabel(instance);
        assert.strictEqual(label, 'foo (bar)');
    });

    it('formats empty instance correctly', () => {
        const instance: Instance = { name: '', namespace: '' };
        const label = formatInstanceLabel(instance);
        assert.strictEqual(label, ' ()');
    });
});
