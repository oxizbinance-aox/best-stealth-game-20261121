// Sound, synthesized live with WebAudio — no audio files to ship.
// Footsteps tell you where a guard is; a sting tells you you were seen.
'use strict';

const AudioSys = {
  ctx: null,

  ensure: function () {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) this.ctx = new AC();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) {
      this.ctx = null;
    }
  },

  // One short tone: frequency, seconds, shape, volume.
  blip: function (freq, dur, type, vol) {
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol || 0.05, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + dur);
    } catch (e) {
      // Silence is fine; never let sound break the game.
    }
  },

  footstep: function (sneaking) {
    this.blip(sneaking ? 90 : 70, 0.05, 'triangle', sneaking ? 0.015 : 0.03);
  },

  pickup: function () {
    this.blip(880, 0.12, 'sine', 0.06);
    setTimeout(() => this.blip(1320, 0.15, 'sine', 0.06), 90);
  },

  alertSting: function () {
    this.blip(220, 0.18, 'sawtooth', 0.07);
    setTimeout(() => this.blip(165, 0.25, 'sawtooth', 0.07), 140);
  },

  win: function () {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => setTimeout(() => this.blip(n, 0.2, 'sine', 0.06), i * 110));
  },

  lose: function () {
    this.blip(110, 0.5, 'sawtooth', 0.08);
  }
};
