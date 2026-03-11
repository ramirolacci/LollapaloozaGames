class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Essential assets for Preloader
        this.load.image('background', 'assets/fondo/background-text.jpg');
        this.load.image('logo', 'assets/logo/Logo Mi Gusto 2025.png');
        // The "matambre" empanada for animation (handling the space in filename)
        this.load.image('matambre', 'assets/empanadas/empanada-matambre -alapizza.png');

        // Audio Assets
        this.load.audio('bgm', 'assets/audio/music.mp3');
        this.load.audio('match', 'assets/audio/match.mp3');
        this.load.audio('select', 'assets/audio/select.mp3');
        this.load.audio('swap', 'assets/audio/swap.mp3');
        this.load.audio('win', 'assets/audio/win.mp3');

        this.load.on('complete', () => {
            this.scene.start('PreloaderScene');
        });
    }
}
