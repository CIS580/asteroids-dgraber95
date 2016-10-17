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