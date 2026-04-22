# Destroy-Ball Strategy Kit

This is the public student repo for writing and testing `decide(context)` strategies for the current destroy-ball energy-allocation rules.

Edit the `startegy.js`, change its name to `(Last_name)_(First_name)_(Student_number).js` and submit.

## Quick start

```bash
npm install
npm run run
npm test
```

Edit `strategy.js`, then run the sample scenarios again.

To try an included example strategy:

```bash
npm run run -- examples/momentum-reader.js
```

## What your strategy receives

`decide(context)` gets:

```js
{
  roundNumber,
  line,
  lineScores,
  availableEnergy,
  player,
  players,
  history
}
```

Rules:

- return an `allocations` array with the same length as `line`
- every allocation must be a non-negative integer
- the total allocated energy cannot exceed `availableEnergy`
- all-zero allocations are legal and mean the strategy is saving energy

## Repository layout

- `strategy.js`
  - your editable starter strategy
- `examples/`
  - reference strategies you can read, run, copy, or remix
- `src/sample-contexts.js`
  - sample rounds used by the local runner and tests
- `src/strategy-sdk.js`
  - shared validation and execution helpers
- `scripts/run-strategy.js`
  - runs any strategy file against the sample contexts
- `test/strategy.test.js`
  - checks that `strategy.js` always returns legal allocations
- `test/example-strategies.test.js`
  - checks that every included example is also legal

## Included example strategies

- `examples/momentum-reader.js`
  - pressures strong scoring positions using table state and recent history
- `examples/risk-manager.js`
  - spends more aggressively when trailing the room
- `examples/same-hunter.js`
  - pushes compact high-value middle positions
