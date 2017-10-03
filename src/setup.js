import Rx from 'rxjs/Rx';

export let DEBUG_MODE = false;

export const FPS = 60;

export const STATES = {
  SPLASH: 0,
  GAME: 1,
  SCORE: 2,
};

export const GRAVITY = 0.25;
export const VELOCITY = 0;
export const POSITION = 180;
export const ROTATION = 0;
export const JUMP = -4.6;

export let PIPE_HEIGHT = 90;
export const PIPE_WIDTH = 52;
export const PIPE_INTERVAL = 1.4;
export const PIPE_PADDING = 80;

export const BIRD_WIDTH = 34.0;
export const BIRD_HEIGHT = 24.0;

export const REPLAY_CLICKABLE = false;

export default function setup(search) {
  if (search.indexOf('?debug') > -1) DEBUG_MODE = true;
  if (search.indexOf('?easy') > -1) PIPE_HEIGHT = 200;
}
