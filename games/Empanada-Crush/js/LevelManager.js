class LevelManager {
    constructor() {
        this.levels = [
            {
                id: 1,
                objective: {
                    type: 'score',
                    value: 1000,
                    description: 'Alcanza 1000 puntos'
                },
                moves: 20,
                difficulty: 1
            }
        ];
        this.currentLevelIndex = 0;
    }

    getCurrentLevel() {
        return this.levels[this.currentLevelIndex];
    }

    nextLevel() {
        if (this.currentLevelIndex < this.levels.length - 1) {
            this.currentLevelIndex++;
            return true;
        }
        return false;
    }

    resetProgression() {
        this.currentLevelIndex = 0;
    }
}
