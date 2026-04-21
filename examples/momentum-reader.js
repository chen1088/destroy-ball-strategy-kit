function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function hashString(input) {
  let total = 0;

  for (const character of String(input || '')) {
    total += character.charCodeAt(0);
  }

  return total;
}

module.exports = {
  name: 'Momentum Reader',
  description: 'Uses line scores, available energy, player standing, and recent history to pressure key balls.',
  decide(context) {
    const {
      roundNumber = 1,
      line = [4, 2, 7, 3],
      lineScores = [16, 56, 42, 63],
      availableEnergy = 0,
      player = {},
      players = [],
      history = []
    } = context;

    const safeLine = Array.isArray(line) && line.length > 0 ? line : [4, 2, 7, 3];
    const safeScores = Array.isArray(lineScores) && lineScores.length === safeLine.length
      ? lineScores
      : safeLine.map(() => 1);
    const roster = Array.isArray(players) ? players : [];
    const recentHistory = Array.isArray(history) ? history.slice(0, 3) : [];
    const allocations = safeLine.map(() => 0);

    if (!Number.isInteger(availableEnergy) || availableEnergy <= 0) {
      return { allocations };
    }

    const playerSeed = hashString(player.id || player.name || 'cpu');
    const averagePoints = roster.length === 0
      ? player.points || 0
      : roster.reduce((sum, entry) => sum + (entry.points || 0), 0) / roster.length;
    const trailingTable = (player.points || 0) < averagePoints;
    const recentlyPassing = recentHistory.every((entry) => entry && entry.didDestroy === false);
    const scoredPositions = safeScores
      .map((score, index) => ({
        index,
        score,
        value: safeLine[index]
      }))
      .sort((left, right) => right.score - left.score || right.value - left.value || left.index - right.index);

    const best = scoredPositions[0];
    const second = scoredPositions[1] || best;
    const wantsPressure = trailingTable || recentlyPassing || (roundNumber + playerSeed) % 3 === 0;
    const bestSpend = wantsPressure
      ? availableEnergy
      : clamp(Math.ceil(availableEnergy / 2), 1, availableEnergy);

    allocations[best.index] = bestSpend;

    const remainingEnergy = availableEnergy - bestSpend;
    if (remainingEnergy > 0 && second.index !== best.index) {
      allocations[second.index] = remainingEnergy;
    }

    return {
      allocations
    };
  }
};