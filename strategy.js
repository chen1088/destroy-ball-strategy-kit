module.exports = {
  name: 'Balanced Starter',
  description: 'Targets the best base score and spreads any leftover energy to the runner-up.',
  decide(context) {
    const {
      line = [1, 2, 3, 4],
      lineScores = [1, 1, 1, 1],
      availableEnergy = 0,
      player = {},
      players = []
    } = context;

    const safeLine = Array.isArray(line) && line.length > 0 ? line : [1, 2, 3, 4];
    const safeScores = Array.isArray(lineScores) && lineScores.length === safeLine.length
      ? lineScores
      : safeLine.map(() => 1);
    const allocations = safeLine.map(() => 0);

    if (!Number.isInteger(availableEnergy) || availableEnergy <= 0) {
      return { allocations };
    }

    const averagePoints = players.length === 0
      ? player.points || 0
      : players.reduce((sum, entry) => sum + (entry.points || 0), 0) / players.length;
    const trailingTable = (player.points || 0) < averagePoints;
    const rankedPositions = safeScores
      .map((score, index) => ({
        index,
        score,
        value: safeLine[index]
      }))
      .sort((left, right) => right.score - left.score || right.value - left.value || left.index - right.index);

    const primary = rankedPositions[0];
    const secondary = rankedPositions[1] || primary;
    const primarySpend = trailingTable
      ? availableEnergy
      : Math.max(1, Math.ceil(availableEnergy / 2));

    allocations[primary.index] = primarySpend;

    const remainingEnergy = availableEnergy - primarySpend;
    if (remainingEnergy > 0 && secondary.index !== primary.index) {
      allocations[secondary.index] = remainingEnergy;
    }

    return {
      allocations
    };
  }
};