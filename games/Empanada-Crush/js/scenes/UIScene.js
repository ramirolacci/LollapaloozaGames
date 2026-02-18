class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
    }

    create() {
        const gameScene = this.scene.get('GameScene');
        const bouncyStyle = { fontFamily: 'Chewy' };
        const roundedStyle = { fontFamily: 'Fredoka', fontWeight: '700' };

        // Score con animación de rolling
        this.displayScore = 0;
        this.scoreText = this.add.text(20, 20, 'Puntaje: 0', { ...bouncyStyle, fontSize: '48px', fill: '#ffffff' });
        this.movesText = this.add.text(20, 80, 'Movimientos: ' + gameScene.moves, { ...roundedStyle, fontSize: '28px', fill: '#cccccc' });
        this.objectiveText = this.add.text(20, 120, gameScene.objectiveDescription, { ...roundedStyle, fontSize: '22px', fill: '#ffcc00' });

        // Add Logo
        const logo = this.add.image(this.game.config.width - 20, 20, 'logo');
        logo.setOrigin(1, 0);
        logo.setDisplaySize(150, 60);
        logo.setAlpha(0);

        // Intro Animation for UI (GSAP Style) - Solo se activa tras el modal
        const { width, height } = this.game.config;
        this.instructionText = this.add.text(width / 2, height - 30, 'Desliza o toca para mover las piezas', {
            fontFamily: 'Fredoka',
            fontSize: '24px',
            fill: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);

        this.container = this.add.container(0, 0, [this.scoreText, this.movesText, this.objectiveText, this.instructionText]);
        this.container.x = -300;

        // Mostrar el Modal de Inicio
        this.showStartModal(gameScene, logo);

        // Listen for events from GameScene
        gameScene.events.on('updateScore', (score) => {
            this.tweens.add({
                targets: this,
                displayScore: score,
                duration: 500,
                ease: 'Quad.easeOut',
                onUpdate: () => {
                    this.scoreText.setText('Puntaje: ' + Math.floor(this.displayScore));
                }
            });

            // Punch effect on score
            this.tweens.add({
                targets: this.scoreText,
                scale: 1.2,
                duration: 100,
                yoyo: true,
                ease: 'Quad.easeOut'
            });
        });

        gameScene.events.on('updateMoves', (moves) => {
            this.movesText.setText('Movimientos: ' + moves);

            // Subtle punch on moves
            this.tweens.add({
                targets: this.movesText,
                scale: 1.1,
                duration: 100,
                yoyo: true,
                ease: 'Quad.easeOut'
            });
        });

        // Update objective description
        gameScene.events.on('updateObjective', (desc) => {
            this.objectiveText.setText(desc);
        });

        // Cheat Button (Invisible Zone over "P" of "Puntaje")
        // Located roughly at 20, 20 where scoreText starts
        let cheatZone = this.add.zone(20, 20, 50, 50).setOrigin(0).setInteractive();
        cheatZone.on('pointerdown', () => {
            gameScene.events.emit('cheatScore');
        });
    }

    showStartModal(gameScene, logo) {
        const { width, height } = this.game.config;

        // Overlay obscuro parcial para resaltar modal
        let overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.4);
        overlay.setAlpha(0);

        let modalContainer = this.add.container(width / 2, height / 2);
        modalContainer.setScale(0);

        let modalBg = this.add.graphics();
        modalBg.fillStyle(0x1a1a1a, 0.95);
        modalBg.fillRoundedRect(-200, -150, 400, 360, 20); // Height increased to 360
        modalBg.lineStyle(4, 0xffcc00, 1);
        modalBg.strokeRoundedRect(-200, -150, 400, 360, 20);
        modalContainer.add(modalBg);

        let title = this.add.text(0, -60, '¿Estás listo para\nel desafío?', {
            fontFamily: 'Chewy',
            fontSize: '32px',
            fill: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        modalContainer.add(title);

        let btnBg = this.add.graphics();
        btnBg.fillStyle(0xffcc00, 1);
        btnBg.fillRoundedRect(-100, 40, 200, 60, 15);
        modalContainer.add(btnBg);

        let btnText = this.add.text(0, 70, '¡COMENZAR!', {
            fontFamily: 'Fredoka',
            fontSize: '24px',
            fontWeight: '700',
            fill: '#000000'
        }).setOrigin(0.5);
        modalContainer.add(btnText);

        let hitArea = this.add.rectangle(0, 70, 200, 60, 0x000000, 0).setInteractive({ useHandCursor: true });
        modalContainer.add(hitArea);

        // Botón Menú Principal (Estilo secundario)
        let menuBtnBg = this.add.graphics();
        menuBtnBg.lineStyle(2, 0xffffff, 0.8);
        menuBtnBg.strokeRoundedRect(-100, 120, 200, 50, 15);
        modalContainer.add(menuBtnBg);

        let menuBtnText = this.add.text(0, 145, 'MENÚ PRINCIPAL', {
            fontFamily: 'Fredoka',
            fontSize: '18px',
            fontWeight: '700',
            fill: '#ffffff'
        }).setOrigin(0.5);
        modalContainer.add(menuBtnText);

        let menuHitArea = this.add.rectangle(0, 145, 200, 50, 0x000000, 0).setInteractive({ useHandCursor: true });
        modalContainer.add(menuHitArea);

        menuHitArea.on('pointerdown', () => {
            window.location.href = '../../index.html';
        });

        // Hover effect for menu button
        menuHitArea.on('pointerover', () => {
            menuBtnText.setFill('#ffcc00');
            menuBtnBg.clear();
            menuBtnBg.lineStyle(2, 0xffcc00, 1);
            menuBtnBg.strokeRoundedRect(-100, 120, 200, 50, 15);
        });
        menuHitArea.on('pointerout', () => {
            menuBtnText.setFill('#ffffff');
            menuBtnBg.clear();
            menuBtnBg.lineStyle(2, 0xffffff, 0.8);
            menuBtnBg.strokeRoundedRect(-100, 120, 200, 50, 15);
        });

        hitArea.on('pointerdown', () => {
            this.tweens.add({
                targets: [modalContainer, overlay],
                alpha: 0,
                scale: 0.5,
                duration: 300,
                onComplete: () => {
                    modalContainer.destroy();
                    overlay.destroy();

                    // Iniciar el juego (quitar blur)
                    gameScene.events.emit('gameStart');

                    // Entrar UI
                    this.tweens.add({
                        targets: this.container,
                        x: 0,
                        duration: 800,
                        ease: 'Back.easeOut'
                    });

                    this.tweens.add({
                        targets: logo,
                        alpha: 0.8,
                        duration: 800
                    });
                }
            });
        });

        this.tweens.add({ targets: overlay, alpha: 1, duration: 300 });
        this.tweens.add({ targets: modalContainer, scale: 1, duration: 500, ease: 'Back.easeOut' });
    }
}
