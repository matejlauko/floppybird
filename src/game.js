import loop$, { pipeGeneratorLoop$ } from './loop';
import Rx from 'rxjs/Rx';
import input$ from './inputs';
import { GRAVITY, JUMP, PIPE_PADDING, PIPE_HEIGHT, DEBUG_MODE, BIRD_WIDTH, BIRD_HEIGHT } from './setup';
import { updateBird, drawPipe } from './update';

let flyArea = null;
let ceiling = null;
let flyAreaHeight = null;
let birdEl = null;
let birdSubscription = null;
let gameSusbsription = null;
let pipeSubscription = null;

export default function startGame() {
  birdEl = document.getElementById('player');
  flyArea = document.getElementById('flyarea');
  ceiling = document.getElementById('ceiling');
  flyAreaHeight = flyArea.getBoundingClientRect().height;

  pipeSubscription = pipe$.subscribe(newPipe => drawPipe(flyArea)(newPipe));
  gameSusbsription = game$.subscribe(state => {
    if (state.dead) {
      gameSusbsription.unsubscribe();
    }

    updateBird(birdEl)(state.bird);
  });
}

// Normal bird velocity - falling
const birdLoop$ = loop$.mapTo(({ velocity }) => velocity + GRAVITY);
// Bird velocity when jumped
const birdJump$ = input$.mapTo(_ => JUMP);

const initialBirdState = {
  velocity: 0,
  position: 180,
  rotation: 0,
};
/**
 * Calculates bird state
 */
const bird$ = Rx.Observable.merge(birdLoop$, birdJump$).scan((state, velocityFn) => {
  const velocity = velocityFn(state);
  const position = state.position + velocity;
  return {
    velocity,
    position: position > 0 ? position : 0,
    rotation: Math.max(Math.min(velocity / 10 * 90, 90), -90),
  };
}, initialBirdState);

/**
 * Generates new pipes
 */
const pipe$ = pipeGeneratorLoop$
  .map(_ => {
    const constraint = flyAreaHeight - PIPE_HEIGHT - PIPE_PADDING * 2; //double PIPE_PADDING (for top and bottom)
    const topheight = Math.floor(Math.random() * constraint + PIPE_PADDING); //add lower padding
    const bottomheight = flyAreaHeight - PIPE_HEIGHT - topheight;

    return {
      topheight,
      bottomheight,
    };
  })
  .share();

const intialGameState = {
  score: 0,
  pipes: [],
  dead: false,
  ...initialBirdState,
};

// if (boxtop <= ceiling.offset().top + ceiling.height()) position = 0;

const game$ = bird$.merge(pipe$.withLatestFrom(bird$, (newPipe, bird) => ({ newPipe, bird }))).scan((state, event) => {
  state = {
    ...state,
    bird: event.bird || event,
  };

  const box = birdEl.getBoundingClientRect();
  const boxwidth = BIRD_WIDTH - Math.sin(Math.abs(state.bird.rotation) / 90) * 8;
  const boxheight = (BIRD_HEIGHT + box.height) / 2;
  const boxleft = (box.width - boxwidth) / 2 + box.left;
  const boxtop = (box.height - boxheight) / 2 + box.top;
  const boxright = boxleft + boxwidth;
  const boxbottom = boxtop + boxheight;

  if (event.newPipe) {
    state = {
      ...state,
      pipes: state.pipes.concat(),
    };
  }

  console.log('bird', state.bird);

  console.log(birdEl.offsetTop + boxheight);
  if (birdEl.offsetTop + boxheight >= flyAreaHeight) {
    state.dead = true;
  }

  return state;
}, intialGameState);
