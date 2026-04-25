const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { runStrategyBenchmark } = require('../src/benchmark-sdk');

function withTempStrategyProject(callback) {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'destroy-ball-kit-benchmark-'));

  try {
    callback({ projectRoot });
  } finally {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  }
}

test('runStrategyBenchmark returns a target standing against bundled baselines', () => {
  const projectRoot = path.resolve(__dirname, '..');
  const result = runStrategyBenchmark({
    projectRoot,
    lines: [[5, 1, 4, 9]],
    gameCount: 1
  });

  assert.equal(result.games.length, 1);
  assert.ok(result.strategies.length > 1);
  assert.ok(result.target);
  assert.ok(result.standings.some((entry) => entry.isTarget));
});

test('runStrategyBenchmark can compare a custom target strategy against a baseline file', () => {
  withTempStrategyProject(({ projectRoot }) => {
    const examplesDirectory = path.join(projectRoot, 'examples');
    fs.mkdirSync(examplesDirectory, { recursive: true });

    const targetPath = path.join(projectRoot, 'strategy.js');
    const baselinePath = path.join(examplesDirectory, 'last-ball.js');

    fs.writeFileSync(targetPath, `
      module.exports = {
        name: 'First Ball',
        decide(context) {
          return {
            allocations: context.line.map((_, index) => (index === 0 ? context.availableEnergy : 0))
          };
        }
      };
    `);

    fs.writeFileSync(baselinePath, `
      module.exports = {
        name: 'Last Ball',
        decide(context) {
          return {
            allocations: context.line.map((_, index) => (index === context.line.length - 1 ? context.availableEnergy : 0))
          };
        }
      };
    `);

    const result = runStrategyBenchmark({
      projectRoot,
      targetPath,
      baselinePaths: [baselinePath],
      lines: [[4, 7, 2, 9]],
      gameCount: 1,
      startingEnergy: 5,
      maxRounds: 10,
      passLimit: 3
    });

    assert.equal(result.standings.length, 2);
    assert.equal(result.standings[0].strategyName, 'First Ball');
    assert.equal(result.standings[0].wins, 1);
    assert.equal(result.target.strategyName, 'First Ball');
    assert.equal(result.target.placement, 1);
  });
});