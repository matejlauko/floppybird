/*
   Copyright 2014 Nebez Briefkani
   floppybird - main.js

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

var debugmode = false;

var states = Object.freeze({
  SplashScreen: 0,
  GameScreen: 1,
  ScoreScreen: 2,
});

var currentstate;

var gravity = 0.25;
var velocity = 0;
var position = 180;
var rotation = 0;
var jump = -4.6;
var flyArea = $('#flyarea').height();

var score = 0;
var highscore = 0;

var pipeheight = 90;
var pipewidth = 52;
var pipes = new Array();

var replayclickable = false;

//sounds
var volume = 30;
var soundJump = new buzz.sound('assets/sounds/sfx_wing.ogg');
var soundScore = new buzz.sound('assets/sounds/sfx_point.ogg');
var soundHit = new buzz.sound('assets/sounds/sfx_hit.ogg');
var soundDie = new buzz.sound('assets/sounds/sfx_die.ogg');
var soundSwoosh = new buzz.sound('assets/sounds/sfx_swooshing.ogg');
buzz.all().setVolume(volume);

//loops
var loopGameloop;
var loopPipeloop;

$(document).ready(function() {
  if (window.location.search == '?debug') debugmode = true;
  if (window.location.search == '?easy') pipeheight = 200;

  //get the highscore
  var savedscore = getCookie('highscore');
  if (savedscore != '') highscore = parseInt(savedscore);

  //start with the splash screen
  showSplash();
});

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

function showScore() {
  //unhide us
  $('#scoreboard').css('display', 'block');

  //remove the big score
  setBigScore(true);

  //have they beaten their high score?
  if (score > highscore) {
    //yeah!
    highscore = score;
    //save it!
    setCookie('highscore', highscore, 999);
  }

  //update the scoreboard
  setSmallScore();
  setHighScore();
  var wonmedal = setMedal();

  //SWOOSH!
  soundSwoosh.stop();
  soundSwoosh.play();

  //show the scoreboard
  $('#scoreboard').css({ y: '40px', opacity: 0 }); //move it down so we can slide it up
  $('#replay').css({ y: '40px', opacity: 0 });
  $('#scoreboard').transition({ y: '0px', opacity: 1 }, 600, 'ease', function() {
    //When the animation is done, animate in the replay button and SWOOSH!
    soundSwoosh.stop();
    soundSwoosh.play();
    $('#replay').transition({ y: '0px', opacity: 1 }, 600, 'ease');

    //also animate in the MEDAL! WOO!
    if (wonmedal) {
      $('#medal').css({ scale: 2, opacity: 0 });
      $('#medal').transition({ opacity: 1, scale: 1 }, 1200, 'ease');
    }
  });

  //make the replay button clickable
  replayclickable = true;
}

$('#replay').click(function() {
  //make sure we can only click once
  if (!replayclickable) return;
  else replayclickable = false;
  //SWOOSH!
  soundSwoosh.stop();
  soundSwoosh.play();

  //fade out the scoreboard
  $('#scoreboard').transition({ y: '-40px', opacity: 0 }, 1000, 'ease', function() {
    //when that's done, display us back to nothing
    $('#scoreboard').css('display', 'none');

    //start the game over!
    showSplash();
  });
});

function playerScore() {
  score += 1;
  //play score sound
  soundScore.stop();
  soundScore.play();
  setBigScore();
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

var isIncompatible = {
  Android: function() {
    return navigator.userAgent.match(/Android/i);
  },
  BlackBerry: function() {
    return navigator.userAgent.match(/BlackBerry/i);
  },
  iOS: function() {
    return navigator.userAgent.match(/iPhone|iPad|iPod/i);
  },
  Opera: function() {
    return navigator.userAgent.match(/Opera Mini/i);
  },
  Safari: function() {
    return navigator.userAgent.match(/OS X.*Safari/) && !navigator.userAgent.match(/Chrome/);
  },
  Windows: function() {
    return navigator.userAgent.match(/IEMobile/i);
  },
  any: function() {
    return (
      isIncompatible.Android() ||
      isIncompatible.BlackBerry() ||
      isIncompatible.iOS() ||
      isIncompatible.Opera() ||
      isIncompatible.Safari() ||
      isIncompatible.Windows()
    );
  },
};
