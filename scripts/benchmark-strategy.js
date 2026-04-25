const path = require('path');

const { runStrategyBenchmark } = require('../src/benchmark-sdk');

function printUsage() {
  console.log(`Usage:
  npm run benchmark
  npm run benchmark -- [strategy-file]
  npm run benchmark -- [strategy-file] --games 24

Examples:
  npm run benchmark
  npm run benchmark -- strategy.js
  npm run benchmark -- examples/momentum-reader.js --games 24
`);
}

function parseArgs(argv) {
  const options = {
    targetPath: path.resolve(__dirname, '..', 'strategy.js'),
    gameCount: null
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

      const parsed = Number(argv[index + 1]);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error('--games must be a positive integer');
      }

      options.gameCount = parsed;
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

function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  const benchmark = runStrategyBenchmark({
    targetPath: options.targetPath,
    gameCount: options.gameCount == null ? undefined : options.gameCount
  });

  const baselineCount = Math.max(0, benchmark.strategies.length - 1);
  const targetLabel = benchmark.target
    ? `${benchmark.target.strategyName} (${benchmark.target.fileName})`
    : path.basename(options.targetPath);

  console.log(`Benchmarking ${targetLabel}`);
  console.log(`Against ${baselineCount} bundled baseline strateg${baselineCount === 1 ? 'y' : 'ies'} across ${benchmark.options.gameCount} games from a fixed ${benchmark.options.lineBankSize}-line bank.`);
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