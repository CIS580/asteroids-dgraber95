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
  this.paused = false;
  this.laser_wait = 0;
  this.ready_to_fire = false;
  this.lasers = [];
  this.color = "white";
  this.explosionSound = new Audio('sounds/explosion.wav');
  this.explosion = new Image();
  this.explosion.src = 'assets/explosion/explosion.png';
  this.explosionFrame = 0;
  this.state = 'default';
  this.dead = false;
  this.invincible = true;
  this.shots = 0;
}


Player.prototype.buttonDown = function(event){
  switch(event.key) {
    case ' ':
      if(this.ready_to_fire && this.state == 'default'){
        this.lasers.push(new Laser(this.position, (this.angle % (2*Math.PI) + Math.PI/2), this.canvas));
        this.shots++;
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


Player.prototype.warp = function(asteroids){
  var valid = false;
  this.thrusting = false;
  this.steerLeft = false;
  this.steerRight = false;
  this.velocity = {
    x: 0,
    y: 0
  }
  this.position = newPosition(this.worldWidth, this.worldHeight);
  for(var i = 0; i < asteroids.length; i++){
    var dist = Math.sqrt(
      Math.pow((this.position.x) - (asteroids[i].position.x + asteroids[i].radius), 2) +
      Math.pow((this.position.y) - (asteroids[i].position.y + asteroids[i].radius), 2));

    if(dist < asteroids[i].radius + 100 && asteroids[i].state == 'default') {
      this.position = newPosition(this.worldWidth, this.worldHeight);
      i = 0;
    }
  }
}

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
  this.state = 'default';
  this.velocity = {
    x: 0,
    y: 0
  };
  this.thrusting = false;
  this.steerLeft = false;
  this.steerRight = false;
  this.explosionFrame = 0;
  this.dead = false;
  this.ready_to_fire = false;
}

/**
 * @function updates the player object
 * {DOMHighResTimeStamp} time the elapsed time since the last frame
 */
Player.prototype.update = function(time) {
  if(this.state == 'default'){
    this.laser_wait += time;
    if(this.laser_wait >= LASER_WAIT){
      if(!this.invincible)
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
  else if(!this.dead && this.state =='exploding'){
    this.explosionFrame += 1;
    if(this.explosionFrame >= 16){
      this.dead = true;
    }
  }
}

/**
 * @function renders the player into the provided context
 * {DOMHighResTimeStamp} time the elapsed time since the last frame
 * {CanvasRenderingContext2D} ctx the context to render into
 */
Player.prototype.render = function(time, ctx) {
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

  if(this.state == 'default'){
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
  else if(!this.dead && this.state == 'exploding'){
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
