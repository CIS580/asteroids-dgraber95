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
