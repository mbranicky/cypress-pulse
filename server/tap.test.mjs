import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTap, tapRun, TapCollector } from './tap.mjs';

test('idle discovery accepts Cypress 16 no-session output', () => {
  assert.deepEqual(parseTap('No running Cypress session found. Start Cypress in open mode.'), []);
});
test('interactive reruns have distinct identities and empty is not success', () => {
  const base = {pid: 10, projectRoot: '/project', status: 'passed', totalTests: 1, results: {passed: 0, pending: 1}};
  assert.equal(tapRun(base).status, 'empty');
  assert.notEqual(tapRun({...base, startedAt: 'one'}).id, tapRun({...base, startedAt: 'two'}).id);
});
test('unfinished Tap pending counts are not completed pending tests', () => {
  const run = tapRun({pid: 10, projectRoot: '/project', status: 'running', results: {passed: 0, failed: 0, pending: 2, skipped: 0}, totalTests: 2});
  assert.equal(run.pending, 0);
});
test('build failures retain the status diagnostic', () => {
  const run = tapRun({pid: 10, projectRoot: '/project', status: 'failed', error: {message: 'Build failed'}});
  assert.match(run.errors[0], /Build failed/);
});
test('session versions use each project installation, not discovery CLI', async () => {
  const calls = [];
  const collector = new TapCollector({resolve: root => ({cli: `${root}/cli`, version: '16.1.1'}), call: async (cli, root, args) => {
    calls.push(cli);
    if (args[0] === 'sessions') return [{pid: 10, projectRoot: '/tmp'}, {pid: 11, projectRoot: '/outside'}];
    return {pid: 10, projectRoot: '/tmp', status: 'running', startedAt: '2026-10-14T10:00:00Z', results: {passed: 1}};
  }});
  const result = await collector.collect('/tmp', '/tmp/nested');
  assert.equal(result.runs.length, 1);
  assert.deepEqual(calls, ['/tmp/nested/cli', '/tmp/cli']);
});
test('rejects a report if a new run starts while reading it', async () => {
  let reads = 0;
  const collector = new TapCollector({resolve: () => ({cli: '/cli', version: '16.1.1'}), call: async (_cli, _root, args) => {
    if (args[0] === 'reporter') return {tests: []};
    return {pid: 10, projectRoot: '/tmp', status: 'passed', startedAt: ++reads === 1 ? 'one' : 'two', results: {passed: 1}};
  }});
  await assert.rejects(() => collector.report({id: 'tap-10-none-one', sessionPid: 10, projectRoot: '/tmp'}), /rerun started/);
});
