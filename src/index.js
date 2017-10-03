import Rx from 'rxjs/Rx';
import setup from './setup';
import startGame, { reset } from './game';

Rx.Observable.fromEvent(document, 'DOMContentLoaded').subscribe(_ => {
  setup(window.location.search);
  // startGame();
  reset();
});
