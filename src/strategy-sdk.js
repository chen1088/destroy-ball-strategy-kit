const DEFAULT_STRATEGY_ID = 'strategy';

function createStrategyIdFromFileName(fileName = '') {
  const normalizedFileName = typeof fileName === 'string' ? fileName.trim() : '';
  const withoutExtension = normalizedFileName.replace(/\.js$/i, '');
  const compact = withoutExtension
    .replace(/[^\w-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return compact || DEFAULT_STRATEGY_ID;
}

function createStrategyNameFromId(id) {
  return id
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase()) || 'Strategy';
}

function normalizeStrategyModule(strategyLike, { fileName } = {}) {
  let candidate = strategyLike;

  if (candidate && typeof candidate === 'object' && !Array.isArray(candidate) && !candidate.decide && candidate.default) {
    candidate = candidate.default;
  }

  if (typeof candidate === 'function') {
    candidate = { decide: candidate };
  }

  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new TypeError('strategy must export an object or function');
  }

  const fallbackId = createStrategyIdFromFileName(fileName);
  const decide = typeof candidate.decide === 'function' ? candidate.decide : null;

  if (!decide) {
    throw new TypeError('strategy.decide must be a function');
  }

  return {
    id: typeof candidate.id === 'string' && candidate.id.trim() !== '' ? candidate.id.trim() : fallbackId,
    name: typeof candidate.name === 'string' && candidate.name.trim() !== '' ? candidate.name.trim() : createStrategyNameFromId(fallbackId),
    description: typeof candidate.description === 'string' ? candidate.description.trim() : '',
    decide
  };
}

function normalizeDecisionAllocations(decision) {
  if (Array.isArray(decision)) {
    return decision;
  }

  if (decision && typeof decision === 'object' && Array.isArray(decision.allocations)) {
    return decision.allocations;
  }

  throw new TypeError('strategy decision must provide an allocations array');
}

function validateStrategyDecision(decision, { lineLength = 4, availableEnergy } = {}) {
  const allocations = normalizeDecisionAllocations(decision);

  if (allocations.length !== lineLength) {
    throw new RangeError(`strategy decision allocations must contain exactly ${lineLength} entries`);
  }

  const normalizedAllocations = allocations.map((value) => {
    if (!Number.isInteger(value) || value < 0) {
      throw new RangeError('strategy decision allocations must be non-negative integers');
    }

    return value;
  });

  const totalAllocated = normalizedAllocations.reduce((sum, value) => sum + value, 0);

  if (availableEnergy != null) {
    if (!Number.isInteger(availableEnergy) || availableEnergy < 0) {
      throw new RangeError('availableEnergy must be a non-negative integer when provided');
    }

    if (totalAllocated > availableEnergy) {
      throw new RangeError('strategy decision allocations cannot exceed availableEnergy');
    }
  }

  return {
    allocations: normalizedAllocations
  };
}

function runStrategy(strategyLike, context = {}, options = {}) {
  const normalizedStrategy = normalizeStrategyModule(strategyLike, {
    fileName: options.fileName || context.strategyFileName
  });
  const line = Array.isArray(context.line) ? context.line : [];
  const lineLength = line.length > 0 ? line.length : 4;
  const availableEnergy = context.availableEnergy == null ? null : context.availableEnergy;
  const decision = normalizedStrategy.decide(Object.assign({}, context));

  return validateStrategyDecision(decision, {
    lineLength,
    availableEnergy
  });
}

module.exports = {
  createStrategyIdFromFileName,
  createStrategyNameFromId,
  normalizeStrategyModule,
  validateStrategyDecision,
  runStrategy
};