/**
 * TODO:
 * - score
 * - highscore
 * - medals
 * - sound
 */

const FPS = 60;
const GRAVITY = 0.25;
const JUMP = -4.6;
const PIPE_HEIGHT = 90;
const PIPE_WIDTH = 52;
const PIPE_INTERVAL = 1.4;
const PIPE_PADDING = 80;
const BIRD_WIDTH = 34.0;
const BIRD_HEIGHT = 24.0;
const SPACEBAR_KEYCODE = 32;

let flyArea = null;
let landTop = null;
let flyAreaHeight = null;
let birdEl = null;
let gameSusbsription = null;
let pipeSubscription = null;
let connectableGameSubscription = null;

/*******************************************************
 * HELPERS
 *******************************************************/

const toggleAnimation = (on = true) => {
  document.querySelectorAll('.animated').forEach(anim => {
    anim.style['animation-play-state'] = on ? 'running' : 'paused';
    anim.style['-webkit-animation-play-state'] = on ? 'running' : 'paused';
  });
};

/*******************************************************
 * INPUT & LOOP
 *******************************************************/

const input$ = Rx.Observable.merge(
  Rx.Observable.fromEvent(document, 'mousedown'),
  Rx.Observable.fromEvent(document, 'touchstart'),
  Rx.Observable.fromEvent(document, 'keydown').filter(e => e.keyCode === SPACEBAR_KEYCODE)
);

const loop$ = Rx.Observable
  .interval(1000 / FPS, Rx.Scheduler.animationFrame)
  .timeInterval()
  .map(({ interval }) => interval / 1000);

/*******************************************************
 * BIRD
 *******************************************************/

// Normal bird velocity - falling
const birdLoop$ = loop$.mapTo(({ velocity }) => velocity + GRAVITY);
// Bird velocity when jumped
const birdJump$ = input$.mapTo(_ => JUMP).takeWhile(_ => !gameSusbsription.closed); // Don't jump anymore after game ended

// Bird state
const initialBirdState = {
  velocity: 0,
  position: 180,
  rotation: 0,
};
const bird$ = Rx.Observable
  .merge(birdLoop$, birdJump$)
  .scan((state, velocityFn) => {
    const velocity = velocityFn(state);
    const position = state.position + velocity;
    return {
      velocity,
      position: position > 0 ? position : 0,
      rotation: Math.max(Math.min(velocity / 10 * 90, 90), -90),
    };
  }, initialBirdState)
  .takeWhile(bird => bird.position < flyAreaHeight)
  .share();

// Draw bird
const updateBird = playerEl => ({ rotation, position }) => {
  playerEl.style.transform = `rotate(${rotation}deg)`;
  playerEl.style.top = `${position}px`;
};

/*******************************************************
 * PIPES
 *******************************************************/

const pipeGeneratorLoop$ = Rx.Observable.interval(PIPE_INTERVAL * 1000);

// Generates new pipes
const pipe$ = pipeGeneratorLoop$
  .map(_ => {
    const constraint = flyAreaHeight - PIPE_HEIGHT - PIPE_PADDING * 2;
    const topheight = Math.floor(Math.random() * constraint + PIPE_PADDING);
    const bottomheight = flyAreaHeight - PIPE_HEIGHT - topheight;

    return {
      topPipeHeight: topheight,
      topPipeBottom: topheight,
      bottomPipeHeight: bottomheight,
      bottomPipeTop: flyAreaHeight - bottomheight,
    };
  })
  .timestamp()
  .map(({ value, timestamp }) => ({
    ...value,
    id: timestamp,
  }))
  .share();

// Returns the current pipe in stack
const getCurrentPipe = (pipesState, birdState) => {
  const nextPipe = pipesState[0];

  if (nextPipe) {
    const pipeEl = document.getElementById(`pipe-${nextPipe.id}`);
    const pipeBox = pipeEl.getBoundingClientRect();
    nextPipe.left = pipeBox.left;
    nextPipe.right = pipeBox.left + PIPE_WIDTH;

    if (birdState.right > nextPipe.left) {
      return nextPipe;
    }
  }

  return null;
};

// Has the bird passed the pipe?
const pipePassed = (currentPipe, birdState) => currentPipe && birdState.left > currentPipe.right;

// Update pipes stack
const updatePipes = (pipesState, newPipe, currentPipe, birdState) => {
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

const drawPipe = flyareaEl => pipe => {
  const pipeEl = document.createElement('div');
  const pipeUpperEl = document.createElement('div');
  const pipeLowerEl = document.createElement('div');
  pipeEl.className = 'pipe animated';
  pipeEl.id = `pipe-${pipe.id}`;
  pipeUpperEl.className = 'pipe_upper';
  pipeUpperEl.style.height = `${pipe.topPipeHeight}px`;
  pipeLowerEl.className = 'pipe_lower';
  pipeLowerEl.style.height = `${pipe.bottomPipeHeight}px`;

  pipeEl.appendChild(pipeUpperEl);
  pipeEl.appendChild(pipeLowerEl);
  flyareaEl.appendChild(pipeEl);
};

/*******************************************************
 * SCORE
 *******************************************************/

const scoreSubject$ = new Rx.BehaviorSubject();

const showScore = state => {
  document.getElementById('scoreboard').classList.add('isShown');
  document.getElementById('bigscore').style.display = 'none';
  document.getElementById('replay').classList.add('isShown');

  input$
    .withLatestFrom(Rx.Observable.of(1).delay(1000))
    .take(1)
    .subscribe(reset);
};

// Score state
const initialScore = {
  highScore: 0,
  score: 0,
};
const score$ = scoreSubject$
  .scan(({ score, highScore }, gameState) => {
    if (gameState) {
      score = pipePassed(gameState.currentPipe, gameState.bird) ? score + 1 : score;
    } else {
      score = 0;
    }

    return {
      score,
      highScore: score > highScore ? score : highScore,
    };
  }, initialScore)
  .share();

// Draw score
const createScoreImage = (digits, elemscore, type = 'small') => {
  for (var i = 0; i < digits.length; i++) {
    const img = document.createElement('img');
    img.src = `assets/font_${type}_${digits[i]}.png`;
    img.alt = digits[i];
    elemscore.appendChild(img);
  }
};

const setBigScore = (score, erase = false) => {
  const elemscore = document.getElementById('bigscore');
  elemscore.innerHTML = '';
  if (erase) return false;

  createScoreImage(score.toString().split(''), elemscore, 'big');
};

const setSmallScore = score => {
  const elemscore = document.getElementById('currentscore');
  elemscore.innerHTML = '';
  createScoreImage(score.toString().split(''), elemscore);
};

const setHighScore = score => {
  const elemscore = document.getElementById('highscore');
  elemscore.innerHTML = '';
  createScoreImage(score.toString().split(''), elemscore);
};

// Draw medal
const setMedal = score => {
  const elemmedal = document.getElementById('medal');
  elemmedal.innerHTML = '';
  let medal = null;

  if (score < 10) return false;

  if (score >= 10) medal = 'bronze';
  if (score >= 20) medal = 'silver';
  if (score >= 30) medal = 'gold';
  if (score >= 40) medal = 'platinum';

  const img = document.createElement('img');
  img.src = `assets/medal_${medal}.png`;
  img.alt = medal;

  elemmedal.appendChild(img);
  document.getElementById('medal').classList.add('isShown');
};

// Draw score
score$.subscribe(({ score, highScore }) => {
  setHighScore(highScore);
  setMedal(score);
  setSmallScore(score);
});

/*******************************************************
 * MAIN GAME
 *******************************************************/

// Prepare the game after DOM content loaded
Rx.Observable.fromEvent(document, 'DOMContentLoaded').subscribe(_ => {
  birdEl = document.getElementById('player');
  flyArea = document.getElementById('flyarea');
  landTop = document.getElementById('land').getBoundingClientRect().top;
  flyAreaHeight = flyArea.getBoundingClientRect().height;

  reset();
});

// Resets the game
const reset = () => {
  // Draw inital state of things
  updateBird(birdEl)(initialBirdState);
  document.querySelectorAll('.pipe').forEach(pipe => flyArea.removeChild(pipe));
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
  input$
    .withLatestFrom(Rx.Observable.of(1).delay(1000))
    .take(1)
    .subscribe(startGame);
};

// Has the game ended?
const isAlive = ({ bird, currentPipe }) => {
  const deadByPipe =
    currentPipe &&
    (currentPipe.topPipeBottom > bird.position || currentPipe.bottomPipeTop < bird.bottom);

  return bird.bottom < landTop && !deadByPipe;
};

// Main game observer
const game = state => {
  if (state && !isAlive(state)) {
    connectableGameSubscription.unsubscribe();
    gameSusbsription.unsubscribe();
    pipeSubscription.unsubscribe();
    playerDead(state);
  }
};

// Start the game
const startGame = () => {
  document.getElementById('splash').classList.remove('isShown');
  bird$.subscribe(updateBird(birdEl));
  connectableGameSubscription = game$.connect();
  gameSusbsription = game$.subscribe(game);
  pipeSubscription = pipe$.subscribe(drawPipe(flyArea));

  score$
    .distinctUntilKeyChanged('score')
    .pluck('score')
    .subscribe(setBigScore);
};

// Game state
const intialGameState = {
  pipes: [],
  ...initialBirdState,
};
const game$ = bird$
  .merge(
    pipe$.withLatestFrom(bird$, (newPipe, bird) => ({
      newPipe,
      bird,
    }))
  )
  .scan((state, event) => {
    const bird = event.bird || event;

    const box = birdEl.getBoundingClientRect();
    const boxwidth = BIRD_WIDTH - Math.sin(Math.abs(bird.rotation) / 90) * 8;
    const boxheight = (BIRD_HEIGHT + box.height) / 2;
    const boxleft = (box.width - boxwidth) / 2 + box.left;
    const boxtop = (box.height - boxheight) / 2 + box.top;
    const boxright = boxleft + boxwidth;
    const boxbottom = boxtop + boxheight;

    let newState = {
      ...state,
      bird: {
        ...bird,
        height: boxheight,
        width: boxwidth,
        left: boxleft,
        right: boxright,
        bottom: boxbottom,
      },
    };

    // No pipes yet
    if (state.pipes.length < 1 && !event.newPipe) {
      return newState;
    }

    const currentPipe = getCurrentPipe(state.pipes, newState.bird);

    newState = {
      ...newState,
      currentPipe,
      pipes: updatePipes(state.pipes, event.newPipe, currentPipe, newState.bird),
    };

    return newState;
  }, intialGameState)
  .multicast(scoreSubject$);

const playerDead = state => {
  toggleAnimation(false);
  showScore(state);
};
