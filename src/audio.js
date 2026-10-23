const STORAGE_MUSIC = 'pixel-block-jam.music';
const STORAGE_EFFECTS = 'pixel-block-jam.effects';

function readSetting(key) {
  try { return globalThis.localStorage?.getItem(key) !== 'false'; } catch { return true; }
}

function writeSetting(key, value) {
  try { globalThis.localStorage?.setItem(key, String(value)); } catch { /* storage may be unavailable */ }
}

function frequency(note) { return 440 * 2 ** ((note - 69) / 12); }

export class AudioEngine {
  constructor() {
    this.musicEnabled = readSetting(STORAGE_MUSIC);
    this.effectsEnabled = readSetting(STORAGE_EFFECTS);
    this.context = null;
    this.master = null;
    this.musicBus = null;
    this.effectBus = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.sourceMixMode = false;
    this.resumeTask = null;
    this.lastCueAt = new Map();
    this.pendingCues = [];
    this.pendingCueAt = new Map();
  }

  ensureContext() {
    if (this.context) return;
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) return;
    this.context = new Context();
    this.master = this.context.createGain();
    this.musicBus = this.context.createGain();
    this.effectBus = this.context.createGain();
    const useSourceMix = this.sourceMixMode && this.musicEnabled && this.effectsEnabled;
    this.musicBus.gain.value = this.musicEnabled && !useSourceMix ? 0.36 : 0;
    this.effectBus.gain.value = this.effectsEnabled && !useSourceMix ? 0.8 : 0;
    this.musicBus.connect(this.master);
    this.effectBus.connect(this.master);
    this.master.connect(this.context.destination);
    this.master.gain.value = 0.68;
  }

  async startFromGesture() {
    this.ensureContext();
    if (!this.context) return;
    if (!this.resumeTask) {
      this.resumeTask = this.context.resume().catch(() => {}).finally(() => { this.resumeTask = null; });
    }
    await this.resumeTask;
    if (this.context.state === 'running' && this.pendingCues.length) {
      const pending = this.pendingCues.splice(0);
      this.pendingCueAt.clear();
      for (const name of pending) this.playCue(name);
    }
    if (this.musicEnabled && !document.hidden && !this.isUsingSourceMix()) this.startMusic();
  }

  setMusic(enabled) {
    this.musicEnabled = Boolean(enabled);
    writeSetting(STORAGE_MUSIC, this.musicEnabled);
    if (this.musicBus && this.context) {
      this.musicBus.gain.setTargetAtTime(this.musicEnabled && !this.isUsingSourceMix() ? 0.36 : 0, this.context.currentTime, 0.04);
    }
    if (this.musicEnabled) void this.startFromGesture();
    else this.stopMusic();
  }

  setEffects(enabled) {
    this.effectsEnabled = Boolean(enabled);
    writeSetting(STORAGE_EFFECTS, this.effectsEnabled);
    if (!this.effectsEnabled) {
      this.pendingCues = [];
      this.pendingCueAt.clear();
    }
    if (this.effectBus && this.context) {
      this.effectBus.gain.setTargetAtTime(this.effectsEnabled && !this.isUsingSourceMix() ? 0.8 : 0, this.context.currentTime, 0.04);
    }
  }

  playTone(note, duration, wave = 'sine', targetBus = this.musicBus, volume = 0.12, delay = 0) {
    if (!this.context || !targetBus) return;
    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency(note), now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(targetBus);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  startMusic() {
    if (!this.context || !this.musicEnabled || this.musicTimer || document.hidden || this.isUsingSourceMix()) return;
    const chords = [
      [60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62],
    ];
    const melody = [72, 74, 76, 79, 76, 74, 71, 72];
    const playBar = () => {
      if (!this.context || !this.musicEnabled || document.hidden) return;
      const chord = chords[this.musicStep % chords.length];
      chord.forEach((note, index) => this.playTone(note, 1.35, 'sine', this.musicBus, 0.027, index * 0.035));
      const lead = melody[this.musicStep % melody.length];
      this.playTone(lead, 0.42, 'triangle', this.musicBus, 0.035, 0.4);
      this.musicStep += 1;
    };
    playBar();
    this.musicTimer = globalThis.setInterval(playBar, 1650);
  }

  stopMusic() {
    if (this.musicTimer) globalThis.clearInterval(this.musicTimer);
    this.musicTimer = null;
  }

  cue(name) {
    if (this.isUsingSourceMix()) return;
    if (!this.effectsEnabled || !this.context || !this.effectBus) return;
    if (this.context.state !== 'running') {
      const now = this.context.currentTime;
      const minimumGap = name === 'collect' ? 0.08 : 0.055;
      if (now - (this.pendingCueAt.get(name) ?? -Infinity) < minimumGap) return;
      this.pendingCueAt.set(name, now);
      if (this.pendingCues.length < 8) this.pendingCues.push(name);
      return;
    }
    this.playCue(name);
  }

  playCue(name) {
    if (!this.effectsEnabled || !this.context || !this.effectBus || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    const minimumGap = name === 'collect' ? 0.08 : 0.055;
    if (now - (this.lastCueAt.get(name) ?? -Infinity) < minimumGap) return;
    this.lastCueAt.set(name, now);
    const cues = {
      button: [[76, 0.09, 'triangle', 0.06]],
      drag: [[54, 0.12, 'sine', 0.025]],
      collect: [[72, 0.12, 'sine', 0.09], [84, 0.16, 'triangle', 0.045, 0.035]],
      invalid: [[46, 0.18, 'sawtooth', 0.06], [43, 0.16, 'sine', 0.035, 0.06]],
      win: [[72, 0.28, 'triangle', 0.085], [76, 0.3, 'triangle', 0.085, 0.12], [79, 0.5, 'triangle', 0.095, 0.24]],
      lose: [[55, 0.34, 'sine', 0.075], [49, 0.42, 'sine', 0.06, 0.16]],
    };
    for (const [note, duration, wave, volume, delay = 0] of (cues[name] ?? [])) {
      this.playTone(note, duration, wave, this.effectBus, volume, delay);
    }
  }

  setPaused(paused) {
    if (paused) this.stopMusic();
    else if (this.musicEnabled) void this.startFromGesture();
  }

  setSourceMixMode(enabled) {
    this.sourceMixMode = Boolean(enabled);
    if (!this.context) return;
    const useSourceMix = this.isUsingSourceMix();
    this.musicBus.gain.setTargetAtTime(this.musicEnabled && !useSourceMix ? 0.36 : 0, this.context.currentTime, 0.04);
    this.effectBus.gain.setTargetAtTime(this.effectsEnabled && !useSourceMix ? 0.8 : 0, this.context.currentTime, 0.04);
    if (useSourceMix) this.stopMusic();
    else if (this.musicEnabled) this.startMusic();
  }

  isUsingSourceMix() {
    return this.sourceMixMode && this.musicEnabled && this.effectsEnabled;
  }
}
