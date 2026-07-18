export interface PadState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  LP: boolean;
  MP: boolean;
  HP: boolean;
  LK: boolean;
  MK: boolean;
  HK: boolean;
}

export function emptyPad(): PadState {
  return {
    up: false, down: false, left: false, right: false,
    LP: false, MP: false, HP: false, LK: false, MK: false, HK: false,
  };
}

const P1_KEYS: Record<string, keyof PadState> = {
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
  KeyU: 'LP', KeyI: 'MP', KeyO: 'HP',
  KeyJ: 'LK', KeyK: 'MK', KeyL: 'HK',
};

const P2_KEYS: Record<string, keyof PadState> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  Numpad7: 'LP', Numpad8: 'MP', Numpad9: 'HP',
  Numpad4: 'LK', Numpad5: 'MK', Numpad6: 'HK',
};

// Standard gamepad mapping: X/Y/RB punches, A/B/RT kicks.
const GP_BUTTONS: Array<[number, keyof PadState]> = [
  [2, 'LP'], [3, 'MP'], [5, 'HP'],
  [0, 'LK'], [1, 'MK'], [7, 'HK'],
  [12, 'up'], [13, 'down'], [14, 'left'], [15, 'right'],
];

export class InputManager {
  private keys = new Set<string>();

  constructor() {
    addEventListener('keydown', (e) => {
      if (P1_KEYS[e.code] || P2_KEYS[e.code]) e.preventDefault();
      this.keys.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
  }

  read(player: 0 | 1): PadState {
    const pad = emptyPad();
    const map = player === 0 ? P1_KEYS : P2_KEYS;
    for (const [code, name] of Object.entries(map)) {
      if (this.keys.has(code)) pad[name] = true;
    }
    const gp = navigator.getGamepads?.()[player];
    if (gp && gp.connected) {
      for (const [idx, name] of GP_BUTTONS) {
        if (gp.buttons[idx]?.pressed) pad[name] = true;
      }
      if ((gp.axes[0] ?? 0) < -0.5) pad.left = true;
      if ((gp.axes[0] ?? 0) > 0.5) pad.right = true;
      if ((gp.axes[1] ?? 0) < -0.5) pad.up = true;
      if ((gp.axes[1] ?? 0) > 0.5) pad.down = true;
    }
    return pad;
  }
}
