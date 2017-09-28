import Rx from 'rxjs/Rx';

const setup$ = Rx.Observable.of;
export let DEBUG_MODE = false;

const SCREENS = {
  SPLASH_SCREEN: 0,
  GAME_SCREEN: 1,
  SCORE_SCREEN: 2,
};

const GRAVITY = 0.25;
const VELOCITY = 0;
const POSITION = 180;
const ROTATION = 0;
const JUMP = -4.6;

let PIPE_HEIGHT = 90;
const PIPE_WIDTH = 52;

const REPLAY_CLICKABLE = false;

Rx.Observable
  .fromEvent(document, 'DOMContentLoaded')
  .mapTo(window.location.search)
  .subscribe(search => {
    if (search.indexOf('?debug') > -1) DEBUG_MODE = true;
    if (search.indexOf('?easy') > -1) PIPE_HEIGHT = 200;
  });
