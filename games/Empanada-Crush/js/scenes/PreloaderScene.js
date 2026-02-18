class PreloaderScene extends Phaser.Scene {
    constructor() {
        super('PreloaderScene');
    }

    preload() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Background (loaded in BootScene)
        this.add.image(width / 2, height / 2, 'background').setAlpha(0.3);

        // Progress Bar Background
        const barWidth = 400;
        const barHeight = 30;
        const x = (width - barWidth) / 2;
        const y = height / 2 + 50;

        const bgBar = this.add.graphics();
        bgBar.fillStyle(0x222222, 0.8);
        bgBar.fillRoundedRect(x, y, barWidth, barHeight, 15);
        bgBar.lineStyle(2, 0x444444);
        bgBar.strokeRoundedRect(x, y, barWidth, barHeight, 15);

        // Progress Bar Fill
        const progressBar = this.add.graphics();

        // Percentage Text
        const percentText = this.add.text(width / 2, y + barHeight + 30, '0%', {
            fontFamily: 'Chewy',
            fontSize: '32px',
            fill: '#ffcc00'
        }).setOrigin(0.5);

        // Loading Info Text
        const assetText = this.add.text(width / 2, y + barHeight + 70, 'Preparando empanadas...', {
            fontFamily: 'Fredoka',
            fontSize: '18px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // Animated Matambre Empanada
        const matambre = this.add.image(x, y + 15, 'matambre');
        matambre.setDisplaySize(80, 80);
        matambre.setOrigin(0.5);

        // GSAP-style animation for the matambre empanada (idle)
        this.tweens.add({
            targets: matambre,
            angle: 360,
            duration: 2000,
            repeat: -1,
            ease: 'Linear'
        });

        this.tweens.add({
            targets: matambre,
            scaleX: 0.9,
            scaleY: 1.1,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Load actual game assets
        this.load.image('empanada_carne', 'assets/empanadas/carnesuave.png');
        this.load.image('empanada_pollo', 'assets/empanadas/pollo.png');
        this.load.image('empanada_jq', 'assets/empanadas/jamonyqueso.png');
        this.load.image('empanada_humita', 'assets/empanadas/choclo.png');
        this.load.image('empanada_verdura', 'assets/empanadas/verdura.png');
        this.load.image('empanada_picante', 'assets/empanadas/carnepicante.png');
        this.load.image('special_striped', 'assets/empanadas/CRUNCHY.png');
        this.load.image('special_wrapped', 'assets/empanadas/empanada-big-burger.png');
        this.load.image('special_bomb', 'assets/empanadas/CRUNCHY.png');

        // Main game sounds and other assets would go here

        // Update progress
        this.load.on('progress', (value) => {
            percentText.setText(Math.floor(value * 100) + '%');

            progressBar.clear();
            // Golden Gradient Fill
            progressBar.fillStyle(0xffcc00, 1);
            progressBar.fillRoundedRect(x, y, barWidth * value, barHeight, 15);

            // Move matambre along the bar
            matambre.x = x + (barWidth * value);
        });

        this.load.on('fileprogress', (file) => {
            assetText.setText('Cargando: ' + file.key);
        });

        this.load.on('complete', () => {
            assetText.setText('¡Listo para el Crush!');
            this.time.delayedCall(500, () => {
                this.scene.start('GameScene');
            });
        });
    }
}
