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
  asteroids.push(new Asteroid(canvas));
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

      if(distSquared < Math.pow(asteroids[i].radius, 2)) {
        player.lasers[j].color = "green";
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
      player.color = "red";
      return;
    }
  }
  player.color = "white";
}

function check_asteroid_collisions(){
  axisList.sort(function(a,b){return a.position.x - b.position.x});

  var active = [];
  var potentiallyColliding = [];
  // Loop over every asteroid
  axisList.forEach(function(asteroid, aindex){
    active = active.filter(function(oasteroid){ // remove asteroids too far away from current asteroid
      return asteroid.position.x - oasteroid.position.x < oasteroid.diameter;
    });
    active.forEach(function(oasteroid, bindex){
      potentiallyColliding.push({a: oasteroid, b: asteroid});
    });
    active.push(asteroid);
  });

  // Check for collisions between potential pairs
  var collisions = [];
  potentiallyColliding.forEach(function(pair){
    var distSquared =
      Math.pow((pair.a.position.x + pair.a.radius) - (pair.b.position.x + pair.b.radius), 2) +
      Math.pow((pair.a.position.y + pair.a.radius) - (pair.b.position.y + pair.b.radius), 2);

    if(distSquared < Math.pow(pair.a.radius + pair.b.radius, 2)) {
      // Push the colliding pair into our collisions array
      collisions.push(pair);
    }


    // Process asteroids collisions
    collisions.forEach(function(pair){
      var collisionNormal = {
        x: pair.a.position.x - pair.b.position.x,
        y: pair.a.position.y - pair.b.position.y
      }
      // Calculate the overlap between balls
      var overlap = pair.a.radius + pair.b.radius + 4 - Vector.magnitude(collisionNormal);
      var collisionNormal = Vector.normalize(collisionNormal);

      pair.a.position.x += collisionNormal.x * overlap / 2;
      pair.a.position.y += collisionNormal.y * overlap / 2; 
      pair.b.position.x -= collisionNormal.x * overlap / 2; 
      pair.b.position.y -= collisionNormal.y * overlap / 2; 
      
      var angle = Math.atan2(collisionNormal.y, collisionNormal.x);
      var a = Vector.rotate(pair.a.velocity, angle);
      var b = Vector.rotate(pair.b.velocity, angle);
      // Solve the collisions along the x-axis
      var aOriginal = a.x;
      var bOriginal = b.x;

      a.x = (aOriginal * (pair.a.mass - pair.b.mass) + 2 * pair.b.mass * bOriginal)/(pair.a.mass + pair.b.mass);
      b.x = (bOriginal * (pair.b.mass - pair.a.mass) + 2 * pair.a.mass * aOriginal)/(pair.a.mass + pair.b.mass);

      // Rotate back to the original system
      a = Vector.rotate(a, -angle);
      b = Vector.rotate(b, -angle);
      pair.a.velocity.x = a.x;
      pair.a.velocity.y = a.y;
      pair.b.velocity.x = b.x;
      pair.b.velocity.y = b.y;
    });
  });
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
  for(var i = 0; i < asteroids.length; i++){
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
function Asteroid(canvas, sx, sy, dir) {
  this.worldWidth = canvas.width;
  this.worldHeight = canvas.height;
  this.spritesheet = new Image();
  this.spritesheet.src = 'assets/asteroids/large.png';
  this.diameter  = Math.random() * 40 + 80;
  this.radius = this.diameter/2;
  this.mass = this.diameter / 120;
  this.color = "green";


  do{
    this.position = {
      x: Math.random() * (canvas.width - this.diameter) + this.diameter/2,
      y: Math.random() * (canvas.height - this.diameter) + this.diameter/3
    };  
  }while(this.position.x > canvas.width/2 - 150 && this.position.x < canvas.width/2 + 50
          && this.position.y > canvas.height/2 - 150 && this.position.y < canvas.height/2 + 50)

  this.velocity = {
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1
  };


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
 * @function updates the asteroid object
 * {DOMHighResTimeStamp} time the elapsed time since the last frame
 */
Asteroid.prototype.update = function(time) {
  this.angle -= this.angularVelocity;

  // Apply velocity
  this.position.x += this.velocity.x;
  this.position.y += this.velocity.y;

  if(this.position.x < -1 * this.diameter) this.position.x = this.worldWidth;
  if(this.position.x > this.worldWidth) this.position.x = -1 * this.diameter;
  if(this.position.y < -1 * this.diameter) this.position.y = this.worldHeight;
  if(this.position.y > this.worldHeight) this.position.y = -1 * this.diameter;
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

  // ctx.beginPath();
  // ctx.lineWidth = "3";
  // ctx.strokeStyle = this.color;
  // ctx.rect(-1*this.diameter/2, -1*this.diameter/2, this.diameter, this.diameter);
  // ctx.stroke();

  ctx.restore();  
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
  this.color = "red";
}


/**
 * @function updates the laser object
 * {DOMHighResTimeStamp} time the elapsed time since the last frame
 */
Laser.prototype.update = function(time) {
  // Apply velocity
  this.position.x += this.velocity.x * LASER_SPEED;
  this.position.y -= this.velocity.y * LASER_SPEED;
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
  }
  if(this.lasers.length != 0 && 
     (this.lasers[0].position.x < 0 || this.lasers[0].position.x > this.worldWidth ||
     this.lasers[0].position.y < 0 || this.lasers[0].position.y > this.worldHeight)){
    this.lasers.splice(0,1);
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
