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
    return new Promise((resolve) => {
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

        // Get asset elements
        ninjaRun1 = document.getElementById('ninjaRun1');
        ninjaRun2 = document.getElementById('ninjaRun2');
        birdSprite = document.getElementById('bird');
        enemySprite = document.getElementById('enemy');

        // Set up load handlers
        ninjaRun1.onload = assetLoaded;
        ninjaRun2.onload = assetLoaded;
        birdSprite.onload = assetLoaded;
        enemySprite.onload = assetLoaded;

        // Handle already loaded images
        if (ninjaRun1.complete) assetLoaded();
        if (ninjaRun2.complete) assetLoaded();
        if (birdSprite.complete) assetLoaded();
        if (enemySprite.complete) assetLoaded();
    });
}

async function initGame() {
    // Get DOM elements
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    scoreElement = document.getElementById('score');

    await loadAssets();

    // Debug log to check if sprites are loaded
    console.log('Sprites loaded:', {
        ninjaRun1: ninjaRun1.complete,
        ninjaRun2: ninjaRun2.complete,
        bird: birdSprite.complete,
        enemy: enemySprite.complete
    });

    // Set up event listeners
    window.addEventListener('resize', setCanvasSize);
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchend', handleTouchEnd);

    // Set initial ninja position
    ninja.x = canvas.width * 0.2;

    setCanvasSize();
    gameLoop();
}

function setCanvasSize() {
    const container = document.getElementById('gameContainer');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    GROUND_Y = canvas.height - (canvas.height * 0.2);
    
    // Set ninja size to a smaller proportion of game height
    ninja.normalHeight = canvas.height * 0.2;
    ninja.width = ninja.normalHeight * 0.8;
    ninja.duckedHeight = ninja.normalHeight * 0.5;
    ninja.height = ninja.normalHeight;
    
    // Adjust physics for lower, more natural jump arc
    window.GRAVITY = ninja.normalHeight * 0.025;     // Increased gravity
    window.JUMP_FORCE = -ninja.normalHeight * 0.25;  // Reduced initial jump force
    window.MAX_FALL_SPEED = ninja.normalHeight * 0.2; // Lower max fall speed
    window.OBSTACLE_SPEED = canvas.width * 0.006;
    
    if (!gameOver) {
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
            // Adjust flying heights for lower jump height
            const minHeight = GROUND_Y - ninja.normalHeight * 0.8;  // Lower minimum height
            const maxHeight = GROUND_Y - ninja.normalHeight * 0.6;  // Lower maximum height
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
        // Add horizontal position-based jump force variation
        const jumpForceMultiplier = 1.0 + (ninja.x / canvas.width) * 0.1;
        ninja.velocityY = window.JUMP_FORCE * jumpForceMultiplier;
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
    scoreElement.textContent = `Score: ${score}`;
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
    ctx.fillStyle = 'black';
    ctx.font = '14px Arial';
    ctx.fillText(`Ninja: ${Math.round(ninja.x)},${Math.round(ninja.y)}`, 10, 20);
    ctx.fillText(`Jumping: ${ninja.isJumping}`, 10, 40);
    ctx.fillText(`Ducking: ${ninja.isDucking}`, 10, 60);
    ctx.fillText(`Obstacles: ${obstacles.length}`, 10, 80);
}

function gameLoop() {
    ctx.fillStyle = '#D2D2D2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!gameOver) {
        frameCount++;
        
        // Draw ground line
        ctx.fillStyle = '#000';
        ctx.fillRect(0, GROUND_Y + ninja.normalHeight, canvas.width, 2);

        updateNinja();
        drawNinja();

        // Draw debug info
        drawDebugInfo();

        // Spawn obstacles
        if (frameCount >= nextSpawnTime) {
            obstacles.push(new Obstacle());
            nextSpawnTime = frameCount + Math.floor(Math.random() * (MAX_SPAWN_TIME - MIN_SPAWN_TIME) + MIN_SPAWN_TIME);
        }

        // Update and draw obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
            obstacles[i].move();
            obstacles[i].draw();

            if (obstacles[i].x + obstacles[i].width < 0) {
                obstacles.splice(i, 1);
                score++;
                scoreElement.textContent = `Score: ${score}`;
            }

            if (checkCollision(obstacles[i])) {
                gameOver = true;
            }
        }
    } else {
        const fontSize = canvas.height * 0.05;
        ctx.fillStyle = 'black';
        ctx.font = `${fontSize}px Arial`;
        ctx.fillText('Game Over!', canvas.width/2 - fontSize * 2, canvas.height/2);
        ctx.font = `${fontSize * 0.6}px Arial`;
        ctx.fillText('Tap to Restart', canvas.width/2 - fontSize * 2, canvas.height/2 + fontSize);
    }

    requestAnimationFrame(gameLoop);
}

document.addEventListener('DOMContentLoaded', initGame); 