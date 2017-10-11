'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

/**
 * TODO:
 * - score
 * - highscore
 * - medals
 * - sound
 */

var FPS = 60;
var GRAVITY = 0.25;
var JUMP = -4.6;
var PIPE_HEIGHT = 90;
var PIPE_WIDTH = 52;
var PIPE_INTERVAL = 1.4;
var PIPE_PADDING = 80;
var BIRD_WIDTH = 34.0;
var BIRD_HEIGHT = 24.0;
var SPACEBAR_KEYCODE = 32;
var ASSET_URL_BASE = 'public/assets/';

var flyArea = null;
var landTop = null;
var flyAreaHeight = null;
var birdEl = null;
var gameSusbsription = null;
var pipeSubscription = null;
var connectableGameSubscription = null;

/*******************************************************
 * HELPERS
 *******************************************************/

var toggleAnimation = function toggleAnimation() {
  var on = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

  document.querySelectorAll('.animated').forEach(function (anim) {
    anim.style['animation-play-state'] = on ? 'running' : 'paused';
    anim.style['-webkit-animation-play-state'] = on ? 'running' : 'paused';
  });
};

/*******************************************************
 * INPUT & LOOP
 *******************************************************/

var input$ = Rx.Observable.merge(Rx.Observable.fromEvent(document, 'mousedown'), Rx.Observable.fromEvent(document, 'touchstart'), Rx.Observable.fromEvent(document, 'keydown').filter(function (e) {
  return e.keyCode === SPACEBAR_KEYCODE;
}));

var loop$ = Rx.Observable.interval(1000 / FPS, Rx.Scheduler.animationFrame).timeInterval().map(function (_ref) {
  var interval = _ref.interval;
  return interval / 1000;
});

/*******************************************************
 * BIRD
 *******************************************************/

// Normal bird velocity - falling
var birdLoop$ = loop$.mapTo(function (_ref2) {
  var velocity = _ref2.velocity;
  return velocity + GRAVITY;
});
// Bird velocity when jumped
var birdJump$ = input$.mapTo(function (_) {
  return JUMP;
}).takeWhile(function (_) {
  return !gameSusbsription.closed;
}); // Don't jump anymore after game ended

// Bird state
var initialBirdState = {
  velocity: 0,
  position: 180,
  rotation: 0
};
var bird$ = Rx.Observable.merge(birdLoop$, birdJump$).scan(function (state, velocityFn) {
  var velocity = velocityFn(state);
  var position = state.position + velocity;
  return {
    velocity: velocity,
    position: position > 0 ? position : 0,
    rotation: Math.max(Math.min(velocity / 10 * 90, 90), -90)
  };
}, initialBirdState).takeWhile(function (bird) {
  return bird.position < flyAreaHeight;
}).share();

// Draw bird
var updateBird = function updateBird(playerEl) {
  return function (_ref3) {
    var rotation = _ref3.rotation,
        position = _ref3.position;

    playerEl.style.transform = 'rotate(' + rotation + 'deg)';
    playerEl.style.top = position + 'px';
  };
};

/*******************************************************
 * PIPES
 *******************************************************/

var pipeGeneratorLoop$ = Rx.Observable.interval(PIPE_INTERVAL * 1000);

// Generates new pipes
var pipe$ = pipeGeneratorLoop$.map(function (_) {
  var constraint = flyAreaHeight - PIPE_HEIGHT - PIPE_PADDING * 2;
  var topheight = Math.floor(Math.random() * constraint + PIPE_PADDING);
  var bottomheight = flyAreaHeight - PIPE_HEIGHT - topheight;

  return {
    topPipeHeight: topheight,
    topPipeBottom: topheight,
    bottomPipeHeight: bottomheight,
    bottomPipeTop: flyAreaHeight - bottomheight
  };
}).timestamp().map(function (_ref4) {
  var value = _ref4.value,
      timestamp = _ref4.timestamp;
  return _extends({}, value, {
    id: timestamp
  });
}).share();

// Returns the current pipe in stack
var getCurrentPipe = function getCurrentPipe(pipesState, birdState) {
  var nextPipe = pipesState[0];

  if (nextPipe) {
    var pipeEl = document.getElementById('pipe-' + nextPipe.id);
    var pipeBox = pipeEl.getBoundingClientRect();
    nextPipe.left = pipeBox.left;
    nextPipe.right = pipeBox.left + PIPE_WIDTH;

    if (birdState.right > nextPipe.left) {
      return nextPipe;
    }
  }

  return null;
};

// Has the bird passed the pipe?
var pipePassed = function pipePassed(currentPipe, birdState) {
  return currentPipe && birdState.left > currentPipe.right;
};

// Update pipes stack
var updatePipes = function updatePipes(pipesState, newPipe, currentPipe, birdState) {
  // Add new pipe to the end
  if (newPipe) {
    pipesState = pipesState.concat(newPipe);
  }

  // Remove passed pipe
  if (pipePassed(currentPipe, birdState)) {
    pipesState = pipesState.slice(1, pipesState.length);
  }

  return pipesState;
};

var drawPipe = function drawPipe(flyareaEl) {
  return function (pipe) {
    var pipeEl = document.createElement('div');
    var pipeUpperEl = document.createElement('div');
    var pipeLowerEl = document.createElement('div');
    pipeEl.className = 'pipe animated';
    pipeEl.id = 'pipe-' + pipe.id;
    pipeUpperEl.className = 'pipe_upper';
    pipeUpperEl.style.height = pipe.topPipeHeight + 'px';
    pipeLowerEl.className = 'pipe_lower';
    pipeLowerEl.style.height = pipe.bottomPipeHeight + 'px';

    pipeEl.appendChild(pipeUpperEl);
    pipeEl.appendChild(pipeLowerEl);
    flyareaEl.appendChild(pipeEl);
  };
};

/*******************************************************
 * SCORE
 *******************************************************/

var scoreSubject$ = new Rx.BehaviorSubject();

var showScore = function showScore(state) {
  document.getElementById('scoreboard').classList.add('isShown');
  document.getElementById('bigscore').style.display = 'none';
  document.getElementById('replay').classList.add('isShown');

  input$.withLatestFrom(Rx.Observable.of(1).delay(1000)).take(1).subscribe(reset);
};

// Score state
var initialScore = {
  highScore: 0,
  score: 0
};
var score$ = scoreSubject$.scan(function (_ref5, gameState) {
  var score = _ref5.score,
      highScore = _ref5.highScore;

  if (gameState) {
    score = pipePassed(gameState.currentPipe, gameState.bird) ? score + 1 : score;
  } else {
    score = 0;
  }

  return {
    score: score,
    highScore: score > highScore ? score : highScore
  };
}, initialScore).share();

// Draw score
var createScoreImage = function createScoreImage(digits, elemscore) {
  var type = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'small';

  for (var i = 0; i < digits.length; i++) {
    var img = document.createElement('img');
    img.src = ASSET_URL_BASE + 'font_' + type + '_' + digits[i] + '.png';
    img.alt = digits[i];
    elemscore.appendChild(img);
  }
};

var setBigScore = function setBigScore(score) {
  var erase = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  var elemscore = document.getElementById('bigscore');
  elemscore.innerHTML = '';
  if (erase) return false;

  createScoreImage(score.toString().split(''), elemscore, 'big');
};

var setSmallScore = function setSmallScore(score) {
  var elemscore = document.getElementById('currentscore');
  elemscore.innerHTML = '';
  createScoreImage(score.toString().split(''), elemscore);
};

var setHighScore = function setHighScore(score) {
  var elemscore = document.getElementById('highscore');
  elemscore.innerHTML = '';
  createScoreImage(score.toString().split(''), elemscore);
};

// Draw medal
var setMedal = function setMedal(score) {
  var elemmedal = document.getElementById('medal');
  elemmedal.innerHTML = '';
  var medal = null;

  if (score < 10) return false;

  if (score >= 10) medal = 'bronze';
  if (score >= 20) medal = 'silver';
  if (score >= 30) medal = 'gold';
  if (score >= 40) medal = 'platinum';

  var img = document.createElement('img');
  img.src = ASSET_URL_BASE + 'medal_' + medal + '.png';
  img.alt = medal;

  elemmedal.appendChild(img);
  document.getElementById('medal').classList.add('isShown');
};

// Draw score
score$.subscribe(function (_ref6) {
  var score = _ref6.score,
      highScore = _ref6.highScore;

  setHighScore(highScore);
  setMedal(score);
  setSmallScore(score);
});

/*******************************************************
 * MAIN GAME
 *******************************************************/

// Prepare the game after DOM content loaded
Rx.Observable.fromEvent(document, 'DOMContentLoaded').subscribe(function (_) {
  birdEl = document.getElementById('player');
  flyArea = document.getElementById('flyarea');
  landTop = document.getElementById('land').getBoundingClientRect().top;
  flyAreaHeight = flyArea.getBoundingClientRect().height;

  reset();
});

// Resets the game
var reset = function reset() {
  // Draw inital state of things
  updateBird(birdEl)(initialBirdState);
  document.querySelectorAll('.pipe').forEach(function (pipe) {
    return flyArea.removeChild(pipe);
  });
  toggleAnimation();
  document.getElementById('splash').classList.add('isShown');
  document.getElementById('scoreboard').classList.remove('isShown');
  document.getElementById('replay').classList.remove('isShown');
  document.getElementById('medal').classList.remove('isShown');
  document.getElementById('bigscore').style.display = 'block';
  setBigScore(0, true);

  // Reset game score
  scoreSubject$.next(null);

  // Start the game after click
  input$.withLatestFrom(Rx.Observable.of(1).delay(1000)).take(1).subscribe(startGame);
};

// Has the game ended?
var isAlive = function isAlive(_ref7) {
  var bird = _ref7.bird,
      currentPipe = _ref7.currentPipe;

  var deadByPipe = currentPipe && (currentPipe.topPipeBottom > bird.position || currentPipe.bottomPipeTop < bird.bottom);

  return bird.bottom < landTop && !deadByPipe;
};

// Main game observer
var game = function game(state) {
  if (state && !isAlive(state)) {
    connectableGameSubscription.unsubscribe();
    gameSusbsription.unsubscribe();
    pipeSubscription.unsubscribe();
    playerDead(state);
  }
};

// Start the game
var startGame = function startGame() {
  document.getElementById('splash').classList.remove('isShown');
  bird$.subscribe(updateBird(birdEl));
  connectableGameSubscription = game$.connect();
  gameSusbsription = game$.subscribe(game);
  pipeSubscription = pipe$.subscribe(drawPipe(flyArea));

  score$.distinctUntilKeyChanged('score').pluck('score').subscribe(setBigScore);
};

// Game state
var intialGameState = _extends({
  pipes: []
}, initialBirdState);
var game$ = bird$.merge(pipe$.withLatestFrom(bird$, function (newPipe, bird) {
  return {
    newPipe: newPipe,
    bird: bird
  };
})).scan(function (state, event) {
  var bird = event.bird || event;

  var box = birdEl.getBoundingClientRect();
  var boxwidth = BIRD_WIDTH - Math.sin(Math.abs(bird.rotation) / 90) * 8;
  var boxheight = (BIRD_HEIGHT + box.height) / 2;
  var boxleft = (box.width - boxwidth) / 2 + box.left;
  var boxtop = (box.height - boxheight) / 2 + box.top;
  var boxright = boxleft + boxwidth;
  var boxbottom = boxtop + boxheight;

  var newState = _extends({}, state, {
    bird: _extends({}, bird, {
      height: boxheight,
      width: boxwidth,
      left: boxleft,
      right: boxright,
      bottom: boxbottom,
      top: boxtop
    })
  });

  // No pipes yet
  if (state.pipes.length < 1 && !event.newPipe) {
    return newState;
  }

  var currentPipe = getCurrentPipe(state.pipes, newState.bird);

  newState = _extends({}, newState, {
    currentPipe: currentPipe,
    pipes: updatePipes(state.pipes, event.newPipe, currentPipe, newState.bird)
  });

  return newState;
}, intialGameState).multicast(scoreSubject$);

var playerDead = function playerDead(state) {
  toggleAnimation(false);
  showScore(state);
};
