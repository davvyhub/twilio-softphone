'use strict';

/**
 * Audio notifications using the Web Audio API.
 * No external audio files required — all tones generated programmatically.
 */
const Notifications = (() => {
  let audioCtx = null;
  let ringtoneInterval = null;
  let dialToneOscillators = [];
  let masterVolume = 0.7;

  function getCtx() {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function setVolume(vol) {
    masterVolume = Math.max(0, Math.min(1, vol));
  }

  /**
   * Play a tone burst at given frequencies for a duration.
   * Returns a stop function.
   */
  function playTone(frequencies, duration, gainVal) {
    const ctx = getCtx();
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(gainVal * masterVolume, ctx.currentTime + 0.01);
    gainNode.gain.setValueAtTime(gainVal * masterVolume, ctx.currentTime + duration - 0.01);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    gainNode.connect(ctx.destination);

    const oscs = frequencies.map((freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.connect(gainNode);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
      return osc;
    });

    return () => oscs.forEach((o) => { try { o.stop(); } catch {} });
  }

  // ── DTMF Frequencies ─────────────────────────────────────────────────────
  const DTMF = {
    '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
    '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
    '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
    '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
  };

  function playDtmf(digit) {
    const freqs = DTMF[digit];
    if (!freqs) return;
    playTone(freqs, 0.12, 0.3);
  }

  // ── Ringtone (incoming) ───────────────────────────────────────────────────
  function startRingtone() {
    stopRingtone();
    let playing = false;

    function ring() {
      if (playing) return;
      playing = true;
      playTone([440, 480], 0.5, 0.25);
      setTimeout(() => { playing = false; }, 600);
    }

    ring();
    ringtoneInterval = setInterval(ring, 2000);
  }

  function stopRingtone() {
    if (ringtoneInterval) {
      clearInterval(ringtoneInterval);
      ringtoneInterval = null;
    }
  }

  // ── Dial tone (outbound ringing) ─────────────────────────────────────────
  function startDialTone() {
    stopDialTone();
    try {
      const ctx = getCtx();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15 * masterVolume, ctx.currentTime);
      gain.connect(ctx.destination);

      [350, 440].forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.connect(gain);
        osc.start();
        dialToneOscillators.push(osc);
      });
    } catch {}
  }

  function stopDialTone() {
    dialToneOscillators.forEach((o) => { try { o.stop(); } catch {} });
    dialToneOscillators = [];
  }

  // ── Hangup click ─────────────────────────────────────────────────────────
  function playHangup() {
    try {
      const ctx = getCtx();
      const bufSize = ctx.sampleRate * 0.08;
      const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize) * 0.4;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start();
    } catch {}
  }

  // ── Browser notifications ─────────────────────────────────────────────────
  async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }

  function showBrowserNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  }

  return {
    playDtmf,
    startRingtone,
    stopRingtone,
    startDialTone,
    stopDialTone,
    playHangup,
    setVolume,
    requestNotificationPermission,
    showBrowserNotification,
  };
})();
