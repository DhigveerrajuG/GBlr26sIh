/**
 * audio.js - Web Audio API Synthesis Engine for SIH Support Desk
 * Zero audio assets needed; generates clean synthesized alerts on devices.
 */

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem(window.SIH_CONFIG?.STORAGE_KEYS?.SOUND_ENABLED || 'sih_sound_enabled') !== 'false';
    this.setupUnlockListeners();
  }

  setupUnlockListeners() {
    const unlock = () => {
      this.init();
      ['click', 'touchstart', 'keydown'].forEach(evt => {
        window.removeEventListener(evt, unlock);
      });
    };
    ['click', 'touchstart', 'keydown'].forEach(evt => {
      window.addEventListener(evt, unlock, { once: true });
    });
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleSound() {
    this.enabled = !this.enabled;
    const key = window.SIH_CONFIG?.STORAGE_KEYS?.SOUND_ENABLED || 'sih_sound_enabled';
    localStorage.setItem(key, this.enabled ? 'true' : 'false');
    if (this.enabled) {
      this.playAlert();
    }
    return this.enabled;
  }

  // Incoming ticket notification chime for volunteers (bright, pleasant 2-tone chime)
  playAlert() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // Note 1: High crisp chime (D5 - 587.33 Hz)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.35, now + 0.03);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.3);

      // Note 2: Higher ringing chime (A5 - 880 Hz)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, now + 0.12);

      gain2.gain.setValueAtTime(0.001, now + 0.12);
      gain2.gain.linearRampToValueAtTime(0.4, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);

      osc2.start(now + 0.12);
      osc2.stop(now + 0.68);
    } catch (e) {
      console.warn('[Audio] Autoplay blocked or context error', e);
    }
  }

  // Action success sound (soft ascending chord)
  playSuccess() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + (idx * 0.07));

        gain.gain.setValueAtTime(0.001, now + (idx * 0.07));
        gain.gain.linearRampToValueAtTime(0.22, now + (idx * 0.07) + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (idx * 0.07) + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + (idx * 0.07));
        osc.stop(now + (idx * 0.07) + 0.3);
      });
    } catch (e) {}
  }

  // Severe cluster alert: pulsed siren for >7 teams reporting similar issue
  playSevereOutage() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      // 3 urgent dual-frequency alarm pulses
      [0, 0.22, 0.44].forEach(offset => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now + offset);
        osc.frequency.linearRampToValueAtTime(587.33, now + offset + 0.16);

        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.linearRampToValueAtTime(0.35, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.2);
      });
    } catch (e) {
      console.warn('[Audio] Severe outage chime error', e);
    }
  }

  // Critical ticket buzzer
  playCritical() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(320, now + 0.15);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.29);
    } catch (e) {}
  }
}

window.sound = new AudioEngine();
