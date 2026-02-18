class LevelManager {
    constructor() {
        this.levels = [
            {
                id: 1,
                objective: {
                    type: 'score',
                    value: 650,
                    description: 'Alcanza 650 puntos'
                },
                moves: 10,
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
