module.exports = [
  {
    name: 'Opening round with no history',
    context: {
      roundNumber: 1,
      line: [5, 1, 4, 9],
      lineScores: [25, 20, 36, 81],
      availableEnergy: 5,
      maxEnergy: 8,
      player: {
        id: 'student-01',
        name: 'Student 01',
        points: 0,
        energy: 5,
        kind: 'cpu'
      },
      players: [
        { id: 'student-01', name: 'Student 01', points: 0, energy: 5, kind: 'cpu' },
        { id: 'student-02', name: 'Student 02', points: 0, energy: 5, kind: 'human' },
        { id: 'student-03', name: 'Student 03', points: 0, energy: 5, kind: 'human' }
      ],
      history: []
    }
  },
  {
    name: 'Pressure round after repeated passes',
    context: {
      roundNumber: 4,
      line: [8, 2, 11, 6, 3],
      lineScores: [32, 176, 132, 198, 54],
      availableEnergy: 4,
      maxEnergy: 8,
      player: {
        id: 'student-01',
        name: 'Student 01',
        points: 18,
        energy: 4,
        kind: 'cpu'
      },
      players: [
        { id: 'student-01', name: 'Student 01', points: 18, energy: 4, kind: 'cpu' },
        { id: 'student-02', name: 'Student 02', points: 25, energy: 5, kind: 'human' },
        { id: 'student-03', name: 'Student 03', points: 22, energy: 4, kind: 'human' }
      ],
      history: [
        { roundNumber: 3, didDestroy: false },
        { roundNumber: 2, didDestroy: false }
      ]
    }
  },
  {
    name: 'Late round with limited energy',
    context: {
      roundNumber: 7,
      line: [3, 10, 5, 7],
      lineScores: [300, 150, 350, 245],
      availableEnergy: 2,
      maxEnergy: 8,
      player: {
        id: 'student-01',
        name: 'Student 01',
        points: 64,
        energy: 2,
        kind: 'cpu'
      },
      players: [
        { id: 'student-01', name: 'Student 01', points: 64, energy: 2, kind: 'cpu' },
        { id: 'student-02', name: 'Student 02', points: 77, energy: 3, kind: 'human' },
        { id: 'student-03', name: 'Student 03', points: 52, energy: 1, kind: 'human' },
        { id: 'student-04', name: 'Student 04', points: 61, energy: 2, kind: 'human' }
      ],
      history: [
        { roundNumber: 6, didDestroy: true },
        { roundNumber: 5, didDestroy: true },
        { roundNumber: 4, didDestroy: false }
      ]
    }
  }
];