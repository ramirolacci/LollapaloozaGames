// Game Constants
const TILE_COUNT = 3; // 3x3 Grid
const IMAGE_SRC = 'assets/CRUNCHY.png';

// State
let tiles = [];
let hasStarted = false;
let timeLeft = 60;
let isGameOver = false;
let isVictory = false;
let timerInterval = null;
let isAnimating = false;

// DOM Elements
const gridEl = document.getElementById('puzzle-grid');
const timerDisplay = document.getElementById('timer-display');
const timerIconBox = document.getElementById('timer-icon-box');
const startOverlay = document.getElementById('start-overlay');
const resultModal = document.getElementById('result-modal');
const resultTitle = document.getElementById('result-title');
const resultMessage = document.getElementById('result-message');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const playAgainBtn = document.getElementById('play-again-btn');

// Sound Manager
const soundManager = {
    moveSound: new Howl({
        src: ['https://cdn.pixabay.com/audio/2022/03/15/audio_7314757041.mp3'],
        volume: 0.5
    }),
    winSound: new Howl({
        src: ['https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3'],
        volume: 0.6
    }),
    lossSound: new Howl({
        src: ['https://cdn.pixabay.com/audio/2021/08/04/audio_bb38933b9e.mp3'],
        volume: 0.5
    }),
    playMove: () => soundManager.moveSound.play(),
    playWin: () => soundManager.winSound.play(),
    playLoss: () => soundManager.lossSound.play()
};

// Utils
const getRowCol = (index) => ({
    row: Math.floor(index / TILE_COUNT),
    col: index % TILE_COUNT
});

const isAdjacent = (pos1, pos2) => {
    const { row: r1, col: c1 } = getRowCol(pos1);
    const { row: r2, col: c2 } = getRowCol(pos2);
    const rowDiff = Math.abs(r1 - r2);
    const colDiff = Math.abs(c1 - c2);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
};

const isSolvable = (tiles) => {
    let inversions = 0;
    for (let i = 0; i < tiles.length - 1; i++) {
        for (let j = i + 1; j < tiles.length; j++) {
            if (tiles[i] !== -1 && tiles[j] !== -1 && tiles[i] > tiles[j]) {
                inversions++;
            }
        }
    }
    // For odd grid sizes (3x3), simple inversion count parity check works
    return inversions % 2 === 0;
};

const shuffleTiles = () => {
    const count = TILE_COUNT * TILE_COUNT;
    let newTiles = Array.from({ length: count - 1 }, (_, i) => i);
    newTiles.push(-1); // -1 is empty

    // Fisher-Yates
    for (let i = newTiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newTiles[i], newTiles[j]] = [newTiles[j], newTiles[i]];
    }

    if (!isSolvable(newTiles)) {
        if (newTiles[0] !== -1 && newTiles[1] !== -1) {
            [newTiles[0], newTiles[1]] = [newTiles[1], newTiles[0]];
        } else {
            [newTiles[newTiles.length - 2], newTiles[newTiles.length - 3]] = [newTiles[newTiles.length - 3], newTiles[newTiles.length - 2]];
        }
    }
    return newTiles;
};

const isWin = (currentTiles) => {
    for (let i = 0; i < currentTiles.length - 1; i++) {
        if (currentTiles[i] !== i) return false;
    }
    return currentTiles[currentTiles.length - 1] === -1;
};

// Game Logic
const initGame = () => {
    tiles = shuffleTiles();
    timeLeft = 60;
    isGameOver = false;
    isVictory = false;
    isAnimating = false;
    hasStarted = false;

    clearInterval(timerInterval);
    updateTimerDisplay();

    // Reset UI
    gridEl.style.gridTemplateColumns = `repeat(${TILE_COUNT}, 1fr)`;
    startOverlay.classList.remove('hidden'); // Show start screen
    resultModal.classList.add('hidden');
    timerIconBox.classList.remove('bg-red', 'animate-pulse');
    timerDisplay.classList.remove('text-red');

    renderGrid();
};


const startGame = () => {
    if (hasStarted) return;
    hasStarted = true;
    startOverlay.classList.add('hidden');

    // Start Timer
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 10) {
            timerIconBox.classList.add('bg-red', 'animate-pulse');
            timerDisplay.classList.add('text-red');
        }

        if (timeLeft <= 0) {
            handleGameOver();
        }
    }, 1000);

    // Initial Animation
    gsap.fromTo(".puzzle-tile",
        { opacity: 0, scale: 0.8, y: 30 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, stagger: 0.03, ease: "power2.out" }
    );
};

const updateTimerDisplay = () => {
    const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const secs = (timeLeft % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${mins}:${secs}`;
};

const handleTileClick = (index) => {
    if (!hasStarted || isGameOver || isVictory || isAnimating) return;

    const emptyIndex = tiles.indexOf(-1);
    if (isAdjacent(index, emptyIndex)) {
        // Swap Logic
        const newTiles = [...tiles];
        [newTiles[index], newTiles[emptyIndex]] = [newTiles[emptyIndex], newTiles[index]];

        soundManager.playMove();

        // Animation
        const tileEl = document.getElementById(`tile-${index}`);
        const emptyEl = document.getElementById(`tile-empty`); // We need to track the empty slot element or position

        // Easier approach: Just re-render logic with FLIP-like animation or simplified CSS transition?
        // Let's us GSAP for accurate movement matching logic
        // Calculate relative position difference
        const { row: currentRow, col: currentCol } = getRowCol(index);
        const { row: emptyRow, col: emptyCol } = getRowCol(emptyIndex);

        const xDiff = (emptyCol - currentCol) * 100;
        const yDiff = (emptyRow - currentRow) * 100;

        isAnimating = true;

        gsap.to(tileEl, {
            xPercent: xDiff,
            yPercent: yDiff,
            duration: 0.2,
            ease: "power2.out",
            onComplete: () => {
                gsap.set(tileEl, { xPercent: 0, yPercent: 0 }); // Reset transform
                tiles = newTiles;
                renderGrid(); // Re-render DOM sorted
                isAnimating = false;

                if (isWin(tiles)) {
                    handleWin();
                }
            }
        });
    }
};

const handleWin = () => {
    isVictory = true;
    clearInterval(timerInterval);
    soundManager.playWin();

    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#facc15', '#fbbf24', '#f59e0b']
    });

    setTimeout(() => {
        resultTitle.textContent = "¡FELICITACIONES!";
        resultTitle.className = "text-amber-500";
        resultMessage.textContent = "GANASTE UN COMBO DE 2 EMPANADAS";
        resultModal.classList.remove('hidden');
    }, 500);
};

const handleGameOver = () => {
    isGameOver = true;
    clearInterval(timerInterval);
    soundManager.playLoss();

    resultTitle.textContent = "TIEMPO AGOTADO";
    resultTitle.className = "text-red";
    resultMessage.textContent = "No te rindas, ¡inténtalo de nuevo para ganar una empanada gratis!";
    resultModal.classList.remove('hidden');
};

const renderGrid = () => {
    gridEl.innerHTML = '';

    tiles.forEach((tileId, index) => {
        const tileEl = document.createElement('div');

        if (tileId === -1) {
            tileEl.id = `tile-empty`;
            tileEl.className = 'empty-tile';
        } else {
            tileEl.id = `tile-${index}`; // ID based on current index for animation targeting
            tileEl.className = 'puzzle-tile';

            const { row, col } = getRowCol(tileId); // Original position for image background
            const xPercent = (col / (TILE_COUNT - 1)) * 100;
            const yPercent = (row / (TILE_COUNT - 1)) * 100;

            const imgEl = document.createElement('div');
            imgEl.className = 'tile-image';
            imgEl.style.backgroundImage = `url('${IMAGE_SRC}')`;
            imgEl.style.backgroundSize = `${TILE_COUNT * 100}% ${TILE_COUNT * 100}%`;
            imgEl.style.backgroundPosition = `${xPercent}% ${yPercent}%`;

            const overlayEl = document.createElement('div');
            overlayEl.className = 'tile-overlay';

            tileEl.appendChild(imgEl);
            tileEl.appendChild(overlayEl);

            // Mouse Click
            tileEl.addEventListener('click', () => handleTileClick(index));

            // Touch Events (Basic Swiping)
            let touchStartX = 0;
            let touchStartY = 0;

            tileEl.addEventListener('touchstart', (e) => {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
            }, { passive: true });

            tileEl.addEventListener('touchend', (e) => {
                const touchEndX = e.changedTouches[0].clientX;
                const touchEndY = e.changedTouches[0].clientY;

                const dx = touchEndX - touchStartX;
                const dy = touchEndY - touchStartY;

                if (Math.abs(dx) > 30 || Math.abs(dy) > 30) {
                    const emptyIndex = tiles.indexOf(-1);
                    const { row: targetRow, col: targetCol } = getRowCol(index);
                    const { row: emptyRow, col: emptyCol } = getRowCol(emptyIndex);

                    if (Math.abs(dx) > Math.abs(dy)) {
                        // Horizontal
                        if (dx > 0 && emptyCol === targetCol + 1 && emptyRow === targetRow) handleTileClick(index);
                        if (dx < 0 && emptyCol === targetCol - 1 && emptyRow === targetRow) handleTileClick(index);
                    } else {
                        // Vertical
                        if (dy > 0 && emptyRow === targetRow + 1 && emptyCol === targetCol) handleTileClick(index);
                        if (dy < 0 && emptyRow === targetRow - 1 && emptyCol === targetCol) handleTileClick(index);
                    }
                }
            });
        }
        gridEl.appendChild(tileEl);
    });
};

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', initGame);
playAgainBtn.addEventListener('click', initGame);

// Animations
window.addEventListener('load', () => {
    // Logo Float
    gsap.to("#logo", {
        y: -10,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut"
    });

    initGame();
});
