class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
        this.gridSize = 8;
        this.tileSpacing = 8;
        // tileSize will be calculated in create() based on screen width
        this.empanadaTypes = [
            'empanada_carne', 'empanada_pollo', 'empanada_jq',
            'empanada_humita', 'empanada_verdura', 'empanada_picante'
        ];
        this.typeColors = {
            'empanada_carne': 0x8d6e63,
            'empanada_pollo': 0xfbc02d,
            'empanada_jq': 0xf06292,
            'empanada_humita': 0xfb8c00,
            'empanada_verdura': 0x4caf50,
            'empanada_picante': 0xe53935,
            'special_striped': 0xffffff,
            'special_wrapped': 0xffffff,
            'special_bomb': 0x000000,
            'logo': 0x333333
        };
        this.board = [];
        this.levelManager = new LevelManager();
        this.selectedTile = null;
        this.isProcessing = false;

        // POOLING
        this.empanadaPool = null;
        // PARTICLES
        this.particleManager = null;
    }

    init() {
        this.loadLevel();
    }

    loadLevel() {
        const levelData = this.levelManager.getCurrentLevel();
        this.score = 0;
        this.moves = levelData.moves;
        this.objectiveValue = levelData.objective.value;
        this.objectiveType = levelData.objective.type; // 'score' or 'obstacles'
        this.objectiveDescription = levelData.objective.description;
        this.logoMatchesToClear = this.objectiveType === 'match_logo' ? this.objectiveValue : 0;
        this.logoMatchesMade = 0;

        // Add logo to matchable types if it's Level 2
        this.currentEmpanadaTypes = [...this.empanadaTypes];
        if (this.objectiveType === 'match_logo') {
            this.currentEmpanadaTypes.push('logo');
        }
    }

    create() {
        // Background
        let bg = this.add.image(this.game.config.width / 2, this.game.config.height / 2, 'background');
        bg.setDisplaySize(this.game.config.width, this.game.config.height);
        bg.setAlpha(0.4);

        // Initialize Pool
        this.empanadaPool = this.add.group({
            classType: Phaser.GameObjects.Container,
            maxSize: 200,
            runChildUpdate: false
        });

        // Initialize Particles
        this.particleManager = this.add.particles(0, 0, 'white_particle', {
            speed: 100,
            scale: { start: 1, end: 0 },
            blendMode: 'ADD',
            lifespan: 500,
            gravityY: 200
        });
        // create a texture for the particle if it doesn't exist
        if (!this.textures.exists('white_particle')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(4, 4, 4);
            graphics.generateTexture('white_particle', 8, 8);
        }

        // Dynamic Tile Size Calculation
        const maxBoardWidth = this.game.config.width * 0.95; // Use 95% of screen width
        this.tileSize = Math.floor((maxBoardWidth - (this.gridSize - 1) * this.tileSpacing) / this.gridSize);
        // Ensure tile size isn't too big on desktop
        this.tileSize = Math.min(this.tileSize, 80);

        const boardWidth = this.gridSize * (this.tileSize + this.tileSpacing);
        this.boardOffsetX = (this.game.config.width - boardWidth) / 2 + this.tileSize / 2;
        this.boardOffsetY = (this.game.config.height - boardWidth) / 2 + this.tileSize / 2 + 60;

        this.input.on('pointerup', (pointer) => {
            if (this.dragging && this.selectedTile) {
                this.handleSwipe(pointer);
            }
            this.dragging = false;
            // Don't deselect automatically to allow click-click play style
            // unless it was a valid swipe
        });

        // Bloquear input hasta que empiece el juego
        this.isProcessing = true;

        // Aplicar Blur (Phaser 3.60+ FX) - Ajustado a un nivel más leve
        const blurFX = this.cameras.main.postFX.addBlur(1, 0, 0, 2);

        this.scene.launch('UIScene');
        // Audio
        this.sound.stopAll();
        if (this.sound.get('bgm')) {
            this.sound.play('bgm', { loop: true, volume: 0.5 });
        }

        // Cheat Listener
        this.events.on('cheatScore', () => {
            if (!this.levelManager.isGameOver) {
                this.score = 600;
                this.events.emit('updateScore', this.score);
                this.showFloatingText(this.game.config.width / 2, this.game.config.height / 2, '¡HACKER!');
                this.checkGameOver();
            }
        });

        // Move Timer
        this.moveTimeLeft = 15000; // 15 seconds in ms
        this.timerText = this.add.text(this.game.config.width / 2, 110, '15', {
            fontFamily: 'Chewy',
            fontSize: '32px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        this.createBoard();

        // Escuchar evento de inicio desde UIScene
        this.events.on('gameStart', () => {
            this.tweens.add({
                targets: blurFX,
                blur: 0,
                duration: 500,
                onComplete: () => {
                    this.cameras.main.postFX.clear();
                    this.isProcessing = false;
                }
            });
        });
    }

    createBoard() {
        for (let row = 0; row < this.gridSize; row++) {
            this.board[row] = [];
            for (let col = 0; col < this.gridSize; col++) {
                let empanada = this.createEmpanada(row, col, this.boardOffsetX, this.boardOffsetY);
                this.board[row][col] = empanada;

                // Animación de entrada escalonada (GSAP Style)
                const finalX = empanada.x;
                const finalY = empanada.y;
                empanada.y -= 1000;
                empanada.scale = 0;

                this.tweens.add({
                    targets: empanada,
                    y: finalY,
                    scale: 1,
                    duration: 600,
                    delay: (row * this.gridSize + col) * 15,
                    ease: 'Back.easeOut'
                });
            }
        }

        this.generateValidBoard();
    }

    generateValidBoard() {
        // Loop through board and re-assign types until no matches exist
        // Since we create tiles first now, we iterate and check.
        // Actually, it's efficient to do this construction-side, but 
        // since createBoard spawns them all, we can iterate:

        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                let tile = this.board[r][c];
                let type = tile.getData('type');

                while (this.checkMatch(r, c, type)) {
                    type = Phaser.Utils.Array.GetRandom(this.currentEmpanadaTypes);
                }

                // Update if changed
                if (type !== tile.getData('type')) {
                    this.updateTileVisuals(tile, type);
                }
            }
        }
    }

    checkMatch(row, col, type) {
        // Check horizontal
        if (col >= 2) {
            const t1 = this.board[row][col - 1].getData('type');
            const t2 = this.board[row][col - 2].getData('type');
            if (t1 === type && t2 === type) return true;
        }
        // Check vertical
        if (row >= 2) {
            const t1 = this.board[row - 1][col].getData('type');
            const t2 = this.board[row - 2][col].getData('type');
            if (t1 === type && t2 === type) return true;
        }
        return false;
    }

    updateTileVisuals(container, newType) {
        container.setData('type', newType);
        let sprite = container.getData('sprite');
        sprite.setTexture(newType);

        let bg = container.getData('bg');
        bg.clear();
        let color = this.typeColors[newType] || 0xffffff;
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-this.tileSize / 2, -this.tileSize / 2, this.tileSize, this.tileSize, 8);

        if (newType === 'logo') {
            bg.lineStyle(4, 0xffcc00, 1);
        } else {
            bg.lineStyle(2, 0xffffff, 0.5);
        }
        bg.strokeRoundedRect(-this.tileSize / 2, -this.tileSize / 2, this.tileSize, this.tileSize, 8);
    }

    createEmpanada(row, col, offsetX, offsetY, type = null, bgColorKey = null) {
        if (!type) {
            type = Phaser.Utils.Array.GetRandom(this.currentEmpanadaTypes);
        }
        if (!bgColorKey) bgColorKey = type;

        const x = offsetX + col * (this.tileSize + this.tileSpacing);
        const y = offsetY + row * (this.tileSize + this.tileSpacing);

        // Get from POOL
        let container = this.empanadaPool.get(x, y);

        if (!container) {
            // Pool is full or failed, create new (fallback)
            container = this.add.container(x, y);
        }

        container.setActive(true);
        container.setVisible(true);
        container.setAlpha(1);
        container.setScale(1);
        // Optimize: Reuse children if they exist
        let bg, sprite;

        if (container.list.length > 0) {
            // Assuming order: 0 is bg, 1 is sprite
            bg = container.list[0];
            sprite = container.list[1];
            if (bg) bg.clear();
        } else {
            container.setSize(this.tileSize, this.tileSize);

            // Background rectangle
            bg = this.add.graphics();
            container.add(bg);

            // Empanada Sprite
            sprite = this.add.sprite(0, 0, type);
            container.add(sprite);
        }

        // Ensure children do NOT block input
        if (bg.disableInteractive) bg.disableInteractive();
        if (sprite.disableInteractive) sprite.disableInteractive();

        // Update Visuals
        let color = this.typeColors[bgColorKey] || 0xffffff;
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-this.tileSize / 2, -this.tileSize / 2, this.tileSize, this.tileSize, 8);

        if (type === 'logo') {
            bg.lineStyle(4, 0xffcc00, 1); // Thick yellow border for logos
        } else {
            bg.lineStyle(2, 0xffffff, 0.5); // Normal border
        }
        bg.strokeRoundedRect(-this.tileSize / 2, -this.tileSize / 2, this.tileSize, this.tileSize, 8);

        sprite.setTexture(type);
        sprite.setDisplaySize(this.tileSize * 0.9, this.tileSize * 0.9);

        // Interactive - Make hit area slightly larger for better touch handling
        const hitSize = this.tileSize * 1.1;
        if (!container.input) {
            container.setInteractive(new Phaser.Geom.Rectangle(-hitSize / 2, -hitSize / 2, hitSize, hitSize), Phaser.Geom.Rectangle.Contains);
        } else {
            container.input.hitArea.setTo(-hitSize / 2, -hitSize / 2, hitSize, hitSize);
        }
        container.input.cursor = 'pointer'; // Show hand cursor

        // Data
        container.setData('row', row);
        container.setData('col', col);
        container.setData('type', type);
        container.setData('bg', bg);
        container.setData('sprite', sprite);
        container.setData('powerUp', null); // Reset powerup
        container.setData('isObstacle', false);

        // Events (remove old listeners to avoid duplicates if reused)
        container.off('pointerdown');
        container.off('pointerover');

        container.on('pointerdown', (pointer) => {
            if (this.isProcessing || this.moves <= 0) return;
            this.resetIdleTimer();
            this.dragging = true;
            this.swipeStartX = pointer.x;
            this.swipeStartY = pointer.y;

            // If we already have a selected tile and we click another one (non-adjacent or simply click)
            if (this.selectedTile && this.selectedTile !== container) {
                const row1 = this.selectedTile.getData('row');
                const col1 = this.selectedTile.getData('col');
                const row2 = container.getData('row');
                const col2 = container.getData('col');

                const dist = Math.abs(row1 - row2) + Math.abs(col1 - col2);
                if (dist === 1) {
                    this.swapTiles(this.selectedTile, container);
                    this.selectedTile.setAlpha(1);
                    this.selectedTile = null;
                    this.dragging = false; // logic handled
                    return;
                }
            }

            // Select this tile
            if (this.selectedTile) this.selectedTile.setAlpha(1);
            this.selectedTile = container;
            container.setAlpha(0.6);

            if (this.sound.get('select')) this.sound.play('select');

            // Squash & Stretch (Juice)
            this.tweens.add({
                targets: container,
                scaleX: 0.9,
                scaleY: 1.1,
                duration: 100,
                yoyo: true,
                ease: 'Quad.easeOut'
            });
        });

        return container;
    }

    handleSwipe(pointer) {
        // Minimum distance for a swipe vs a click
        const swipeThreshold = 30;
        const diffX = pointer.x - this.swipeStartX;
        const diffY = pointer.y - this.swipeStartY;

        if (Math.abs(diffX) < swipeThreshold && Math.abs(diffY) < swipeThreshold) {
            // It's a click/tap, already handled in pointerdown
            return;
        }

        const row = this.selectedTile.getData('row');
        const col = this.selectedTile.getData('col');
        let targetRow = row;
        let targetCol = col;

        if (Math.abs(diffX) > Math.abs(diffY)) {
            // Horizontal
            if (diffX > 0) targetCol++; else targetCol--;
        } else {
            // Vertical
            if (diffY > 0) targetRow++; else targetRow--;
        }

        // Bounds check
        if (targetRow >= 0 && targetRow < this.gridSize && targetCol >= 0 && targetCol < this.gridSize) {
            const targetTile = this.board[targetRow][targetCol];
            if (targetTile) {
                this.swapTiles(this.selectedTile, targetTile);
                this.selectedTile.setAlpha(1);
                this.selectedTile = null;
            }
        }
    }

    swapTiles(tile1, tile2, isUndo = false) {
        this.isProcessing = true;

        if (this.selectedTile) {
            this.selectedTile.setAlpha(1);
            this.selectedTile = null;
        }

        const row1 = tile1.getData('row');
        const col1 = tile1.getData('col');
        const row2 = tile2.getData('row');
        const col2 = tile2.getData('col');

        // Swap in board array
        this.board[row1][col1] = tile2;
        this.board[row2][col2] = tile1;

        // Update tile data
        tile1.setData('row', row2);
        tile1.setData('col', col2);
        tile2.setData('row', row1);
        tile2.setData('col', col1);

        // Check for Color Bomb Interaction
        const type1 = tile1.getData('powerUp');
        const type2 = tile2.getData('powerUp');

        if (type1 === 'color_bomb' || type2 === 'color_bomb') {
            const bomb = type1 === 'color_bomb' ? tile1 : tile2;
            const other = type1 === 'color_bomb' ? tile2 : tile1;
            const targetColor = other.getData('type');

            // If dragging two bombs or bomb on special, standard behavior or specific combo (simplified here to just color clear)
            if (targetColor) {
                this.triggerColorBomb(bomb, targetColor);
                this.isProcessing = false; // logic handled inside
                return; // Exit swapTiles standard logic
            }
        }

        // Animate swap
        this.tweens.add({
            targets: tile1,
            x: tile2.x,
            y: tile2.y,
            duration: 300,
            ease: 'Power2'
        });

        this.tweens.add({
            targets: tile2,
            x: tile1.x,
            y: tile1.y,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                if (!isUndo) {
                    const matchResult = this.getAllMatches();
                    if (matchResult.unique.length > 0) {
                        this.moves--;
                        this.events.emit('updateMoves', this.moves);
                        this.handleMatches(matchResult);
                    } else {
                        // No match, swap back
                        this.swapTiles(tile1, tile2, true);
                    }
                } else {
                    this.isProcessing = false;
                }
            }
        });
    }

    triggerColorBomb(bomb, targetColor) {
        this.isProcessing = true;
        this.moves--;
        this.events.emit('updateMoves', this.moves);

        // Visual effect for bomb
        if (this.sound.get('match')) this.sound.play('match');
        this.showFloatingText(bomb.x, bomb.y, '¡SÚPER RAYO!');

        // Find targets (ROW + COL)
        let targets = [];
        const bombRow = bomb.getData('row');
        const bombCol = bomb.getData('col');

        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                let t = this.board[r][c];
                if (t && (r === bombRow || c === bombCol)) {
                    if (!targets.includes(t)) {
                        targets.push(t);
                    }
                }
            }
        }

        // Animate Beams/Explosion
        this.tweens.add({
            targets: targets,
            scaleX: 0,
            scaleY: 0,
            angle: 360,
            duration: 500,
            onComplete: () => {
                let score = 0;
                targets.forEach(t => {
                    const r = t.getData('row');
                    const c = t.getData('col');
                    if (this.board[r][c] === t) {
                        this.board[r][c] = null;
                        t.setActive(false);
                        t.setVisible(false);
                        this.empanadaPool.killAndHide(t);

                        score += 20; // More points for super clear
                        // Particle
                        this.particleManager.emitParticleAt(t.x, t.y);
                    }
                });

                this.updateScore(score);
                this.dropTiles();
            }
        });
    }

    getAllMatches() {
        let matches = [];
        let sets = [];

        // Check horizontal
        for (let row = 0; row < this.gridSize; row++) {
            let matchLen = 1;
            for (let col = 0; col < this.gridSize; col++) {
                let checkNext = false;
                if (col === this.gridSize - 1) {
                    checkNext = true;
                } else {
                    const typeCurrent = this.board[row][col].getData('type');
                    const typeNext = this.board[row][col + 1].getData('type');
                    if (typeCurrent === typeNext) {
                        matchLen++;
                    } else {
                        checkNext = true;
                    }
                }

                if (checkNext) {
                    if (matchLen >= 3) {
                        let set = [];
                        for (let i = 0; i < matchLen; i++) {
                            set.push(this.board[row][col - i]);
                        }
                        sets.push({ tiles: set, type: 'horizontal', len: matchLen });
                        matches.push(...set);
                    }
                    matchLen = 1;
                }
            }
        }

        // Check vertical
        for (let col = 0; col < this.gridSize; col++) {
            let matchLen = 1;
            for (let row = 0; row < this.gridSize; row++) {
                let checkNext = false;
                if (row === this.gridSize - 1) {
                    checkNext = true;
                } else {
                    const typeCurrent = this.board[row][col].getData('type');
                    const typeNext = this.board[row + 1][col].getData('type');
                    if (typeCurrent === typeNext) {
                        matchLen++;
                    } else {
                        checkNext = true;
                    }
                }

                if (checkNext) {
                    if (matchLen >= 3) {
                        let set = [];
                        for (let i = 0; i < matchLen; i++) {
                            set.push(this.board[row - i][col]);
                        }
                        sets.push({ tiles: set, type: 'vertical', len: matchLen });
                        matches.push(...set);
                    }
                    matchLen = 1;
                }
            }
        }

        return { unique: [...new Set(matches)], sets: sets };
    }

    handleMatches(matchResult) {
        let matches = matchResult.unique;
        const sets = matchResult.sets;

        // Check for power-up triggers in the matches
        let additionalMatches = [];
        matches.forEach(tile => {
            const powerType = tile.getData('powerUp');
            if (powerType) {
                additionalMatches.push(...this.triggerPowerUp(tile, powerType));
            }
        });

        if (additionalMatches.length > 0) {
            matches = [...new Set([...matches, ...additionalMatches])];
        }

        this.score += matches.length * 10;
        this.events.emit('updateScore', this.score);

        // Check for Logo matches
        if (this.objectiveType === 'match_logo') {
            sets.forEach(set => {
                const firstTile = set.tiles[0];
                if (firstTile.getData('type') === 'logo') {
                    this.logoMatchesMade++;
                    const remaining = Math.max(0, this.logoMatchesToClear - this.logoMatchesMade);
                    this.events.emit('updateObjective', `Logos: ${remaining}`);
                }
            });
        }

        // Check for power-ups to CREATE
        let powerUpToCreate = null;

        // Detect Wrapped (intersecting sets)
        let intersectingTiles = this.findIntersectingTiles(sets);
        if (intersectingTiles.length > 0) {
            let posTile = intersectingTiles[0];
            powerUpToCreate = {
                type: 'wrapped',
                r: posTile.getData('row'),
                c: posTile.getData('col'),
                flavor: posTile.getData('type')
            };
        } else {
            sets.forEach(set => {
                if (set.len === 4) {
                    let posTile = set.tiles[0];
                    powerUpToCreate = {
                        type: set.type === 'horizontal' ? 'striped_v' : 'striped_h',
                        r: posTile.getData('row'),
                        c: posTile.getData('col'),
                        flavor: posTile.getData('type')
                    };
                } else if (set.len >= 5) {
                    let posTile = set.tiles[0];
                    powerUpToCreate = {
                        type: 'color_bomb',
                        r: posTile.getData('row'),
                        c: posTile.getData('col'),
                        flavor: 'any'
                    };
                }
            });
        }

        // Animate disappearance
        if (matches.length > 0) {
            // Particle effect at the center of the match
            let centerX = 0;
            let centerY = 0;
            matches.forEach(t => { centerX += t.x; centerY += t.y; });
            centerX /= matches.length;
            centerY /= matches.length;

            this.particleManager.emitParticleAt(centerX, centerY, 10);

            if (this.sound.get('match')) this.sound.play('match');

            // Combo Text
            if (matches.length > 3) {
                const phrases = ['¡SABROSO!', '¡GENIAL!', '¡CRUJIENTE!', '¡CALIENTITO!'];
                const text = Phaser.Utils.Array.GetRandom(phrases);
                this.showFloatingText(centerX, centerY, text);
            }
        }

        this.tweens.add({
            targets: matches,
            scaleX: 0,
            scaleY: 0,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                matches.forEach(tile => {
                    const r = tile.getData('row'); // Capture r and c before tile is destroyed
                    const c = tile.getData('col');
                    if (this.board[r][c] === tile) {
                        this.board[r][c] = null;
                        // POOLING: Return to pool instead of destroy
                        tile.setActive(false);
                        tile.setVisible(false);
                        this.empanadaPool.killAndHide(tile);
                    }
                });

                if (powerUpToCreate) {
                    const r = powerUpToCreate.r;
                    const c = powerUpToCreate.c;

                    let spriteKey = powerUpToCreate.flavor;
                    if (powerUpToCreate.type.startsWith('striped')) spriteKey = 'special_striped';
                    else if (powerUpToCreate.type === 'wrapped') spriteKey = 'special_wrapped';
                    else if (powerUpToCreate.type === 'color_bomb') spriteKey = 'special_bomb';

                    // For the background color, use the flavor color unless it's a color bomb
                    let bgColorKey = powerUpToCreate.flavor === 'any' ? 'special_bomb' : powerUpToCreate.flavor;

                    // Create (get from pool)
                    let newTile = this.createEmpanada(r, c, this.boardOffsetX, this.boardOffsetY, spriteKey, bgColorKey);
                    this.board[r][c] = newTile;
                    newTile.setData('powerUp', powerUpToCreate.type);
                    newTile.setData('type', powerUpToCreate.flavor); // Keep original flavor for matching

                    // Formation Animation
                    newTile.setScale(0);
                    this.tweens.add({
                        targets: newTile,
                        scaleX: 1.2,
                        scaleY: 1.2,
                        duration: 200,
                        yoyo: true,
                        ease: 'Back.easeOut',
                        onComplete: () => {
                            newTile.setScale(1);
                        }
                    });

                    // Visual indicator for powerup
                    let bg = newTile.getData('bg');
                    if (powerUpToCreate.type.startsWith('striped')) {
                        bg.lineStyle(6, 0xffffff, 1);
                        bg.strokeRect(-this.tileSize / 2, -5, this.tileSize, 10);
                        if (powerUpToCreate.type === 'striped_h') bg.setRotation(Math.PI / 2);
                    } else if (powerUpToCreate.type === 'wrapped') {
                        bg.lineStyle(6, 0xffffff, 1);
                        bg.strokeCircle(0, 0, this.tileSize / 2.5);
                    } else if (powerUpToCreate.type === 'color_bomb') {
                        bg.clear();
                        bg.fillGradientStyle(0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 1);
                        bg.fillCircle(0, 0, this.tileSize / 2);
                    }
                }

                this.dropTiles();
            }
        });
    }

    triggerPowerUp(tile, type) {
        let affected = [];
        const row = tile.getData('row');
        const col = tile.getData('col');

        // Screen Shake (Juice)
        this.cameras.main.shake(200, 0.01);

        if (type === 'striped_h') {
            for (let c = 0; c < this.gridSize; c++) {
                if (this.board[row][c]) affected.push(this.board[row][c]);
            }
        } else if (type === 'striped_v') {
            for (let r = 0; r < this.gridSize; r++) {
                if (this.board[r][col]) affected.push(this.board[r][col]);
            }
        } else if (type === 'wrapped') {
            for (let r = row - 1; r <= row + 1; r++) {
                for (let c = col - 1; c <= col + 1; c++) {
                    if (r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize) {
                        if (this.board[r][c]) affected.push(this.board[r][c]);
                    }
                }
            }
        } else if (type === 'color_bomb') {
            const flavorMatch = tile.getData('type');
            for (let r = 0; r < this.gridSize; r++) {
                for (let c = 0; c < this.gridSize; c++) {
                    if (this.board[r][c] && this.board[r][c].getData('type') === flavorMatch) {
                        affected.push(this.board[r][c]);
                    }
                }
            }
        }
        return affected;
    }

    findIntersectingTiles(sets) {
        let hSets = sets.filter(s => s.type === 'horizontal');
        let vSets = sets.filter(s => s.type === 'vertical');
        let intersections = [];

        hSets.forEach(h => {
            vSets.forEach(v => {
                h.tiles.forEach(ht => {
                    v.tiles.forEach(vt => {
                        if (ht === vt) intersections.push(ht);
                    });
                });
            });
        });
        return intersections;
    }

    update(time, delta) {
        if (!this.isProcessing && this.moves > 0 && !this.levelManager.isGameOver) {
            // Timer Logic
            this.moveTimeLeft -= delta;
            this.timerText.setText(Math.ceil(this.moveTimeLeft / 1000));

            if (this.moveTimeLeft <= 5000) {
                this.timerText.setStyle({ fill: '#ff0000' });
                this.timerText.setScale(1.2); // Pulse warning
            } else {
                this.timerText.setStyle({ fill: '#ffffff' });
                this.timerText.setScale(1);
            }

            if (this.moveTimeLeft <= 0) {
                this.moveTimeLeft = 15000;
                this.moves--;
                this.events.emit('updateMoves', this.moves);
                this.showFloatingText(this.game.config.width / 2, this.game.config.height / 2, '¡TIEMPO!');
                this.checkGameOver();
            }

            // Standard Idle/Hint Logic
            this.idleTimer += delta;
            if (this.idleTimer > 5000 && !this.hintTween) {
                this.showHint();
            }
        } else {
            this.resetIdleTimer();
        }
    }

    resetIdleTimer() {
        this.idleTimer = 0;
        this.moveTimeLeft = 15000; // Reset move timer on interaction
        if (this.timerText) this.timerText.setText('15');

        if (this.hintTween) {
            this.hintTween.stop();
            this.hintTiles.forEach(t => {
                if (t && t.active) {
                    t.setScale(1);
                    t.setAngle(0);
                    t.setAlpha(1); // Restore container alpha 

                    let bg = t.getData('bg');
                    if (bg) bg.setAlpha(1); // Restore background alpha
                }
            });
            this.hintTween = null;
            this.hintTiles = [];
        }
    }

    showHint() {
        const moves = this.findPossibleMoves();
        if (moves.length > 0) {
            const randomMove = Phaser.Utils.Array.GetRandom(moves);
            this.hintTiles = [randomMove.tile1, randomMove.tile2];
            this.hintTween = this.tweens.add({
                targets: this.hintTiles,
                angle: { from: -5, to: 5 },
                scale: 1.1,
                duration: 200,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    dropTiles() {
        let maxDrop = 0;

        for (let col = 0; col < this.gridSize; col++) {
            let emptySpaces = 0;
            for (let row = this.gridSize - 1; row >= 0; row--) {
                if (this.board[row][col] === null) {
                    emptySpaces++;
                } else if (emptySpaces > 0) {
                    let tile = this.board[row][col];
                    const newRow = row + emptySpaces;
                    this.board[newRow][col] = tile;
                    this.board[row][col] = null;
                    tile.setData('row', newRow);

                    const newY = this.boardOffsetY + newRow * (this.tileSize + this.tileSpacing);
                    maxDrop = Math.max(maxDrop, emptySpaces);

                    this.tweens.add({
                        targets: tile,
                        y: newY,
                        duration: emptySpaces * 100,
                        ease: 'Bounce.easeOut'
                    });
                }
            }

            // Fill top with new tiles
            if (emptySpaces > 0) {
                maxDrop = Math.max(maxDrop, emptySpaces + 4); // Added padding for refill
            }
            for (let i = 0; i < emptySpaces; i++) {
                const row = emptySpaces - 1 - i;
                let empanada = this.createEmpanada(row, col, this.boardOffsetX, this.boardOffsetY);
                this.board[row][col] = empanada;

                const finalY = empanada.y;
                empanada.y -= 600;

                this.tweens.add({
                    targets: empanada,
                    y: finalY,
                    duration: 400 + i * 100,
                    ease: 'Bounce.easeOut'
                });
            }
        }

        // Wait for drops and check for new matches
        this.time.delayedCall(maxDrop * 150 + 200, () => {
            const matchResult = this.getAllMatches();
            if (matchResult.unique.length > 0) {
                this.handleMatches(matchResult);
            } else {
                this.isProcessing = false;
                if (this.selectedTile) this.selectedTile.setAlpha(1);

                if (!this.findPossibleMoves().length) {
                    this.reshuffleBoard();
                } else {
                    this.checkGameOver();
                }
            }
        });
    }

    findPossibleMoves() {
        let possibleMoves = [];
        for (let r = 0; r < this.gridSize; r++) {
            for (let c = 0; c < this.gridSize; c++) {
                const tile1 = this.board[r][c];
                if (!tile1 || tile1.getData('isObstacle')) continue;

                // Check right
                if (c < this.gridSize - 1) {
                    const tile2 = this.board[r][c + 1];
                    if (tile2 && !tile2.getData('isObstacle')) {
                        if (this.checkSwapMatches(r, c, r, c + 1)) {
                            possibleMoves.push({ tile1, tile2 });
                        }
                    }
                }
                // Check down
                if (r < this.gridSize - 1) {
                    const tile2 = this.board[r + 1][c];
                    if (tile2 && !tile2.getData('isObstacle')) {
                        if (this.checkSwapMatches(r, c, r + 1, c)) {
                            possibleMoves.push({ tile1, tile2 });
                        }
                    }
                }
            }
        }
        return possibleMoves;
    }

    checkSwapMatches(r1, c1, r2, c2) {
        // Temporary swap
        const temp = this.board[r1][c1];
        this.board[r1][c1] = this.board[r2][c2];
        this.board[r2][c2] = temp;

        const hasMatch = this.getAllMatches().unique.length > 0;

        // Swap back
        this.board[r2][c2] = this.board[r1][c1];
        this.board[r1][c1] = temp;

        return hasMatch;
    }

    reshuffleBoard() {
        this.isProcessing = true;
        AlertManager.show({
            title: '¡SIN MOVIMIENTOS!',
            message: 'Mezclando el tablero...',
            buttonText: '¡DALE!',
            type: 'win',
            callback: () => {
                let tiles = [];
                for (let r = 0; r < this.gridSize; r++) {
                    for (let c = 0; c < this.gridSize; c++) {
                        if (this.board[r][c] && !this.board[r][c].getData('isObstacle')) {
                            tiles.push(this.board[r][c]);
                        }
                    }
                }

                Phaser.Utils.Array.Shuffle(tiles);

                let tileIndex = 0;
                for (let r = 0; r < this.gridSize; r++) {
                    for (let c = 0; c < this.gridSize; c++) {
                        if (this.board[r][c] && !this.board[r][c].getData('isObstacle')) {
                            const tile = tiles[tileIndex++];
                            this.board[r][c] = tile;
                            tile.setData('row', r);
                            tile.setData('col', c);

                            const newX = this.boardOffsetX + c * (this.tileSize + this.tileSpacing);
                            const newY = this.boardOffsetY + r * (this.tileSize + this.tileSpacing);

                            this.tweens.add({
                                targets: tile,
                                x: newX,
                                y: newY,
                                duration: 500,
                                ease: 'Back.easeOut'
                            });
                        }
                    }
                }

                this.time.delayedCall(600, () => {
                    if (!this.findPossibleMoves().length) {
                        this.reshuffleBoard();
                    } else {
                        this.isProcessing = false;
                        this.checkGameOver();
                    }
                });
            }
        });
    }

    // resolveInitialMatches replaced by generateValidBoard above

    checkGameOver() {
        const isWin = this.objectiveType === 'score'
            ? this.score >= this.objectiveValue
            : this.logoMatchesMade >= this.objectiveValue;

        if (this.moves <= 0 && !isWin) {
            AlertManager.show({
                title: '¡PERDISTE!',
                message: `Te quedaste cerca.<br><br>Puntaje final:<br><span style="font-size: 24px; color: #ffcc00; font-weight: bold;">${this.score}</span>`,
                buttonText: 'REINTENTAR',
                type: 'loss',
                callback: () => this.scene.restart()
            });
        } else if (isWin) {
            if (this.sound.get('win')) this.sound.play('win');

            // Como solo hay 1 nivel, ganaste el juego y el premio
            AlertManager.show({
                title: '¡GANASTE!',
                message: '¡Felicidades! Ganaste un<br><span style="color: #ffcc00; font-weight: bold; font-size: 22px;">COMBO DE 2 EMPANADAS</span><br><br><img src="assets/logo/Logo Mi Gusto 2025.png" style="width: 150px; height: auto;">',
                buttonText: 'RECLAMAR PREMIO',
                type: 'win',
                callback: () => {
                    // Aquí podrías redirigir a un formulario o mostrar un código
                    // Por ahora, reiniciamos para que puedan jugar de nuevo
                    this.scene.restart();
                }
            });
        }
    }

    showFloatingText(x, y, message) {
        let text = this.add.text(x, y, message, {
            fontFamily: 'Chewy',
            fontSize: '40px',
            fill: '#ffcc00',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.tweens.add({
            targets: text,
            y: y - 100,
            alpha: 0,
            scale: 1.5,
            duration: 800,
            ease: 'Back.easeOut',
            onComplete: () => text.destroy()
        });
    }

    makeBestMove() {
        // Simple AI: Find first available move and take it
        const moves = this.findPossibleMoves();
        if (moves.length > 0) {
            // Prioritize moves that create powerups if possible, otherwise random
            // For now random is fine as "panic move"
            const move = Phaser.Utils.Array.GetRandom(moves);

            // Visual feedback of auto-move
            this.showFloatingText(move.tile1.x, move.tile1.y, '¡TIEMPO!');

            this.swapTiles(move.tile1, move.tile2);
        } else {
            // Should reshuffle if no moves, handled by normal logic but forced here
            this.reshuffleBoard();
        }
    }
}
