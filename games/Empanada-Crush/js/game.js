const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 600,
    height: 800,
    backgroundColor: '#1a1a1a',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [BootScene, PreloaderScene, GameScene, UIScene]
};

const game = new Phaser.Game(config);
