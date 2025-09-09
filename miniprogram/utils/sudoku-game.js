// 数独游戏模型类
class SudokuGame {
  constructor({
    board = [],
    isFixed = [],
    notes = [],
    difficulty = '1级',
    gridSize = 9,
    secondsElapsed = 0,
    isCompleted = false,
    startTime = new Date(),
    checkCount = 0,
    hintCount = 0
  }) {
    this.board = board;
    this.isFixed = isFixed;
    this.notes = notes.length > 0 ? notes : this.createEmptyNotes(gridSize);
    this.difficulty = difficulty;
    this.gridSize = gridSize;
    this.secondsElapsed = secondsElapsed;
    this.isCompleted = isCompleted;
    this.startTime = startTime;
    this.checkCount = checkCount;
    this.hintCount = hintCount;
  }

  // 创建空的备注数组
  createEmptyNotes(size) {
    return Array(size).fill(null).map(() => 
      Array(size).fill(null).map(() => new Set())
    );
  }

  copyWith({
    board,
    isFixed,
    notes,
    difficulty,
    gridSize,
    secondsElapsed,
    isCompleted,
    startTime,
    checkCount,
    hintCount
  }) {
    return new SudokuGame({
      board: board || this.board.map(row => [...row]),
      isFixed: isFixed || this.isFixed.map(row => [...row]),
      notes: notes || this.notes.map(row => row.map(cell => new Set(cell))),
      difficulty: difficulty || this.difficulty,
      gridSize: gridSize !== undefined ? gridSize : this.gridSize,
      secondsElapsed: secondsElapsed !== undefined ? secondsElapsed : this.secondsElapsed,
      isCompleted: isCompleted !== undefined ? isCompleted : this.isCompleted,
      startTime: startTime || this.startTime,
      checkCount: checkCount !== undefined ? checkCount : this.checkCount,
      hintCount: hintCount !== undefined ? hintCount : this.hintCount
    });
  }

  toJson() {
    return {
      board: this.board,
      isFixed: this.isFixed,
      notes: this.notes.map(row => row.map(cell => Array.from(cell))),
      difficulty: this.difficulty,
      gridSize: this.gridSize,
      secondsElapsed: this.secondsElapsed,
      isCompleted: this.isCompleted,
      startTime: this.startTime.toISOString(),
      checkCount: this.checkCount,
      hintCount: this.hintCount
    };
  }

  static fromJson(json) {
    return new SudokuGame({
      board: json.board.map(row => [...row]),
      isFixed: json.isFixed.map(row => [...row]),
      notes: json.notes ? json.notes.map(row => row.map(cell => new Set(cell))) : [],
      difficulty: json.difficulty,
      gridSize: json.gridSize || 9,
      secondsElapsed: json.secondsElapsed || 0,
      isCompleted: json.isCompleted || false,
      startTime: new Date(json.startTime),
      checkCount: json.checkCount || 0,
      hintCount: json.hintCount || 0
    });
  }
}

// 游戏难度枚举
const GameDifficulty = {
  level1: { 
    displayName: '1级', 
    gridSize: 4, 
    numberRange: 4, 
    initialClues: 8, 
    checkLimit: 5, 
    hintLimit: 3 
  },
  level2: { 
    displayName: '2级', 
    gridSize: 4, 
    numberRange: 4, 
    initialClues: 5, 
    checkLimit: 5, 
    hintLimit: 3 
  },
  level3: { 
    displayName: '3级', 
    gridSize: 6, 
    numberRange: 6, 
    initialClues: 16, 
    checkLimit: 5, 
    hintLimit: 3 
  },
  level4: { 
    displayName: '4级', 
    gridSize: 6, 
    numberRange: 6, 
    initialClues: 12, 
    checkLimit: 5, 
    hintLimit: 3 
  },
  level5: { 
    displayName: '5级', 
    gridSize: 9, 
    numberRange: 9, 
    initialClues: 45, 
    checkLimit: 5, 
    hintLimit: 3 
  },
  level6: { 
    displayName: '6级', 
    gridSize: 9, 
    numberRange: 9, 
    initialClues: 40, 
    checkLimit: 5, 
    hintLimit: 2 
  },
  level7: { 
    displayName: '7级', 
    gridSize: 9, 
    numberRange: 9, 
    initialClues: 35, 
    checkLimit: 3, 
    hintLimit: 1 
  },
  level8: { 
    displayName: '8级', 
    gridSize: 9, 
    numberRange: 9, 
    initialClues: 30, 
    checkLimit: 3, 
    hintLimit: 1 
  },
  level9: { 
    displayName: '9级', 
    gridSize: 9, 
    numberRange: 9, 
    initialClues: 25, 
    checkLimit: 1, 
    hintLimit: 0 
  }
};

// 获取难度枚举列表
const getDifficultyValues = () => {
  return Object.values(GameDifficulty);
};

// 根据难度名称获取难度对象
const getDifficultyFromName = (difficultyName) => {
  return Object.values(GameDifficulty).find(d => d.displayName === difficultyName);
};

// 导出模块
module.exports = {
  SudokuGame,
  GameDifficulty,
  getDifficultyValues,
  getDifficultyFromName
};