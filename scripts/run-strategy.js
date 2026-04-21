const path = require('path');

const sampleContexts = require('../src/sample-contexts');
const {
  normalizeStrategyModule,
  runStrategy
} = require('../src/strategy-sdk');

function loadFreshModule(filePath) {
  const resolvedPath = require.resolve(filePath);
  delete require.cache[resolvedPath];
  return require(resolvedPath);
}

function main() {
  const inputPath = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : path.resolve(__dirname, '..', 'strategy.js');
  const rawStrategy = loadFreshModule(inputPath);
  const strategy = normalizeStrategyModule(rawStrategy, {
    fileName: path.basename(inputPath)
  });

  console.log(`${strategy.name}`);
  if (strategy.description) {
    console.log(strategy.description);
  }
  console.log('');

  sampleContexts.forEach((entry, index) => {
    const decision = runStrategy(rawStrategy, entry.context, {
      fileName: path.basename(inputPath)
    });
    const totalAllocated = decision.allocations.reduce((sum, value) => sum + value, 0);

    console.log(`${index + 1}. ${entry.name}`);
    console.log(`   Line: ${entry.context.line.join(', ')}`);
    console.log(`   Scores: ${entry.context.lineScores.join(', ')}`);
    console.log(`   Available energy: ${entry.context.availableEnergy}`);
    console.log(`   Decision allocations: ${decision.allocations.join(', ')} (total ${totalAllocated})`);
    console.log('');
  });
}

try {
  main();
} catch (error) {
  console.error(`Strategy run failed: ${error.message}`);
  process.exit(1);
}