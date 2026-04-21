module.exports = {
  name: 'Same Hunter',
  description: 'Pressures compact middle positions when the top scores are close together.',
  decide(context) {
    const {
      line = [4, 2, 7, 3],
      lineScores = [16, 56, 42, 63],
      availableEnergy = 0
    } = context;

    const safeLine = Array.isArray(line) && line.length > 0 ? line : [4, 2, 7, 3];
    const safeScores = Array.isArray(lineScores) && lineScores.length === safeLine.length
      ? lineScores
      : safeLine.map(() => 1);
    const allocations = safeLine.map(() => 0);

    if (!Number.isInteger(availableEnergy) || availableEnergy <= 0) {
      return { allocations };
    }

    const rankedPositions = safeScores
      .map((score, index) => ({
        index,
        score
      }))
      .sort((left, right) => right.score - left.score || left.index - right.index);

    const topScore = rankedPositions[0].score;
    const closeLeaders = rankedPositions.filter((entry) => topScore - entry.score <= Math.max(3, Math.floor(topScore * 0.1)));
    const preferred = closeLeaders
      .slice()
      .sort((left, right) => {
        const leftDistance = Math.abs(left.index - (safeLine.length - 1) / 2);
        const rightDistance = Math.abs(right.index - (safeLine.length - 1) / 2);
        return leftDistance - rightDistance || left.index - right.index;
      });

    const primary = preferred[0] || rankedPositions[0];
    allocations[primary.index] = availableEnergy;

    return {
      allocations
    };
  }
};