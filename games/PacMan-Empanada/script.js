let width = 800;
let height = 625;
let gridSize = 32;
let offset = parseInt(gridSize / 2);
let config = {
    type: Phaser.CANVAS,
    width: width,
    height: height,
    canvas: document.getElementById("mycanvas"),
    physics: {
        default: "arcade",
        arcade: {
            debug: false,
            gravity: {
                x: 0,
                y: 0
            }
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

let gameRunning = false;
let startButton = document.getElementById("start-btn");
let startScreen = document.getElementById("start-screen");

startButton.addEventListener("click", function () {
    startScreen.classList.add("hidden");
    gameRunning = true;
    newGame();
});


let game = new Phaser.Game(config);

let cursors;
let player;
let ghosts = [];
let pills;
let pillsCount = 0;
let pillsAte = 0;
let map;
let layer1;
let layer2;
let graphics;
let scoreText;
let livesImage = [];
let tiles = "pacman-tiles";
let winScreen = document.getElementById("win-screen");
let restartButton = document.getElementById("restart-btn");
let gameOverScreen = document.getElementById("gameover-screen");
let retryButton = document.getElementById("retry-btn");

restartButton.addEventListener("click", function () {
    winScreen.classList.add("hidden");
    gameRunning = true;
    newGame();
});

retryButton.addEventListener("click", function () {
    gameOverScreen.classList.add("hidden");
    startScreen.classList.remove("hidden");
    newGame();
    gameRunning = false; // Stop game loop until "COMENZAR" is clicked
});
let spritesheet = "pacman-spritesheet";
let spritesheetPath = "https://raw.githubusercontent.com/kudchikarsk/phaser-pacman/master/assets/images/pacmansprites.png";
let tilesPath = "https://raw.githubusercontent.com/kudchikarsk/phaser-pacman/master/assets/images/background.png";
let mapPath =
    "https://raw.githubusercontent.com/kudchikarsk/phaser-pacman/master/assets/levels/codepen-level.json";

// Touch Control Listeners
document.getElementById('btn-up').addEventListener('pointerdown', () => player.queueTurn(Phaser.UP));
document.getElementById('btn-down').addEventListener('pointerdown', () => player.queueTurn(Phaser.DOWN));
document.getElementById('btn-left').addEventListener('pointerdown', () => player.queueTurn(Phaser.LEFT));
document.getElementById('btn-right').addEventListener('pointerdown', () => player.queueTurn(Phaser.RIGHT));

let Animation = {
    Player: {
        Eat: "player-eat",
        Stay: "player-stay",
        Die: "player-die"
    },
    Ghost: {
        Blue: {
            Move: "ghost-blue-move"
        },

        Orange: {
            Move: "ghost-orange-move"
        },

        White: {
            Move: "ghost-white-move"
        },

        Pink: {
            Move: "ghost-pink-move"
        },

        Red: {
            Move: "ghost-red-move"
        }
    }
};

function preload() {
    this.load.spritesheet(spritesheet, spritesheetPath, {
        frameWidth: gridSize,
        frameHeight: gridSize
    });
    this.load.tilemapTiledJSON("map", mapPath);
    this.load.image(tiles, tilesPath);
    this.load.image("pill", "https://raw.githubusercontent.com/kudchikarsk/phaser-pacman/master/assets/images/pac%20man%20pill/spr_pill_0.png");
    this.load.image("lifecounter", "https://raw.githubusercontent.com/kudchikarsk/phaser-pacman/master/assets/images/pac%20man%20life%20counter/spr_lifecounter_0.png");
    this.load.image("pacman-empanada", "pacman-empanada.png");
    this.load.image("pacman-empanada2", "pacman-empanada2.png");
    this.load.image("ghost1", "fantasma-empanada1.png");
    this.load.image("ghost2", "fantasma-empanada2.png");
    this.load.image("ghost3", "fantasma-empanada3.png");
    this.load.image("ghost4", "fantasma-empanada4.png");
}

function create() {
    this.anims.create({
        key: Animation.Player.Eat,
        frames: [
            { key: "pacman-empanada" },
            { key: "pacman-empanada2" }
        ],
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: Animation.Player.Stay,
        frames: [{ key: "pacman-empanada" }],
        frameRate: 20
    });

    this.anims.create({
        key: Animation.Player.Die,
        frames: [{ key: "pacman-empanada" }],
        frameRate: 1
    });

    this.anims.create({
        key: Animation.Ghost.Blue.Move,
        frames: [{ key: "ghost1" }],
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: Animation.Ghost.Orange.Move,
        frames: [{ key: "ghost3" }],
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: Animation.Ghost.White.Move,
        frames: [{ key: "ghost3" }], // Reusing ghost3 or should I use one of the others? The request gave 4 images.
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: Animation.Ghost.Pink.Move,
        frames: [{ key: "ghost4" }],
        frameRate: 10,
        repeat: -1
    });

    this.anims.create({
        key: Animation.Ghost.Red.Move,
        frames: [{ key: "ghost2" }],
        frameRate: 10,
        repeat: -1
    });

    map = this.make.tilemap({
        key: "map",
        tileWidth: gridSize,
        tileHeight: gridSize
    });
    const tileset = map.addTilesetImage(tiles);

    layer1 = map.createStaticLayer("Layer 1", tileset, 0, 0);
    layer1.setCollisionByProperty({ collides: true });

    layer2 = map.createStaticLayer("Layer 2", tileset, 0, 0);
    layer2.setCollisionByProperty({ collides: true });

    let spawnPoint = map.findObject("Objects", obj => obj.name === "Player");
    let position = new Phaser.Geom.Point(
        spawnPoint.x + offset,
        spawnPoint.y - offset
    );
    player = new Player(this, position, Animation.Player, function () {
        if (player.life <= 0) {
            // Game Over - Lose
            gameRunning = false;
            gameOverScreen.classList.remove("hidden");
        } else {
            respawn();
        }
    });

    let scene = this;

    pills = this.physics.add.group();
    map.filterObjects("Objects", function (value, index, array) {
        if (value.name == "Pill") {
            let pill = scene.physics.add.sprite(
                value.x + offset,
                value.y - offset,
                "pill"
            );
            pills.add(pill);
            pillsCount++;
        }
    });

    let ghostsGroup = this.physics.add.group();
    let i = 0;
    let skins = [
        Animation.Ghost.Blue,
        Animation.Ghost.Red,
        Animation.Ghost.Orange,
        Animation.Ghost.Pink
    ];

    // Find all safe tiles for random spawning
    let safeTiles = [];
    layer1.forEachTile(function (tile) {
        if (tile.index === 19 || tile.index === 18 || tile.index === -1) { // -1 is open space
            // ONLY Allow spawning in the middle section (Ghost house and surroundings)
            // This prevents them from spawning in isolated decorative areas on the far right/left
            if (tile.x >= 5 && tile.x <= 20 && tile.y >= 5 && tile.y <= 15) {
                safeTiles.push({ x: tile.pixelX + offset, y: tile.pixelY + offset });
            }
        }
    });

    map.filterObjects("Objects", function (value, index, array) {
        if (value.name == "Ghost") {
            let position;
            if (safeTiles.length > 0) {
                // Pick random safe tile
                let randTile = Phaser.Math.RND.pick(safeTiles);
                position = new Phaser.Geom.Point(randTile.x, randTile.y);
            } else {
                position = new Phaser.Geom.Point(value.x + offset, value.y - offset);
            }

            let ghost = new Ghost(scene, position, skins[i]);
            ghosts.push(ghost);
            ghostsGroup.add(ghost.sprite);
            i++;
        }
    });

    this.physics.add.collider(player.sprite, layer1);
    this.physics.add.collider(player.sprite, layer2);
    this.physics.add.collider(ghostsGroup, layer1);
    this.physics.add.collider(ghostsGroup, layer2); // Add collision with layer 2 for ghosts too
    this.physics.add.overlap(
        player.sprite,
        pills,
        function (sprite, pill) {
            pill.disableBody(true, true);
            pillsAte++;
            player.score += 10;
            if (pillsCount == pillsAte) {
                // Game Over - Win
                gameRunning = false;
                winScreen.classList.remove("hidden");
            }
        },
        null,
        this
    );

    this.physics.add.overlap(
        player.sprite,
        ghostsGroup,
        function (sprite, ghostSprite) {
            if (player.active) {
                player.die();
                for (let ghost of ghosts) {
                    ghost.freeze();
                }
            }
        },
        null,
        this
    );

    cursors = this.input.keyboard.createCursorKeys();

    graphics = this.add.graphics();

    scoreText = this.add
        .text(25, 595, "Score: " + player.score)
        .setFontFamily("Arial")
        .setFontSize(18)
        .setColor("#ffffff");
    this.add
        .text(630, 595, "Lives:")
        .setFontFamily("Arial")
        .setFontSize(18)
        .setColor("#ffffff");
    for (let i = 0; i < player.life; i++) {
        livesImage.push(this.add.image(700 + i * 25, 605, "pacman-empanada").setScale(0.027));
    }

    // Auto-start game since we hid the start screen
    gameRunning = true;
    newGame();
}


function respawn() {
    player.respawn();
    for (let ghost of ghosts) {
        ghost.respawn();
    }
}

function reset() {
    respawn();
    for (let child of pills.getChildren()) {
        child.enableBody(false, child.x, child.y, true, true);
    }
    pillsAte = 0;
}

function newGame() {
    reset();
    player.life = 1; // Set to 1 Life as requested
    player.score = 0;
    for (let i = 0; i < player.life; i++) {
        let image = livesImage[i];
        if (image) {
            image.alpha = 1;
        }
    }
}

function update() {
    if (!gameRunning) return;

    player.setDirections(getDirection(map, layer1, player.sprite));

    player.setDirections(getDirection(map, layer1, player.sprite));

    // Remove ghost freeze logic dependent on player.playing
    // Ghosts should always move if gameRunning is true.

    for (let ghost of ghosts) {
        ghost.setDirections(getDirection(map, layer1, ghost.sprite));
    }

    player.setTurningPoint(getTurningPoint(map, player.sprite));

    for (let ghost of ghosts) {
        ghost.setTurningPoint(getTurningPoint(map, ghost.sprite));
    }

    if (cursors.left.isDown) {
        player.queueTurn(Phaser.LEFT);
    } else if (cursors.right.isDown) {
        player.queueTurn(Phaser.RIGHT);
    } else if (cursors.up.isDown) {
        player.queueTurn(Phaser.UP);
    } else if (cursors.down.isDown) {
        player.queueTurn(Phaser.DOWN);
    }

    player.update();

    for (let ghost of ghosts) {
        ghost.update();
        this.physics.world.wrap(ghost.sprite);
    }

    this.physics.world.wrap(player.sprite);

    scoreText.setText("Score: " + player.score);

    for (let i = player.life; i < 3; i++) {
        let image = livesImage[i];
        if (image) {
            image.alpha = 0;
        }
    }

    if (player.active) {
        if (player.sprite.x < 0 - offset) {
            player.sprite.setPosition(width + offset, player.sprite.y);
        } else if (player.sprite.x > width + offset) {
            player.sprite.setPosition(0 - offset, player.sprite.y);
        }
    }

    //drawDebug();
}

function drawDebug() {
    graphics.clear();
    player.drawDebug(graphics);
    for (let ghost of ghosts) {
        ghost.drawDebug(graphics);
    }
}

function getDirection(map, layer, sprite) {
    let directions = [];
    let sx = Phaser.Math.FloorTo(sprite.x);
    let sy = Phaser.Math.FloorTo(sprite.y);
    let currentTile = map.getTileAtWorldXY(sx, sy, true);
    if (currentTile) {
        var x = currentTile.x;
        var y = currentTile.y;

        directions[Phaser.LEFT] = map.getTileAt(x - 1, y, true, layer);
        directions[Phaser.RIGHT] = map.getTileAt(x + 1, y, true, layer);
        directions[Phaser.UP] = map.getTileAt(x, y - 1, true, layer);
        directions[Phaser.DOWN] = map.getTileAt(x, y + 1, true, layer);
    }

    return directions;
}

function getTurningPoint(map, sprite) {
    let turningPoint = new Phaser.Geom.Point();
    let sx = Phaser.Math.FloorTo(sprite.x);
    let sy = Phaser.Math.FloorTo(sprite.y);
    let currentTile = map.getTileAtWorldXY(sx, sy, true);
    if (currentTile) {
        turningPoint.x = currentTile.pixelX + offset;
        turningPoint.y = currentTile.pixelY + offset;
    }

    return turningPoint;
}

class Ghost {
    constructor(scene, position, anim) {
        this.sprite = scene.physics.add
            .sprite(position.x, position.y, "ghost1")
            .setScale(0.030)
            .setOrigin(0.5);
        this.spawnPoint = position;
        this.anim = anim;
        this.speed = 130;
        this.moveTo = new Phaser.Geom.Point();
        this.safetile = [-1, 18, 19, 20]; // Added 20 for the ghost gate / red line

        // Optimize physics body for no-stick movement
        // Circle body smaller than tile (32px) prevents snagging on corners
        let radius = 10; // 20px diameter (tile is 32px)
        this.sprite.body.setCircle(radius, (this.sprite.width - radius * 2) / 2, (this.sprite.height - radius * 2) / 2);

        this.directions = [];
        this.opposites = [
            null,
            null,
            null,
            null,
            null,
            Phaser.DOWN,
            Phaser.UP,
            Phaser.RIGHT,
            Phaser.LEFT
        ];
        this.current = Phaser.NONE;
        this.turning = Phaser.NONE;
        this.turningPoint = new Phaser.Geom.Point();
        this.threshold = 8; // Smaller threshold for precision
        this.rnd = new Phaser.Math.RandomDataGenerator();
        this.sprite.anims.play(anim.Move, true);
        this.turnCount = 0;
        this.turnAtTime = [4, 8, 16, 32, 64];
        this.turnAt = this.rnd.pick(this.turnAtTime);
        this.lastPosition = new Phaser.Geom.Point(0, 0);
        this.stuckTimer = 0;
        this.lastTurnedTile = { x: -1, y: -1 };
    }

    freeze() {
        this.moveTo = new Phaser.Geom.Point();
        this.current = Phaser.NONE;
    }

    move() {
        this.move(this.rnd.pick([Phaser.UP, Phaser.DOWN]));
    }

    respawn() {
        // Random respawn on death too? Or keep original spawn point?
        // User asked for random places, usually means Start. But respawning at same spot is boring.
        // Let's respawn at original spawnPoint (which was random chosen at start).
        // Or re-roll? Re-rolling might spawn on top of player.
        // Let's stick to using the constructor-assigned spawnPoint for now, but that spawnPoint IS random.

        this.sprite.setPosition(this.spawnPoint.x, this.spawnPoint.y);
        // this.move(this.rnd.pick([Phaser.UP, Phaser.DOWN])); // Old logic
        this.current = Phaser.NONE; // Reset current direction
        this.moveTo = new Phaser.Geom.Point(); // Reset velocity
        this.sprite.flipX = false;
        // The update loop will call chase() because current is NONE or unsafe, picking a visual direction
        // But better to force a valid move start?
        // Let's just set it to NONE and let update/chase handle it, OR pick a random SAFE neighbor.
        // Actually, if we set current to NONE, update() checking this.directions[this.current] might fail if current is NONE?
        // this.directions[Phaser.NONE] is undefined.
        // So we should pick a valid direction.

        this.move(Phaser.LEFT); // Default start direction? Or let chase figure it out?
        // Better:
        this.move(this.rnd.pick([Phaser.LEFT, Phaser.RIGHT])); // Try horizontal first?
    }

    moveLeft() {
        this.moveTo.x = -1;
        this.moveTo.y = 0;
        this.sprite.flipX = true;
        this.sprite.angle = 0;
    }

    moveRight() {
        this.moveTo.x = 1;
        this.moveTo.y = 0;
        this.sprite.flipX = false;
        this.sprite.angle = 0;
    }

    moveUp() {
        this.moveTo.x = 0;
        this.moveTo.y = -1;
        this.sprite.angle = 0;
    }

    moveDown() {
        this.moveTo.x = 0;
        this.moveTo.y = 1;
        this.sprite.angle = 0;
    }

    update() {
        // Detect if stuck
        if (Math.abs(this.sprite.x - this.lastPosition.x) < 0.1 && Math.abs(this.sprite.y - this.lastPosition.y) < 0.1) {
            this.stuckTimer++;
            if (this.stuckTimer > 30) { // 0.5 seconds stuck
                this.chase();
                this.stuckTimer = 0;
            }
        } else {
            this.stuckTimer = 0;
        }

        // Hard recovery: If really stuck (e.g. physics glitch), jump to current tile center
        if (this.stuckTimer > 60) {
            let tx = Phaser.Math.FloorTo(this.sprite.x / 32) * 32 + 16;
            let ty = Phaser.Math.FloorTo(this.sprite.y / 32) * 32 + 16;
            this.sprite.setPosition(tx, ty);
            this.sprite.body.reset(tx, ty);
            this.chase();
            this.stuckTimer = 0;
        }

        this.lastPosition.x = this.sprite.x;
        this.lastPosition.y = this.sprite.y;

        this.sprite.setVelocity(
            this.moveTo.x * this.speed,
            this.moveTo.y * this.speed
        );

        this.turn();

        // Blocked check
        if (
            this.directions[this.current] &&
            !this.isSafe(this.directions[this.current].index)
        ) {
            // If we hit a wall/unsafe tile
            if (this.turning !== Phaser.NONE) {
                // We were trying to turn? Force it if close enough.
                if (Phaser.Math.Within(this.sprite.x, this.turningPoint.x, this.threshold * 2) &&
                    Phaser.Math.Within(this.sprite.y, this.turningPoint.y, this.threshold * 2)) {
                    this.sprite.setPosition(this.turningPoint.x, this.turningPoint.y);
                    this.move(this.turning);
                    this.turning = Phaser.NONE;
                } else {
                    this.chase(); // Recalculate if we hit a wall before turning
                }
            } else {
                this.chase();
            }
        }

        // Smart AI: Chase Player at intersections or if blocked
        let tx_tile = Phaser.Math.FloorTo(this.sprite.x / 32);
        let ty_tile = Phaser.Math.FloorTo(this.sprite.y / 32);

        if (
            this.current === Phaser.NONE ||
            (this.directions[this.current] && !this.isSafe(this.directions[this.current].index)) ||
            (tx_tile !== this.lastTurnedTile.x || ty_tile !== this.lastTurnedTile.y)
        ) {
            this.chase();
        }
    }
    chase() {
        let turns = [];
        for (let i = 0; i < this.directions.length; i++) {
            let direction = this.directions[i];
            if (direction) {
                if (this.isSafe(direction.index)) {
                    turns.push(i);
                }
            }
        }

        // Remove opposite direction to prevent oscillating, unless it's the only option
        if (turns.length > 1) {
            let index = turns.indexOf(this.opposites[this.current]);
            if (index > -1) {
                turns.splice(index, 1);
            }
        }

        let bestTurn = Phaser.NONE;
        let minDist = 999999;

        // 20% Randomness to make them not too perfect
        if (this.rnd.integerInRange(0, 100) < 20 && turns.length > 0) {
            this.setTurn(this.rnd.pick(turns));
            return;
        }

        for (let turn of turns) {
            let point = this.directions[turn];
            // Calculate distance to player from this potential new tile
            let dist = Phaser.Math.Distance.Between(point.x, point.y, player.sprite.x / 32, player.sprite.y / 32);

            if (dist < minDist) {
                minDist = dist;
                bestTurn = turn;
            }
        }

        if (bestTurn !== Phaser.NONE) {
            this.setTurn(bestTurn);
        } else if (turns.length > 0) {
            this.setTurn(turns[0]);
        } else {
            // Fallback: If no turns found (e.g. boxed in or errored), try any random safe direction from opposite
            let reverseDirection = this.opposites[this.current];
            if (reverseDirection && this.directions[reverseDirection] && this.isSafe(this.directions[reverseDirection].index)) {
                this.setTurn(reverseDirection);
            }
        }
    }

    setDirections(directions) {
        this.directions = directions;
    }

    setTurningPoint(turningPoint) {
        this.turningPoint = turningPoint;
    }

    setTurn(turnTo) {
        if (
            !this.directions[turnTo] ||
            this.turning === turnTo ||
            this.current === turnTo ||
            !this.isSafe(this.directions[turnTo].index)
        ) {
            return false;
        }

        if (this.opposites[turnTo] && this.opposites[turnTo] === this.current) {
            this.move(turnTo);
            this.turning = Phaser.NONE;
            this.turningPoint = new Phaser.Geom.Point();
        } else {
            this.turning = turnTo;
        }
    }

    takeRandomTurn() {
        let turns = [];
        for (let i = 0; i < this.directions.length; i++) {
            let direction = this.directions[i];
            if (direction) {
                if (this.isSafe(direction.index)) {
                    turns.push(i);
                }
            }
        }

        if (turns.length >= 2) {
            let index = turns.indexOf(this.opposites[this.current]);
            if (index > -1) {
                turns.splice(index, 1);
            }
        }

        if (turns.length > 0) {
            let turn = this.rnd.pick(turns);
            this.setTurn(turn);
        }

        this.turnCount = 0;
        this.turnAt = this.rnd.pick(this.turnAtTime);
    }

    turn() {
        if (this.turnCount === this.turnAt) {
            this.chase(); // Periodically re-evaluate path
        }
        this.turnCount++;

        if (this.turning === Phaser.NONE) {
            return false;
        }

        // Precision threshold for turning
        if (
            !Phaser.Math.Within(this.sprite.x, this.turningPoint.x, this.threshold) ||
            !Phaser.Math.Within(this.sprite.y, this.turningPoint.y, this.threshold)
        ) {
            return false;
        }

        // Snap to grid and reset physics body to ensure clean turn
        this.sprite.setPosition(this.turningPoint.x, this.turningPoint.y);
        this.sprite.body.reset(this.turningPoint.x, this.turningPoint.y);

        this.move(this.turning);

        let tx = Phaser.Math.FloorTo(this.sprite.x / 32);
        let ty = Phaser.Math.FloorTo(this.sprite.y / 32);
        this.lastTurnedTile = { x: tx, y: ty };

        this.turning = Phaser.NONE;
        this.turningPoint = new Phaser.Geom.Point();
        return true;
    }

    move(direction) {
        this.current = direction;

        switch (direction) {
            case Phaser.LEFT:
                this.moveLeft();
                break;
            case Phaser.RIGHT:
                this.moveRight();
                break;
            case Phaser.UP:
                this.moveUp();
                break;
            case Phaser.DOWN:
                this.moveDown();
                break;
        }
    }

    isSafe(index) {
        for (let i of this.safetile) {
            if (i === index) return true;
        }
        return false;
    }

    drawDebug(graphics) {
        let thickness = 4;
        let alpha = 1;
        let color = 0x00ff00;
        for (var t = 0; t < 9; t++) {
            if (this.directions[t] === null || this.directions[t] === undefined) {
                continue;
            }

            if (!this.isSafe(this.directions[t].index)) {
                color = 0xff0000;
            } else {
                color = 0x00ff00;
            }

            graphics.lineStyle(thickness, color, alpha);
            graphics.strokeRect(
                this.directions[t].pixelX,
                this.directions[t].pixelY,
                32,
                32
            );
        }

        color = 0x00ff00;
        graphics.lineStyle(thickness, color, alpha);
        graphics.strokeRect(this.turningPoint.x, this.turningPoint.y, 1, 1);
    }
}

class Player {
    constructor(scene, position, anim, dieCallback) {
        this.sprite = scene.physics.add
            .sprite(position.x, position.y, "pacman-empanada")
            .setScale(0.040)
            .setOrigin(0.5);

        // Robust physics body sizing
        // We ensure the body is a circle slightly smaller than the visual sprite to allow smooth cornering
        let s = this.sprite.width < this.sprite.height ? this.sprite.width : this.sprite.height;
        let radius = (s / 2) * 0.6; // Use 60% of the radius for safety/easier turning

        // Center the circle body within the sprite frame
        let offsetX = (this.sprite.width - (radius * 2)) / 2;
        let offsetY = (this.sprite.height - (radius * 2)) / 2;

        this.sprite.body.setCircle(radius, offsetX, offsetY);
        this.spawnPoint = position;
        this.anim = anim;
        this.dieCallback = dieCallback;
        this.speed = 95;
        this.moveTo = new Phaser.Geom.Point();
        this.sprite.angle = 180;
        this.moveTo = new Phaser.Geom.Point();
        this.sprite.angle = 180;
        this.safetile = [-1, 18, 19]; // Sync safe tiles
        this.directions = [];
        this.directions = [];
        this.opposites = [
            null,
            null,
            null,
            null,
            null,
            Phaser.DOWN,
            Phaser.UP,
            Phaser.RIGHT,
            Phaser.LEFT
        ];
        this.turning = Phaser.NONE;
        this.current = Phaser.NONE;
        this.current = Phaser.NONE;
        this.turningPoint = new Phaser.Geom.Point();
        this.threshold = 10; // Increased threshold for easier turning
        this.life = 3;
        this.score = 0;
        this.active = true;
        this.sprite.anims.play(this.anim.Stay, true);
        let ref = this;
        this.sprite.on(
            "animationcomplete",
            function (animation, frame) {
                ref.animComplete(animation, frame);
            },
            scene
        );
        this.playing = false;
        this.nextDirection = Phaser.NONE;
    }

    queueTurn(turnTo) {
        if (turnTo === Phaser.NONE) return;
        this.nextDirection = turnTo;
    }

    die() {
        this.active = false;
        this.playing = false;
        this.life--;
        this.moveTo = new Phaser.Geom.Point();
        this.sprite.anims.play(this.anim.Die, true);
    }

    animComplete(animation, frame) {
        if (animation.key == this.anim.Die) {
            this.dieCallback();
        }
    }

    respawn() {
        this.active = true;
        this.playing = false;
        this.sprite.setPosition(this.spawnPoint.x, this.spawnPoint.y);
        this.moveTo = new Phaser.Geom.Point();
        this.sprite.anims.play(this.anim.Stay, true);
        this.sprite.angle = 180;
        this.turning = Phaser.NONE;
        this.current = Phaser.NONE;
    }

    moveLeft() {
        this.moveTo.x = -1;
        this.moveTo.y = 0;
        this.sprite.anims.play(this.anim.Eat, true);
        this.sprite.angle = 180;
    }

    moveRight() {
        this.moveTo.x = 1;
        this.moveTo.y = 0;
        this.sprite.anims.play(this.anim.Eat, true);
        this.sprite.angle = 0;
    }

    moveUp() {
        this.moveTo.x = 0;
        this.moveTo.y = -1;
        this.sprite.anims.play(this.anim.Eat, true);
        this.sprite.angle = 270;
    }

    moveDown() {
        this.moveTo.x = 0;
        this.moveTo.y = 1;
        this.sprite.anims.play(this.anim.Eat, true);
        this.sprite.angle = 90;
    }

    update() {
        if (this.nextDirection !== Phaser.NONE) {
            if (this.setTurn(this.nextDirection)) {
                this.nextDirection = Phaser.NONE;
            }
        }

        this.sprite.setVelocity(
            this.moveTo.x * this.speed,
            this.moveTo.y * this.speed
        );
        this.turn();
        if (
            this.directions[this.current] &&
            !this.isSafe(this.directions[this.current].index)
        ) {
            this.sprite.anims.play("faceRight", true);
        }
    }

    setDirections(directions) {
        this.directions = directions;
    }

    setTurningPoint(turningPoint) {
        this.turningPoint = turningPoint;
    }

    setTurn(turnTo) {
        if (
            !this.active ||
            !this.directions[turnTo] ||
            this.turning === turnTo ||
            this.current === turnTo ||
            !this.isSafe(this.directions[turnTo].index)
        ) {
            return false;
        }

        if (this.opposites[turnTo] && this.opposites[turnTo] === this.current) {
            this.move(turnTo);
            this.turning = Phaser.NONE;
            this.turningPoint = new Phaser.Geom.Point();
            this.nextDirection = Phaser.NONE; // Clear buffer
            return true;
        } else {
            this.turning = turnTo;
            this.turningPoint = new Phaser.Geom.Point(); // Ensure turning point is fresh? No, turningPoint is set by setTurningPoint separately.
            // Wait, existing code didn't reset turningPoint here.
            // existing code:
            // } else {
            //    this.turning = turnTo;
            // }
            return true;
        }
    }

    turn() {
        if (this.turning === Phaser.NONE) {
            return false;
        }

        //  This needs a threshold, because at high speeds you can't turn because the coordinates skip past
        if (
            !Phaser.Math.Within(this.sprite.x, this.turningPoint.x, this.threshold) ||
            !Phaser.Math.Within(this.sprite.y, this.turningPoint.y, this.threshold)
        ) {
            return false;
        }

        this.sprite.setPosition(this.turningPoint.x, this.turningPoint.y);
        this.move(this.turning);
        this.turning = Phaser.NONE;
        this.turningPoint = new Phaser.Geom.Point();
        return true;
    }

    move(direction) {
        this.playing = true;
        this.current = direction;

        switch (direction) {
            case Phaser.LEFT:
                this.moveLeft();
                break;

            case Phaser.RIGHT:
                this.moveRight();
                break;

            case Phaser.UP:
                this.moveUp();
                break;

            case Phaser.DOWN:
                this.moveDown();
                break;
        }
    }

    isSafe(index) {
        for (let i of this.safetile) {
            if (i === index) return true;
        }

        return false;
    }

    drawDebug(graphics) {
        let thickness = 4;
        let alpha = 1;
        let color = 0x00ff00;

        for (var t = 0; t < 9; t++) {
            if (this.directions[t] === null || this.directions[t] === undefined) {
                continue;
            }

            if (this.directions[t].index !== -1) {
                color = 0xff0000;
            } else {
                color = 0x00ff00;
            }

            graphics.lineStyle(thickness, color, alpha);
            graphics.strokeRect(
                this.directions[t].pixelX,
                this.directions[t].pixelY,
                32,
                32
            );
        }

        color = 0x00ff00;
        graphics.lineStyle(thickness, color, alpha);
        graphics.strokeRect(this.turningPoint.x, this.turningPoint.y, 1, 1);
    }
}