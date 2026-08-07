import assert from 'node:assert/strict';
import { test, afterEach } from 'node:test';
import { playKitchenAlertSound } from './src/lib/sound';

interface ScheduledNote {
  frequency: number;
  startAt: number;
  stopAt: number;
  connected: boolean;
}

class FakeParam {
  events: { kind: string; value: number; at: number }[] = [];
  setValueAtTime(value: number, at: number) {
    this.events.push({ kind: 'set', value, at });
  }
  linearRampToValueAtTime(value: number, at: number) {
    this.events.push({ kind: 'linear', value, at });
  }
  exponentialRampToValueAtTime(value: number, at: number) {
    this.events.push({ kind: 'exponential', value, at });
  }
}

function installAudioContext(factory?: () => unknown) {
  const notes: ScheduledNote[] = [];
  const gains: FakeParam[] = [];

  class FakeAudioContext {
    currentTime = 0;
    destination = { name: 'destination' };

    createOscillator() {
      const frequency = new FakeParam();
      const note: ScheduledNote = { frequency: 0, startAt: -1, stopAt: -1, connected: false };
      notes.push(note);
      return {
        type: 'square',
        frequency,
        connect: () => {
          note.connected = true;
        },
        start: (at: number) => {
          note.startAt = at;
          note.frequency = frequency.events[0]?.value ?? 0;
        },
        stop: (at: number) => {
          note.stopAt = at;
        }
      };
    }

    createGain() {
      const gain = new FakeParam();
      gains.push(gain);
      return { gain, connect: () => {} };
    }
  }

  const saved = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    value: { AudioContext: factory ? factory() : FakeAudioContext },
    configurable: true,
    writable: true
  });

  return {
    notes,
    gains,
    restore: () => {
      if (saved) Object.defineProperty(globalThis, 'window', saved);
      else delete (globalThis as unknown as Record<string, unknown>).window;
    }
  };
}

let restore: (() => void) | null = null;

afterEach(() => {
  restore?.();
  restore = null;
});

test('plays a three-tone chime on the E5/G#5/B5 notes', () => {
  const audio = installAudioContext();
  restore = audio.restore;

  playKitchenAlertSound();

  assert.deepEqual(audio.notes.map(n => n.frequency), [659.25, 830.61, 987.77]);
  assert.ok(audio.notes.every(n => n.connected));
});

test('staggers the notes and stops each one after it starts', () => {
  const audio = installAudioContext();
  restore = audio.restore;

  playKitchenAlertSound();

  assert.deepEqual(audio.notes.map(n => n.startAt), [0, 0.15, 0.3]);
  audio.notes.forEach(note => assert.ok(note.stopAt > note.startAt));
});

test('each note gets its own gain envelope', () => {
  const audio = installAudioContext();
  restore = audio.restore;

  playKitchenAlertSound();

  assert.equal(audio.gains.length, 3);
  audio.gains.forEach(gain => {
    assert.deepEqual(gain.events.map(e => e.kind), ['set', 'linear', 'exponential']);
    assert.equal(gain.events[0].value, 0);
    assert.ok(gain.events[1].value > 0);
    assert.ok(gain.events[2].value > 0);
  });
});

test('does nothing when the browser has no AudioContext', () => {
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true, writable: true });
  restore = () => {
    if (saved) Object.defineProperty(globalThis, 'window', saved);
    else delete (globalThis as unknown as Record<string, unknown>).window;
  };

  assert.doesNotThrow(() => playKitchenAlertSound());
});

test('swallows audio errors so a blocked context never breaks the caller', () => {
  const audio = installAudioContext(() => class Broken {
    constructor() {
      throw new Error('user has not interacted with the document yet');
    }
  });
  restore = audio.restore;

  const originalWarn = console.warn;
  const warnings: unknown[] = [];
  console.warn = (...args: unknown[]) => warnings.push(args);
  try {
    assert.doesNotThrow(() => playKitchenAlertSound());
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(warnings.length, 1);
});
