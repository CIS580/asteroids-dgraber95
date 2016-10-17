(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict;"

const COUNTDOWN = 2400;
const INIT_ASTEROIDS = 10;

/* Classes */
const Game = require('./game.js');
const Player = require('./player.js');
const Asteroid = require('./asteroid.js');

/* Global variables */
var canvas = document.getElementById('screen');
var game = new Game(canvas, update, render);
var background = new Image();
background.src = 'assets/background.jpg';
var player = new Player({x: canvas.width/2, y: canvas.height/2}, canvas);
var asteroids = [];
var level = 1;              // Level counter
var score = 0;              // Score counter
var state = 'ready';        // State of the game (initally ready)
var countDown = COUNTDOWN;  // Countdown for ready screen
var p_key = false;          // Used for pausing/unpausing
var newgameSound = new Audio('sounds/newgame.wav');
newgameSound.volume = 0.5;

// Create asteroids
for(var i = 0; i < INIT_ASTEROIDS; i++){
  asteroids.push(new Asteroid(level, canvas, 3));
}



/**
 * @function masterLoop
 * Advances the game in sync with the refresh rate of the screen
 * @param {DOMHighResTimeStamp} timestamp the current time
 */
var masterLoop = function(timestamp) {
  game.loop(timestamp);
  window.requestAnimationFrame(masterLoop);
}
masterLoop(performance.now());


/**
 * Handles key press down events 
 * p = pause/unpause
 */
window.onkeydown = function(event) {
  switch(event.key) {
    // p to pause
    case 'p':
      event.preventDefault();
      if(!p_key){
        p_key = true;
        if(state == 'paused'){
          player.thrusting = false;
          state = 'running';
        }
        else if(state == 'running'){
          state = 'paused';
        }
      }
      break;
    // q to warp
    case 'q':
      if(state == 'running' && player.state == 'running')
        player.warp(asteroids);
      break;
    default:
      if(state == 'running' || state == 'ready'){
        player.buttonDown(event);
      }
      break;
  }
}


/**
 * Handles key up events 
 */
window.onkeyup = function(event) {
  switch(event.key) {
    // p
    case 'p':
      event.preventDefault();
      p_key = false;
      break;
    default:
      if(state == 'running' || state == 'ready'){
        player.buttonUp(event);
      }
      break;
  }
}


/**
 * Pause game if window loses focus
 */
window.onblur = function(){
  if(state == 'running' || state == 'ready'){
    state = 'paused';
  }
}


/**
 * @function update
 * Updates the game state, moving
 * game objects and handling interactions
 * between them.
 * @param {DOMHighResTimeStamp} elapsedTime indicates
 * the number of milliseconds passed since the last frame.
 */
function update(elapsedTime) {
  switch(state) {
    case 'ready': 
      countDown -= elapsedTime;
      if(countDown <= 0){
        countDown = COUNTDOWN;
        state = 'running';
        player.state = 'running';
      }
    // Intentional fallthrough
    case 'gameover':
    case 'running':
      // Update player
      player.update(elapsedTime);

      // Update asteroids
      for(var i = 0; i < asteroids.length; i++){
        asteroids[i].update(elapsedTime);
        if(asteroids[i].remove)
          asteroids.splice(i, 1);
      }

      // Check for collisions
      check_asteroid_collisions();
      check_laser_collisions();
      if(asteroids.length == 0){
        // Create new level if all asteroids destroyed
        new_level();
      }
      check_player_collisions();

      // If player is dead, check lives count and act accordingly
      if(player.state == 'dead'){
        if(player.lives > 0){
          player.restart();
          state = 'ready';
        }
        else{
          state = 'gameover';
        }
      }
      break;
    
    // Update nothing if paused
    case 'paused':
      break;
  }
}


/**
 * Check for laser on asteroid collisions
 */
function check_laser_collisions(){
  for(var i = 0; i < asteroids.length; i++){
    for(var j = 0; j < player.lasers.length; j++){
      var distSquared =
        Math.pow((player.lasers[j].position.x) - (asteroids[i].position.x + asteroids[i].radius), 2) +
        Math.pow((player.lasers[j].position.y) - (asteroids[i].position.y + asteroids[i].radius), 2);

      if(distSquared < Math.pow(asteroids[i].radius, 2) && asteroids[i].state == 'default') {
        // Laser struck asteroid
        player.lasers[j].remove = true;
        asteroids[i].struck(asteroids);
        score += 10;
        return;
      }
    }
  }
}

/**
 * Check for player on asteroid collisions
 */
function check_player_collisions(){
  if(player.state == 'running'){
    for(var i = 0; i < asteroids.length; i++){
      var distSquared =
        Math.pow((player.position.x + 10) - (asteroids[i].position.x + asteroids[i].radius), 2) +
        Math.pow((player.position.y + 10) - (asteroids[i].position.y + asteroids[i].radius), 2);

      if(asteroids[i].state != 'exploding' && distSquared < Math.pow(10 + asteroids[i].radius, 2)) {
        // Player struck asteroid
        player.explode();
        return;
      }
    }
  }
}


/**
 * Check for and deal with asteroid on asteroid collisions
 */
function check_asteroid_collisions(){
  for(var i = 0; i < asteroids.length; i++){
    for(var j = 0; j < asteroids.length; j++)
    {
      if( i != j && asteroids[i].state != 'exploding' && asteroids[j].state != 'exploding'){
        var distSquared =
          Math.pow((asteroids[i].position.x + asteroids[i].radius) - (asteroids[j].position.x + asteroids[j].radius), 2) +
          Math.pow((asteroids[i].position.y + asteroids[i].radius) - (asteroids[j].position.y + asteroids[j].radius), 2);
        // Check for collision
        if(distSquared <= Math.pow(asteroids[i].radius + asteroids[j].radius, 2)){
          // Calculate angle of rotation for collision
          var angle = Math.atan(Math.abs(asteroids[i].position.y - asteroids[j].position.y)/Math.abs(asteroids[i].position.x - asteroids[j].position.x));
          if(asteroids[i].position.y <= asteroids[j].position.y )
            angle *= -1;

          // Rotate asteroid velocities for calculations
          var aNewX = asteroids[i].velocity.x*Math.cos(angle) - asteroids[i].velocity.y*Math.sin(angle);
          var aNewY = asteroids[i].velocity.x*Math.sin(angle) + asteroids[i].velocity.y*Math.cos(angle);
          var bNewX = asteroids[j].velocity.x*Math.cos(angle) - asteroids[j].velocity.y*Math.sin(angle);
          var bNewY = asteroids[j].velocity.x*Math.sin(angle) + asteroids[j].velocity.y*Math.cos(angle);

          // Calculate new velocities of the two asteroids
          var aNewVel = aNewX*((asteroids[i].mass - asteroids[j].mass)/(asteroids[i].mass + asteroids[j].mass)) + bNewX*((2*asteroids[j].mass)/(asteroids[i].mass + asteroids[j].mass));
          var bNewVel = bNewX*((asteroids[j].mass - asteroids[i].mass)/(asteroids[j].mass + asteroids[i].mass)) + aNewX*((2*asteroids[i].mass)/(asteroids[j].mass + asteroids[i].mass));

          // Return to original orientation and assign new velocities
          asteroids[i].velocity.x = aNewVel*Math.cos(-angle) - aNewY*Math.sin(-angle);
          asteroids[i].velocity.y = aNewVel*Math.sin(-angle) + aNewY*Math.cos(-angle);
          asteroids[j].velocity.x = bNewVel*Math.cos(-angle) - bNewY*Math.sin(-angle);
          asteroids[j].velocity.y = bNewVel*Math.sin(-angle) + bNewY*Math.cos(-angle);

          // Update new asteroid positions to account for overlap
          var aNewXPos = asteroids[i].position.x*Math.cos(angle) - asteroids[i].position.y*Math.sin(angle);
          var aNewYPos = asteroids[i].position.x*Math.sin(angle) + asteroids[i].position.y*Math.cos(angle);
          var bNewXPos = asteroids[j].position.x*Math.cos(angle) - asteroids[j].position.y*Math.sin(angle);
          var bNewYPos = asteroids[j].position.x*Math.sin(angle) + asteroids[j].position.y*Math.cos(angle);

          var overlap = Math.ceil(((asteroids[i].radius + asteroids[j].radius) - Math.abs(asteroids[i].position.x - asteroids[j].position.x))/8);
          if(overlap > 0){
            if(asteroids[i].position.x > asteroids[j].position.x){
              aNewXPos += overlap;
              bNewXPos -= overlap;
            }
            else{
              aNewXPos -= overlap;
              bNewXPos += overlap;
            }
          }
          // Assign new asteroid positions
          asteroids[i].position.x = aNewXPos*Math.cos(-angle) - aNewYPos*Math.sin(-angle);
          asteroids[i].position.y = aNewXPos*Math.sin(-angle) + aNewYPos*Math.cos(-angle);
          asteroids[j].position.x = bNewXPos*Math.cos(-angle) - bNewYPos*Math.sin(-angle);
          asteroids[j].position.y = bNewXPos*Math.sin(-angle) + bNewYPos*Math.cos(-angle);
        }
      }
    }
  }
}

/**
  * @function render
  * Renders the current game state into a back buffer.
  * @param {DOMHighResTimeStamp} elapsedTime indicates
  * the number of milliseconds passed since the last frame.
  * @param {CanvasRenderingContext2D} ctx the context to render to
  */
function render(elapsedTime, ctx) {
  // Draw background
  ctx.drawImage(background, 0, 0, 960, 640, 0, 0, canvas.width, canvas.height)
  // Draw asteroids
  for(var i = asteroids.length - 1; i >= 0; i--){
    asteroids[i].render(elapsedTime, ctx);
  }
  // Draw player
  player.render(elapsedTime, ctx);

  if(state != 'gameover'){
    // Render score and level
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.font = "40px Impact";
    ctx.fillText("Score: " + score, canvas.width - 100, canvas.height - 25);      
    ctx.strokeText("Score: " + score, canvas.width - 100, canvas.height - 25);  
		ctx.fillText("Level: " + level, canvas.width - 100, canvas.height - 75);
		ctx.strokeText("Level: " + level, canvas.width - 100, canvas.height - 75);
  }

  // Game over screen
  if(state == 'gameover'){
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.font = "60px impact";
		ctx.fillStyle = "red";
    ctx.strokeStyle = 'black';
		ctx.textAlign = "center";
		ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2); 
		ctx.strokeText("GAME OVER", canvas.width/2, canvas.height/2); 
		ctx.font = "35px impact";
		ctx.fillStyle = "black";
		ctx.fillText("Final Score: " + score, canvas.width/2, canvas.height/2 + 40);
    ctx.fillText("Levels complete: " + (level - 1), canvas.width/2, canvas.height/2 + 80);
  }

  // Pause screen
  else if(state == 'paused'){
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
		ctx.textAlign = "center";
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.font = "50px impact";
    ctx.fillText("PAUSED", canvas.width/2, canvas.height/2); 
    ctx.strokeText("PAUSED", canvas.width/2, canvas.height/2); 
  }

  // Ready screen (level + countdown)
  else if(state == 'ready'){
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.font = "75px impact";
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
		ctx.textAlign = "center";
		ctx.fillText(Math.ceil(countDown/(COUNTDOWN/3)),  canvas.width/2, canvas.height/2); 
		ctx.strokeText(Math.ceil(countDown/(COUNTDOWN/3)),  canvas.width/2, canvas.height/2);
  }
}


/**
 * @function new_level
 * 
 */
function new_level(){
  level++;
  score += 100;
  player.restart();
  state = 'ready';
  asteroids = [];
  for(var i = 0; i < INIT_ASTEROIDS; i++){
    asteroids.push(new Asteroid(level, canvas, 3));
  }
}
},{"./asteroid.js":2,"./game.js":3,"./player.js":5}],2:[function(require,module,exports){
"use strict";

const MS_PER_FRAME = 1000/8;
/**
 * @module exports the Asteroid class
 */
module.exports = exports = Asteroid;

/**
 * @constructor Asteroid
 * Creates a new asteroid object
 * @param {Postition} position object specifying an x and y
 */
function Asteroid(level, canvas, size, startPos, startVelocity, startDi) {
  this.level = level;
  this.worldWidth = canvas.width;
  this.worldHeight = canvas.height;
  this.spritesheet = new Image();
  this.spritesheet.src = 'assets/asteroids/asteroid.png';
  this.explosion = new Image();
  this.explosion.src = 'assets/explosion/explosion.png';
  this.explosionSound = new Audio('sounds/explosion.wav');
  this.explosionSound.playbackRate = 3;
  if(startDi) this.diameter = startDi;
  else this.diameter  = Math.random() * 40 + 80;
  this.radius = this.diameter/2;
  this.mass = this.diameter / 120;
  this.size = size;;
  this.canvas = canvas;
  this.state = 'default';
  this.explosionFrame = 0;
  this.remove = false;
  // Assign starting position if it exists. Generate randomly otherwise
  if(startPos){
    this.position = {x: startPos.x + 5, y: startPos.y + 5};
  }
  else{
    do{
      this.position = {
        x: Math.random() * (canvas.width - this.diameter) + this.diameter/2,
        y: Math.random() * (canvas.height - this.diameter) + this.diameter/3
      };
    }while(this.position.x > canvas.width/2 - 150 && this.position.x < canvas.width/2 + 50
            && this.position.y > canvas.height/2 - 150 && this.position.y < canvas.height/2 + 50)
  }

  // Assign starting velocity if it exists. Generate randomly otherwise
  if(startVelocity){
    this.velocity = startVelocity;
  }
  else{
    var tempX = Math.random() + 0.5*(this.level-1);
    var tempY = Math.random() + 0.5*(this.level-1);
    if(Math.random() > 0.5) tempX *= -1;
    if(Math.random() > 0.5) tempY *= -1;
    this.velocity = {
      x: tempX,
      y: tempY
    };
  }
  this.count = 0;
  this.angle = Math.random() * 2 * Math.PI;
  this.angularVelocity = Math.random() * 0.1 - 0.05;
}

/**
 * @function damages or destroyes asteroid, depending on size
 * {Asteroid[]} asteroids the current list of asteroids
 */
Asteroid.prototype.struck = function(asteroids) {
  this.state = 'exploding';
  this.explosionSound.play();
  if(this.size > 1){
    var angle = Math.atan(this.velocity.y/this.velocity.x);
    var velocity1 = {x: Math.cos(angle + Math.PI/4)*1.5, y: Math.sin(angle + Math.PI/4)*1.5};
    var velocity2 = {x: Math.cos(angle - Math.PI/4)*1.5, y: Math.sin(angle - Math.PI/4)*1.5};
    var newAst1 = new Asteroid(this.level, this.canvas, this.size - 1, this.position, velocity1, this.diameter*2/3);
    var newAst2 = new Asteroid(this.level, this.canvas, this.size - 1, this.position, velocity2, this.diameter*2/3);
    asteroids.push(newAst1);
    asteroids.push(newAst2);
  }
}


/**
 * @function updates the asteroid object
 * {DOMHighResTimeStamp} time the elapsed time since the last frame
 */
Asteroid.prototype.update = function(time) {
  if(this.state == 'default'){
    this.angle -= this.angularVelocity;

    // Apply velocity
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;

    if(this.position.x < -1 * this.diameter) this.position.x = this.worldWidth;
    if(this.position.x > this.worldWidth) this.position.x = -1 * this.diameter;
    if(this.position.y < -1 * this.diameter) this.position.y = this.worldHeight;
    if(this.position.y > this.worldHeight) this.position.y = -1 * this.diameter;
  }
  else if(this.state == 'exploding'){
    if(this.explosionFrame < 16)
      this.explosionFrame ++;
    else
      this.remove = true;
  }
}

/**
 * @function renders the asteroid into the provided context
 * {DOMHighResTimeStamp} time the elapsed time since the last frame
 * {CanvasRenderingContext2D} ctx the context to render into
 */
Asteroid.prototype.render = function(time, ctx) {
  if(this.state == 'default'){
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.translate(this.diameter/2, this.diameter/2);
    ctx.rotate(-this.angle);
    ctx.drawImage(
      //image
      this.spritesheet,
      //source rectangle
      0, 0, 240, 240,
      //destination rectangle
      -1 * this.diameter/2, -1 * (this.diameter/2), this.diameter, this.diameter
    );
    ctx.restore();
  }
  else if(this.state == 'exploding'){
    ctx.drawImage(
      //image
      this.explosion,
      //source rectangle
      (this.explosionFrame % 4)*64, Math.floor(this.explosionFrame/4)*64, 64, 64,
      //destination rectangle
      this.position.x, this.position.y, this.diameter, this.diameter
    );
  }
}

},{}],3:[function(require,module,exports){
"use strict";

/**
 * @module exports the Game class
 */
module.exports = exports = Game;

/**
 * @constructor Game
 * Creates a new game object
 * @param {canvasDOMElement} screen canvas object to draw into
 * @param {function} updateFunction function to update the game
 * @param {function} renderFunction function to render the game
 */
function Game(screen, updateFunction, renderFunction) {
  this.update = updateFunction;
  this.render = renderFunction;

  // Set up buffers
  this.frontBuffer = screen;
  this.frontCtx = screen.getContext('2d');
  this.backBuffer = document.createElement('canvas');
  this.backBuffer.width = screen.width;
  this.backBuffer.height = screen.height;
  this.backCtx = this.backBuffer.getContext('2d');

  // Start the game loop
  this.oldTime = performance.now();
  this.paused = false;
}

/**
 * @function pause
 * Pause or unpause the game
 * @param {bool} pause true to pause, false to start
 */
Game.prototype.pause = function(flag) {
  this.paused = (flag == true);
}

/**
 * @function loop
 * The main game loop.
 * @param{time} the current time as a DOMHighResTimeStamp
 */
Game.prototype.loop = function(newTime) {
  var game = this;
  var elapsedTime = newTime - this.oldTime;
  this.oldTime = newTime;

  if(!this.paused) this.update(elapsedTime);
  this.render(elapsedTime, this.frontCtx);

  // Flip the back buffer
  this.frontCtx.drawImage(this.backBuffer, 0, 0);
}

},{}],4:[function(require,module,exports){
"use strict";

const MS_PER_FRAME = 1000/8;
const LASER_SPEED = 20;

/**
 * @module exports the Laser class
 */
module.exports = exports = Laser;

/**
 * @constructor Laser
 * Creates a new laser object
 * @param {Postition} position object specifying an x and y
 */
function Laser(position, angle, canvas) {
  this.worldWidth = canvas.width;
  this.worldHeight = canvas.height;
  this.sound = new Audio('sounds/laser.wav');
  this.sound.volume = 0.5;
  this.sound.play();
  this.position = {
    x: position.x,
    y: position.y
  };
  this.angle = angle;
  this.velocity = {
    x: Math.cos(this.angle),
    y: Math.sin(this.angle)
  }
  this.color = "green";
  this.remove = false;
}


/**
 * @function updates the laser object
 * {DOMHighResTimeStamp} time the elapsed time since the last frame
 */
Laser.prototype.update = function(time) {
  // Apply velocity
  this.position.x += this.velocity.x * LASER_SPEED;
  this.position.y -= this.velocity.y * LASER_SPEED;

  if(this.position.x < 0 || this.position.x > this.worldWidth ||
     this.position.y < 0 || this.position.y > this.worldHeight){
    this.remove = true;;
  }
}

/**
 * @function renders the laser into the provided context
 * {DOMHighResTimeStamp} time the elapsed time since the last frame
 * {CanvasRenderingContext2D} ctx the context to render into
 */
Laser.prototype.render = function(time, ctx) {
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.position.x, this.position.y);
    ctx.lineTo(this.position.x + LASER_SPEED*this.velocity.x, this.position.y - LASER_SPEED*this.velocity.y);
    ctx.stroke();
    ctx.restore();
}

},{}],5:[function(require,module,exports){
"use strict";

const MS_PER_FRAME = 1000/8;
const LASER_WAIT = 150;

const Laser = require('./laser.js');

/**
 * @module exports the Player class
 */
module.exports = exports = Player;

/**
 * @constructor Player
 * Creates a new player object
 * @param {Postition} position object specifying an x and y
 */
function Player(position, canvas) {
  this.canvas = canvas;
  this.worldWidth = canvas.width;
  this.worldHeight = canvas.height;
  this.position = {
    x: position.x,
    y: position.y
  };
  this.velocity = {
    x: 0,
    y: 0
  }
  this.angle = 0;
  this.radius  = 64;
  this.thrusting = false;
  this.steerLeft = false;
  this.steerRight = false;
  this.lives = 3;
  this.p_key = false;
  this.laser_wait = 0;
  this.lasers = [];
  this.color = "white";
  this.explosionSound = new Audio('sounds/explosion.wav');
  this.explosion = new Image();
  this.explosion.src = 'assets/explosion/explosion.png';
  this.explosionFrame = 0;
  this.state = 'ready';
}

/**
 * Button handler for player related
 * button presses
 */
Player.prototype.buttonDown = function(event){
  switch(event.key) {
    case ' ':
      event.preventDefault();
      if(this.state == 'running' && this.laser_wait >= LASER_WAIT){
        this.lasers.push(new Laser(this.position, (this.angle % (2*Math.PI) + Math.PI/2), this.canvas));
        this.laser_wait = 0;
      }
      break;
    case 'ArrowUp': // up
    case 'w':
      this.thrusting = true;
      break;
    case 'ArrowLeft': // left
    case 'a':
      this.steerLeft = true;
      break;
    case 'ArrowRight': // right
    case 'd':
      this.steerRight = true;
      break;
  }
}
Player.prototype.buttonUp = function(event){
  switch(event.key) {
    case 'ArrowUp': // up
    case 'w':
      this.thrusting = false;
      break;
    case 'ArrowLeft': // left
    case 'a':
      this.steerLeft = false;
      break;
    case 'ArrowRight': // right
    case 'd':
      this.steerRight = false;
      break;
  }
}

/**
 * Warps player to a random location on the screen,
 * (supposedly) guaranteeing they won't warp onto an 
 * asteroid
 */
Player.prototype.warp = function(asteroids){
  // Reset movement variables
  var valid = false;
  this.thrusting = false;
  this.steerLeft = false;
  this.steerRight = false;
  this.velocity = {
    x: 0,
    y: 0
  }
  // Warp to new, random position
  this.position = newPosition(this.worldWidth, this.worldHeight);
  for(var i = 0; i < asteroids.length; i++){
    var dist = Math.sqrt(
      Math.pow((this.position.x) - (asteroids[i].position.x + asteroids[i].radius), 2) +
      Math.pow((this.position.y) - (asteroids[i].position.y + asteroids[i].radius), 2));

    // If the distance between the player's new position and any 
    // asteroid is too small, pick a new position and restart 
    // asteroid checking loop
    if(dist < asteroids[i].radius + 100 && asteroids[i].state == 'running') {
      this.position = newPosition(this.worldWidth, this.worldHeight);
      i = 0;
    }
  }
}

/**
 * Calculate a new random position
 */
function newPosition(width, height){
    return {
    x: Math.random()*width,
    y: Math.random()*height
  };
}


/**
 * @function explodes player
 */
Player.prototype.explode = function() {
  this.lasers = [];
  this.lives--;
  this.state = 'exploding';
  this.explosionSound.currentTime = 0;
  this.explosionSound.play();
}

/**
 * @function restarts player
 */
Player.prototype.restart = function() {
  this.lasers = [];
  this.angle = 0;
  this.position = {x: this.worldWidth/2, y: this.worldHeight/2};
  this.state = 'ready';
  this.velocity = {
    x: 0,
    y: 0
  };
  this.thrusting = false;
  this.steerLeft = false;
  this.steerRight = false;
  this.explosionFrame = 0;
  this.laser_wait = 0;
}

/**
 * @function updates the player object
 * {DOMHighResTimeStamp} time the elapsed time since the last frame
 */
Player.prototype.update = function(time) {
  switch(this.state){
    case 'ready':
    case 'running':
      // Laser wait time
      this.laser_wait += time;

      // Apply angular velocity
      if(this.steerLeft) {
        this.angle += time * 0.005;
      }
      if(this.steerRight) {
        this.angle -= 0.1;
      }
      // Apply acceleration
      if(this.thrusting) {
        var acceleration = {
          x: Math.sin(this.angle),
          y: Math.cos(this.angle)
        }
        this.velocity.x -= acceleration.x * 0.25;
        this.velocity.y -= acceleration.y * 0.25;
      }
      // Apply velocity
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
      // Wrap around the screen
      if(this.position.x < 0) this.position.x += this.worldWidth;
      if(this.position.x > this.worldWidth) this.position.x -= this.worldWidth;
      if(this.position.y < 0) this.position.y += this.worldHeight;
      if(this.position.y > this.worldHeight) this.position.y -= this.worldHeight;
      // Update lasers
      for(var i = 0; i < this.lasers.length; i++){
        this.lasers[i].update(time);
        if(this.lasers[i].remove){
          this.lasers.splice(i,1);
        }
      }
      break;

    case 'exploding':
      // Increment explosion frame
      this.explosionFrame++;
      if(this.explosionFrame >= 16){
        this.state = 'dead';
      }
      break;

    case 'dead':
      break;
  }
}

/**
 * @function renders the player into the provided context
 * {DOMHighResTimeStamp} time the elapsed time since the last frame
 * {CanvasRenderingContext2D} ctx the context to render into
 */
Player.prototype.render = function(time, ctx) {
  // Draw remaining lives
  for(var i = 0; i < this.lives; i++){
    ctx.save();
    ctx.translate(this.worldWidth - 125 + (30 * i), this.worldHeight - 135);
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(-10, 10);
    ctx.lineTo(0, 0);
    ctx.lineTo(10, 10);
    ctx.closePath();
    ctx.strokeStyle = this.color;
    ctx.stroke();
    ctx.restore();
  }

  if(this.state == 'running' || this.state == 'ready'){
    ctx.save();
    // Draw lasers
    for(var i = 0; i < this.lasers.length; i++){
      this.lasers[i].render(time, ctx);
    }

    // Draw player's ship
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(-this.angle);
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(-10, 10);
    ctx.lineTo(0, 0);
    ctx.lineTo(10, 10);
    ctx.closePath();
    ctx.strokeStyle = this.color;
    ctx.stroke();

    // Draw engine thrust
    if(this.thrusting) {
      ctx.beginPath();
      ctx.moveTo(0, 20);
      ctx.lineTo(5, 10);
      ctx.arc(0, 10, 5, 0, Math.PI, true);
      ctx.closePath();
      ctx.strokeStyle = 'orange';
      ctx.stroke();
    }
    ctx.restore();
  }
  else{
    ctx.drawImage(
      //image
      this.explosion,
      //source rectangle
      (this.explosionFrame % 4)*64, Math.floor(this.explosionFrame/4)*64, 64, 64,
      //destination rectangle
      this.position.x-50, this.position.y-50, 100, 100
    );
  }
}

},{"./laser.js":4}]},{},[1]);
