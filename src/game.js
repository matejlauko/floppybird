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
import { updateBird, drawPipe, toggleAnimation } from './update';

let flyArea = null;
let landTop = null;
let flyAreaHeight = null;
let birdEl = null;
let gameSusbsription = null;
let pipeSubscription = null;
let birdSubscription = null;

export const reset = () => {
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

  input$.take(1).subscribe(startGame);
};

const isAlive = ({ bird, currentPipe }) => {
  const deadByPipe =
    currentPipe &&
    (currentPipe.topPipeBottom > bird.top || currentPipe.bottomPipeTop < bird.bottom);

  return bird.bottom < landTop && !deadByPipe;
};

const game = state => {
  if (!isAlive(state)) {
    gameSusbsription.unsubscribe();
    pipeSubscription.unsubscribe();
    playerDead();
  }
};

export default function startGame() {
  document.getElementById('splash').classList.remove('isShown');
  console.log('startgame');
  birdSubscription = bird$.subscribe(updateBird(birdEl));
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

const updatePipes = (pipesState, newPipe, currentPipe, birdState) => {
  // Add new pipe to the end
  if (newPipe) {
    pipesState = pipesState.concat(newPipe);
    console.debug('add pipe', pipesState);
  }

  // Remove passed pipe
  if (currentPipe && birdState.left > currentPipe.right) {
    pipesState = pipesState.slice(1, pipesState.length);
    console.debug('remove pipe', pipesState);
  }

  return pipesState;
};

const intialGameState = {
  score: 0,
  pipes: [],
  dead: false,
  ...initialBirdState,
};
const game$ = bird$
  .merge(pipe$.withLatestFrom(bird$, (newPipe, bird) => ({ newPipe, bird })))
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
  .share();

const playerDead = state => {
  toggleAnimation(false);
  //skip right to showing score
  showScore(state);
};

const showScore = state => {
  document.getElementById('scoreboard').classList.add('isShown');
  document.getElementById('bigscore').style.display = 'none';
  document.getElementById('replay').classList.add('isShown');

  input$.take(1).subscribe(reset);
};

const score$ = game$.scan((score, state) => {});
