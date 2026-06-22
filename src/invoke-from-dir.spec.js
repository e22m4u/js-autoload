import os from 'node:os';
import {expect} from 'chai';
import path from 'node:path';
import fs from 'node:fs/promises';
import {invokeFromDir} from './invoke-from-dir.js';

const createTempDir = async function () {
  const tmpBase = path.join(os.tmpdir(), 'js-autoload-');
  return await fs.mkdtemp(tmpBase);
};

describe('invokeFromDir', function () {
  it('should execute default export functions from files in numeric order', async function () {
    const tempDir = await createTempDir();
    try {
      await fs.writeFile(
        path.join(tempDir, '02-second.js'),
        'export default (ctx) => ctx.push("second")',
      );
      await fs.writeFile(
        path.join(tempDir, '10-third.js'),
        'export default (ctx) => ctx.push("third")',
      );
      await fs.writeFile(
        path.join(tempDir, '01-first.js'),
        'export default (ctx) => ctx.push("first")',
      );
      const context = [];
      await invokeFromDir(tempDir, context);
      expect(context).to.deep.equal(['first', 'second', 'third']);
    } finally {
      await fs.rm(tempDir, {recursive: true, force: true});
    }
  });

  it('should look for files recursively', async function () {
    const tempDir = await createTempDir();
    try {
      const subDir = path.join(tempDir, 'nested/level/deep');
      await fs.mkdir(subDir, {recursive: true});
      await fs.writeFile(
        path.join(subDir, 'action.js'),
        'export default (ctx) => ctx.ran = true',
      );
      const context = {ran: false};
      await invokeFromDir(tempDir, context);
      expect(context.ran).to.be.true;
    } finally {
      await fs.rm(tempDir, {recursive: true, force: true});
    }
  });

  it('should pass multiple arguments to the exported function', async function () {
    const tempDir = await createTempDir();
    try {
      await fs.writeFile(
        path.join(tempDir, 'test.js'),
        'export default (a, b, c) => { a.sum = b + c; }',
      );
      const result = {sum: 0};
      await invokeFromDir(tempDir, result, 10, 20);
      expect(result.sum).to.equal(30);
    } finally {
      await fs.rm(tempDir, {recursive: true, force: true});
    }
  });

  it('should ignore non-js files and test files', async function () {
    const tempDir = await createTempDir();
    try {
      const tracker = {count: 0};
      const script = 'export default (t) => t.count++';
      await fs.writeFile(path.join(tempDir, 'valid.js'), script);
      await fs.writeFile(path.join(tempDir, 'notes.txt'), script);
      await fs.writeFile(path.join(tempDir, 'valid.test.js'), script);
      await fs.writeFile(path.join(tempDir, 'valid.spec.js'), script);
      await invokeFromDir(tempDir, tracker);
      expect(tracker.count).to.equal(1);
    } finally {
      await fs.rm(tempDir, {recursive: true, force: true});
    }
  });

  it('should support async functions', async function () {
    const tempDir = await createTempDir();
    try {
      await fs.writeFile(
        path.join(tempDir, 'async-op.js'),
        `export default async (obj) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          obj.done = true;
        }`,
      );
      const state = {done: false};
      await invokeFromDir(tempDir, state);
      expect(state.done).to.be.true;
    } finally {
      await fs.rm(tempDir, {recursive: true, force: true});
    }
  });

  it('should ignore files that do not have a function as default export', async function () {
    const tempDir = await createTempDir();
    try {
      await fs.writeFile(
        path.join(tempDir, 'string-export.js'),
        'export default "i am not a function"',
      );
      await fs.writeFile(
        path.join(tempDir, 'named-only.js'),
        'export const named = function() {}',
      );
      await invokeFromDir(tempDir);
    } finally {
      await fs.rm(tempDir, {recursive: true, force: true});
    }
  });

  it('should not execute classes from default export', async function () {
    const tempDir = await createTempDir();
    try {
      await fs.writeFile(
        path.join(tempDir, 'class-export.js'),
        'export default class SomeClass {}',
      );
      await invokeFromDir(tempDir);
    } finally {
      await fs.rm(tempDir, {recursive: true, force: true});
    }
  });

  it('should throw an error if the directory does not exist', async function () {
    const nonExistentPath = path.join(
      os.tmpdir(),
      'definitely-not-exists-12345',
    );
    try {
      await invokeFromDir(nonExistentPath);
      throw new Error('Should have failed');
    } catch (err) {
      expect(err.code).to.equal('ENOENT');
    }
  });
});
