// Global variables
let assetsLoaded = 0;
const totalAssets = 4;
let canvas, ctx, scoreElement;
let ninjaRun1, ninjaRun2, birdSprite, enemySprite;
let obstacles = [];
let score = 0;
let gameOver = false;
let frameCount = 0;
let nextSpawnTime = 100;
let gameStarted = false;

// Game constants
const ANIMATION_SPEED = 8;
const MIN_SPAWN_TIME = 50;
const MAX_SPAWN_TIME = 130;
let GROUND_Y;

// Player object
const ninja = {
    x: 50,
    y: 0,
    width: 0,  // Will be set in setCanvasSize
    height: 0, // Will be set in setCanvasSize
    normalHeight: 0,
    duckedHeight: 0,
    velocityY: 0,
    isJumping: false,
    isDucking: false,
    currentFrame: 0,
    canJump: true
};

function loadAssets() {
    return new Promise((resolve, reject) => {
        let assetsLoaded = 0;
        const totalAssets = 4;
        
        function assetLoaded() {
            assetsLoaded++;
            console.log('Asset loaded:', assetsLoaded);
            if (assetsLoaded === totalAssets) {
                console.log('All assets loaded');
                resolve();
            }
        }

        function assetError(e) {
            console.error('Error loading asset:', e.target.id);
            reject(new Error(`Failed to load ${e.target.id}`));
        }

        // Get asset elements
        ninjaRun1 = document.getElementById('ninjaRun1');
        ninjaRun2 = document.getElementById('ninjaRun2');
        birdSprite = document.getElementById('bird');
        enemySprite = document.getElementById('enemy');

        // Log asset states
        console.log('Initial asset states:', {
            ninjaRun1: ninjaRun1?.complete,
            ninjaRun2: ninjaRun2?.complete,
            bird: birdSprite?.complete,
            enemy: enemySprite?.complete
        });

        // Set up load handlers
        ninjaRun1.onload = assetLoaded;
        ninjaRun2.onload = assetLoaded;
        birdSprite.onload = assetLoaded;
        enemySprite.onload = assetLoaded;

        // Set up error handlers
        ninjaRun1.onerror = assetError;
        ninjaRun2.onerror = assetError;
        birdSprite.onerror = assetError;
        enemySprite.onerror = assetError;

        // Handle already loaded images
        if (ninjaRun1?.complete) assetLoaded();
        if (ninjaRun2?.complete) assetLoaded();
        if (birdSprite?.complete) assetLoaded();
        if (enemySprite?.complete) assetLoaded();
    });
}

function setGameContainerSize() {
    const gameContainer = document.getElementById('gameContainer');
    const windowHeight = window.innerHeight;
    const gameHeight = Math.floor(windowHeight * 0.9); // 90% of window height
    const padding = Math.floor(windowHeight * 0.02); // 2% padding top and bottom
    
    gameContainer.style.height = `${gameHeight}px`;
    document.body.style.paddingTop = `${padding}px`;
    document.body.style.paddingBottom = `${padding}px`;
}

async function initGame() {
    try {
        // Get DOM elements
        canvas = document.getElementById('gameCanvas');
        if (!canvas) {
            throw new Error('Canvas element not found');
        }

        ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('Could not get canvas context');
        }

        scoreElement = document.getElementById('score');
        
        // Force initial canvas size
        const container = document.getElementById('gameContainer');
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;

        // Wait for assets to load first
        await loadAssets();

        // Add touch handlers to the game container instead of just the canvas
        const gameContainer = document.getElementById('gameContainer');
        gameContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
        gameContainer.addEventListener('touchend', handleTouchEnd, { passive: false });

        // Set up event listeners
        window.addEventListener('resize', () => {
            setGameContainerSize();
            setCanvasSize();
        });

        // Set initial ninja position
        ninja.x = canvas.width * 0.05;
        ninja.y = GROUND_Y;

        setCanvasSize();
        
        // Set initial size
        setGameContainerSize();
        
        // Start game loop
        console.log('Starting game loop');
        requestAnimationFrame(gameLoop);
    } catch (error) {
        console.error('Game initialization failed:', error);
    }
}

function setCanvasSize() {
    const container = document.getElementById('gameContainer');
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    
    // Ensure canvas matches container size
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Scale ninja position if canvas size changed
    if (oldWidth !== 0 && oldHeight !== 0) {
        ninja.x = canvas.width * 0.05;
        if (!ninja.isJumping) {
            ninja.y = GROUND_Y;
        }
    }
    
    GROUND_Y = canvas.height - (canvas.height * 0.2);
    
    // Set ninja size
    ninja.normalHeight = canvas.height * 0.2;
    ninja.width = ninja.normalHeight * 0.8;
    ninja.duckedHeight = ninja.normalHeight * 0.5;
    ninja.height = ninja.normalHeight;

    // Physics calculations
    if (isMobileDevice()) {
        window.GRAVITY = canvas.height * 0.002;
        window.JUMP_FORCE = -canvas.height * 0.035;
        window.MAX_FALL_SPEED = canvas.height * 0.035;
        window.OBSTACLE_SPEED = canvas.width * 0.008;
    } else {
        window.GRAVITY = canvas.height * 0.002;
        window.JUMP_FORCE = -canvas.height * 0.035;
        window.MAX_FALL_SPEED = canvas.height * 0.035;
        window.OBSTACLE_SPEED = canvas.width * 0.006;
    }
    
    if (!gameOver && !ninja.isJumping) {
        ninja.y = GROUND_Y;
    }
}

class Obstacle {
    constructor() {
        this.isHigh = Math.random() > 0.7;
        this.width = ninja.normalHeight * 0.8;
        this.height = this.isHigh ? ninja.normalHeight * 0.6 : ninja.normalHeight * 0.8;
        this.x = canvas.width;
        
        if (this.isHigh) {
            // Adjust flying heights for exactly 1/3 screen height
            const minHeight = GROUND_Y - (canvas.height / 3);     // Exactly 1/3 height
            const maxHeight = GROUND_Y - (canvas.height / 3) * 0.9; // Slightly below max
            this.y = Math.random() * (maxHeight - minHeight) + minHeight;
        } else {
            this.y = GROUND_Y + (ninja.normalHeight - this.height);
        }
    }

    move() {
        this.x -= window.OBSTACLE_SPEED;
    }

    draw() {
        const sprite = this.isHigh ? birdSprite : enemySprite;
        ctx.drawImage(sprite, this.x, this.y, this.width, this.height);
    }
}

// Touch controls
function handleTouchStart(event) {
    event.preventDefault();
    
    if (!gameStarted) {
        const startScreen = document.getElementById('startScreen');
        startScreen.style.display = 'none';
        gameStarted = true;
        return;
    }
    
    // Store touch start time for jump detection
    ninja.touchStartTime = Date.now();
    
    if (gameOver) {
        resetGame();
        return;
    }
    
    // Start ducking after a delay
    ninja.touchTimer = setTimeout(() => {
        if (!ninja.isJumping) {
            ninja.isDucking = true;
            ninja.height = ninja.duckedHeight;
            ninja.y = GROUND_Y + (ninja.normalHeight - ninja.duckedHeight);
        }
    }, 200);
}

function handleTouchEnd(event) {
    event.preventDefault();
    clearTimeout(ninja.touchTimer);
    
    const touchDuration = Date.now() - (ninja.touchStartTime || 0);
    
    if (touchDuration < 200 && ninja.canJump) {
        // Simple, consistent jump force
        ninja.velocityY = window.JUMP_FORCE;
        ninja.isJumping = true;
        ninja.canJump = false;
        ninja.isDucking = false;
        ninja.height = ninja.normalHeight;
    }
    
    if (!ninja.isJumping) {
        ninja.isDucking = false;
        ninja.height = ninja.normalHeight;
        ninja.y = GROUND_Y;
    }
}

function resetGame() {
    obstacles = [];
    score = 0;
    gameOver = false;
    ninja.y = GROUND_Y;
    ninja.velocityY = 0;
    ninja.isJumping = false;
    ninja.isDucking = false;
    ninja.height = ninja.normalHeight;
    ninja.canJump = true;
    nextSpawnTime = 100;
    scoreElement.textContent = `SCORE: ${score}`;
    gameStarted = false;
    
    // Show the start screen instead of game over text
    const startScreen = document.getElementById('startScreen');
    startScreen.style.display = 'flex';
    startScreen.querySelector('h1').textContent = 'RANK UP RUNNER';
    startScreen.querySelector('p').textContent = 'Tap to Start';
}

function updateNinja() {
    if (ninja.isJumping) {
        ninja.velocityY += window.GRAVITY;
        // Limit fall speed
        ninja.velocityY = Math.min(ninja.velocityY, window.MAX_FALL_SPEED);
        ninja.y += ninja.velocityY;

        if (ninja.y > GROUND_Y) {
            ninja.y = GROUND_Y;
            ninja.velocityY = 0;
            ninja.isJumping = false;
            ninja.canJump = true;
        }
    }
}

function drawNinja() {
    const currentSprite = Math.floor(frameCount / ANIMATION_SPEED) % 2 === 0 ? 
        ninjaRun1 : ninjaRun2;

    console.log('Drawing ninja:', {
        x: ninja.x,
        y: ninja.y,
        width: ninja.width,
        height: ninja.isDucking ? ninja.duckedHeight : ninja.normalHeight,
        sprite: currentSprite ? 'loaded' : 'missing'
    });

    ctx.drawImage(
        currentSprite,
        ninja.x,
        ninja.y,
        ninja.width,
        ninja.isDucking ? ninja.duckedHeight : ninja.normalHeight
    );
}

function checkCollision(obstacle) {
    const padding = 0.2;
    const ninjaHitbox = {
        x: ninja.x + ninja.width * padding,
        y: ninja.y + ninja.height * padding,
        width: ninja.width * (1 - padding * 2),
        height: ninja.height * (1 - padding * 2)
    };
    
    const obstacleHitbox = {
        x: obstacle.x + obstacle.width * padding,
        y: obstacle.y + obstacle.height * padding,
        width: obstacle.width * (1 - padding * 2),
        height: obstacle.height * (1 - padding * 2)
    };
    
    return ninjaHitbox.x < obstacleHitbox.x + obstacleHitbox.width &&
           ninjaHitbox.x + ninjaHitbox.width > obstacleHitbox.x &&
           ninjaHitbox.y < obstacleHitbox.y + obstacleHitbox.height &&
           ninjaHitbox.y + ninjaHitbox.height > obstacleHitbox.y;
}

// Add debug info
function drawDebugInfo() {
    // Comment out debug text drawing
    /*
    ctx.fillStyle = 'black';
    ctx.font = '14px Arial';
    ctx.fillText(`Ninja: ${Math.round(ninja.x)},${Math.round(ninja.y)}`, 10, 20);
    ctx.fillText(`Jumping: ${ninja.isJumping}`, 10, 40);
    ctx.fillText(`Ducking: ${ninja.isDucking}`, 10, 60);
    ctx.fillText(`Obstacles: ${obstacles.length}`, 10, 80);
    */
}

function gameLoop() {
    try {
        if (!ctx) {
            console.error('No canvas context in game loop');
            return;
        }

        ctx.fillStyle = '#D2D2D2';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Comment out debug info call
        // drawDebugInfo();

        if (!gameOver && gameStarted) {
            frameCount++;
            
            // Draw ground line
            ctx.fillStyle = '#000';
            ctx.fillRect(0, GROUND_Y + ninja.normalHeight, canvas.width, 2);

            updateNinja();
            drawNinja();

            // Update and draw obstacles
            for (let i = obstacles.length - 1; i >= 0; i--) {
                obstacles[i].move();
                obstacles[i].draw();

                if (obstacles[i].x + obstacles[i].width < 0) {
                    obstacles.splice(i, 1);
                    score++;
                    scoreElement.textContent = `SCORE: ${score}`;
                }

                if (checkCollision(obstacles[i])) {
                    gameOver = true;
                    resetGame();  // Reset game immediately when collision occurs
                }
            }

            // Spawn obstacles
            if (frameCount >= nextSpawnTime) {
                obstacles.push(new Obstacle());
                nextSpawnTime = frameCount + Math.floor(Math.random() * (MAX_SPAWN_TIME - MIN_SPAWN_TIME) + MIN_SPAWN_TIME);
            }
        } else if (gameOver) {
            const fontSize = canvas.height * 0.08;
            ctx.fillStyle = 'black';
            ctx.font = `${fontSize}px Arial`;
            ctx.fillText('GAME OVER!', canvas.width/2 - fontSize * 2.5, canvas.height/2);
            ctx.font = `${fontSize * 0.6}px Arial`;
            ctx.fillText('TAP TO RESTART', canvas.width/2 - fontSize * 2.5, canvas.height/2 + fontSize);
        }

        requestAnimationFrame(gameLoop);
    } catch (error) {
        console.error('Game loop error:', error);
    }
}

// Add this function to check if we're on mobile
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing game');
    initGame().catch(error => {
        console.error('Failed to initialize game:', error);
    });
}); 