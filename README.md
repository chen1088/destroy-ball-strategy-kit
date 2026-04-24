# Destroy-Ball Strategy Kit

This is the public student repo for writing and testing `decide(context)` strategies for the current destroy-ball energy-allocation rules.

Edit `strategy.js` while you are developing locally. When you are ready to submit, copy or rename your final file to `(Last_name)_(First_name)_(Student_number).js`.

## Quick start

```bash
npm install
npm run run
npm test
```

Edit `strategy.js`, then run the sample scenarios again.

Keep the local working file named `strategy.js` if you want `npm run run` and `npm test` to keep using the default starter path.

To try an included example strategy:

```bash
npm run run -- examples/momentum-reader.js
```

## What your strategy receives

`decide(context)` gets an object with this shape:

```js
{
  roundNumber: 4,                // integer, starts at 1
  line: [8, 2, 11, 6, 3],        // number[]
  lineScores: [32, 176, 132, 198, 54], // number[], same length as line
  availableEnergy: 4,            // integer >= 0
  timerSeconds: 45,              // optional in local sample contexts
  roomMode: 'classroom',         // optional in local sample contexts: 'classroom' | 'normal'
  player: {
    id: 'cpu-1',                 // string
    name: 'Pressure Popper',     // string
    points: 18,                  // number
    energy: 4,                   // integer >= 0
    kind: 'cpu',                 // 'cpu' | 'human'
    strategyId: 'momentum-reader',      // optional: string | null
    strategyName: 'Momentum Reader',    // optional: string | null
    strategyFile: 'momentum-reader.js'  // optional: string | null
  },
  players: [
    {
      id: 'cpu-1',
      name: 'Pressure Popper',
      points: 18,
      energy: 4,
      kind: 'cpu',
      strategyId: 'momentum-reader',
      strategyName: 'Momentum Reader',
      strategyFile: 'momentum-reader.js'
    }
  ],
  history: [
    {
      roundNumber: 3,            // integer, newest round first
      roundType: 'destroy',      // 'destroy' | 'final'
      didDestroy: true,          // boolean
      destroyedPosition: 2,      // integer | null, 1-based
      destroyedValue: 11,        // integer | null
      baseScore: 176,            // number | null
      totalEnergySpent: 6,       // integer
      lineBefore: [8, 2, 11, 6, 3],
      lineAfter: [8, 2, 6, 3],
      energyTotals: [0, 1, 4, 1, 0], // number[] | null
      autoFinalBaseScore: null,  // number | null
      didAutoFinal: false        // boolean
    }
  ]
}
```

Field notes:

- `roundNumber` is 1-based.
- `line[i]` and `lineScores[i]` describe the same ball position.
- `availableEnergy` is the maximum total energy your strategy may spend this round. In live games it matches `player.energy`.
- `player` is the current strategy's own player snapshot.
- `players` is the full room roster, including the current player.
- `history` is ordered newest first.
- The local examples in `src/sample-contexts.js` use the core fields only. Live game contexts also include `timerSeconds`, `roomMode`, full `history` entries, and CPU strategy metadata fields.
- Your strategy should read only the fields it needs and tolerate extra fields being added later.

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
