const { SudokuGame, GameDifficulty, getDifficultyFromName } = require('./sudoku-game.js');

// 格子难度分析类
class CellDifficulty {
  constructor({ row, col, validNumbers, constraintLevel, hasHiddenSingle }) {
    this.row = row;
    this.col = col;
    this.validNumbers = validNumbers;
    this.constraintLevel = constraintLevel;
    this.hasHiddenSingle = hasHiddenSingle;
    this.easyScore = this.calculateEasyScore();
  }

  calculateEasyScore() {
    let score = 0;
    const validCount = this.validNumbers.length;
    
    // 可选数字越少分数越高
    if (validCount === 1) {
      score += 1000;
    } else if (validCount === 2) {
      score += 100;
    } else if (validCount === 3) {
      score += 10;
    } else {
      score += 1;
    }
    
    // 约束越多分数越高
    score += this.constraintLevel * 2;
    
    // 隐藏单候选数加分
    if (this.hasHiddenSingle) score += 50;
    
    return score;
  }
}

class SudokuService {
  // 创建新的数独游戏
  static createNewGame(difficulty) {
    const result = this.generateSudokuBoard(difficulty);
    
    return new SudokuGame({
      board: result.board,
      isFixed: result.isFixed,
      difficulty: difficulty.displayName,
      gridSize: difficulty.gridSize,
      checkCount: difficulty.checkLimit,
      hintCount: difficulty.hintLimit
    });
  }

  // 验证数字是否可以放置在指定位置
  static isValidMove(game, row, col, number) {
    if (game.isFixed[row][col]) return false;
    
    const difficulty = getDifficultyFromName(game.difficulty);
    const maxNumber = difficulty ? difficulty.numberRange : 9;
    
    if (number < 1 || number > maxNumber) return false;

    return this.isValidPlacement(game.board, row, col, number, game.gridSize);
  }

  // 检查数字放置是否有效
  static isValidPlacement(board, row, col, number, gridSize) {
    // 检查行
    for (let c = 0; c < gridSize; c++) {
      if (c !== col && board[row][c] === number) {
        return false;
      }
    }

    // 检查列
    for (let r = 0; r < gridSize; r++) {
      if (r !== row && board[r][col] === number) {
        return false;
      }
    }

    // 检查子区域
    const subRegionPositions = this.getSubRegionPositions(row, col, gridSize);
    for (const pos of subRegionPositions) {
      const [r, c] = pos;
      if ((r !== row || c !== col) && board[r][c] === number) {
        return false;
      }
    }

    return true;
  }

  // 放置数字
  static placeNumber(game, row, col, number) {
    if (game.isFixed[row][col]) return game;

    const newBoard = game.board.map(row => [...row]);

    if (newBoard[row][col] === number) {
      // 如果点击相同数字，则清除
      newBoard[row][col] = 0;
    } else {
      // 直接放置数字，不再验证或计数错误
      newBoard[row][col] = number;
    }

    return game.copyWith({ board: newBoard });
  }

  // 擦除单元格
  static eraseCell(game, row, col) {
    if (game.isFixed[row][col]) return game;

    const newBoard = game.board.map(row => [...row]);
    newBoard[row][col] = 0;

    return game.copyWith({ board: newBoard });
  }

  // 检查数字在当前位置是否有冲突
  static hasConflict(game, row, col) {
    const number = game.board[row][col];
    if (number === 0) return false;
    
    const conflictPositions = this.findConflictingPositions(game, row, col, number);
    return conflictPositions.length > 0;
  }

  // 查找与指定位置数字冲突的其他位置
  static findConflictingPositions(game, row, col, number) {
    const conflicts = [];
    const gridSize = game.gridSize;
    
    // 检查同行
    for (let c = 0; c < gridSize; c++) {
      if (c !== col && game.board[row][c] === number) {
        conflicts.push([row, c]);
      }
    }
    
    // 检查同列
    for (let r = 0; r < gridSize; r++) {
      if (r !== row && game.board[r][col] === number) {
        conflicts.push([r, col]);
      }
    }
    
    // 检查同子区域
    const subRegionPositions = this.getSubRegionPositions(row, col, gridSize);
    for (const pos of subRegionPositions) {
      const [r, c] = pos;
      if ((r !== row || c !== col) && game.board[r][c] === number) {
        conflicts.push([r, c]);
      }
    }
    
    return conflicts;
  }

  // 获取指定位置所在子区域的所有位置
  static getSubRegionPositions(row, col, gridSize) {
    const positions = [];
    
    switch (gridSize) {
      case 4: {
        const subGridRow = Math.floor(row / 2) * 2;
        const subGridCol = Math.floor(col / 2) * 2;
        for (let r = subGridRow; r < subGridRow + 2; r++) {
          for (let c = subGridCol; c < subGridCol + 2; c++) {
            positions.push([r, c]);
          }
        }
        break;
      }
      case 6: {
        const subGridRow = Math.floor(row / 2) * 2;
        const subGridCol = Math.floor(col / 3) * 3;
        for (let r = subGridRow; r < subGridRow + 2; r++) {
          for (let c = subGridCol; c < subGridCol + 3; c++) {
            positions.push([r, c]);
          }
        }
        break;
      }
      case 9:
      default: {
        const subGridRow = Math.floor(row / 3) * 3;
        const subGridCol = Math.floor(col / 3) * 3;
        for (let r = subGridRow; r < subGridRow + 3; r++) {
          for (let c = subGridCol; c < subGridCol + 3; c++) {
            positions.push([r, c]);
          }
        }
        break;
      }
    }
    
    return positions;
  }

  // 检查游戏是否完成
  static isGameComplete(game) {
    const gridSize = game.gridSize;
    // 检查是否所有单元格都已填充
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (game.board[row][col] === 0) return false;
      }
    }

    // 验证数独规则
    return this.isValidSudoku(game.board, gridSize);
  }

  // 智能选择最容易解决的空白格子
  static getSmartHint(game) {
    const candidates = [];
    
    // 分析所有空白格子
    for (let row = 0; row < game.gridSize; row++) {
      for (let col = 0; col < game.gridSize; col++) {
        if (game.board[row][col] === 0 && !game.isFixed[row][col]) {
          const validNumbers = this.getValidNumbers(game, row, col);
          if (validNumbers.length > 0) {
            const constraints = this.getConstraintLevel(game, row, col);
            const hasHiddenSingle = this.hasHiddenSingle(game, row, col, validNumbers);
            
            candidates.push(new CellDifficulty({
              row,
              col,
              validNumbers,
              constraintLevel: constraints,
              hasHiddenSingle
            }));
          }
        }
      }
    }
    
    if (candidates.length === 0) return null;
    
    // 按容易程度排序，选择最容易的
    candidates.sort((a, b) => b.easyScore - a.easyScore);
    const best = candidates[0];
    
    return {
      row: best.row,
      col: best.col,
      validCount: best.validNumbers.length
    };
  }

  // 获取指定位置的有效数字
  static getValidNumbers(game, row, col) {
    const validNumbers = [];
    const difficulty = getDifficultyFromName(game.difficulty);
    const maxNumber = difficulty ? difficulty.numberRange : 9;
    
    for (let number = 1; number <= maxNumber; number++) {
      if (this.isValidMove(game, row, col, number)) {
        validNumbers.push(number);
      }
    }
    
    return validNumbers;
  }

  // 计算格子的约束强度
  static getConstraintLevel(game, row, col) {
    let constraints = 0;
    
    // 同行已填数字数量
    for (let c = 0; c < game.gridSize; c++) {
      if (game.board[row][c] !== 0) constraints++;
    }
    
    // 同列已填数字数量
    for (let r = 0; r < game.gridSize; r++) {
      if (game.board[r][col] !== 0) constraints++;
    }
    
    // 同子区域已填数字数量
    const subRegion = this.getSubRegionPositions(row, col, game.gridSize);
    for (const pos of subRegion) {
      if (game.board[pos[0]][pos[1]] !== 0) constraints++;
    }
    
    return constraints;
  }

  // 检查是否有隐藏单候选数
  static hasHiddenSingle(game, row, col, validNumbers) {
    for (const number of validNumbers) {
      if (this.isHiddenSingleInRow(game, row, col, number) ||
          this.isHiddenSingleInCol(game, row, col, number) ||
          this.isHiddenSingleInRegion(game, row, col, number)) {
        return true;
      }
    }
    return false;
  }

  // 检查在同行中是否为隐藏单候选数
  static isHiddenSingleInRow(game, row, col, number) {
    for (let c = 0; c < game.gridSize; c++) {
      if (c !== col && game.board[row][c] === 0) {
        if (this.isValidMove(game, row, c, number)) {
          return false;
        }
      }
    }
    return true;
  }

  // 检查在同列中是否为隐藏单候选数
  static isHiddenSingleInCol(game, row, col, number) {
    for (let r = 0; r < game.gridSize; r++) {
      if (r !== row && game.board[r][col] === 0) {
        if (this.isValidMove(game, r, col, number)) {
          return false;
        }
      }
    }
    return true;
  }

  // 检查在同子区域中是否为隐藏单候选数
  static isHiddenSingleInRegion(game, row, col, number) {
    const subRegion = this.getSubRegionPositions(row, col, game.gridSize);
    for (const pos of subRegion) {
      const [r, c] = pos;
      if ((r !== row || c !== col) && game.board[r][c] === 0) {
        if (this.isValidMove(game, r, c, number)) {
          return false;
        }
      }
    }
    return true;
  }

  // 获取提示（保留原有方法以兼容）
  static getHint(game, row, col) {
    if (game.isFixed[row][col]) return [];
    return this.getValidNumbers(game, row, col);
  }

  // 格式化时间
  static formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  // 保存游戏状态
  static saveGame(game) {
    this.savedGame = game;
    try {
      wx.setStorageSync('savedGame', game.toJson());
    } catch (error) {
      console.error('保存游戏失败:', error);
    }
  }

  // 获取保存的游戏
  static getSavedGame() {
    if (this.savedGame) return this.savedGame;
    
    try {
      const savedData = wx.getStorageSync('savedGame');
      if (savedData) {
        this.savedGame = SudokuGame.fromJson(savedData);
        return this.savedGame;
      }
    } catch (error) {
      console.error('读取保存的游戏失败:', error);
    }
    
    return null;
  }

  // 清除保存的游戏
  static clearSavedGame() {
    this.savedGame = null;
    try {
      wx.removeStorageSync('savedGame');
    } catch (error) {
      console.error('清除保存的游戏失败:', error);
    }
  }

  // 检查是否有保存的游戏
  static hasSavedGame() {
    if (this.savedGame) return true;
    
    try {
      const savedData = wx.getStorageSync('savedGame');
      return !!savedData;
    } catch (error) {
      console.error('检查保存的游戏失败:', error);
      return false;
    }
  }

  // 生成分级数独棋盘
  static generateSudokuBoard(difficulty) {
    if (difficulty.gridSize === 4) {
      return this.generate4x4Board(difficulty);
    } else if (difficulty.gridSize === 6) {
      return this.generate6x6Board(difficulty);
    } else {
      return this.generateStandardBoard(difficulty);
    }
  }

  // 生成4x4网格棋盘
  static generate4x4Board(difficulty) {
    const completedBoard = this.generateComplete4x4Board();
    const board = completedBoard.map(row => [...row]);
    
    const totalCells = 4 * 4;
    const cluesToRemove = totalCells - difficulty.initialClues;
    this.removeClues(board, 4, cluesToRemove);
    
    const isFixed = board.map(row => row.map(cell => cell !== 0));
    
    return { board, isFixed };
  }

  // 生成完整的4x4数独解
  static generateComplete4x4Board() {
    const board = [
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [2, 3, 4, 1],
      [4, 1, 2, 3]
    ];
    
    this.shuffle4x4Board(board);
    return board;
  }

  // 随机变换4x4数独棋盘
  static shuffle4x4Board(board) {
    if (Math.random() > 0.5) this.swapRows(board, 0, 1);
    if (Math.random() > 0.5) this.swapRows(board, 2, 3);
    if (Math.random() > 0.5) this.swapColumns(board, 0, 1);
    if (Math.random() > 0.5) this.swapColumns(board, 2, 3);
    
    if (Math.random() > 0.5) {
      this.swapRows(board, 0, 2);
      this.swapRows(board, 1, 3);
    }
    
    if (Math.random() > 0.5) {
      this.swapColumns(board, 0, 2);
      this.swapColumns(board, 1, 3);
    }
    
    this.remapNumbers(board, 4);
  }

  // 生成6x6网格棋盘
  static generate6x6Board(difficulty) {
    const completedBoard = this.generateComplete6x6Board();
    const board = completedBoard.map(row => [...row]);
    
    const totalCells = 6 * 6;
    const cluesToRemove = totalCells - difficulty.initialClues;
    this.removeClues(board, 6, cluesToRemove);
    
    const isFixed = board.map(row => row.map(cell => cell !== 0));
    
    return { board, isFixed };
  }

  // 生成完整的6x6数独解
  static generateComplete6x6Board() {
    const board = [
      [1, 2, 3, 4, 5, 6],
      [4, 5, 6, 1, 2, 3],
      [2, 3, 1, 6, 4, 5],
      [5, 6, 4, 2, 3, 1],
      [3, 1, 2, 5, 6, 4],
      [6, 4, 5, 3, 1, 2]
    ];
    
    this.shuffle6x6Board(board);
    return board;
  }

  // 随机变换6x6数独棋盘
  static shuffle6x6Board(board) {
    for (let subGrid = 0; subGrid < 3; subGrid++) {
      if (Math.random() > 0.5) {
        this.swapRows(board, subGrid * 2, subGrid * 2 + 1);
      }
    }
    
    for (let subGrid = 0; subGrid < 2; subGrid++) {
      const base = subGrid * 3;
      if (Math.random() > 0.5) this.swapColumns(board, base, base + 1);
      if (Math.random() > 0.5) this.swapColumns(board, base + 1, base + 2);
    }
    
    if (Math.random() > 0.5) {
      this.swapRows(board, 0, 2);
      this.swapRows(board, 1, 3);
    }
    
    if (Math.random() > 0.5) {
      this.swapRows(board, 2, 4);
      this.swapRows(board, 3, 5);
    }
    
    if (Math.random() > 0.5) {
      this.swapColumns(board, 0, 3);
      this.swapColumns(board, 1, 4);
      this.swapColumns(board, 2, 5);
    }
    
    this.remapNumbers(board, 6);
  }

  // 生成标准数独棋盘（1-9数字）
  static generateStandardBoard(difficulty) {
    const completedBoard = this.generateComplete9x9Board();
    const board = completedBoard.map(row => [...row]);
    
    const totalCells = 9 * 9;
    const cluesToRemove = totalCells - difficulty.initialClues;
    this.removeClues(board, 9, cluesToRemove);
    
    const isFixed = board.map(row => row.map(cell => cell !== 0));
    
    return { board, isFixed };
  }

  // 生成完整的9x9数独解
  static generateComplete9x9Board() {
    const board = [
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      [4, 5, 6, 7, 8, 9, 1, 2, 3],
      [7, 8, 9, 1, 2, 3, 4, 5, 6],
      [2, 3, 1, 5, 6, 4, 8, 9, 7],
      [5, 6, 4, 8, 9, 7, 2, 3, 1],
      [8, 9, 7, 2, 3, 1, 5, 6, 4],
      [3, 1, 2, 6, 4, 5, 9, 7, 8],
      [6, 4, 5, 9, 7, 8, 3, 1, 2],
      [9, 7, 8, 3, 1, 2, 6, 4, 5]
    ];
    
    this.shuffle9x9Board(board);
    return board;
  }

  // 随机变换9x9数独棋盘
  static shuffle9x9Board(board) {
    for (let subGrid = 0; subGrid < 3; subGrid++) {
      const base = subGrid * 3;
      if (Math.random() > 0.5) this.swapRows(board, base, base + 1);
      if (Math.random() > 0.5) this.swapRows(board, base + 1, base + 2);
    }
    
    for (let subGrid = 0; subGrid < 3; subGrid++) {
      const base = subGrid * 3;
      if (Math.random() > 0.5) this.swapColumns(board, base, base + 1);
      if (Math.random() > 0.5) this.swapColumns(board, base + 1, base + 2);
    }
    
    if (Math.random() > 0.5) {
      this.swapRows(board, 0, 3);
      this.swapRows(board, 1, 4);
      this.swapRows(board, 2, 5);
    }
    
    if (Math.random() > 0.5) {
      this.swapRows(board, 3, 6);
      this.swapRows(board, 4, 7);
      this.swapRows(board, 5, 8);
    }
    
    if (Math.random() > 0.5) {
      this.swapColumns(board, 0, 3);
      this.swapColumns(board, 1, 4);
      this.swapColumns(board, 2, 5);
    }
    
    if (Math.random() > 0.5) {
      this.swapColumns(board, 3, 6);
      this.swapColumns(board, 4, 7);
      this.swapColumns(board, 5, 8);
    }
    
    this.remapNumbers(board, 9);
  }

  // 随机移除棋盘上的数字
  static removeClues(board, gridSize, cluesToRemove) {
    let removed = 0;
    const totalPositions = gridSize * gridSize;
    const positions = Array.from({ length: totalPositions }, (_, i) => i);
    
    // 随机排列位置
    for (let i = positions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [positions[i], positions[j]] = [positions[j], positions[i]];
    }
    
    for (const pos of positions) {
      if (removed >= cluesToRemove) break;
      
      const row = Math.floor(pos / gridSize);
      const col = pos % gridSize;
      
      if (board[row][col] !== 0) {
        board[row][col] = 0;
        removed++;
      }
    }
  }

  // 验证数独是否有效
  static isValidSudoku(board, gridSize) {
    // 验证行
    for (let row = 0; row < gridSize; row++) {
      if (!this.isValidGroup(board[row])) return false;
    }

    // 验证列
    for (let col = 0; col < gridSize; col++) {
      const column = [];
      for (let row = 0; row < gridSize; row++) {
        column.push(board[row][col]);
      }
      if (!this.isValidGroup(column)) return false;
    }

    // 验证子网格
    if (gridSize === 4) {
      return this.validate4x4SubGrids(board);
    } else if (gridSize === 6) {
      return this.validate6x6SubGrids(board);
    } else if (gridSize === 9) {
      return this.validate9x9SubGrids(board);
    }

    return true;
  }

  // 验证4x4子网格
  static validate4x4SubGrids(board) {
    for (let subRow = 0; subRow < 2; subRow++) {
      for (let subCol = 0; subCol < 2; subCol++) {
        const subGridValues = [];
        for (let r = subRow * 2; r < subRow * 2 + 2; r++) {
          for (let c = subCol * 2; c < subCol * 2 + 2; c++) {
            subGridValues.push(board[r][c]);
          }
        }
        if (!this.isValidGroup(subGridValues)) return false;
      }
    }
    return true;
  }

  // 验证6x6子网格
  static validate6x6SubGrids(board) {
    for (let subRow = 0; subRow < 3; subRow++) {
      for (let subCol = 0; subCol < 2; subCol++) {
        const subGridValues = [];
        for (let r = subRow * 2; r < subRow * 2 + 2; r++) {
          for (let c = subCol * 3; c < subCol * 3 + 3; c++) {
            subGridValues.push(board[r][c]);
          }
        }
        if (!this.isValidGroup(subGridValues)) return false;
      }
    }
    return true;
  }

  // 验证9x9子网格
  static validate9x9SubGrids(board) {
    for (let subRow = 0; subRow < 3; subRow++) {
      for (let subCol = 0; subCol < 3; subCol++) {
        const subGridValues = [];
        for (let r = subRow * 3; r < subRow * 3 + 3; r++) {
          for (let c = subCol * 3; c < subCol * 3 + 3; c++) {
            subGridValues.push(board[r][c]);
          }
        }
        if (!this.isValidGroup(subGridValues)) return false;
      }
    }
    return true;
  }

  // 验证一组数字是否有效
  static isValidGroup(group) {
    const seen = new Set();
    for (const number of group) {
      if (number !== 0) {
        if (seen.has(number)) return false;
        seen.add(number);
      }
    }
    return true;
  }

  // 交换两行
  static swapRows(board, row1, row2) {
    const temp = board[row1];
    board[row1] = board[row2];
    board[row2] = temp;
  }

  // 交换两列
  static swapColumns(board, col1, col2) {
    for (let row = 0; row < board.length; row++) {
      const temp = board[row][col1];
      board[row][col1] = board[row][col2];
      board[row][col2] = temp;
    }
  }

  // 随机重新映射数字
  static remapNumbers(board, maxNumber) {
    const numbers = Array.from({ length: maxNumber }, (_, i) => i + 1);
    
    // 随机排列数字
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    
    const mapping = {};
    for (let i = 0; i < maxNumber; i++) {
      mapping[i + 1] = numbers[i];
    }
    
    // 应用映射
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        if (board[row][col] !== 0) {
          board[row][col] = mapping[board[row][col]];
        }
      }
    }
  }
}

// 静态属性
SudokuService.savedGame = null;

// 导出模块
module.exports = {
  SudokuService
};