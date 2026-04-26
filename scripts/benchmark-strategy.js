const path = require('path');

const { runStrategyBenchmark } = require('../src/benchmark-sdk');

function printUsage() {
  console.log(`Usage:
  npm run benchmark
  npm run benchmark -- [strategy-file]
  npm run benchmark -- [strategy-file] --games 24
  npm run benchmark -- [strategy-file] --balls 12
  npm run benchmark -- [strategy-file] --max-energy balls

Examples:
  npm run benchmark
  npm run benchmark -- strategy.js
  npm run benchmark -- examples/momentum-reader.js --games 24
  npm run benchmark -- strategy.js --balls 20 --max-energy balls
`);
}

function parsePositiveInteger(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }

  return parsed;
}

function parseMaxEnergyOption(value) {
  const normalized = String(value || '').trim().toLowerCase();
  const startingBallsAliases = new Set([
    'balls',
    'ball',
    'ball-count',
    'starting-balls',
    'starting-ball-count',
    'line',
    'line-length'
  ]);

  if (startingBallsAliases.has(normalized)) {
    return 'starting-balls';
  }

  return parsePositiveInteger(value, '--max-energy');
}

function parseArgs(argv) {
  const options = {
    targetPath: path.resolve(__dirname, '..', 'strategy.js'),
    gameCount: null,
    ballCount: null,
    maxEnergy: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }

    if (argument === '--games') {
      if (index + 1 >= argv.length) {
        throw new Error('Missing value for --games');
      }

      options.gameCount = parsePositiveInteger(argv[index + 1], '--games');
      index += 1;
      continue;
    }

    if (argument === '--balls') {
      if (index + 1 >= argv.length) {
        throw new Error('Missing value for --balls');
      }

      options.ballCount = parsePositiveInteger(argv[index + 1], '--balls');
      index += 1;
      continue;
    }

    if (argument === '--max-energy') {
      if (index + 1 >= argv.length) {
        throw new Error('Missing value for --max-energy');
      }

      options.maxEnergy = parseMaxEnergyOption(argv[index + 1]);
      index += 1;
      continue;
    }

    if (argument.startsWith('-')) {
      throw new Error(`Unknown option: ${argument}`);
    }

    options.targetPath = path.resolve(process.cwd(), argument);
  }

  return options;
}

function formatStanding(entry, placement) {
  const marker = entry.isTarget ? ' <== your strategy' : '';
  return `${placement}. ${entry.strategyName} (${entry.fileName})\n   ${entry.wins} wins | avg rank ${entry.averageRank} | ${entry.averagePoints} avg pts | ${entry.runtimeErrors} runtime errors${marker}`;
}

function formatBenchmarkLineSource(options) {
  if (options.lineSource === 'generated' && options.ballCount) {
    return `${options.lineBankSize}-line generated ${options.ballCount}-ball bank`;
  }

  return `fixed ${options.lineBankSize}-line bank`;
}

function formatMaxEnergy(options) {
  if (options.maxEnergyDescription) {
    return options.maxEnergyDescription;
  }

  return options.maxEnergyMode === 'starting-balls'
    ? 'starting balls per game'
    : String(options.maxEnergy);
}

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  const benchmark = runStrategyBenchmark({
    targetPath: options.targetPath,
    gameCount: options.gameCount == null ? undefined : options.gameCount,
    ballCount: options.ballCount == null ? undefined : options.ballCount,
    maxEnergy: options.maxEnergy == null ? undefined : options.maxEnergy
  });

  const baselineCount = Math.max(0, benchmark.strategies.length - 1);
  const targetLabel = benchmark.target
    ? `${benchmark.target.strategyName} (${benchmark.target.fileName})`
    : path.basename(options.targetPath);

  console.log(`Benchmarking ${targetLabel}`);
  console.log(`Against ${baselineCount} bundled baseline strateg${baselineCount === 1 ? 'y' : 'ies'} across ${benchmark.options.gameCount} games from a ${formatBenchmarkLineSource(benchmark.options)}.`);
  console.log(`Energy: start ${benchmark.options.startingEnergy}, cap ${formatMaxEnergy(benchmark.options)}.`);
  console.log('');
  console.log('Standings');
  console.log('---------');
  benchmark.standings.forEach((entry, index) => {
    console.log(formatStanding(entry, index + 1));
  });

  if (benchmark.target) {
    console.log('');
    console.log(`Your strategy finished #${benchmark.target.placement} of ${benchmark.standings.length}.`);
  }
}

try {
  main();
} catch (error) {
  console.error(`Benchmark failed: ${error.message}`);
  process.exit(1);
}
