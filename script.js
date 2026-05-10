const canvas = document.getElementById('pinballCanvas');
const ctx = canvas.getContext('2d');

const width = canvas.width;
const height = canvas.height;

// Ball
const ball = {
    x: width / 2,
    y: height - 50,
    radius: 8,
    vx: 0,
    vy: 0,
    color: '#ffff00'
};

// Gravity
const gravity = 0.2;

// Flippers
const flipperWidth = 60;
const flipperHeight = 10;
const flipperGap = 20;
const leftFlipper = {
    x: width / 2 - flipperWidth - flipperGap,
    y: height - 30,
    angle: 0, // degrees
    maxAngle: 30,
    speed: 5
};
const rightFlipper = {
    x: width / 2 + flipperGap,
    y: height - 30,
    angle: 0,
    maxAngle: 30,
    speed: 5
};

let leftPressed = false;
let rightPressed = false;

// Input
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') leftPressed = true;
    if (e.key === 'ArrowRight') rightPressed = true;
});
document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') leftPressed = false;
    if (e.key === 'ArrowRight') rightPressed = false;
});

// Update flipper angles
function updateFlippers() {
    if (leftPressed) {
        leftFlipper.angle = Math.min(leftFlipper.angle + leftFlipper.speed, leftFlipper.maxAngle);
    } else {
        leftFlipper.angle = Math.max(leftFlipper.angle - leftFlipper.speed, 0);
    }
    if (rightPressed) {
        rightFlipper.angle = Math.min(rightFlipper.angle + rightFlipper.speed, rightFlipper.maxAngle);
    } else {
        rightFlipper.angle = Math.max(rightFlipper.angle - rightFlipper.speed, 0);
    }
}

// Simple circle-rectangle collision (for flipper)
function circleRectCollision(circle, rect) {
    const distX = Math.abs(circle.x - rect.x - rect.width / 2);
    const distY = Math.abs(circle.y - rect.y - rect.height / 2);

    if (distX > (rect.width / 2 + circle.radius)) return false;
    if (distY > (rect.height / 2 + circle.radius)) return false;

    if (distX <= (rect.width / 2)) return true;
    if (distY <= (rect.height / 2)) return true;

    const dx = distX - rect.width / 2;
    const dy = distY - rect.height / 2;
    return (dx * dx + dy * dy) <= (circle.radius * circle.radius);
}

// Update ball physics
function updateBall() {
    // Apply gravity
    ball.vy += gravity;

    // Update position
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Walls collision
    if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx = -ball.vx * 0.5; // some damping
    }
    if (ball.x + ball.radius > width) {
        ball.x = width - ball.radius;
        ball.vx = -ball.vx * 0.5;
    }
    if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy = -ball.vy * 0.5;
    }
    // Bottom - if ball falls below canvas, reset
    if (ball.y > height) {
        resetBall();
    }

    // Flipper collision
    const leftFlipperRect = {
        x: leftFlipper.x,
        y: leftFlipper.y,
        width: flipperWidth,
        height: flipperHeight
    };
    const rightFlipperRect = {
        x: rightFlipper.x,
        y: rightFlipper.y,
        width: flipperWidth,
        height: flipperHeight
    };

    // Simple approach: treat flipper as a line; we'll approximate with rectangle rotated.
    // For simplicity, we'll just check if ball is near flipper and moving upward.
    // We'll do a simple AABB check after rotating the flipper points? Too complex.
    // Instead, we'll just give a kick when ball is near flipper and flipper is active.
    const nearLeft = Math.abs(ball.x - (leftFlipper.x + flipperWidth / 2)) < flipperWidth / 2 + ball.radius &&
                     Math.abs(ball.y - (leftFlipper.y + flipperHeight / 2)) < flipperHeight / 2 + ball.radius;
    const nearRight = Math.abs(ball.x - (rightFlipper.x + flipperWidth / 2)) < flipperWidth / 2 + ball.radius &&
                      Math.abs(ball.y - (rightFlipper.y + flipperHeight / 2)) < flipperHeight / 2 + ball.radius;

    if (nearLeft && leftFlipper.angle > 0 && ball.vy > 0) {
        // Kick ball up and slightly left
        ball.vy = -Math.abs(ball.vy) - 2;
        ball.vx -= 2;
    }
    if (nearRight && rightFlipper.angle > 0 && ball.vy > 0) {
        ball.vy = -Math.abs(ball.vy) - 2;
        ball.vx += 2;
    }
}

function resetBall() {
    ball.x = width / 2;
    ball.y = height - 50;
    ball.vx = (Math.random() - 0.5) * 2;
    ball.vy = -5;
}

// Draw everything
function draw() {
    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Draw flippers
    ctx.save();
    ctx.translate(leftFlipper.x + flipperWidth / 2, leftFlipper.y + flipperHeight / 2);
    ctx.rotate((leftFlipper.angle * Math.PI) / 180);
    ctx.fillStyle = '#e94560';
    ctx.fillRect(-flipperWidth / 2, -flipperHeight / 2, flipperWidth, flipperHeight);
    ctx.restore();

    ctx.save();
    ctx.translate(rightFlipper.x + flipperWidth / 2, rightFlipper.y + flipperHeight / 2);
    ctx.rotate(-(rightFlipper.angle * Math.PI) / 180); // flip other way
    ctx.fillStyle = '#e94560';
    ctx.fillRect(-flipperWidth / 2, -flipperHeight / 2, flipperWidth, flipperHeight);
    ctx.restore();

    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();
    ctx.closePath();

    // Optional: draw walls
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);
}

// Main loop
function loop() {
    updateFlippers();
    updateBall();
    draw();
    requestAnimationFrame(loop);
}

// Start
resetBall();
loop();