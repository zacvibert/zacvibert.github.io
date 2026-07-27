import { setupCanvas } from './engine/renderer';
import { startLoop } from './engine/loop';
import { InputManager } from './engine/input';
import { Match } from './game/match';
import { loadSpriteSet, type SpriteSet } from './game/sprites';
import { loadStage, type StageSet } from './game/stage';
import type { CharacterData } from './game/types';
import fighterZero from './characters/fighter-zero.json';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = setupCanvas(canvas);
const input = new InputManager();
const data = fighterZero as CharacterData;

const DEFAULT_STAGE = 'dockside';

let match = new Match(input, data);
let debug = false;
let sprites: [SpriteSet | null, SpriteSet | null] = [null, null];
let stage: StageSet | null = null;

// exposed for automated smoke tests
(window as unknown as { __match: Match }).__match = match;

// Pixel sprite sheets, if the character has any, replace the procedural
// renderer per animation (see docs/SPRITE_SPEC.md). Loaded async; the game
// starts on the procedural look and upgrades when the sheets arrive.
void Promise.all([loadSpriteSet(data.id), loadSpriteSet(data.id, true)]).then((sets) => {
  sprites = sets;
  match.spriteSets = sets;
});
void loadStage(DEFAULT_STAGE).then((s) => {
  stage = s;
  match.stageSet = s;
});

addEventListener('keydown', (e) => {
  if (e.code === 'F1') {
    e.preventDefault();
    debug = !debug;
  }
  if (e.code === 'Enter' && match.phase === 'matchOver') {
    match = new Match(input, data);
    match.spriteSets = sprites;
    match.stageSet = stage;
    (window as unknown as { __match: Match }).__match = match;
  }
});

startLoop(
  () => match.update(),
  () => match.draw(ctx, debug),
);
