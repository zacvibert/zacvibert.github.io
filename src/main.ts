import { setupCanvas } from './engine/renderer';
import { startLoop } from './engine/loop';
import { InputManager } from './engine/input';
import { Match } from './game/match';
import type { CharacterData } from './game/types';
import fighterZero from './characters/fighter-zero.json';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = setupCanvas(canvas);
const input = new InputManager();
const data = fighterZero as CharacterData;

let match = new Match(input, data);
let debug = false;

// exposed for automated smoke tests
(window as unknown as { __match: Match }).__match = match;

addEventListener('keydown', (e) => {
  if (e.code === 'F1') {
    e.preventDefault();
    debug = !debug;
  }
  if (e.code === 'Enter' && match.phase === 'matchOver') {
    match = new Match(input, data);
    (window as unknown as { __match: Match }).__match = match;
  }
});

startLoop(
  () => match.update(),
  () => match.draw(ctx, debug),
);
