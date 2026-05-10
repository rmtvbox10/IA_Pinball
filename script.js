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
const gravity = 0.15;

// Flippers
const flipperWidth = 60;
const flipperHeight = 12;
const flipperGap = 20;
const leftFlipper = {
    pivotX: width / 2 - flipperGap,
    pivotY: height - 20,
    angle: 0, // degrees, 0 = horizontal pointing right
    maxAngle: 30, // how far up it can go when pressed
    speed: 6
};
const rightFlipper = {
    pivotX: width / 2 + flipperGap,
    pivotY: height - 20,
    angle: 0, // degrees, 0 = horizontal pointing left (we'll treat negative)
    maxAngle: 30,
    speed: 6
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

// Convert degrees to radians
function toRad(deg) {
    return deg * Math.PI / 180;
}

// Get flipper line segment: from pivot to tip
function getFlipperSegment(f) {
    const length = flipperWidth;
    const angleRad = toRad(f.angle);
    // For left flipper, angle rotates up from horizontal pointing right
    // For right flipper, we want it pointing left when angle=0, so we subtract angle
    const dx = length * Math.cos(angleRad);
    const dy = length * Math.sin(angleRad); // positive y up? Actually canvas y increases down.
    // In canvas, y increases downward, so we need to subtract dy for upward angle.
    // We'll treat angle as upward from horizontal, so tipY = pivotY - dy
    const tipX = f.pivotX + (f === leftFlipper ? dx : -dx); // right flipper points left
    const tipY = f.pivotY - dy; // up
    return { pivot: {x: f.pivotX, y: f.pivotY}, tip: {x: tipX, y: tipY} };
}

// Distance from point C to segment AB
function distPointToSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - ax, py - ay);
    const t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    const clamped = Math.max(0, Math.min(1, t));
    const projX = ax + clamped * dx;
    const projY = ay + clamped * dy;
    return Math.hypot(px - projX, py - projY);
}

// Closest point on segment
function closestPointOnSegment(px, py, ax, ay, bx, by) {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return {x: ax, y: ay};
    const t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    const clamped = Math.max(0, Math.min(1, t));
    return {x: ax + clamped * dx, y: ay + clamped * dy};
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
        ball.vx = -Math.abs(ball.vx) * 0.5; // bounce left
    }
    if (ball.x + ball.radius > width) {
        ball.x = width - ball.radius;
        ball.vx = Math.abs(ball.vx) * 0.5; // bounce right
    }
    if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy = Math.abs(ball.vy) * 0.5; // bounce up
    }
    // Bottom - if ball falls below canvas, reset
    if (ball.y > height) {
        resetBall();
    }

    // Flipper collision
    const leftSeg = getFlipperSegment(leftFlipper);
    const rightSeg = getFlipperSegment(rightFlipper);

    // Check left flipper
    const dLeft = distPointToSegment(ball.x, ball.y,
        leftSeg.pivot.x, leftSeg.pivot.y,
        leftSeg.tip.x, leftSeg.tip.y);
    if (dLeft < ball.radius && leftFlipper.angle > 0) {
        // Only react if ball is moving towards the flipper (approaching from below)
        // Compute normal from segment to ball
        const closest = closestPointOnSegment(ball.x, ball.y,
            leftSeg.pivot.x, leftSeg.pivot.y,
            leftSeg.tip.x, leftSeg.tip.y);
        const nx = ball.x - closest.x;
        const ny = ball.y - closest.y;
        const normLen = Math.hypot(nx, ny);
        if (normLen > 0) {
            const nxn = nx / normLen;
            const nyn = ny / normLen;
            // Reflect velocity along normal
            const velDotNorm = ball.vx * nxn + ball.vy * nyn;
            if (velDotNorm < 0) { // moving towards surface
                // Impulse
                const impulse = 2 * velDotNorm;
                ball.vx -= impulse * nxn;
                ball.vy -= impulse * nyn;
                // Add a bit of upward kick
                ball.vy -= 3;
                // Add some horizontal based on flipper side
                ball.vx += (ball.x < width/2 ? -2 : 2);
            }
        }
    }

    // Check right flipper
    const dRight = distPointToSegment(ball.x, ball.y,
        rightSeg.pivot.x, rightSeg.pivot.y,
        rightSeg.tip.x, rightSeg.tip.y);
    if (dRight < ball.radius && rightFlipper.angle > 0) {
        const closest = closestPointOnSegment(ball.x, ball.y,
            rightSeg.pivot.x, rightSeg.pivot.y,
            rightSeg.tip.x, rightSeg.tip.y);
        const nx = ball.x - closest.x;
        const ny = ball.y - closest.y;
        const normLen = Math.hypot(nx, ny);
        if (normLen > 0) {
            const nxn = nx / normLen;
            const nyn = ny / normLen;
            const velDotNorm = ball.vx * nxn + ball.vy * nyn;
            if (velDotNorm < 0) {
                const impulse = 2 * velDotNorm;
                ball.vx -= impulse * nxn;
                ball.vy -= impulse * nyn;
                ball.vy -= 3;
                ball.vx += (ball.x < width/2 ? -2 : 2);
            }
        }
    }
}

function resetBall() {
    ball.x = width / 2;
    ball.y = height - 50;
    // Random initial launch
    ball.vx = (Math.random() - 0.5) * 4;
    ball.vy = -6;
}

// Draw everything
function draw() {
    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Draw flippers
    ctx.fillStyle = '#e94560';
    // Left flipper
    ctx.save();
    ctx.translate(leftFlipper.pivotX, leftFlipper.pivotY);
    ctx.rotate(toRad(leftFlipper.angle));
    ctx.fillRect(-flipperHeight/2, -flipperWidth/2, flipperHeight, flipperWidth); // rotate so width along x?
    ctx.restore();
    // Right flipper (mirrored)
    ctx.save();
    ctx.translate(rightFlipper.pivotX, rightFlipper.pivotY);
    ctx.rotate(-toRad(rightFlipper.angle)); // opposite direction
    ctx.fillRect(-flipperHeight/2, -flipperWidth/2, flipperHeight, flipperWidth);
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