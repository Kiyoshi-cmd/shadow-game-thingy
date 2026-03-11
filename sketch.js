//===========
//Glabal Vars
//===========
const FRIGHTEN_TOTAL_DUR = 180;
const FRIGHTEN_FLASH_DUR = 300;
const FRIGHTEN_COOLDOWN_MAX = 1800;
const DASH_SPEED = 20;
const DASH_FRAMES = 15;
const DASH_COOLDOWN = 150;
const COYOTE_FRAMES = 8;
const playerW = 50, playerH = 80;
const speed = 4, BASE_JUMP = -11, MAX_JUMP = -21, gravity = 0.4, groundY = 350;
const wallJumpVelX = 20, wallJumpVelY = -9;
const GRACE_FRAMES = 35, CHARGE_FRAMES = 90;
const FAST_FALL_ACCEL = 1.2; // Extra gravity when S is held airborne


//==========
// Menu drop
//==========
const MENU_HEIGHT = 300;

let menuY = -MENU_HEIGHT;
let menuTarget = -MENU_HEIGHT;


//================
// State Variables
//================
let x = 200, y = 200, velX = 0, velY = 0;
let camX = 0, camY = 0;
let facing = -1, onGround = false, touchingWall = 0;
let jumpsLeft = 1, jumpCooldown = 0, coyoteTimer = 0;
let playerHealth = 3, invulnTimer = 0;
let showInventory = false;
let gamePaused = false;
let gameState = "mainMenu"; // "mainMenu" | "playing"


//=========================
// Death / Respawn sequence
//=========================
let deathState = "alive";
let deathTimer = 0;
const DEATH_SCREEN_DUR = 60;  
const FADE_OUT_DUR     = 40;  
const FADE_IN_DUR      = 40;  
let fadeAlpha = 0;            


//=====================
// Spell/Ability States
//=====================
let dashing = false, dashTimer = 0, dashCooldown = 0, dashDirX = 1, dashDirY = 0;
let frightenTimer = 0, frightenVisualTimer = 0, frightenCooldown = 0, glowTimer = 0;
let spaceHeld = false, spaceHoldTimer = 0, isCharging = false, chargeUsed = false;


//=================
// Assets & Visuals
//=================
let TRANSITION_FRAMES = 8;
let playerImg, playerIdleImg, playerTransitionImg, jumpFrame1Img, jumpFrame3Img;
let heartImg, invImg, deathImg;
let dustParticles = [];
let shakeTimer = 0, shakeAmt = 0;
let prevVelY = 0, moveTransitionTimer = 0, wasMoving = false;
let spellIconConfig;


//===========
// Map layout
//===========
let rects = [
  { x: 300, y: 220, w: 400, h: 30 },
  { x: 800, y: 150, w: 500, h: 30 },
  { x: -200, y: 180, w: 350, h: 30 },
  { x: 400, y: -50, w: 400, h: 30 },
  { x: 110, y: -1320, w: 40, h: 1500 },
  { x: 250, y: -1320, w: 40, h: 1500 },
  { x: 510, y: -300, w: 300, h: 30 },
  { x: 750, y: 100, w: 40, h: 250 },
  { x: 1350, y: -200, w: 40, h: 550 },
];


//===========
//Enemy logic
//===========
let enemies = [];
class Enemy {
  constructor(plat) {
    this.plat = plat;
    this.w = 40;
    this.h = 60;
    this.x = plat.x + plat.w / 2;
    this.y = plat.y - this.h / 2;
    this.vx = 1.2;
    this.dir = 1;
    this.state = "PATROL";
    this.noticeTimer = 0;
  }

  update() {
    if (frightenTimer > 0) return;

    let onSamePlat = (y + playerH / 2 <= this.plat.y + 10 && y + playerH / 2 >= this.plat.y - 10);
    let inRange = (x > this.plat.x && x < this.plat.x + this.plat.w);
    let playerOnMyPlat = onSamePlat && inRange;

    if (this.state === "PATROL") {
      this.x += this.vx;
      this.dir = this.vx > 0 ? 1 : -1;
      if (playerOnMyPlat) {
        let toPlayer = x - this.x;
        if ((toPlayer > 0 && this.dir > 0) || (toPlayer < 0 && this.dir < 0)) {
          this.state = "NOTICE";
          this.noticeTimer = 45;
        }
      }
      if (this.x < this.plat.x + 10) this.vx = 1.2;
      if (this.x > this.plat.x + this.plat.w - 10) this.vx = -1.2;
    } else if (this.state === "NOTICE") {
      this.noticeTimer--;
      if (this.noticeTimer <= 0) this.state = "CHASE";
      if (!playerOnMyPlat) this.state = "PATROL";
    } else if (this.state === "CHASE") {
      let chaseDir = x < this.x ? -1 : 1;
      this.vx = chaseDir * 4;
      this.x += this.vx;
      this.dir = chaseDir;
      if (!playerOnMyPlat) {
        this.state = "PATROL";
        this.vx = this.dir * 1.2;
      }
    }
  }

  draw(cx, cy, intensity) {
    push();
    rectMode(CENTER);

    // Fill based on state
    if (frightenTimer > 0) {
      // Frightened: flash blue/white
      let flash = sin(frameCount * 0.3) * 0.5 + 0.5;
      fill(lerpColor(color(20, 20, 180), color(200, 200, 255), flash));
      stroke(100, 100, 255);
    } else if (intensity > 0.1) {
      fill(lerpColor(color(180, 0, 0), color(255), intensity));
      stroke(255, 180, 180);
    } else if (this.state === "CHASE") {
      fill(255, 0, 0);
      stroke(200, 0, 0);
    } else if (this.state === "NOTICE") {
      fill(255, 255, 0);
      stroke(200, 180, 0);
    } else {
      fill(180, 0, 0);
      stroke(120, 0, 0);
    }

    strokeWeight(2);
    rect(this.x - cx, this.y - cy, this.w, this.h);

    // Eye white
    fill(222);
    noStroke();
    rect(this.x - cx + (this.dir * 10), this.y - cy - 10, 8, 8)
    pop();
    rectMode(CORNER);
  }
}

//=================
// All base 64 imgs
//=================
 function preload() {
   
playerImg = loadImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABYklEQVR4AeyWQVLCMBSGU2HsCCvQlStP4H08gSsP4MpDuOIEXssF40q7K04dGMxXiIRMB957dWCTzvxN+tK+/8trGrhwZz4yQK5ArkCuQK6AugIP4/E6VZ/dXAWA8f1k4mLdlKUjboUQA2CCWWp0Oxo54ow7wyEGIPesqtzzfP6nj8WCsOsDIQZ4q+vip7XbnV490IsHCiC7EXlPDLBNWdCu3zlvBNSsqtoqbCK6sxagzV7ctc3eqVmt9q6lFyaAruRfTdMVPhpTAbDSn6ZTdxmlpf/oY58egHUSDYm6KgAMMMIQEESfGGMix+QmFQDPYoQhfT4/dLJ9ANNY1oUX51BXgHXAjJk5icIeQIwxYhqpAUh+7fd/2nIwoOklE0AwTl+BpQomAKaMufXb5/kgE8B/mQNhAjg0c+1rMAFAfkhXw6H4T4oaIN6IuiDq7Y+SFEINgGmAYEdM9b1cuiDuPaZfAAAA//9YGm7GAAAABklEQVQDAFNelY2Wx0laAAAAAElFTkSuQmCC");

playerIdleImg = loadImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABX0lEQVR4AeyUP07DMBTGHSoRqZUqtTAxsbFxH07AxAGYOARTT8C1GComyNZKQaqKfy5Oo7RN/b0MXRzp2c9/v5+fnXflLvxlgByBHIEcgRwBOQJPk8m2a0OyuQSA8ONs5tp2W5aOfitEMgAiiHWF7sZjRz/jzvAlA7D3oqrc63LZ2Nd6TbcbApEM8LFaFb9Bbl+8e6A3DxRB9iPpXjLA/5YF9faTcmdALapq1zCUKkCQKO5D1RRANA3RMQGIGr3TJQBe+st87q5bW+LT913XjnfSGkpyJQAEEHr2EIhi+PQxlqTYmSQBsBYhBPH5/bCH6dScjGQAhKPVm01wf3z4g2MoZADeAZmPk6M3JAewXgZg0Y3P/9TlaEQVDCjgQkMoTABROF6BoHcw1QTALogPuXv2wEwAfeLqNZgATp2cd8CpFDMB9AkAoURBBmgnoj6Q1DEZgI0jBBnxmDEn2rn6DwAA//+7eBh6AAAABklEQVQDANEoh7HWcC9cAAAAAElFTkSuQmCC");

playerTransitionImg = loadImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABWklEQVR4AeyVMW7CMBSGnSI1EkzQTp16gt6nJ+jUA3TqIZg4AddiQEyQLaAgEPgLGIwVhN8LgsWRftt5Tt7/+eGYF/PkKwGkCqQKpAqkCogr8N3r7UK1Oc1FABh/9fvG13ueG+JaiGgATDALjT66XUOceaO4ogHIPSoK8zednjRbLgmbNhDRAOOyzNa13bkZWqB/C+RAzjPxo2iAY8qMfjehPQioUVHUVThEZK0UoM6efdbdRVNttxf3sTcqgKbki6pqCt+MiQDY6b+DgXn10jL+sbG5BWCfeFNRQxEABhhhCAhiTIy5KMfgIREA72KEIWM+P/SwcwBTX9qN5+cQV4B9wIpZOYncGUCMOWISiQFI/mbPf/q806FrJRWAMw5/Ak0VVAAsGXPtt8/7TiqAe5kDoQK4x8oxRyoAXrwm6T4QA/gHURNEKfxTEgNg6iA4EUOtNhseOenWYA8AAP//vMifygAAAAZJREFUAwDqGoyxNUG4yQAAAABJRU5ErkJggg==");

jumpFrame1Img = loadImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABcElEQVR4AeyUMU7DMBSGHSoRqZUqtWJiYmPjPpyAiQMwcQimnoD7cAKGignSqZWCVJV8Lk6frIj6dwYWR/pt5zl5/+cXxxfun68CUCpQKlAqUCogV+B+NjvEGnOaSwAY3y0Wzuqqrh3xXIhkAEwwi42up1NHnHmXcSUDkHvVNO5pve71sdsRdmMgkgFet9vq29udmpcO6LkDCiCnmfRRMsBvyor+8E57FFCrpvFVOEa0VgXw2asb3/UNEG+bTX+vDLIAhgzYiEPxczEJgJ3+uFy6S5OVMbHPtnXsEzOVNJQAMMDooYPAFDEmxlySY/SQBMC7GGHImN8PUX6qQ0yVDGAN2v2+v82FyAZg5biPOQN4Xwag1LfzOe+6ejLx/ZhGBsAsGNtPQDxHEoBdPeZf3a9nTXP2gQSAGasfMmcOqRAyAJsuXjnGuZIAwhnAORBkjUOM52z8r7EEQCKSWwVT+hDnuVTJAHHiYEofz3F/Tj8AAAD//5CojqgAAAAGSURBVAMAvN+mQZ6VgigAAAAASUVORK5CYII=");
  
jumpFrame3Img = jumpFrame1Img; // Placeholder

heartImg = loadImage("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAGCAYAAAAPDoR2AAAAdklEQVR4ARyNMQqAMAxFf+PipB7AURGv5uhBnMSLObk6OunUUmhrfgIhL/wXItDaq6ocIkURnJvuZCHMbYup6yzolYemMZa62AGyqqMKOhBjRHAOsuTsrvcFy6vI4A4Ba0rOflI4vw8MHu8toGwhgSYvKHJn/wAAAP//2/jwwwAAAAZJREFUAwAVSTigb6dlnwAAAABJRU5ErkJggg==");

deathImg =
loadImage("data:image/png;base64,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")
  
}


//=====
//Setup
//=====
function setup() {
  createCanvas(800, 400);
  imageMode(CENTER);
  noSmooth();
  spellIconConfig = { x: 750, y: 40, size: 40 };
  enemies.push(new Enemy(rects[0]));
  enemies.push(new Enemy(rects[1]));
}


//==========
// main draw
//==========
function draw() {
  // Show main menu if not playing
  if (gameState === "mainMenu") {
    drawMainMenu();
    return;
  }

  // Menu snaps instantly (no animation)
  menuY = menuTarget;

  if (!gamePaused && deathState === "alive") {
    updateTimers();
    let fIntensity = frightenVisualTimer > 0 ? map(frightenVisualTimer, 0, FRIGHTEN_FLASH_DUR, 0, 1) : 0;
    background(lerpColor(color(40), color(0), fIntensity));

    if (onGround) { coyoteTimer = COYOTE_FRAMES; jumpsLeft = 1; }
    else if (coyoteTimer > 0) coyoteTimer--;

    handleJumpInput();
    prevVelY = velY;
    handleMovement();
    
    resolveCollisions();
    checkEnemyCollisions();

    camX = x - width / 2;
    camY = y - height / 2;

    push();
    translate(shakeTimer > 0 ? random(-shakeAmt, shakeAmt) : 0, shakeTimer > 0 ? random(-shakeAmt, shakeAmt) : 0);
    renderWorld(fIntensity);
    for (let en of enemies) { en.update(); en.draw(camX, camY, fIntensity); }
    updateDust();
    drawPlayer();
    pop();

  } else if (gamePaused && deathState === "alive") {
    drawPausedState();
  }

  drawUI();
  handleDeathSequence();
}

// --- Main Menu ---
function drawMainMenu() {
  background(20);
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(42);
  text("shadow game thingy", width / 2, height / 2 - 60);
  textSize(16);
  fill(180);
  text("Q to go in inventory, 1 to cast frighten, SHIFT to dash, WAD to move, S to fall faster", width / 2, height / 2 - 10);

  // Play button
  let btnX = width / 2 - 80, btnY = height / 2 + 40, btnW = 160, btnH = 50;
  let hovered = mouseX > btnX && mouseX < btnX + btnW && mouseY > btnY && mouseY < btnY + btnH;
  fill(hovered ? color(100, 100, 100) : color(60, 60, 60));
  noStroke();
  rect(btnX, btnY, btnW, btnH, 8);
  fill(255);
  textSize(20);
  text("Continue", width / 2, btnY + btnH / 2);
  textAlign(LEFT, BASELINE);
}

function mousePressed() {
  if (gameState === "mainMenu") {
    let btnX = width / 2 - 80, btnY = height / 2 + 40, btnW = 160, btnH = 50;
    if (mouseX > btnX && mouseX < btnX + btnW && mouseY > btnY && mouseY < btnY + btnH) {
      gameState = "playing";
    }
    return;
  }

  // Inventory "Return to Menu" button click
  if (showInventory) {
    let panelX = 250, panelY = menuY - 200, panelW = 300, panelH = 300;
    let btnX = panelX + 50, btnY = panelY + panelH - 70, btnW = 200, btnH = 40;
    if (mouseX > btnX && mouseX < btnX + btnW && mouseY > btnY && mouseY < btnY + btnH) {
      returnToMainMenu();
    }
  }
}

function returnToMainMenu() {
  // Reset all game state
  playerHealth = 3;
  x = 200; y = 200; velX = 0; velY = 0;
  dashing = false; frightenTimer = 0; invulnTimer = 0;
  dustParticles = [];
  deathState = "alive"; fadeAlpha = 0;
  showInventory = false;
  gamePaused = false;
  menuTarget = -MENU_HEIGHT;
  menuY = -MENU_HEIGHT;
  for (let en of enemies) { en.state = "PATROL"; en.vx = 1.2; }
  gameState = "mainMenu";
}

// --- Enemy Collision Logic ---
function checkEnemyCollisions() {
  if (invulnTimer > 0 || playerHealth <= 0) return;

  for (let en of enemies) {
    let overlapX = (playerW / 2 + en.w / 2) - abs(x - en.x);
    let overlapY = (playerH / 2.15 + en.h / 2) - abs(y - en.y);

    if (overlapX > 0 && overlapY > 0) {
      playerHealth--;
      invulnTimer = 60;
      shakeTimer = 15; 
      shakeAmt = 10;
      velX = (x < en.x) ? -12 : 12;
      velY = -6;
      onGround = false;
    }
  }
}

function handleJumpInput() {
  if (spaceHeld && !chargeUsed && (onGround || coyoteTimer > 0)) {
    spaceHoldTimer++;
    if (spaceHoldTimer > GRACE_FRAMES) isCharging = true;
    if (isCharging && getChargeProgress() >= 1.0) {
      executeJump(MAX_JUMP, false);
      shakeTimer = 8; shakeAmt = 5;
      spawnDust(x, y + playerH / 2, 18);
    }
  }
}

function resolveCollisions() {
  let wasOnGround = onGround; 
  onGround = false; 
  touchingWall = 0;

  if (y + playerH / 2 > groundY) {
    if (!wasOnGround && prevVelY >= 0) spawnDust(x, groundY, 12);
    y = groundY - playerH / 2; velY = 0; onGround = true;
  }

  for (let r of rects) {
    let overlapX = (playerW / 2 + r.w / 2) - abs(x - (r.x + r.w / 2));
    let overlapY = (playerH / 2 + r.h / 2) - abs(y - (r.y + r.h / 2));
    if (overlapX > 0 && overlapY > 0) {
      if (overlapX < overlapY) {
        let sign = x < (r.x + r.w / 2) ? -1 : 1;
        x += sign * overlapX; velX = 0; touchingWall = -sign;
      } else {
        let sign = y < (r.y + r.h / 2) ? -1 : 1;
        y += sign * overlapY; velY = 0;
        if (sign === -1) {
          if (!wasOnGround && prevVelY >= 0) spawnDust(x, r.y, 12);
          onGround = true;
        }
      }
    }
  }
}

function handleMovement() {
  if (dashing) {
    dashTimer--;
    velX = dashDirX * DASH_SPEED;
    velY = dashDirY * DASH_SPEED;
    if (dashTimer <= 0) dashing = false;
  } else {
    let chargeSlow = isCharging ? 0.3 : 1.0;
    let accel = (onGround ? 1.2 : 0.18) * chargeSlow;
    if (keyIsDown(65)) velX -= accel;
    else if (keyIsDown(68)) velX += accel;
    else velX *= (onGround ? 0.75 : 0.97);

    velX = constrain(velX, -speed, speed);
    velY += gravity;

    // Fast fall: S key while airborne
    if (!onGround && (keyIsDown(83) || keyIsDown(DOWN_ARROW))) {
      velY += FAST_FALL_ACCEL;
    }
  }
  x += velX;
  y += velY;
  if (velX > 0.1) facing = -1;
  if (velX < -0.1) facing = 1;
}

function keyPressed() {
  if (gameState === "mainMenu") return;

  if (key === "q" || key === "Q") {
    showInventory = !showInventory;
    gamePaused = showInventory;
    menuTarget = showInventory ? height / 2 : -MENU_HEIGHT;
    menuY = menuTarget; // Snap instantly
  }
  if (gamePaused) return;

  if (keyCode === 32 || keyCode === UP_ARROW || key === 'w' || key === 'W') {
    spaceHeld = true;
    spaceHoldTimer = 0;
    chargeUsed = false;
    if (!onGround && coyoteTimer <= 0 && jumpCooldown <= 0) {
      if (touchingWall !== 0) {
        velX = -touchingWall * wallJumpVelX;
        executeJump(wallJumpVelY, false);
        jumpsLeft = 1;
      } else if (jumpsLeft > 0) {
        executeJump(BASE_JUMP * 0.85, true);
        spawnDust(x, y + playerH / 2, 5);
      }
    }
  }
  if (keyCode === SHIFT) tryDash();
  if (key === '1') castFrighten();
}

function keyReleased() {
  if (gamePaused) return;
  if (keyCode === 32 || keyCode === UP_ARROW || key === 'w' || key === 'W') {
    if (!chargeUsed && jumpCooldown <= 0 && (onGround || coyoteTimer > 0)) {
      let prog = getChargeProgress();
      let force = lerp(BASE_JUMP, MAX_JUMP, prog);
      if (prog >= 0.99) {
        shakeTimer = 8; shakeAmt = 5;
        spawnDust(x, y + playerH / 2, 18);
      }
      executeJump(force, false);
    }
    spaceHeld = false;
    isCharging = false;
  }
}

// --- UI & Rendering Helpers ---

function renderWorld(fIntensity) {
  let worldCol = lerpColor(color(80, 120, 200), color(255), fIntensity);
  let groundCol = lerpColor(color(20), color(255), fIntensity);
  let strokeCol = lerpColor(color(60), color(200), fIntensity);

  // Ground
  fill(groundCol);
  stroke(strokeCol);
  strokeWeight(2);
  rect(-1000 - camX, groundY - camY, 3000, 500);

  // Platforms
  fill(worldCol);
  stroke(lerpColor(color(120, 160, 255), color(255), fIntensity));
  strokeWeight(2);
  for (let r of rects) {
    rect(r.x - camX, r.y - camY, r.w, r.h);
  }
  noStroke();
}

function drawPlayer() {
  let isMoving = abs(velX) > 0.5;
  if (isMoving !== wasMoving && onGround) moveTransitionTimer = TRANSITION_FRAMES;
  if (moveTransitionTimer > 0) moveTransitionTimer--;
  wasMoving = isMoving;

  let imgToDraw = playerIdleImg;
  if (dashing) imgToDraw = playerImg;
  else if (!onGround) imgToDraw = (velY < 0) ? jumpFrame1Img : jumpFrame3Img;
  else if (moveTransitionTimer > 0) imgToDraw = playerTransitionImg;
  else if (isMoving) imgToDraw = playerImg;

  let prog = getChargeProgress();
  if (prog > 0) {
    noFill(); stroke(255, 100); ellipse(x - camX, y - camY, 120, 120);
    stroke(255, 200, 50);
    arc(x - camX, y - camY, 120, 120, -HALF_PI, -HALF_PI + prog * TWO_PI);
  }

  // Soft shadow below player
  noStroke();
  fill(0, 0, 0, 50);
  ellipse(x - camX, groundY - camY, constrain(playerW * 1.2 - abs(y - groundY) * 0.06, 6, playerW * 1.2), 8);

  push();
  translate(x - camX, y - camY); scale(facing, 1.0);
  if (imgToDraw && invulnTimer % 4 < 2) image(imgToDraw, 0, -25, playerW + 80, playerH + 50);
  pop();
}


//======
//drawUI
//======
function drawUI() {
  // Always draw health and spell icon during gameplay
  if (gameState === "playing") {
    drawHealthBar();
    drawSpellIcon();
  }

  if (showInventory) {
    let panelX = 250, panelY = menuY - 200, panelW = 300, panelH = 300;

    // Panel background
    fill(60, 60, 60);
    noStroke();
    rect(panelX + 25, panelY + 10, panelW - 50, panelH, 2);

    // Return to Menu button
    let btnX = panelX + 50, btnY = panelY + panelH - 70, btnW = 200, btnH = 40;
    
    fill(50);
    rect(btnX, btnY - 5, 200, 50);
    
    noStroke();
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(22);
    textStyle(BOLD);
    text("Return to Menu", btnX + btnW / 2, btnY + btnH / 2);
    textAlign(LEFT, BASELINE);
    textStyle(NORMAL);
  }
}

//==========
//drawHealth
//==========
function drawHealthBar() {
  const HEART_MARGIN = 20;
  const HEART_Y = 20;
  const HEART_SPACING = 36;
  const HEART_SCALE = 2.5;

  const HEART_W = 12 * HEART_SCALE;
  const HEART_H = 10 * HEART_SCALE;

  let heartsOriginX = HEART_MARGIN;

  for (let i = 0; i < 3; i++) {
    push();

    if (heartImg) {
      if (i >= playerHealth) tint(0, 150);

      image(
        heartImg,
        heartsOriginX + (i * HEART_SPACING),
        HEART_Y,
        HEART_W,
        HEART_H
      );
    } 
    else {
      fill(i < playerHealth ? color(220, 50, 50) : color(60, 20, 20));
      ellipse(
        heartsOriginX + (i * HEART_SPACING),
        HEART_Y,
        HEART_W * 0.85,
        HEART_H
      );
    }

    pop();
  }
}

function drawSpellIcon() {
  let cx = spellIconConfig.x, cy = spellIconConfig.y, sz = spellIconConfig.size;

  push();
  noStroke();

  if (frightenCooldown > 0) {
    // On cooldown: darkened + arc showing progress
    fill(20, 180);
    ellipse(cx, cy, sz);
    fill(250, 250, 250, 180);
    arc(cx, cy, sz, sz, -HALF_PI, -HALF_PI + (TWO_PI * (1 - frightenCooldown / FRIGHTEN_COOLDOWN_MAX)));
    noFill();
    stroke(120, 120, 120);
    strokeWeight(2);
    ellipse(cx, cy, sz);
  } else {
    // Ready
    fill(20, 180);
    ellipse(cx, cy, sz);
    noFill();
    stroke(glowTimer > 0 ? color(255, 220, 80) : color(255));
    strokeWeight(glowTimer > 0 ? map(glowTimer, 0, 60, 2, 10) : 2);
    ellipse(cx, cy, sz);

    // Keybind label
    noStroke();
    fill(255, glowTimer > 0 ? 255 : 200);
    textAlign(CENTER, CENTER);
    textSize(14);
    text("1", cx, cy);
    textAlign(LEFT, BASELINE);
  }

  pop();
}

function drawPausedState() {
  let fIntensity = frightenVisualTimer > 0 ? map(frightenVisualTimer, 0, FRIGHTEN_FLASH_DUR, 0, 1) : 0;
  background(lerpColor(color(40), color(0), fIntensity));
  fill(0, 0, 0, 120); rect(0, 0, width, height);
  push();
  renderWorld(fIntensity);
  for (let en of enemies) { en.draw(camX, camY, fIntensity); }
  updateDust();
  drawPlayer();
  pop();
}

function handleDeathSequence() {
  if (playerHealth <= 0 && deathState === "alive") {
    deathState = "death_screen"; deathTimer = DEATH_SCREEN_DUR; fadeAlpha = 0; gamePaused = true;
  }
  if (deathState === "death_screen") {
    fill(0, 0, 0, 140); rect(0, 0, width, height);
    if (deathImg) image(deathImg, width / 2, height / 2, 500, 250);
    if (--deathTimer <= 0) { deathState = "fade_out"; deathTimer = FADE_OUT_DUR; }
  }
  if (deathState === "fade_out") {
    fill(0, 0, 0, 140); rect(0, 0, width, height);
    if (deathImg) image(deathImg, width / 2, height / 2, 500, 250);
    fadeAlpha = map(deathTimer, FADE_OUT_DUR, 0, 0, 255);
    fill(0, 0, 0, fadeAlpha); rect(0, 0, width, height);
    if (--deathTimer <= 0) respawnPlayer();
  }
  if (deathState === "fade_in") {
    fadeAlpha = map(deathTimer, FADE_IN_DUR, 0, 255, 0);
    fill(0, 0, 0, fadeAlpha); rect(0, 0, width, height);
    if (--deathTimer <= 0) { deathState = "alive"; fadeAlpha = 0; }
  }
}

function respawnPlayer() {
  playerHealth = 3; x = 200; y = 200; velX = 0; velY = 0;
  dashing = false; frightenTimer = 0; invulnTimer = 60;
  dustParticles = [];
  for (let en of enemies) { en.state = "PATROL"; en.vx = 1.2; }
  deathState = "fade_in"; deathTimer = FADE_IN_DUR; fadeAlpha = 255; gamePaused = false;
}

function updateTimers() {
  if (dashCooldown > 0) dashCooldown--;
  if (shakeTimer > 0) shakeTimer--;
  if (jumpCooldown > 0) jumpCooldown--;
  if (invulnTimer > 0) invulnTimer--;
  if (frightenTimer > 0) frightenTimer--;
  if (frightenVisualTimer > 0) frightenVisualTimer--;
  if (frightenCooldown > 0 && --frightenCooldown === 0) glowTimer = 60;
  if (glowTimer > 0) glowTimer--;
}

function spawnDust(px, py, count) {
  for (let i = 0; i < count; i++) {
    dustParticles.push({
      x: px + random(-18, 18), y: py,
      vx: random(-3, 3), vy: random(-4, -0.5),
      life: random(20, 38), maxLife: 38,
      size: floor(random(3, 7))
    });
  }
}

function updateDust() {
  noStroke();
  for (let i = dustParticles.length - 1; i >= 0; i--) {
    let d = dustParticles[i];
    if (!gamePaused) { d.x += d.vx; d.y += d.vy; d.vy += 0.18; d.vx *= 0.9; d.life--; }
    fill(210, 195, 170, map(d.life, 0, d.maxLife, 0, 200));
    rect(d.x - camX, d.y - camY, d.size, d.size);
    if (d.life <= 0) dustParticles.splice(i, 1);
  }
}

function getChargeProgress() { return !isCharging ? 0 : min(max(0, spaceHoldTimer - GRACE_FRAMES) / CHARGE_FRAMES, 1); }
function executeJump(force, consumeDouble) {
  velY = force; onGround = false; coyoteTimer = 0; jumpCooldown = 10; chargeUsed = true;
  if (consumeDouble) jumpsLeft--;
}
function castFrighten() {
  if (frightenTimer <= 0 && frightenCooldown <= 0) {
    frightenTimer = FRIGHTEN_TOTAL_DUR; frightenVisualTimer = FRIGHTEN_FLASH_DUR;
    frightenCooldown = FRIGHTEN_COOLDOWN_MAX; shakeTimer = 20; shakeAmt = 10;
  }
}
function tryDash() {
  if (dashing || dashCooldown > 0) return;
  dashing = true; dashTimer = DASH_FRAMES; dashCooldown = DASH_COOLDOWN;
  let ix = keyIsDown(68) ? 1 : keyIsDown(65) ? -1 : (facing === -1 ? 1 : -1);
  let iy = keyIsDown(83) ? 1 : keyIsDown(87) ? -1 : 0;
  let len = sqrt(ix * ix + iy * iy) || 1;
  dashDirX = ix / len; dashDirY = iy / len;
}
