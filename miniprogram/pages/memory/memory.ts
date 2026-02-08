Page({
    data: {
        gridSize: 5,
        level: 1,
        score: 0,
        grid: [] as any[],
        gameState: 'idle', // idle, memorize, recall, result
        resultTitle: '',
        sequence: [] as any[],
        currentStep: 0
    },

    onLoad() {
        // Fill empty grid for display
        this.setData({ grid: this.createEmptyGrid() })
    },

    createEmptyGrid() {
        const grid = []
        for (let i = 0; i < 25; i++) {
            grid.push({ id: i, value: '', status: 'empty' })
        }
        return grid
    },

    startNewGame() {
        this.setData({
            level: 1,
            score: 0,
            gameState: 'starting'
        }, () => {
            this.startLevel()
        })
    },

    retryLevel() {
        // Keep current level and score, just restart the level logic
        this.setData({
            gameState: 'starting'
        }, () => {
            this.startLevel()
        })
    },

    goHome() {
        wx.navigateBack()
    },

    startLevel() {
        const { level } = this.data
        // Difficulty: Number of items = 3 + floor(level/2)
        // Level 1: 3
        // Level 2: 3
        // Level 3: 4
        // Level 4: 4
        // ...
        // Let's make it a bit faster progression? Level 1: 3. Level 2: 4.
        const numItems = 3 + (level - 1)

        // Time limit:
        // Base 1000ms. Plus 500ms per item?
        // 3 items = 2500ms.
        // 4 items = 3000ms.
        // Maybe less time as levels go up?
        // Let's try: 1000 + numItems * 800ms to be generous initially.
        const memorizeTime = 1000 + numItems * 800

        // Reset grid
        const grid = this.createEmptyGrid()

        // Pick random positions
        const indices = new Set<number>()
        while (indices.size < numItems && indices.size < 25) {
            indices.add(Math.floor(Math.random() * 25))
        }

        // Assign values
        const indicesArray = Array.from(indices)
        const sequence: any[] = []

        indicesArray.forEach((idx, i) => {
            grid[idx].value = i + 1
            grid[idx].status = 'visible'
            sequence.push({ idx: idx, val: i + 1 })
        })

        this.setData({
            grid,
            sequence: sequence.sort((a, b) => a.val - b.val),
            currentStep: 0,
            gameState: 'memorize'
        })

        // Auto-hide after time
        setTimeout(() => {
            // Ensure we are still in memorize phase (user didn't restart)
            if (this.data.gameState !== 'memorize') return

            const hiddenGrid = this.data.grid.map((cell: any) => {
                if (cell.status === 'visible') {
                    return { ...cell, status: 'hidden' }
                }
                return cell
            })

            this.setData({
                grid: hiddenGrid,
                gameState: 'recall'
            })
        }, memorizeTime)
    },

    handleTap(e: any) {
        if (this.data.gameState !== 'recall') return

        const index = e.currentTarget.dataset.index
        const cell = this.data.grid[index]

        if (cell.status !== 'hidden') return

        const expectedVal = this.data.sequence[this.data.currentStep].val

        // Check Value
        // Note: cell.value is the visible number.

        if (cell.value === expectedVal) {
            // Correct
            const newGrid = [...this.data.grid]
            newGrid[index].status = 'revealed'

            const nextStep = this.data.currentStep + 1
            this.setData({
                grid: newGrid,
                currentStep: nextStep,
                score: this.data.score + 10
            })

            // Level Clear?
            if (nextStep >= this.data.sequence.length) {
                wx.showToast({ title: 'Nice!', icon: 'success', duration: 500 })
                setTimeout(() => {
                    this.setData({ level: this.data.level + 1 }, () => {
                        this.startLevel()
                    })
                }, 1000)
            }

        } else {
            // Wrong
            const newGrid = [...this.data.grid]
            newGrid[index].status = 'wrong'

            // Reveal all correctly?
            this.data.sequence.forEach((item: any) => {
                newGrid[item.idx].status = 'revealed' // Show all answers
                newGrid[item.idx].value = item.val // Ensure value is shown
            })
            newGrid[index].status = 'wrong' // Keep the wrong one red

            this.setData({ grid: newGrid, gameState: 'result', resultTitle: 'Game Over' })
        }
    }
})
