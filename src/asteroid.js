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
  this.diameter  = Math.random() * 50 + 70;
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
  this.angularVelocity = Math.random() * 0.15 - 0.075;
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


  ctx.globalAlpha = 1.0;
  ctx.fillStyle = 'white';
  ctx.font = "15px Lucida Console";
  ctx.fillText("(" + Math.floor(this.position.x) + ", " + Math.floor(this.position.y) + ")", this.position.x + 20, this.position.y - 20);
  ctx.fillText("Radius: " + Math.floor(this.radius), this.position.x + 20, this.position.y - 45);

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
  ctx.beginPath();
  ctx.lineWidth = "3";
  ctx.strokeStyle = this.color;
  ctx.rect(-1*this.diameter/2, -1*this.diameter/2, this.diameter, this.diameter);
  ctx.stroke();

  ctx.restore();  
}
