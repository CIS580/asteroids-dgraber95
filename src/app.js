"use strict;"

const COUNTDOWN = 2400;
const INIT_ASTEROIDS = 3;

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
      player.update(elapsedTime);
      for(var i = 0; i < asteroids.length; i++){
        asteroids[i].update(elapsedTime);
      }
      axisList.sort(function(a,b){return a.position.x - b.position.x});

      var active = [];
      var potentiallyColliding = [];
      // For each asteroid in the axis list, we consider it
      // in order
      axisList.forEach(function(asteroid, aindex){
        // remove asteroids from the active list that are
        // too far away from our current asteroid to collide
        active = active.filter(function(oasteroid){
          return asteroid.position.x - oasteroid.position.x < oasteroid.diameter;
        });
        // Since only asteroids within colliding distance of
        // our current asteroid are left in the active list,
        // we pair them with the current asteroid and add
        // them to the potentiallyColliding array.
        active.forEach(function(oasteroid, bindex){
          potentiallyColliding.push({a: oasteroid, b: asteroid});
        });
        // Finally, we add our current asteroid to the active
        // array to consider it in the next pass down the
        // axisList
        active.push(asteroid);
      });

      // At this point we have a potentaillyColliding array
      // containing all pairs overlapping in the x-axis.  Now
      // we want to check for REAL collisions between these pairs.
      var collisions = [];
      potentiallyColliding.forEach(function(pair){
        // Calculate the distance between balls; we'll keep
        // this as the squared distance, as we just need to
        // compare it to a distance equal to the radius of
        // both balls summed.  Squaring this second value
        // is less computationally expensive than taking
        // the square root to get the actual distance.
        // In fact, we can cheat a bit more and use a constant
        // for the sum of radii, as we know the radius of our
        // balls won't change.
        var distSquared =
          Math.pow((pair.a.position.x + pair.a.radius) - (pair.b.position.x + pair.b.radius), 2) +
          Math.pow((pair.a.position.y + pair.a.radius) - (pair.b.position.y + pair.b.radius), 2);

        if(distSquared < Math.pow(pair.a.radius + pair.b.radius, 2)) {
          // Color the collision pair for visual debugging
          pair.a.color = 'red';
          pair.b.color = 'red';
          // Push the colliding pair into our collisions array
          collisions.push(pair);
        }else{
          pair.a.color = 'gray';
          pair.b.color = 'gray';
        }


        // // Process asteroids collisions
        // collisions.forEach(function(pair){
        //   var collisionNormal = {
        //     x: pair.a.position.x - pair.b.position.x,
        //     y: pair.a.position.y - pair.b.position.y
        //   }
        //   // Calculate the overlap between balls
        //   var overlap = pair.a.radius + pair.b.radius + 4 - Vector.magnitude(collisionNormal);
        //   var collisionNormal = Vector.normalize(collisionNormal);

        //   pair.a.position.x += collisionNormal.x * overlap / 2;
        //   pair.a.position.y += collisionNormal.y * overlap / 2; 
        //   pair.b.position.x -= collisionNormal.x * overlap / 2; 
        //   pair.b.position.y -= collisionNormal.y * overlap / 2; 
          
        //   var angle = Math.atan2(collisionNormal.y, collisionNormal.x);
        //   var a = Vector.rotate(pair.a.velocity, angle);
        //   var b = Vector.rotate(pair.b.velocity, angle);
        //   // Solve the collisions along the x-axis
        //   var aOriginal = a.x;
        //   var bOriginal = b.x;

        //   a.x = (aOriginal * (pair.a.mass - pair.b.mass) + 2 * pair.b.mass * bOriginal)/(pair.a.mass + pair.b.mass);
        //   b.x = (bOriginal * (pair.b.mass - pair.a.mass) + 2 * pair.a.mass * aOriginal)/(pair.a.mass + pair.b.mass);

        //   // Rotate back to the original system
        //   a = Vector.rotate(a, -angle);
        //   b = Vector.rotate(b, -angle);
        //   pair.a.velocity.x = a.x;
        //   pair.a.velocity.y = a.y;
        //   pair.b.velocity.x = b.x;
        //   pair.b.velocity.y = b.y;
        // });


      });

      break;
    
    // Update nothing if gameover or paused
    case 'gameover':
    case 'paused':
      break;
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
  for(var i = 0; i < asteroids.length; i++){
    asteroids[i].render(elapsedTime, ctx);
  }

    // Show mouse position
    // ctx.globalAlpha = 1.0;
    // ctx.fillStyle = 'white';
    // ctx.font = "30px Lucida Console";
    // ctx.fillText("X: " + cursor_x + "  Y: " + cursor_y, canvas.width/2 - 50, canvas.height/2);      

    if(state != 'gameover'){
    // Render score
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.font = "40px Lucida Console";
    ctx.fillText("Score: " + score, canvas.width - 150, canvas.height - 40);      
    ctx.strokeText("Score: " + score, canvas.width - 150, canvas.height - 40);  
  }

  // Game over screen
  if(state == 'gameover'){
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.font = "60px Lucida Console";
		ctx.fillStyle = "red";
    ctx.strokeStyle = 'black';
		ctx.textAlign = "center";
		ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2); 
		ctx.strokeText("GAME OVER", canvas.width/2, canvas.height/2); 
		ctx.font = "35px Lucida Console";
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
    ctx.font = "50px Lucida Console";
    ctx.fillText("PAUSED", canvas.width/2, canvas.height/2); 
    ctx.strokeText("PAUSED", canvas.width/2, canvas.height/2); 
  }

  // Ready screen (level + countdown)
  else if(state == 'ready'){
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    ctx.font = "75px Lucida Console";
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
		ctx.textAlign = "center";
		ctx.fillText(Math.ceil(countDown/(COUNTDOWN/3)),  canvas.width/2, canvas.height/2); 
		ctx.strokeText(Math.ceil(countDown/(COUNTDOWN/3)),  canvas.width/2, canvas.height/2); 
		ctx.font = "40px Lucida Console";
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