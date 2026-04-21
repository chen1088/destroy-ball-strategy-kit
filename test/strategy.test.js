const test = require('node:test');
const assert = require('node:assert/strict');

const sampleContexts = require('../src/sample-contexts');
const {
  normalizeStrategyModule,
  runStrategy
} = require('../src/strategy-sdk');
const strategy = require('../strategy');

test('strategy exports a valid strategy module', () => {
  const normalized = normalizeStrategyModule(strategy, {
    fileName: 'strategy.js'
  });

  assert.equal(typeof normalized.id, 'string');
  assert.ok(normalized.id.length > 0);
  assert.equal(typeof normalized.name, 'string');
  assert.ok(typeof normalized.decide === 'function');
});

test('strategy returns a legal decision for every sample context', () => {
  sampleContexts.forEach((entry) => {
    const decision = runStrategy(strategy, entry.context, {
      fileName: 'strategy.js'
    });
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