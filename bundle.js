(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict;"

const COUNTDOWN = 2400;
const INIT_ASTEROIDS = 10;

const Vector = require('./vector');

/* Classes */
const Game = require('./game.js');
const Player = require('./player.js');
const Asteroid = require('./asteroid.js');


/* Global variables */
var canvas = document.getElementById('screen');
var game = new Game(canvas, update, render);
var player = new Player({x: canvas.width/2, y: canvas.height/2}, canvas);
var asteroids = [];
var axisList = [];

for(var i = 0; i < INIT_ASTEROIDS; i++){
  asteroids.push(new Asteroid(canvas, 3));
  axisList.push(asteroids[i]);
}

// asteroids.push(new Asteroid(canvas, 150, 150, 0));
// axisList.push(asteroids[0]);
// asteroids.push(new Asteroid(canvas, 400, 100, 1));
// axisList.push(asteroids[1]);

axisList.sort(function(a,b){return a.position.x - b.position.x});


var cursor_x = 0;
var cursor_y = 0;

var level = 1;              // Level counter
var score = 0;              // Score counter
var state = 'ready';        // State of the game (initally ready)
var countDown = COUNTDOWN;  // Countdown for ready screen
var p_key = false;          // Used for pausing/unpausing


var newgameSound = new Audio('sounds/newgame.wav');
newgameSound.volume = 0.5;


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
 * Updates cursor position whenever mouse moves
 */
window.onmousemove = function(event) {
  getMousePos(event);
}
/**
 * @function getMousePos
 * Gets mouse position relative to the top left corner of the canvas
 */
function getMousePos(event) {
  var rect = canvas.getBoundingClientRect();
  cursor_x = event.clientX - rect.left;
  cursor_y = event.clientY - rect.top;  
}

/**
 * Handles key press down events 
 * p = pause/unpause
 */
window.onkeydown = function(event) {
  switch(event.keyCode) {
    // P to pause
    case 80:
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
    default:
      if(state == 'running'){
        player.buttonDown(event);
      }
      break;
  }
}


/**
 * Handles key up events 
 */
window.onkeyup = function(event) {
  switch(event.keyCode) {
    // P
    case 80:
      event.preventDefault();
      p_key = false;
      break;
    default:
      if(state == 'running'){
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
    //state = 'paused';
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
      }
      break;

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
      check_player_collisions();
      check_laser_collisions();
      break;
    
    // Update nothing if gameover or paused
    case 'gameover':
    case 'paused':
      break;
  }
}


function check_laser_collisions(){
  for(var i = 0; i < asteroids.length; i++){
    for(var j = 0; j < player.lasers.length; j++){
      var distSquared =
        Math.pow((player.lasers[j].position.x) - (asteroids[i].position.x + asteroids[i].radius), 2) +
        Math.pow((player.lasers[j].position.y) - (asteroids[i].position.y + asteroids[i].radius), 2);

      if(distSquared < Math.pow(asteroids[i].radius, 2) && asteroids[i].state == 'default') {
        // Laser struck asteroid
        player.lasers[j].remove = true;
        asteroids[i].struck(asteroids, axisList);
        return;
      }
    }
  }
}

function check_player_collisions(){
  for(var i = 0; i < asteroids.length; i++){
    var distSquared =
      Math.pow((player.position.x + 10) - (asteroids[i].position.x + asteroids[i].radius), 2) +
      Math.pow((player.position.y + 10) - (asteroids[i].position.y + asteroids[i].radius), 2);

    if(distSquared < Math.pow(10 + asteroids[i].radius, 2)) {
      // Player struck asteroid
      return;
    }
  }
}

function check_asteroid_collisions(){
  for(var i = 0; i < asteroids.length; i++){
    for(var j = 0; j < asteroids.length; j++)
    {
      if( i != j && asteroids[i].state != 'exploding' && asteroids[j].state != 'exploding'){
        var distSquared =
          Math.pow((asteroids[i].position.x + asteroids[i].radius) - (asteroids[j].position.x + asteroids[j].radius), 2) +
          Math.pow((asteroids[i].position.y + asteroids[i].radius) - (asteroids[j].position.y + asteroids[j].radius), 2);
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

          var aNewXPos = asteroids[i].position.x*Math.cos(angle) - asteroids[i].position.y*Math.sin(angle);
          var aNewYPos = asteroids[i].position.x*Math.sin(angle) + asteroids[i].position.y*Math.cos(angle);
          var bNewXPos = asteroids[j].position.x*Math.cos(angle) - asteroids[j].position.y*Math.sin(angle);
          var bNewYPos = asteroids[j].position.x*Math.sin(angle) + asteroids[j].position.y*Math.cos(angle);

          // Update new asteroid positions to account for overlap
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
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  player.render(elapsedTime, ctx);
  for(var i = asteroids.length - 1; i >= 0; i--){
    asteroids[i].render(elapsedTime, ctx);
  }

    // Show mouse position
    // ctx.globalAlpha = 1.0;
    // ctx.fillStyle = 'white';
    // ctx.font = "30px impact";
    // ctx.fillText("X: " + cursor_x + "  Y: " + cursor_y, canvas.width/2 - 50, canvas.height/2);

    if(state != 'gameover'){
    // Render score
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.font = "40px Impact";
    ctx.fillText("Score: " + score, canvas.width - 150, canvas.height - 40);      
    ctx.strokeText("Score: " + score, canvas.width - 150, canvas.height - 40);  
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
		ctx.fillText("Final Score: " + score, canvas.width/2, canvas.height/2 + 35);
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
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.font = "75px impact";
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
		ctx.textAlign = "center";
		ctx.fillText(Math.ceil(countDown/(COUNTDOWN/3)),  canvas.width/2, canvas.height/2); 
		ctx.strokeText(Math.ceil(countDown/(COUNTDOWN/3)),  canvas.width/2, canvas.height/2); 
		ctx.font = "40px impact";
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
		ctx.fillText("Level: " + level, canvas.width/2, canvas.height/2 + 60);
		ctx.strokeText("Level: " + level, canvas.width/2, canvas.height/2 + 60);
  }  
}

/**
 * @function new_level
 * 
 */
function new_level(){
  // Play sound, set state, increment level, speed up flow, and update score
  newgameSound.play();
  state = 'ready';
  level += 1;
  count -= 30;
  score += 10 * pipes_used;
  pipes_used = 0;

  // Reset board
  startPipe = new StartPipe();
  endPipe = new EndPipe(startPipe.x_cell, startPipe.y_cell);
  cells = new Array(BOARD_WIDTH);
  for (var i = 0; i < BOARD_WIDTH; i++) {
    cells[i] = new Array(BOARD_HEIGHT);
  }
  cells[startPipe.x_cell][startPipe.y_cell] = startPipe;
  cells[endPipe.x_cell][endPipe.y_cell] = endPipe; 

  // Get new current pipe
  currentPipe = Math.floor(Math.random()*6);
  updatePipeImgSource();

  // Start water flow
  water_cell = startPipe;
  direction = startPipe.beginFlow();
  updateNextCell()
}
},{"./asteroid.js":2,"./game.js":3,"./player.js":5,"./vector":6}],2:[function(require,module,exports){
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
function Asteroid(canvas, size, startPos, startVelocity, startDi) {
  this.worldWidth = canvas.width;
  this.worldHeight = canvas.height;
  this.spritesheet = new Image();
  this.spritesheet.src = 'assets/asteroids/large.png';
  this.explosion = new Image();
  this.explosion.src = 'assets/explosion/explosion.png';
  if(startDi) this.diameter = startDi;
  else this.diameter  = Math.random() * 40 + 80;
  this.radius = this.diameter/2;
  this.mass = this.diameter / 120;
  this.size = size;
  this.destroyed = false;
  this.canvas = canvas;
  this.state = 'default';
  this.explosionFrame = 0;
  this.remove = false;


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

  if(startVelocity){
    this.velocity = startVelocity;
  }
  else{
    this.velocity = {
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1
    };
  }


  // this.position = {
  //   x: sx, y: sy
  // };

  // switch(dir){
  //   case 0:
  //     this.velocity = {
  //       x: 0.5,
  //       y: 0
  //     };
  //     break;
  //   case 1:
  //     this.velocity = {
  //       x: -0.5,
  //       y: 0
  //     };
  //     break;
  // };

  this.count = 0;
  this.frame = 1;
  this.angle = Math.random() * 2 * Math.PI;
  this.angularVelocity = Math.random() * 0.1 - 0.05;
}

/**
 * @function damages or destroyes asteroid, depending on size
 * {Asteroid[]} asteroids the current list of asteroids
 * {Asteroid[]} axisList list of asteroids sorted by x position
 */
Asteroid.prototype.struck = function(asteroids, axisList) {
  this.state = 'exploding';
  if(this.size > 1){
    var angle = Math.atan(this.velocity.y/this.velocity.x);
    var velocity1 = {x: Math.cos(angle + Math.PI/4)*1.5, y: Math.sin(angle + Math.PI/4)*1.5};
    var velocity2 = {x: Math.cos(angle - Math.PI/4)*1.5, y: Math.sin(angle - Math.PI/4)*1.5};
    var newAst1 = new Asteroid(this.canvas, this.size - 1, this.position, velocity1, this.diameter*2/3);
    var newAst2 = new Asteroid(this.canvas, this.size - 1, this.position, velocity2, this.diameter*2/3);
    asteroids.push(newAst1);
    asteroids.push(newAst2);
    axisList.push(newAst1);
    axisList.push(newAst2);
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


  // ctx.globalAlpha = 1.0;
  // ctx.fillStyle = 'white';
  // ctx.font = "15px Lucida Console";
  // ctx.fillText("(" + Math.floor(this.position.x) + ", " + Math.floor(this.position.y) + ")", this.position.x + 20, this.position.y - 20);
  // ctx.fillText("Radius: " + Math.floor(this.radius), this.position.x + 20, this.position.y - 45);
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

  // ctx.beginPath();
  // ctx.lineWidth = "3";
  // ctx.strokeStyle = this.color;
  // ctx.rect(-1*this.diameter/2, -1*this.diameter/2, this.diameter, this.diameter);
  // ctx.stroke();

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
const LASER_WAIT = 200;

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
  this.state = "idle";
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
  this.paused = false;
  this.laser_wait = 0;
  this.ready_to_fire = false;
  this.lasers = [];
  this.color = "white";
}


Player.prototype.buttonDown = function(event){
      switch(event.key) {
      case ' ':
        if(this.ready_to_fire){
          this.lasers.push(new Laser(this.position, (this.angle % (2*Math.PI) + Math.PI/2), this.canvas));
          this.ready_to_fire = false;
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
 * @function updates the player object
 * {DOMHighResTimeStamp} time the elapsed time since the last frame
 */
Player.prototype.update = function(time) {
  this.laser_wait += time;
  if(this.laser_wait >= LASER_WAIT){
    this.ready_to_fire = true;
    this.laser_wait = 0;
  }

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
}

/**
 * @function renders the player into the provided context
 * {DOMHighResTimeStamp} time the elapsed time since the last frame
 * {CanvasRenderingContext2D} ctx the context to render into
 */
Player.prototype.render = function(time, ctx) {
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

},{"./laser.js":4}],6:[function(require,module,exports){
module.exports = exports = {
    rotate: rotate,
    dotProduct: dotProduct,
    magnitude: magnitude,
    normalize: normalize
}

function rotate(a, angle) {
    return {
        x: a.x * Math.cos(angle) - a.y * Math.sin(angle),
        y: a.x * Math.sin(angle) + a.y * Math.cos(angle)
    };
}


function dotProduct(a, b) {
    return a.x * b.x + a.y * b.y;
}

function magnitude(a) {
    return Math.sqrt(a.x * a.x + a.y * a.y)
}

function normalize(a){
    var mag = magnitude(a);
    return {x: a.x/mag, y: a.y/mag};
}
},{}]},{},[1]);
