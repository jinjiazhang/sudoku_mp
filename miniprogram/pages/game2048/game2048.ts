// game2048.ts
interface Point {
    x: number
    y: number
}

interface Tile {
    id: number
    value: number
    row: number
    col: number
}

Page({
    data: {
        tiles: [] as Tile[],
        score: 0,
        bestScore: 0,
        scoreAdded: 0,
        gameOver: false,
        gameWon: false,
        keepPlaying: false,

        // 用于触摸处理
        touchStartX: 0,
        touchStartY: 0,

        history: [] as any[] // 历史记录栈
    },

    // Internal state to track next ID
    nextTileId: 1,

    onLoad() {
        this.initGame()
        // 读取最高分
        const bestScore = wx.getStorageSync('2048_best_score') || 0
        this.setData({ bestScore })
    },

    onShareAppMessage() {
        return {
            title: `我在2048中获得了${this.data.score}分，来挑战我吧！`,
            path: '/pages/game2048/game2048'
        }
    },

    initGame() {
        this.nextTileId = 1

        this.setData({
            tiles: [],
            score: 0,
            scoreAdded: 0,
            gameOver: false,
            gameWon: false,
            keepPlaying: false
        })

        this.addRandomTile()
        this.addRandomTile()
    },

    restartGame() {
        this.setData({ history: [] })
        this.initGame()
    },

    goBack() {
        wx.navigateBack()
    },

    // 触摸开始
    touchStart(e: any) {
        if (this.data.gameOver || (this.data.gameWon && !this.data.keepPlaying)) return

        if (e.touches.length === 1) {
            this.setData({
                touchStartX: e.touches[0].clientX,
                touchStartY: e.touches[0].clientY
            })
        }
    },

    // 触摸结束
    touchEnd(e: any) {
        if (this.data.gameOver || (this.data.gameWon && !this.data.keepPlaying)) return

        if (e.changedTouches.length === 1) {
            const touchEndX = e.changedTouches[0].clientX
            const touchEndY = e.changedTouches[0].clientY

            const dx = touchEndX - this.data.touchStartX
            const dy = touchEndY - this.data.touchStartY

            const absDx = Math.abs(dx)
            const absDy = Math.abs(dy)

            if (Math.max(absDx, absDy) > 20) {
                if (absDx > absDy) {
                    if (dx > 0) this.move(0, 1) // Right
                    else this.move(0, -1) // Left
                } else {
                    if (dy > 0) this.move(1, 0) // Down
                    else this.move(-1, 0) // Up
                }
            }
        }
    },

    // 核心移动逻辑：基于向量的遍历
    move(vectorR: number, vectorC: number) {
        const tiles = this.data.tiles
        let moved = false
        let score = this.data.score
        let addedScore = 0

        // Snapshot current state
        const currentSnapshot = {
            tiles: JSON.parse(JSON.stringify(this.data.tiles)),
            score: this.data.score
        }

        // 1. 构建位置映射 Map
        // Map<"row,col", Tile>
        const positionMap = new Map<string, Tile>()
        tiles.forEach(t => positionMap.set(`${t.row},${t.col}`, t))

        // 2. 确定遍历顺序
        // 如果向右(col增加)，则从右向左遍历(3->0)
        // 如果向下(row增加)，则从下向上遍历(3->0)
        const rows = [0, 1, 2, 3]
        const cols = [0, 1, 2, 3]

        if (vectorR === 1) rows.reverse()
        if (vectorC === 1) cols.reverse()

        const mergedIds = new Set<number>() // 本轮已合并过的Tile ID

        // 3. 遍历每一个位置
        for (const r of rows) {
            for (const c of cols) {
                const key = `${r},${c}`
                const tile = positionMap.get(key)

                if (tile) {
                    // 寻找该Tile最远能滑到的位置
                    let nextR = r
                    let nextC = c

                    // 逐步向前探测
                    while (true) {
                        const checkR = nextR + vectorR
                        const checkC = nextC + vectorC

                        // 越界检查
                        if (checkR < 0 || checkR > 3 || checkC < 0 || checkC > 3) break

                        const checkKey = `${checkR},${checkC}`
                        const otherExisted = positionMap.get(checkKey)

                        if (!otherExisted) {
                            // 空位，可以移动进入
                            nextR = checkR
                            nextC = checkC
                        } else {
                            // 有障碍物，检查是否可合并
                            // 条件：值相同 + 障碍物未被合并过 + 自己未被合并过(隐含，因为遍历顺序保证先处理靠边的)
                            if (otherExisted.value === tile.value && !mergedIds.has(otherExisted.id)) {
                                // 合并发生！
                                // 逻辑：
                                // 1. 移动当前Tile到目标位置 (触发滑动动画)
                                // 2. 标记目标位置发生合并，稍后处理值更新

                                // Here we adopt a simplified merge animation logic:
                                // Tile A slides to position of Tile B.
                                // Update Tile A's coordinates.
                                // Mark Tile B as "to be removed" (in data, not view logic yet?)
                                // Actually better: 
                                // Update Tile A to match B's position.
                                // Update Tile A's value to *2.
                                // Remove Tile B from the list.

                                // Wait, if we remove B immediately, A slides on top, but it's ID is different.
                                // Ideally:
                                // Tile A moves to (nextR, nextC).
                                // Tile B is at (checkR, checkC).
                                // These are adjacent. Wait.
                                // We are in loop check. 
                                // checkR is the position OF the obstacle. 
                                // So we merge INTO checkR/checkC.

                                nextR = checkR
                                nextC = checkC

                                // Upgrade Value Logic:
                                // We simply update 'tile' to new position and new value.
                                // We remove 'otherExisted'.

                                tile.row = nextR
                                tile.col = nextC
                                tile.value *= 2

                                score += tile.value
                                addedScore += tile.value

                                positionMap.delete(key) // Old pos empty
                                positionMap.set(`${nextR},${nextC}`, tile) // New pos occupied by merged tile

                                // Mark merged so it doesn't merge again this turn
                                mergedIds.add(tile.id)

                                // Remove the other tile from data list (will happen at end)
                                // We need to track deletion.
                                // Let's add a property or use a Set of IDs to keep.

                                // Hack: Set value to -1 to mark deletion?
                                otherExisted.value = -1

                                moved = true
                            }
                            break // 遇到障碍物（无论是否合并），探测结束
                        }
                    }

                    if (nextR !== r || nextC !== c) {
                        // 确实发生了移动
                        if (tile.value !== -1) { // 如果不是刚才被标记删除的
                            tile.row = nextR
                            tile.col = nextC
                            positionMap.delete(key)
                            positionMap.set(`${nextR},${nextC}`, tile)
                            moved = true
                        }
                    }
                }
            }
        }

        if (moved) {
            // Save history
            const history = this.data.history
            history.push(currentSnapshot)
            // Limit history size to 20
            if (history.length > 20) history.shift()

            // Filter out deleted tiles
            const newTiles = tiles.filter(t => t.value !== -1)

            // Sync data first to trigger slide
            this.setData({
                tiles: newTiles,
                history
            })

            // Wait a tiny bit then add random tile? 
            // Better to add immediately for responsiveness, but visually tile appears immediately.
            // 2048 usually adds tile after move animation finishes.
            // CSS transition is 100ms.

            setTimeout(() => {
                const tilesAfterRandom = this.addRandomTile()
                this.checkStatus(tilesAfterRandom, score, addedScore)
            }, 150)
        }
    },

    undoMove() {
        const history = this.data.history
        if (history.length === 0) return

        const lastState = history.pop()

        if (lastState) {
            this.setData({
                tiles: lastState.tiles,
                score: lastState.score,
                history,
                gameOver: false, // Undo game over state if any
                gameWon: false   // Undo win state if needed? Actually usually you Undo before winning often not allowed or relevant, but ok.
            })
        }
    },

    addRandomTile(): Tile[] {
        let tiles = this.data.tiles
        const occupied = new Set<string>()
        tiles.forEach(t => occupied.add(`${t.row},${t.col}`))

        const emptyCells: Point[] = []
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if (!occupied.has(`${r},${c}`)) {
                    emptyCells.push({ x: r, y: c })
                }
            }
        }

        if (emptyCells.length > 0) {
            const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)]
            const newTile: Tile = {
                id: this.nextTileId++,
                value: Math.random() < 0.9 ? 2 : 4,
                row: randomCell.x,
                col: randomCell.y
            }
            // Add new tile
            tiles = [...tiles, newTile]
            this.setData({ tiles })
        }
        return tiles
    },

    checkStatus(tiles: Tile[], score: number, addedScore: number) {
        // Update score
        let bestScore = this.data.bestScore
        if (score > bestScore) {
            bestScore = score
            wx.setStorageSync('2048_best_score', bestScore)
        }

        this.setData({
            score,
            scoreAdded: addedScore,
            bestScore
        })

        // Reset added score animation
        if (addedScore > 0) {
            setTimeout(() => {
                this.setData({ scoreAdded: 0 })
            }, 600)
        }

        // Check Win
        if (!this.data.keepPlaying && !this.data.gameWon) {
            if (tiles.some(t => t.value === 2048)) {
                this.setData({ gameWon: true })
            }
        }

        // Check Loss
        // If map is full and no merges possible
        if (tiles.length === 16) {
            // Build grid for easy check
            const grid: number[][] = [
                [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]
            ]
            tiles.forEach(t => grid[t.row][t.col] = t.value)

            if (this.checkGameOver(grid)) {
                this.setData({ gameOver: true })
            }
        }
    },

    checkGameOver(grid: number[][]) {
        // 1. Check for empty - already done (length 16)
        // 2. Horizontal
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 3; c++) {
                if (grid[r][c] === grid[r][c + 1]) return false
            }
        }
        // 3. Vertical
        for (let c = 0; c < 4; c++) {
            for (let r = 0; r < 3; r++) {
                if (grid[r][c] === grid[r + 1][c]) return false
            }
        }
        return true
    },

    keepPlaying() {
        this.setData({ keepPlaying: true })
    }
})
