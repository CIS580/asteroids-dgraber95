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