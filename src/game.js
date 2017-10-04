/**
 * TODO:
 * - score
 * - highscore
 * - medals
 * - sound
 */

import loop$, { pipeGeneratorLoop$ } from './loop';
import Rx from 'rxjs/Rx';
import input$ from './inputs';
import {
  GRAVITY,
  JUMP,
  PIPE_PADDING,
  PIPE_HEIGHT,
  DEBUG_MODE,
  BIRD_WIDTH,
  BIRD_HEIGHT,
  PIPE_WIDTH,
} from './setup';
import {
  updateBird,
  drawPipe,
  toggleAnimation,
  setBigScore,
  setHighScore,
  setSmallScore,
  setMedal,
} from './update';

let flyArea = null;
let landTop = null;
let flyAreaHeight = null;
let birdEl = null;
let gameSusbsription = null;
let pipeSubscription = null;
let birdSubscription = null;
let connectableGameSubscription = null;

/**
 * Resets the game
 */
export const reset = () => {
  console.log('reset called');

  // Reste game score
  scoreSubject$.next(null);

  birdEl = document.getElementById('player');
  flyArea = document.getElementById('flyarea');
  landTop = document.getElementById('land').getBoundingClientRect().top;
  flyAreaHeight = flyArea.getBoundingClientRect().height;

  updateBird(birdEl)(initialBirdState);
  document.querySelectorAll('.pipe').forEach(pipe => flyArea.removeChild(pipe));
  toggleAnimation();
  document.getElementById('splash').classList.add('isShown');
  document.getElementById('scoreboard').classList.remove('isShown');
  document.getElementById('replay').classList.remove('isShown');
  document.getElementById('bigscore').style.display = 'block';
  setBigScore(0, true);

  input$
    .withLatestFrom(Rx.Observable.of(1).delay(1000))
    .take(1)
    .subscribe(startGame);
};

/**
 * Has the game ended?
 */
const isAlive = ({ bird, currentPipe }) => {
  const deadByPipe =
    currentPipe &&
    (currentPipe.topPipeBottom > bird.position || currentPipe.bottomPipeTop < bird.bottom);

  return bird.bottom < landTop && !deadByPipe;
};

/**
 * Main game observer
 */
const game = state => {
  if (state && !isAlive(state)) {
    connectableGameSubscription.unsubscribe();
    gameSusbsription.unsubscribe();
    pipeSubscription.unsubscribe();
    playerDead();
  }
  score$
    .distinctUntilKeyChanged('score')
    .pluck('score')
    .subscribe(setBigScore);
};

/**
 * Start the game
 */
export default function startGame() {
  document.getElementById('splash').classList.remove('isShown');
  birdSubscription = bird$.subscribe(updateBird(birdEl));
  connectableGameSubscription = game$.connect();
  gameSusbsription = game$.subscribe(game);
  pipeSubscription = pipe$.subscribe(drawPipe(flyArea));
}

// Normal bird velocity - falling
const birdLoop$ = loop$.mapTo(({ velocity }) => velocity + GRAVITY);
// Bird velocity when jumped
const birdJump$ = input$.mapTo(_ => JUMP).takeWhile(_ => !gameSusbsription.closed); // Don't jump anymore after game ended

const initialBirdState = {
  velocity: 0,
  position: 180,
  rotation: 0,
};
/**
 * Calculates bird state
 */
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

/**
 * Generates new pipes
 */
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

const pipePassed = (currentPipe, birdState) => currentPipe && birdState.left > currentPipe.right;

const updatePipes = (pipesState, newPipe, currentPipe, birdState) => {
  // Add new pipe to the end
  if (newPipe) {
    pipesState = pipesState.concat(newPipe);
    console.debug('add pipe', pipesState);
  }

  // Remove passed pipe
  if (pipePassed(currentPipe, birdState)) {
    pipesState = pipesState.slice(1, pipesState.length);
    console.debug('remove pipe', pipesState);
  }

  return pipesState;
};

const scoreSubject$ = new Rx.BehaviorSubject();

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

const showScore = state => {
  document.getElementById('scoreboard').classList.add('isShown');
  document.getElementById('bigscore').style.display = 'none';
  document.getElementById('replay').classList.add('isShown');

  const scoreSub = score$.do(console.warn).subscribe(({ score, highScore }) => {
    setHighScore(highScore);
    setMedal(score);
    setSmallScore(score);
  });

  input$
    .withLatestFrom(Rx.Observable.of(1).delay(1000))
    .take(1)
    .subscribe(_ => {
      scoreSub.unsubscribe();
      reset();
    });
};

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
  .do(x => console.log('s', x))
  .share();
