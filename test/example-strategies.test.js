const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const sampleContexts = require('../src/sample-contexts');
const {
  normalizeStrategyModule,
  runStrategy
} = require('../src/strategy-sdk');

const examplesDirectory = path.resolve(__dirname, '..', 'examples');
const exampleFiles = fs.readdirSync(examplesDirectory)
  .filter((fileName) => fileName.endsWith('.js'))
  .sort();

test('every example strategy exports a valid strategy module', () => {
  assert.ok(exampleFiles.length > 0);

  exampleFiles.forEach((fileName) => {
    const strategy = require(path.resolve(examplesDirectory, fileName));
    const normalized = normalizeStrategyModule(strategy, { fileName });

    assert.equal(typeof normalized.id, 'string');
    assert.ok(normalized.id.length > 0);
    assert.equal(typeof normalized.name, 'string');
    assert.ok(typeof normalized.decide === 'function');
  });
});

test('every example strategy returns a legal decision for every sample context', () => {
  exampleFiles.forEach((fileName) => {
    const strategy = require(path.resolve(examplesDirectory, fileName));

    sampleContexts.forEach((entry) => {
      const decision = runStrategy(strategy, entry.context, { fileName });
      const totalAllocated = decision.allocations.reduce((sum, value) => sum + value, 0);

      assert.ok(Array.isArray(decision.allocations));
      assert.equal(decision.allocations.length, entry.context.line.length);
      decision.allocations.forEach((value) => {
        assert.ok(Number.isInteger(value));
        assert.ok(value >= 0);
      });
      assert.ok(totalAllocated <= entry.context.availableEnergy);
    });
  });
});