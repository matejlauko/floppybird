//loops
var loopGameloop;
var loopPipeloop;

var flyArea = $('#flyarea').height();

var score = 0;
var highscore = 0;

const pipes = new Array();

function startGame() {
  currentstate = states.GameScreen;

  //fade out the splash
  $('#splash').stop();
  $('#splash').transition({ opacity: 0 }, 500, 'ease');

  //update the big score
  setBigScore();

  //debug mode?
  if (debugmode) {
    //show the bounding boxes
    $('.boundingbox').show();
  }

  //start up our loops
  var updaterate = 1000.0 / 60.0; //60 times a second
  loopGameloop = setInterval(gameloop, updaterate);
  loopPipeloop = setInterval(updatePipes, 1400);

  //jump from the start!
  playerJump();
}

function gameloop() {
  var player = $('#player');

  //update the player speed/position
  velocity += gravity;
  position += velocity;

  //update the player
  updatePlayer(player);

  //create the bounding box
  var box = document.getElementById('player').getBoundingClientRect();
  var origwidth = 34.0;
  var origheight = 24.0;

  var boxwidth = origwidth - Math.sin(Math.abs(rotation) / 90) * 8;
  var boxheight = (origheight + box.height) / 2;
  var boxleft = (box.width - boxwidth) / 2 + box.left;
  var boxtop = (box.height - boxheight) / 2 + box.top;
  var boxright = boxleft + boxwidth;
  var boxbottom = boxtop + boxheight;

  //if we're in debug mode, draw the bounding box
  if (debugmode) {
    var boundingbox = $('#playerbox');
    boundingbox.css('left', boxleft);
    boundingbox.css('top', boxtop);
    boundingbox.css('height', boxheight);
    boundingbox.css('width', boxwidth);
  }

  //did we hit the ground?
  if (box.bottom >= $('#land').offset().top) {
    playerDead();
    return;
  }

  //have they tried to escape through the ceiling? :o
  var ceiling = $('#ceiling');
  if (boxtop <= ceiling.offset().top + ceiling.height()) position = 0;

  //we can't go any further without a pipe
  if (pipes[0] == null) return;

  //determine the bounding box of the next pipes inner area
  var nextpipe = pipes[0];
  var nextpipeupper = nextpipe.children('.pipe_upper');

  var pipetop = nextpipeupper.offset().top + nextpipeupper.height();
  var pipeleft = nextpipeupper.offset().left - 2; // for some reason it starts at the inner pipes offset, not the outer pipes.
  var piperight = pipeleft + pipewidth;
  var pipebottom = pipetop + pipeheight;

  if (debugmode) {
    var boundingbox = $('#pipebox');
    boundingbox.css('left', pipeleft);
    boundingbox.css('top', pipetop);
    boundingbox.css('height', pipeheight);
    boundingbox.css('width', pipewidth);
  }

  //have we gotten inside the pipe yet?
  if (boxright > pipeleft) {
    //we're within the pipe, have we passed between upper and lower pipes?
    if (boxtop > pipetop && boxbottom < pipebottom) {
      //yeah! we're within bounds
    } else {
      //no! we touched the pipe
      playerDead();
      return;
    }
  }

  //have we passed the imminent danger?
  if (boxleft > piperight) {
    //yes, remove it
    pipes.splice(0, 1);

    //and score a point
    playerScore();
  }
}

function playerDead() {
  //stop animating everything!
  $('.animated').css('animation-play-state', 'paused');
  $('.animated').css('-webkit-animation-play-state', 'paused');

  //drop the bird to the floor
  var playerbottom = $('#player').position().top + $('#player').width(); //we use width because he'll be rotated 90 deg
  var floor = flyArea;
  var movey = Math.max(0, floor - playerbottom);
  $('#player').transition({ y: movey + 'px', rotate: 90 }, 1000, 'easeInOutCubic');

  //it's time to change states. as of now we're considered ScoreScreen to disable left click/flying
  currentstate = states.ScoreScreen;

  //destroy our gameloops
  clearInterval(loopGameloop);
  clearInterval(loopPipeloop);
  loopGameloop = null;
  loopPipeloop = null;

  //mobile browsers don't support buzz bindOnce event
  if (isIncompatible.any()) {
    //skip right to showing score
    showScore();
  } else {
    //play the hit sound (then the dead sound) and then show score
    soundHit.play().bindOnce('ended', function() {
      soundDie.play().bindOnce('ended', function() {
        showScore();
      });
    });
  }
}

function updatePipes() {
  //Do any pipes need removal?
  $('.pipe')
    .filter(function() {
      return $(this).position().left <= -100;
    })
    .remove();

  //add a new pipe (top height + bottom height  + pipeheight == flyArea) and put it in our tracker
  var padding = 80;
  var constraint = flyArea - pipeheight - padding * 2; //double padding (for top and bottom)
  var topheight = Math.floor(Math.random() * constraint + padding); //add lower padding
  var bottomheight = flyArea - pipeheight - topheight;
  var newpipe = $(
    '<div class="pipe animated"><div class="pipe_upper" style="height: ' +
      topheight +
      'px;"></div><div class="pipe_lower" style="height: ' +
      bottomheight +
      'px;"></div></div>'
  );
  $('#flyarea').append(newpipe);
  pipes.push(newpipe);
}
