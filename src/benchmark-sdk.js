const fs = require('fs');
const path = require('path');

const {
  normalizeStrategyModule,
  runStrategy
} = require('./strategy-sdk');

const DEFAULT_PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_TARGET_PATH = path.join(DEFAULT_PROJECT_ROOT, 'strategy.js');
const DEFAULT_BASELINES_DIRECTORY = path.join(DEFAULT_PROJECT_ROOT, 'examples');
const DEFAULT_STARTING_ENERGY = 5;
const DEFAULT_MAX_ENERGY = 8;
const DEFAULT_TIMER_SECONDS = 45;
const DEFAULT_MAX_ROUNDS = 60;
const DEFAULT_PASS_LIMIT = 12;
const HISTORY_LIMIT = 8;
const DEFAULT_BENCHMARK_LINES = Object.freeze([
  Object.freeze([5, 1, 4, 9]),
  Object.freeze([8, 2, 11, 6, 3]),
  Object.freeze([3, 10, 5, 7]),
  Object.freeze([12, 4, 9, 2, 14]),
  Object.freeze([6, 13, 3, 8, 2, 11]),
  Object.freeze([15, 4, 7, 10, 3, 12]),
  Object.freeze([9, 2, 14, 5, 11, 3, 8]),
  Object.freeze([4, 12, 6, 15, 3, 10, 2, 9]),
  Object.freeze([7, 1, 13, 5, 11, 4, 9, 2, 14]),
  Object.freeze([10, 3, 12, 6, 15, 4, 8, 2, 11, 5]),
  Object.freeze([14, 5, 9, 3, 12, 6, 15, 4, 10, 2, 13]),
  Object.freeze([8, 1, 11, 4, 14, 6, 9, 3, 12, 5, 15, 2])
]);

function clampInteger(value, minimum, maximum, fallback) {
  if (!Number.isFinite(Number(value))) {
    return fallback;
  }

  return Math.max(minimum, Math.min(maximum, Math.floor(Number(value))));
}

function roundPointsAmount(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Number(numericValue.toFixed(2));
}

function resolveUserPath(candidatePath, projectRoot) {
  if (!candidatePath) {
    return '';
  }

  return path.isAbsolute(candidatePath)
    ? path.resolve(candidatePath)
    : path.resolve(projectRoot, candidatePath);
}

function createDisplayFileName(absolutePath, projectRoot) {
  const relativePath = path.relative(projectRoot, absolutePath);
  const normalizedRelativePath = relativePath.replace(/\\/g, '/');

  if (normalizedRelativePath && !normalizedRelativePath.startsWith('..')) {
    return normalizedRelativePath;
  }

  return path.basename(absolutePath);
}

function validateBenchmarkLine(line, label = 'line') {
  if (!Array.isArray(line) || line.length < 4) {
    throw new RangeError(`${label} must contain at least 4 positive integers`);
  }

  return line.map((value, index) => {
    const normalized = Number(value);

    if (!Number.isInteger(normalized) || normalized <= 0) {
      throw new RangeError(`${label}[${index}] must be a positive integer`);
    }

    return normalized;
  });
}

function computeLineBaseScores(line) {
  if (!Array.isArray(line) || line.length < 4) {
    throw new RangeError('line must contain at least 4 balls');
  }

  return line.map((value, index) => {
    if (index === 0) {
      return value * line[1] * line[1];
    }

    if (index === line.length - 1) {
      return line[index - 1] * line[index - 1] * value;
    }

    return line[index - 1] * value * line[index + 1];
  });
}

function createEmptyAllocation(lineLength) {
  return Array.from({ length: lineLength }, () => 0);
}

function rankPointsLeaderboard(players) {
  const sorted = [...players]
    .map((player) => ({
      id: player.id,
      name: player.name,
      points: player.points,
      energy: player.energy
    }))
    .sort((left, right) => right.points - left.points || left.name.localeCompare(right.name));

  let lastPoints = null;
  let lastRank = 0;

  return sorted.map((player, index) => {
    if (player.points !== lastPoints) {
      lastPoints = player.points;
      lastRank = index + 1;
    }

    return Object.assign({}, player, { rank: lastRank });
  });
}

function countUntiedWinningSurvivingBallsByPlayerId(submissions, destroyedIndex) {
  const winsByPlayerId = new Map();

  if (!Array.isArray(submissions) || submissions.length === 0 || !Number.isInteger(destroyedIndex) || destroyedIndex < 0) {
    return winsByPlayerId;
  }

  const lineLength = submissions[0].allocations.length;

  for (let ballIndex = 0; ballIndex < lineLength; ballIndex += 1) {
    if (ballIndex === destroyedIndex) {
      continue;
    }

    let highestAllocation = 0;
    let winningPlayerId = null;
    let tied = false;

    submissions.forEach((submission) => {
      const allocation = Math.max(0, Math.floor(Number(submission.allocations[ballIndex]) || 0));

      if (allocation > highestAllocation) {
        highestAllocation = allocation;
        winningPlayerId = submission.playerId;
        tied = false;
        return;
      }

      if (allocation === highestAllocation && highestAllocation > 0) {
        tied = true;
      }
    });

    if (highestAllocation > 0 && !tied && winningPlayerId) {
      winsByPlayerId.set(winningPlayerId, (winsByPlayerId.get(winningPlayerId) || 0) + 1);
    }
  }

  return winsByPlayerId;
}

function resolveEnergyRound({ line, submissions }) {
  if (!Array.isArray(line) || line.length < 4) {
    throw new RangeError('line must contain at least 4 balls');
  }

  if (!Array.isArray(submissions) || submissions.length === 0) {
    throw new RangeError('submissions must be a non-empty array');
  }

  const lineScores = computeLineBaseScores(line);
  const energyTotals = line.map((_, index) => submissions.reduce((sum, submission) => sum + submission.allocations[index], 0));
  const highestTotal = energyTotals.reduce((maximum, value) => Math.max(maximum, value), 0);
  const destroyedIndex = highestTotal > 0
    ? energyTotals.findIndex((value) => value === highestTotal)
    : 0;
  const lineAfter = line.filter((_, index) => index !== destroyedIndex);

  return {
    roundType: 'destroy',
    didDestroy: true,
    lineBefore: [...line],
    lineAfter,
    energyTotals,
    totalEnergySpent: energyTotals.reduce((sum, value) => sum + value, 0),
    destroyedBall: {
      index: destroyedIndex,
      position: destroyedIndex + 1,
      value: line[destroyedIndex],
      baseScore: lineScores[destroyedIndex]
    }
  };
}

function settleEnergyRound({ players, submissions, resolution, maxEnergy, energyReward = 1 }) {
  const destroyedIndex = resolution.destroyedBall.index;
  const untiedSurvivingWinsByPlayerId = countUntiedWinningSurvivingBallsByPlayerId(submissions, destroyedIndex);

  const provisionalSettlements = players.map((player) => {
    const submission = submissions.find((entry) => entry.playerId === player.id) || {
      allocations: createEmptyAllocation(resolution.lineBefore.length),
      totalEnergy: 0
    };
    const spentOnDestroyedBall = submission.allocations[destroyedIndex] || 0;
    const returnedEnergy = submission.totalEnergy - spentOnDestroyedBall;
    const savedEnergy = player.energy - submission.totalEnergy;
    const untiedSurvivingWins = spentOnDestroyedBall === 0
      ? (untiedSurvivingWinsByPlayerId.get(player.id) || 0)
      : 0;
    const survivalMasterBonus = spentOnDestroyedBall === 0 ? untiedSurvivingWins : 0;
    const bonusEnergy = Math.max(0, Math.floor(Number(energyReward) || 0)) + survivalMasterBonus;
    const rawPointsAwarded = spentOnDestroyedBall * resolution.destroyedBall.baseScore;
    const unclampedEnergyAfter = player.energy - spentOnDestroyedBall + bonusEnergy;
    const energyAfter = Math.min(maxEnergy, unclampedEnergyAfter);

    return {
      playerId: player.id,
      playerName: player.name,
      allocations: [...submission.allocations],
      totalAllocated: submission.totalEnergy,
      spentOnDestroyedBall,
      returnedEnergy,
      savedEnergy,
      untiedSurvivingWins,
      survivalMasterBonus,
      bonusEnergy,
      pointsBefore: player.points,
      rawPointsAwarded,
      energyBefore: player.energy,
      energyAfter
    };
  });

  const highestRawPointsAwarded = provisionalSettlements.reduce(
    (maximumPoints, settlement) => Math.max(maximumPoints, settlement.rawPointsAwarded),
    0
  );
  const highestPointsTieCount = highestRawPointsAwarded > 0
    ? provisionalSettlements.filter((settlement) => settlement.rawPointsAwarded === highestRawPointsAwarded).length
    : 0;

  const settlements = provisionalSettlements.map((settlement) => {
    const shouldSplitTopPayout = highestPointsTieCount > 1
      && settlement.rawPointsAwarded === highestRawPointsAwarded;
    const pointsAwarded = shouldSplitTopPayout
      ? roundPointsAmount(settlement.rawPointsAwarded / highestPointsTieCount)
      : settlement.rawPointsAwarded;
    const pointsAfter = roundPointsAmount(settlement.pointsBefore + pointsAwarded);

    return Object.assign({}, settlement, {
      pointsAwarded,
      pointsAfter
    });
  });

  const settlementsByPlayerId = new Map(settlements.map((entry) => [entry.playerId, entry]));
  const updatedPlayers = players.map((player) => {
    const settlement = settlementsByPlayerId.get(player.id);

    return Object.assign({}, player, {
      points: settlement.pointsAfter,
      energy: settlement.energyAfter
    });
  });

  return {
    settlements,
    updatedPlayers
  };
}

function settleFinalThreeRound({ players, line }) {
  if (!Array.isArray(line) || line.length !== 3) {
    throw new RangeError('line must contain exactly 3 balls for the final round');
  }

  const baseScore = line[0] * line[1] * line[2];
  const settlements = players.map((player) => {
    const spentEnergy = player.energy;
    const pointsAwarded = spentEnergy * baseScore;

    return {
      playerId: player.id,
      playerName: player.name,
      automatic: true,
      spentEnergy,
      pointsBefore: player.points,
      pointsAwarded,
      pointsAfter: roundPointsAmount(player.points + pointsAwarded),
      energyBefore: player.energy,
      energyAfter: 0
    };
  });

  const settlementsByPlayerId = new Map(settlements.map((entry) => [entry.playerId, entry]));
  const updatedPlayers = players.map((player) => {
    const settlement = settlementsByPlayerId.get(player.id);

    return Object.assign({}, player, {
      points: settlement.pointsAfter,
      energy: 0
    });
  });

  return {
    line: [...line],
    baseScore,
    settlements,
    updatedPlayers
  };
}

function createHistoryEntry(roundNumber, resolution, autoFinal) {
  return {
    roundNumber,
    roundType: resolution.roundType,
    didDestroy: resolution.didDestroy,
    destroyedPosition: resolution.destroyedBall ? resolution.destroyedBall.position : null,
    destroyedValue: resolution.destroyedBall ? resolution.destroyedBall.value : null,
    baseScore: resolution.destroyedBall ? resolution.destroyedBall.baseScore : null,
    totalEnergySpent: resolution.totalEnergySpent,
    lineBefore: [...resolution.lineBefore],
    lineAfter: [...resolution.lineAfter],
    energyTotals: Array.isArray(resolution.energyTotals) ? [...resolution.energyTotals] : null,
    autoFinalBaseScore: autoFinal ? autoFinal.baseScore : null,
    didAutoFinal: Boolean(autoFinal)
  };
}

function loadFreshModule(filePath) {
  const resolvedPath = require.resolve(filePath);
  delete require.cache[resolvedPath];
  return require(resolvedPath);
}

function loadDefaultBaselinePaths(baselinesDirectory) {
  if (!fs.existsSync(baselinesDirectory)) {
    return [];
  }

  return fs.readdirSync(baselinesDirectory)
    .filter((fileName) => fileName.endsWith('.js'))
    .sort()
    .map((fileName) => path.join(baselinesDirectory, fileName));
}

function loadBenchmarkStrategies(options) {
  const targetPath = resolveUserPath(options.targetPath, options.projectRoot);
  const baselinePaths = Array.isArray(options.baselinePaths) && options.baselinePaths.length > 0
    ? options.baselinePaths.map((filePath) => resolveUserPath(filePath, options.projectRoot))
    : loadDefaultBaselinePaths(options.baselinesDirectory);
  const seenPaths = new Set();
  const allPaths = [targetPath, ...baselinePaths]
    .filter(Boolean)
    .filter((filePath) => {
      const key = path.resolve(filePath).toLowerCase();
      if (seenPaths.has(key)) {
        return false;
      }

      seenPaths.add(key);
      return true;
    });

  return allPaths.map((absolutePath) => {
    const rawStrategy = loadFreshModule(absolutePath);
    const normalized = normalizeStrategyModule(rawStrategy, {
      fileName: path.basename(absolutePath)
    });

    return {
      id: absolutePath,
      absolutePath,
      fileName: createDisplayFileName(absolutePath, options.projectRoot),
      name: normalized.name,
      description: normalized.description,
      decide: normalized.decide,
      isTarget: path.resolve(absolutePath).toLowerCase() === path.resolve(targetPath).toLowerCase()
    };
  });
}

function normalizeBenchmarkOptions(rawOptions = {}) {
  const projectRoot = rawOptions.projectRoot
    ? path.resolve(rawOptions.projectRoot)
    : DEFAULT_PROJECT_ROOT;
  const lines = Array.isArray(rawOptions.lines) && rawOptions.lines.length > 0
    ? rawOptions.lines.map((line, index) => validateBenchmarkLine(line, `lines[${index}]`))
    : DEFAULT_BENCHMARK_LINES.map((line, index) => validateBenchmarkLine(line, `defaultLines[${index}]`));
  const gameCount = clampInteger(rawOptions.gameCount, 1, 5000, lines.length);
  const startingEnergy = clampInteger(rawOptions.startingEnergy, 1, 99, DEFAULT_STARTING_ENERGY);
  const maxEnergy = clampInteger(rawOptions.maxEnergy, startingEnergy, 99, Math.max(DEFAULT_MAX_ENERGY, startingEnergy));
  const timerSeconds = clampInteger(rawOptions.timerSeconds, 1, 300, DEFAULT_TIMER_SECONDS);
  const maxRounds = clampInteger(rawOptions.maxRounds, 1, 5000, DEFAULT_MAX_ROUNDS);
  const passLimit = clampInteger(rawOptions.passLimit, 1, 100, DEFAULT_PASS_LIMIT);

  return {
    projectRoot,
    targetPath: rawOptions.targetPath || DEFAULT_TARGET_PATH,
    baselinesDirectory: rawOptions.baselinesDirectory
      ? resolveUserPath(rawOptions.baselinesDirectory, projectRoot)
      : DEFAULT_BASELINES_DIRECTORY,
    baselinePaths: Array.isArray(rawOptions.baselinePaths) ? [...rawOptions.baselinePaths] : [],
    lines,
    gameCount,
    startingEnergy,
    maxEnergy,
    timerSeconds,
    maxRounds,
    passLimit
  };
}

function createBenchmarkPlayers(strategies, startingEnergy) {
  return strategies.map((strategy) => ({
    id: strategy.id,
    name: strategy.name,
    fileName: strategy.fileName,
    points: 0,
    energy: startingEnergy,
    kind: 'cpu'
  }));
}

function createBenchmarkLine(options, gameIndex) {
  return [...options.lines[gameIndex % options.lines.length]];
}

function summarizeGame(leaderboard, runtimeErrors, gameIndex, roundCount, line, startingLine, completed, stalledReason) {
  return {
    gameNumber: gameIndex + 1,
    roundsPlayed: roundCount,
    completed,
    stalledReason: stalledReason || null,
    startingLine: [...startingLine],
    remainingLine: [...line],
    leaderboard: leaderboard.map((entry) => Object.assign({}, entry)),
    runtimeErrors: runtimeErrors.map((entry) => Object.assign({}, entry))
  };
}

function runBenchmarkGame(strategies, options, gameIndex) {
  let players = createBenchmarkPlayers(strategies, options.startingEnergy);
  let line = createBenchmarkLine(options, gameIndex);
  const startingLine = [...line];
  let history = [];
  let roundNumber = 1;
  let consecutivePasses = 0;
  const runtimeErrors = [];

  while (line.length > 0 && roundNumber <= options.maxRounds) {
    if (line.length === 3) {
      const finalSettlement = settleFinalThreeRound({ players, line });
      players = finalSettlement.updatedPlayers;
      line = [];
      history = [
        createHistoryEntry(roundNumber, {
          roundType: 'final',
          didDestroy: true,
          lineBefore: [...finalSettlement.line],
          lineAfter: [],
          energyTotals: null,
          totalEnergySpent: null,
          destroyedBall: {
            position: 2,
            value: finalSettlement.line[1],
            baseScore: finalSettlement.baseScore
          }
        }, {
          baseScore: finalSettlement.baseScore
        }),
        ...history
      ].slice(0, HISTORY_LIMIT);
      break;
    }

    const lineScores = computeLineBaseScores(line);
    const submissions = players.map((player, index) => {
      const strategy = strategies[index];
      let allocations = createEmptyAllocation(line.length);

      try {
        const decision = runStrategy(strategy, {
          roundNumber,
          line: [...line],
          lineScores: [...lineScores],
          availableEnergy: player.energy,
          maxEnergy: options.maxEnergy,
          timerSeconds: options.timerSeconds,
          roomMode: 'benchmark',
          player: {
            id: player.id,
            name: player.name,
            points: player.points,
            energy: player.energy,
            kind: player.kind,
            strategyFile: player.fileName
          },
          players: players.map((entry) => ({
            id: entry.id,
            name: entry.name,
            points: entry.points,
            energy: entry.energy,
            kind: entry.kind,
            strategyFile: entry.fileName
          })),
          history: history.map((entry) => Object.assign({}, entry))
        }, {
          fileName: strategy.fileName
        });

        allocations = decision.allocations;
      } catch (error) {
        runtimeErrors.push({
          gameNumber: gameIndex + 1,
          roundNumber,
          fileName: strategy.fileName,
          strategyName: strategy.name,
          message: error.message
        });
      }

      return {
        playerId: player.id,
        playerName: player.name,
        allocations,
        totalEnergy: allocations.reduce((sum, value) => sum + value, 0)
      };
    });

    const resolution = resolveEnergyRound({
      line,
      submissions
    });
    const settlement = settleEnergyRound({
      players,
      submissions,
      resolution,
      energyReward: 1,
      maxEnergy: options.maxEnergy
    });

    players = settlement.updatedPlayers;
    line = [...resolution.lineAfter];

    let autoFinal = null;
    if (resolution.didDestroy && line.length === 3) {
      const finalSettlement = settleFinalThreeRound({ players, line });
      players = finalSettlement.updatedPlayers;
      autoFinal = {
        line: [...line],
        baseScore: finalSettlement.baseScore
      };
      line = [];
    }

    history = [
      createHistoryEntry(roundNumber, resolution, autoFinal),
      ...history
    ].slice(0, HISTORY_LIMIT);

    consecutivePasses = resolution.totalEnergySpent === 0 ? consecutivePasses + 1 : 0;
    if (consecutivePasses >= options.passLimit) {
      const leaderboard = rankPointsLeaderboard(players);
      return summarizeGame(leaderboard, runtimeErrors, gameIndex, roundNumber, line, startingLine, false, 'pass-limit');
    }

    roundNumber += 1;
  }

  const completed = line.length === 0;
  const leaderboard = rankPointsLeaderboard(players);
  const stalledReason = completed ? null : 'max-rounds';

  return summarizeGame(leaderboard, runtimeErrors, gameIndex, roundNumber - 1, line, startingLine, completed, stalledReason);
}

function createStandingAccumulator(strategy) {
  return {
    id: strategy.id,
    fileName: strategy.fileName,
    strategyName: strategy.name,
    isTarget: strategy.isTarget,
    gamesPlayed: 0,
    completedGames: 0,
    stalledGames: 0,
    wins: 0,
    podiums: 0,
    totalPoints: 0,
    totalEnergy: 0,
    totalRank: 0,
    runtimeErrors: 0
  };
}

function finalizeStanding(entry) {
  return Object.assign({}, entry, {
    averagePoints: entry.gamesPlayed === 0 ? 0 : Number((entry.totalPoints / entry.gamesPlayed).toFixed(2)),
    averageEnergy: entry.gamesPlayed === 0 ? 0 : Number((entry.totalEnergy / entry.gamesPlayed).toFixed(2)),
    averageRank: entry.gamesPlayed === 0 ? 0 : Number((entry.totalRank / entry.gamesPlayed).toFixed(2)),
    winRate: entry.gamesPlayed === 0 ? 0 : Number(((entry.wins / entry.gamesPlayed) * 100).toFixed(1))
  });
}

function runStrategyBenchmark(rawOptions = {}) {
  const options = normalizeBenchmarkOptions(rawOptions);
  const strategies = loadBenchmarkStrategies(options);

  if (strategies.length < 2) {
    throw new Error('Benchmark needs at least 2 strategies. Add a baseline or keep the bundled examples folder.');
  }

  const standingsById = new Map(strategies.map((strategy) => [strategy.id, createStandingAccumulator(strategy)]));
  const games = [];

  for (let gameIndex = 0; gameIndex < options.gameCount; gameIndex += 1) {
    const game = runBenchmarkGame(strategies, options, gameIndex);
    games.push(game);

    game.leaderboard.forEach((entry) => {
      const standing = standingsById.get(entry.id);
      if (!standing) {
        return;
      }

      standing.gamesPlayed += 1;
      standing.totalPoints += entry.points;
      standing.totalEnergy += entry.energy;
      standing.totalRank += entry.rank;
      standing.wins += entry.rank === 1 ? 1 : 0;
      standing.podiums += entry.rank <= Math.min(3, strategies.length) ? 1 : 0;
      standing.completedGames += game.completed ? 1 : 0;
      standing.stalledGames += game.completed ? 0 : 1;
    });

    game.runtimeErrors.forEach((error) => {
      const standing = Array.from(standingsById.values()).find((entry) => entry.fileName === error.fileName);
      if (standing) {
        standing.runtimeErrors += 1;
      }
    });
  }

  const standings = Array.from(standingsById.values())
    .map((entry) => finalizeStanding(entry))
    .sort((left, right) => {
      return right.wins - left.wins
        || left.averageRank - right.averageRank
        || right.averagePoints - left.averagePoints
        || left.runtimeErrors - right.runtimeErrors
        || left.strategyName.localeCompare(right.strategyName);
    });
  const targetStanding = standings.find((entry) => entry.isTarget) || null;
  const targetPlacement = targetStanding ? standings.findIndex((entry) => entry.id === targetStanding.id) + 1 : null;

  return {
    generatedAt: new Date().toISOString(),
    target: targetStanding
      ? {
          fileName: targetStanding.fileName,
          strategyName: targetStanding.strategyName,
          placement: targetPlacement
        }
      : null,
    options: {
      gameCount: options.gameCount,
      lineBankSize: options.lines.length,
      startingEnergy: options.startingEnergy,
      maxEnergy: options.maxEnergy,
      timerSeconds: options.timerSeconds,
      maxRounds: options.maxRounds,
      passLimit: options.passLimit
    },
    strategies: strategies.map((strategy) => ({
      fileName: strategy.fileName,
      strategyName: strategy.name,
      isTarget: strategy.isTarget
    })),
    standings,
    games
  };
}

module.exports = {
  DEFAULT_BENCHMARK_LINES,
  runStrategyBenchmark
};