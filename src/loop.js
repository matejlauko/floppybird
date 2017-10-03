import Rx from 'rxjs/Rx';
import { FPS, PIPE_INTERVAL } from './setup';

const loop$ = Rx.Observable
  .interval(1000 / FPS, Rx.Scheduler.animationFrame)
  .timeInterval()
  .map(({ interval }) => interval / 1000);

export default loop$;

export const pipeGeneratorLoop$ = Rx.Observable.interval(PIPE_INTERVAL * 1000);
