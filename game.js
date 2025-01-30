// Global variables and functions
let assetsLoaded = 0;
const totalAssets = 4;
let canvas, ctx, scoreElement, playerSprite1, playerSprite2, trashcanSprite, birdSprite;
let obstacles = [];
let score = 0;
let gameOver = false;
let frameCount = 0;
let nextSpawnTime = 100;

// Game constants
const ANIMATION_SPEED = 8;
let GROUND_Y;

// Move these to the top with other game constants
const MIN_SPAWN_TIME = isMobileDevice() ? 50 : 70;  // Faster for mobile
const MAX_SPAWN_TIME = isMobileDevice() ? 130 : 170; // Faster for mobile

// Add this function to detect mobile devices
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Player object
const player = {
    x: 50,
    y: 0,  // Will be set in setCanvasSize
    width: 40,
    height: 26,
    normalHeight: 26,
    duckedHeight: 13,
    velocityY: 0,
    isJumping: false,
    isDucking: false,
    currentFrame: 0,
    touchStartTime: 0,
    touchTimer: null
};

window.assetLoaded = function() {
    assetsLoaded++;
    console.log('Asset loaded:', assetsLoaded);
    if (assetsLoaded === totalAssets) {
        console.log('All assets loaded, starting game');
        initGame();
    }
}

function initGame() {
    // Get DOM elements
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    scoreElement = document.getElementById('score');
    playerSprite1 = document.getElementById('playerSprite1');
    playerSprite2 = document.getElementById('playerSprite2');
    trashcanSprite = document.getElementById('trashcan');
    birdSprite = document.getElementById('bird');

    // Verify assets are loaded
    console.log('Sprites loaded:', {
        player1: playerSprite1.complete,
        player2: playerSprite2.complete,
        trashcan: trashcanSprite.complete,
        bird: birdSprite.complete
    });

    // Set up both keyboard and touch event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', setCanvasSize);
    
    // Add touch event listeners
    canvas.addEventListener('touchstart', handleTouchStart);
    canvas.addEventListener('touchend', handleTouchEnd);
    
    window.longPressThreshold = 150; // milliseconds to trigger duck

    setCanvasSize();
    gameLoop();
}

// Event handler functions
function handleKeyDown(event) {
    if (event.code === 'ArrowUp' && !player.isJumping) {
        player.velocityY = window.JUMP_FORCE;
        player.isJumping = true;
        player.isDucking = false;
        player.height = player.normalHeight;
    }
    if (event.code === 'ArrowDown' && !player.isJumping) {
        player.isDucking = true;
        player.height = player.duckedHeight;
        player.y = GROUND_Y + (player.normalHeight - player.duckedHeight);
    }
    if (event.code === 'Space' && gameOver) {
        resetGame();
    }
}

function handleKeyUp(event) {
    if (event.code === 'ArrowDown' && !player.isJumping) {
        player.isDucking = false;
        player.height = player.normalHeight;
        player.y = GROUND_Y;
    }
}

function setCanvasSize() {
    const container = document.getElementById('gameContainer');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    GROUND_Y = canvas.height - (canvas.height * 0.25);
    
    // Different physics values for mobile and desktop
    if (isMobileDevice()) {
        window.GRAVITY = canvas.height * 0.0018;    // Increased gravity for mobile
        window.JUMP_FORCE = -canvas.height * 0.03;  // Stronger jump for mobile
        window.OBSTACLE_SPEED = canvas.width * 0.006; // Faster obstacle movement for mobile
    } else {
        window.GRAVITY = canvas.height * 0.0012;
        window.JUMP_FORCE = -canvas.height * 0.025;
        window.OBSTACLE_SPEED = canvas.width * 0.004;
    }
    window.MAX_JUMP_VELOCITY = window.JUMP_FORCE;
    
    const scaleFactor = canvas.height / 1080;
    player.width = canvas.height * 0.15;
    player.normalHeight = canvas.height * 0.1;
    player.duckedHeight = player.normalHeight / 2;
    player.height = player.normalHeight;
    
    if (!gameOver) {
        player.y = GROUND_Y;
    }
}

// Update Obstacle class move method
class Obstacle {
    constructor() {
        this.isHigh = Math.random() > 0.8;  // Only 20% chance for birds, 80% for trashcans
        const scaleFactor = canvas.height / 1080;
        this.width = canvas.height * 0.06;
        this.height = canvas.height * 0.075;
        this.x = canvas.width;
        if (this.isHigh) {
            const groundLevel = GROUND_Y + (player.normalHeight - this.height);
            const maxHeight = GROUND_Y - (canvas.height * 0.2);
            this.y = Math.random() * (groundLevel - maxHeight) + maxHeight;
        } else {
            this.y = GROUND_Y + (player.normalHeight - this.height);
        }
    }

    move() {
        this.x -= window.OBSTACLE_SPEED;
    }

    draw() {
        if (this.isHigh) {
            ctx.drawImage(
                birdSprite,
                this.x,
                this.y,
                this.width,
                this.height
            );
        } else {
            ctx.drawImage(
                trashcanSprite,
                this.x,
                this.y,
                this.width,
                this.height
            );
        }
    }
}

function resetGame() {
    obstacles = [];
    score = 0;
    gameOver = false;
    player.y = GROUND_Y;
    player.velocityY = 0;
    player.isJumping = false;
    player.isDucking = false;
    player.height = player.normalHeight;
    nextSpawnTime = 100;
    scoreElement.textContent = `Score: ${score}`;
}

function updatePlayer() {
    player.velocityY += window.GRAVITY;
    // Limit the fall speed for more control
    player.velocityY = Math.min(player.velocityY, -window.JUMP_FORCE);
    player.y += player.velocityY;

    if (player.y > GROUND_Y) {
        player.y = player.isDucking ? 
            GROUND_Y + (player.normalHeight - player.duckedHeight) : 
            GROUND_Y;
        player.velocityY = 0;
        player.isJumping = false;
    }
}

function drawPlayer() {
    const currentSprite = Math.floor(frameCount / ANIMATION_SPEED) % 2 === 0 ? 
        playerSprite1 : playerSprite2;

    if (player.isDucking) {
        ctx.drawImage(
            currentSprite,
            player.x,
            player.y,
            player.width,
            player.duckedHeight
        );
    } else {
        ctx.drawImage(
            currentSprite,
            player.x,
            player.y,
            player.width,
            player.normalHeight
        );
    }
}

function checkCollision(obstacle) {
    const hitboxPadding = obstacle.width * 0.2;
    
    const playerHitboxWidth = player.width * 0.7;
    const playerHitboxHeight = player.height * 0.8;
    const playerHitboxX = player.x + (player.width - playerHitboxWidth) / 2;
    const playerHitboxY = player.y + (player.height - playerHitboxHeight) / 2;
    
    const obstacleHitboxX = obstacle.x + hitboxPadding;
    const obstacleHitboxWidth = obstacle.width - (hitboxPadding * 2);
    const obstacleHitboxY = obstacle.y + hitboxPadding;
    const obstacleHitboxHeight = obstacle.height - (hitboxPadding * 2);
    
    return playerHitboxX < obstacleHitboxX + obstacleHitboxWidth &&
           playerHitboxX + playerHitboxWidth > obstacleHitboxX &&
           playerHitboxY < obstacleHitboxY + obstacleHitboxHeight &&
           playerHitboxY + playerHitboxHeight > obstacleHitboxY;
}

function gameLoop() {
    ctx.fillStyle = '#D2D2D2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!gameOver) {
        frameCount++;
        
        ctx.fillStyle = 'green';
        ctx.fillRect(0, GROUND_Y + player.normalHeight, canvas.width, 2);

        updatePlayer();
        drawPlayer();

        if (frameCount >= nextSpawnTime) {
            obstacles.push(new Obstacle());
            nextSpawnTime = frameCount + Math.floor(Math.random() * (MAX_SPAWN_TIME - MIN_SPAWN_TIME) + MIN_SPAWN_TIME);
        }

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
        ctx.fillText('Game Over!', canvas.width/2 - (fontSize * 2), canvas.height/2);
        ctx.font = `${fontSize * 0.6}px Arial`;
        ctx.fillText('Press Space to Restart', canvas.width/2 - (fontSize * 2.5), canvas.height/2 + (fontSize));
    }

    requestAnimationFrame(gameLoop);
}

// Touch event handlers
function handleTouchStart(event) {
    event.preventDefault(); // Prevent default touch behaviors
    
    if (gameOver) {
        resetGame();
        return;
    }
    
    player.touchStartTime = Date.now();
    
    // Start ducking immediately on touch
    if (!player.isJumping) {
        player.isDucking = true;
        player.height = player.duckedHeight;
        player.y = GROUND_Y + (player.normalHeight - player.duckedHeight);
    }
}

function handleTouchEnd(event) {
    event.preventDefault();
    
    const touchDuration = Date.now() - (player.touchStartTime || 0);
    
    if (touchDuration < window.longPressThreshold) {
        // Short tap - Jump
        if (!player.isJumping) {
            player.velocityY = window.JUMP_FORCE;
            player.isJumping = true;
            player.isDucking = false;
            player.height = player.normalHeight;
        }
    }
    // Always stop ducking on touch end if not jumping
    if (!player.isJumping) {
        player.isDucking = false;
        player.height = player.normalHeight;
        player.y = GROUND_Y;
    }
} 