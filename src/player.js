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
