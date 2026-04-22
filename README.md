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

## Game rules

Each game starts with a line of balls. Duplicate values are allowed.

Round flow while at least `4` balls remain:

1. Every player chooses how to distribute integer energy across the current line.
2. The ball with the highest total allocated energy is destroyed.
3. If multiple balls tie for the highest positive total energy, the leftmost tied ball is destroyed.
4. If everyone allocates `0`, the leftmost ball is destroyed by default.
5. Energy placed on the destroyed ball is consumed.
6. Energy placed on surviving balls is returned to the player.
7. Whenever a ball is destroyed, every player gains `+1` energy after recycling.

Scoring:

- If a middle ball is destroyed, its base score is `left x middle x right`.
- If the first ball is destroyed, its base score is `self x right x right`.
- If the last ball is destroyed, its base score is `left x left x self`.
- A player's raw round points are `baseScore x energyPlacedOnDestroyedBall`.
- If multiple players tie for the highest raw round points in that round, only those tied top scorers split that top payout evenly among themselves.
- Players below the top raw round score keep their full raw round points.

Endgame:

- When exactly `3` balls remain, the game automatically ends with a final scoring step.
- In that final step, every player spends all remaining energy.
- The final base score is the product of the three remaining ball values.

Starting state:

- Players start with `0` points and `5` energy.
- `lineScores` in the strategy context already gives the current base score for each ball.

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
