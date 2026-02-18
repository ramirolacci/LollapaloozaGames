/**
 * Catch the Empanada - Juego principal
 * Desarrollado con Vanilla JS y Canvas.
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiMenu = document.getElementById('ui-menu');
const uiGameOver = document.getElementById('ui-gameover');
const hud = document.getElementById('hud');
const scoreEl = document.getElementById('score');
const missedEl = document.getElementById('missed');
const finalScoreEl = document.getElementById('final-score');
const uiWin = document.getElementById('ui-win');
const winScoreEl = document.getElementById('win-score');
const restartBtn = document.getElementById('restart-btn');
const restartWinBtn = document.getElementById('restart-win-btn');

// Elementos de carga
const loadingScreen = document.getElementById('loading-screen');
const loadVideo = document.getElementById('load-video');
const gameContainer = document.getElementById('game-container');

// Configuración del Juego
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 800;
const PLAYER_WIDTH = 100;
const PLAYER_HEIGHT = 40;
const ITEM_SIZE = 60;
const MAX_ITEMS = 8;
const INITIAL_SPAWN_RATE = 1500; // ms

// Estado del Juego
let gameState = 'MENU'; // MENU, PLAYING, GAMEOVER, WIN
let score = 0;
let missed = 0;
let items = [];
let lastSpawnTime = 0;
let spawnRate = INITIAL_SPAWN_RATE;
let animationId;

// Imágenes
// Imágenes
const empanadaImages = [
    'assets/empanadas/CRUNCHY.png', 'assets/empanadas/calabaza.png', 'assets/empanadas/carnepicante.png',
    'assets/empanadas/carnesuave.png', 'assets/empanadas/carneyaceiituna.png', 'assets/empanadas/choclo.png',
    'assets/empanadas/cortadacuchillo.png', 'assets/empanadas/cuatroquesos.png', 'assets/empanadas/empanada-american-chicken.png',
    'assets/empanadas/empanada-big-burger.png', 'assets/empanadas/empanada-cheese-burger.png', 'assets/empanadas/empanada-matambre -alapizza.png',
    'assets/empanadas/empanada-mexican-pibil-pork.png', 'assets/empanadas/empanada-vacio-yprovoleta.png', 'assets/empanadas/jamonyhuevo.png',
    'assets/empanadas/jamonyqueso.png', 'assets/empanadas/pancetayciruela.png', 'assets/empanadas/pollo.png',
    'assets/empanadas/polloychampi.png', 'assets/empanadas/quesoycebolla.png', 'assets/empanadas/roquefortyjamon.png',
    'assets/empanadas/verdura.png'
];

const pizzaImages = [
    'assets/pizzas/jamoncrudo.png', 'assets/pizzas/jamonymorron.png', 'assets/pizzas/mortadelaypistacho.png',
    'assets/pizzas/muzza.png', 'assets/pizzas/napo.png', 'assets/pizzas/peperoni.png'
];

const assets = {
    empanadas: [],
    badObject: new Image(), // Reemplazamos pizzas por el logo
    player: new Image(),
    loaded: { empanadas: false, badObject: false, player: false }
};

// Cargar empanadas
let empanadasLoaded = 0;
empanadaImages.forEach((src) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
        empanadasLoaded++;
        if (empanadasLoaded === empanadaImages.length) assets.loaded.empanadas = true;
    };
    assets.empanadas.push(img);
});

// Cargar Logo como objeto malo
assets.badObject.src = 'assets/logo/Logo Mi Gusto 2025.png';
assets.badObject.onload = () => assets.loaded.badObject = true;

assets.player.src = 'assets/caja/cajauser.png';
assets.player.onload = () => assets.loaded.player = true;

// Sonidos (Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(freq, type = 'sine', duration = 0.1) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

// Clase Jugador (Cestita / Caja)
class Player {
    constructor() {
        this.width = 100;
        this.height = 80; // Aumentado para que la caja se vea mejor
        this.x = CANVAS_WIDTH / 2 - this.width / 2;
        this.y = CANVAS_HEIGHT - this.height - 20; // Ajustado dinámicamente
        this.speed = 10; // Un poco más rápido
        this.keys = {};
        this.bounceY = 0; // Para animación GSAP
    }

    update() {
        // Movimiento por teclado
        if (this.keys['ArrowLeft'] || this.keys['a']) this.x -= this.speed;
        if (this.keys['ArrowRight'] || this.keys['d']) this.x += this.speed;

        // Limites
        if (this.x < 0) this.x = 0;
        if (this.x > CANVAS_WIDTH - this.width) this.x = CANVAS_WIDTH - this.width;
    }

    draw() {
        if (assets.loaded.player) {
            ctx.drawImage(assets.player, this.x, this.y + this.bounceY, this.width, this.height);
        } else {
            // Fallback
            ctx.fillStyle = '#8d6e63';
            ctx.beginPath();
            ctx.roundRect(this.x, this.y + 40, this.width, 40, 10);
            ctx.fill();
        }
    }
}

// Clase Objeto (Empanada o Pizza)
class Item {
    constructor() {
        this.isGood = Math.random() > 0.2; // 80% empanadas, 20% pizzas
        this.x = Math.random() * (CANVAS_WIDTH - ITEM_SIZE);
        this.y = -ITEM_SIZE;
        this.width = ITEM_SIZE;
        this.height = ITEM_SIZE;
        this.speed = 2 + (score / 100); // Velocidad aumenta con el score

        // Efecto de rotación
        this.angle = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.08; // Velocidad de giro aleatoria

        if (this.isGood) {
            this.imgIndex = Math.floor(Math.random() * assets.empanadas.length);
        }
    }

    update() {
        this.y += this.speed;
        this.angle += this.rotationSpeed;
    }

    draw() {
        ctx.save();
        // Mover al centro del objeto para rotar
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.angle);

        if (this.isGood) {
            if (assets.loaded.empanadas) {
                this.drawImageContain(assets.empanadas[this.imgIndex]);
            } else {
                this.drawEmpanadaFallback();
            }
        } else {
            if (assets.loaded.badObject) {
                this.drawImageContain(assets.badObject);
            } else {
                this.drawPizzaFallback();
            }
        }
        ctx.restore();
    }

    // Dibuja la imagen manteniendo la proporción (sin estirar)
    drawImageContain(img) {
        const hRatio = this.width / img.width;
        const vRatio = this.height / img.height;
        const ratio = Math.min(hRatio, vRatio);
        const nw = img.width * ratio;
        const nh = img.height * ratio;

        // Centramos la imagen dentro del bounding box de rotación
        // Como ya hicimos translate al centro, dibujamos desde -nw/2, -nh/2
        ctx.drawImage(img, -nw / 2, -nh / 2, nw, nh);
    }

    drawEmpanadaFallback() {
        ctx.fillStyle = '#fbc02d';
        ctx.beginPath();
        // Dibujo relativo al centro del objeto
        ctx.moveTo(-this.width / 2, this.height / 2);
        ctx.lineTo(this.width / 2, this.height / 2);
        ctx.quadraticCurveTo(0, -this.height / 2, -this.width / 2, this.height / 2);
        ctx.fill();
        ctx.strokeStyle = '#f9a825';
        ctx.stroke();
    }

    drawPizzaFallback() {
        ctx.fillStyle = '#d32f2f';
        ctx.beginPath();
        ctx.arc(0, 0, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        // X de malo
        ctx.beginPath();
        ctx.moveTo(-10, -10); ctx.lineTo(10, 10);
        ctx.moveTo(10, -10); ctx.lineTo(-10, 10);
        ctx.stroke();
    }
}

const player = new Player();

// Control de entrada
window.addEventListener('keydown', (e) => player.keys[e.key] = true);
window.addEventListener('keyup', (e) => player.keys[e.key] = false);

// Soporte Mouse/Touch
function handleMove(e) {
    if (gameState !== 'PLAYING') return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    let clientX = e.touches ? e.touches[0].clientX : e.clientX;
    player.x = (clientX - rect.left) * scaleX - player.width / 2;
}
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('touchmove', (e) => {
    handleMove(e);
    e.preventDefault();
}, { passive: false });

window.addEventListener('keydown', (e) => {
    // Solo permitir espacio si ya estaba jugando (pausa si hubiera) o si queremos mantener el atajo oculto. 
    // Por ahora lo dejamos como atajo opcional, pero quitamos el prompt visual.
    if (e.code === 'Space' && gameState !== 'PLAYING') startGame();
});

const startBtn = document.getElementById('start-btn');
startBtn.addEventListener('click', startGame);

restartBtn.addEventListener('click', showMenu);
restartWinBtn.addEventListener('click', showMenu);

function showMenu() {
    gameState = 'MENU';
    uiGameOver.classList.add('hidden');
    uiWin.classList.add('hidden');
    hud.classList.add('hidden');

    uiMenu.classList.remove('hidden');
    gsap.fromTo(uiMenu, { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.3 });
}

function startGame() {
    gameState = 'PLAYING';
    score = 0;
    missed = 0;
    items = [];
    spawnRate = INITIAL_SPAWN_RATE;

    // Animación de salida del menú
    gsap.to(uiMenu, { opacity: 0, scale: 0.8, duration: 0.3, onComplete: () => uiMenu.classList.add('hidden') });
    uiGameOver.classList.add('hidden');
    uiWin.classList.add('hidden');
    hud.classList.remove('hidden');
    gsap.fromTo(hud, { y: -50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "back.out(1.7)" });

    updateHUD();
    lastSpawnTime = 0;
    if (animationId) cancelAnimationFrame(animationId);
    gameLoop();
}

function gameOver() {
    gameState = 'GAMEOVER';
    uiGameOver.classList.remove('hidden');
    finalScoreEl.innerText = 'Puntaje Final: ' + score;
    playSound(200, 'sawtooth', 0.3); // Sonido triste/error

    // Efecto GSAP: Screen Shake
    gsap.to("#game-container", {
        x: 10, duration: 0.05, repeat: 10, yoyo: true, onComplete: () => {
            gsap.set("#game-container", { x: 0 });
        }
    });

    // Efecto GSAP: Entrada de Game Over
    gsap.fromTo(uiGameOver, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" });
}

function gameWin() {
    gameState = 'WIN';
    uiWin.classList.remove('hidden');
    winScoreEl.innerText = 'Puntaje Final: ' + score;
    playSound(600, 'sine', 0.1);
    // Melodia de victoria simple
    setTimeout(() => playSound(600, 'sine', 0.1), 0);
    setTimeout(() => playSound(800, 'sine', 0.1), 200);
    setTimeout(() => playSound(1000, 'sine', 0.2), 400);

    // Efecto GSAP: Confeti o celebración (simulado con animación de entrada)
    gsap.fromTo(uiWin, { scale: 0, opacity: 0, rotation: -15 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.8, ease: "elastic.out(1, 0.5)" });
}

function updateHUD() {
    scoreEl.innerText = `Score: ${score}/1200`;
    missedEl.innerText = `Perdidas: ${missed}/3`;
}

function gameLoop(timestamp) {
    if (gameState !== 'PLAYING') return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Spawn de objetos
    if (timestamp - lastSpawnTime > spawnRate && items.length < MAX_ITEMS) {
        items.push(new Item());
        lastSpawnTime = timestamp;
        // Aumentar dificultad
        spawnRate = Math.max(400, INITIAL_SPAWN_RATE - (score * 5));
    }

    player.update();
    player.draw();

    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        item.update();
        item.draw();

        // Colisión con jugador
        if (
            item.y + item.height > player.y &&
            item.y < player.y + player.height &&
            item.x + item.width > player.x &&
            item.x < player.x + player.width
        ) {
            if (item.isGood) {
                score += 10;
                playSound(600, 'sine', 0.1);

                // Efecto GSAP: Score Pop
                gsap.fromTo(scoreEl, { scale: 1.5, color: "#fbc02d" }, { scale: 1, color: "#ffffff", duration: 0.4, ease: "back.out(2)" });

                // Efecto GSAP: Rebote en la caja
                // Usamos una variable interna para un pequeño desvío en el dibujo
                player.bounceY = 10;
                gsap.to(player, { bounceY: 0, duration: 0.3, ease: "elastic.out(1, 0.3)" });

                updateHUD();

                if (score >= 1200) {
                    gameWin();
                    return;
                }

                items.splice(i, 1);
            } else {
                gameOver();
                return;
            }
        }
        // Fuera de pantalla (Perdida)
        else if (item.y > CANVAS_HEIGHT) {
            if (item.isGood) {
                missed++;

                // Efecto GSAP: Perdidas rojo
                gsap.fromTo(missedEl, { scale: 1.3, color: "#ff0000" }, { scale: 1, color: "#ffffff", duration: 0.4 });

                updateHUD();
                if (missed >= 3) {
                    gameOver();
                    return;
                }
            }
            items.splice(i, 1);
        }
    }

    animationId = requestAnimationFrame(gameLoop);
}

// Pantalla inicial
// Pantalla inicial
function init() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Iniciar video de carga
    loadVideo.play().catch(e => {
        console.warn("Autoplay bloqueado o error en video:", e);
        finishLoading();
    });

    loadVideo.onended = () => {
        finishLoading();
    };

    // Seguridad: Si el video no carga en 5 segundos, forzar inicio
    setTimeout(() => {
        if (!gameContainer.classList.contains('hidden')) return;
        finishLoading();
    }, 5000);
}

function finishLoading() {
    if (!loadingScreen.parentNode) return; // Ya se eliminó o procesó

    const tl = gsap.timeline();

    // Fade out pantalla de carga
    tl.to(loadingScreen, {
        opacity: 0,
        duration: 0.8,
        ease: "power2.inOut",
        onComplete: () => {
            loadingScreen.style.display = 'none';
        }
    });

    // Mostrar y Fade in contenedor del juego
    tl.fromTo(gameContainer,
        { opacity: 0 },
        {
            opacity: 1,
            duration: 0.5,
            onStart: () => gameContainer.classList.remove('hidden')
        },
        "-=0.3"
    );

    // Animaciones del menú
    tl.from("h1", { y: -100, opacity: 0, duration: 1, ease: "bounce.out" });
    tl.from(".blink", { opacity: 0, duration: 1, delay: 0.2 });
    tl.from(".menu-logo", { x: -50, opacity: 0, duration: 0.8, ease: "power2.out" }, "-=0.8");
}

init();
