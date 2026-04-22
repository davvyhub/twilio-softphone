'use strict';

/**
 * Phone module — manages Twilio Device lifecycle, outbound/inbound call handling,
 * dialpad UI, status strip, and token refresh.
 */
const Phone = (() => {
  let device = null;
  let activeCall = null;
  let timerInterval = null;
  let callSeconds = 0;
  let isMuted = false;
  let tokenRefreshTimer = null;
  let currentStatus = 'offline';

  // ── Status management ────────────────────────────────────────────────────
  function setStatus(status, label) {
    currentStatus = status;
    const strip = document.getElementById('status-strip');
    if (!strip) return;
    strip.className = `status-strip ${status}`;
    strip.querySelector('.status-text').textContent = label || status;
  }

  // ── Timer ────────────────────────────────────────────────────────────────
  function startTimer() {
    callSeconds = 0;
    const timerEl = document.getElementById('call-timer');
    if (timerEl) timerEl.classList.add('visible');
    timerInterval = setInterval(() => {
      callSeconds++;
      if (timerEl) timerEl.textContent = UI.formatDuration(callSeconds);
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    callSeconds = 0;
    const timerEl = document.getElementById('call-timer');
    if (timerEl) {
      timerEl.classList.remove('visible');
      timerEl.textContent = '00:00';
    }
  }

  // ── UI state ─────────────────────────────────────────────────────────────
  function showCallingUI() {
    document.getElementById('btn-call').style.display = 'none';
    document.getElementById('btn-hangup').style.display = 'flex';
    const opts = document.getElementById('in-call-options');
    if (opts) opts.classList.add('visible');
    isMuted = false;
    updateMuteButton();
  }

  function showIdleUI() {
    document.getElementById('btn-call').style.display = 'flex';
    document.getElementById('btn-hangup').style.display = 'none';
    const opts = document.getElementById('in-call-options');
    if (opts) opts.classList.remove('visible');
  }

  function updateMuteButton() {
    const btn = document.getElementById('btn-mute');
    if (!btn) return;
    btn.classList.toggle('active', isMuted);
    btn.querySelector('.in-call-btn-icon').textContent = isMuted ? '🔇' : '🎙️';
    btn.querySelector('.in-call-btn-label').textContent = isMuted ? 'Unmute' : 'Mute';
  }

  // ── Token refresh ─────────────────────────────────────────────────────────
  function scheduleTokenRefresh(ttlSeconds) {
    if (tokenRefreshTimer) clearTimeout(tokenRefreshTimer);
    const refreshAt = (ttlSeconds - 600) * 1000; // 10 min before expiry
    if (refreshAt > 0) {
      tokenRefreshTimer = setTimeout(refreshToken, refreshAt);
    }
  }

  async function refreshToken() {
    try {
      const data = await API.token.get();
      if (device && data.token) {
        device.updateToken(data.token);
        scheduleTokenRefresh(data.ttl || 3600);
        console.log('[Phone] Token refreshed');
      }
    } catch (err) {
      console.error('[Phone] Token refresh failed:', err);
      UI.toast('Token refresh failed. Please reload if calls stop working.', 'warning');
    }
  }

  // ── Device setup ─────────────────────────────────────────────────────────
  async function initDevice() {
    try {
      setStatus('connecting', 'Connecting...');
      const data = await API.token.get();

      device = new Twilio.Device(data.token, {
        logLevel: 'warn',
        codecPreferences: ['opus', 'pcmu'],
        fakeLocalDTMF: true,
        enableImprovedSignalingErrorPrecision: true,
      });

      device.on('ready', () => {
        setStatus('ready', 'Ready');
        UI.toast('Softphone ready', 'success');
      });

      device.on('registered', () => {
        setStatus('ready', 'Ready');
      });

      device.on('unregistered', () => {
        setStatus('offline', 'Offline');
      });

      device.on('error', (err) => {
        const msg = err.message || String(err);
        const code = err.code ? ` [code ${err.code}]` : '';
        console.error('[Phone] Device error:', err);
        setStatus('offline', 'Error');
        UI.toast(`Twilio error${code}: ${msg}`, 'error', 8000);
      });

      device.on('incoming', handleIncomingCall);

      device.on('tokenWillExpire', () => {
        refreshToken();
      });

      await device.register();
      scheduleTokenRefresh(data.ttl || 3600);
    } catch (err) {
      const msg = err.message || String(err);
      const code = err.code ? ` [code ${err.code}]` : '';
      console.error('[Phone] Init error:', err);
      setStatus('offline', 'Offline');
      UI.toast(`Failed to initialize softphone${code}: ${msg}`, 'error', 8000);
    }
  }

  // ── Outbound call ─────────────────────────────────────────────────────────
  async function placeCall(number) {
    if (!device || currentStatus === 'offline') {
      UI.toast('Device not ready. Please wait and try again.', 'warning');
      return;
    }
    if (activeCall) {
      UI.toast('Already on a call', 'warning');
      return;
    }

    try {
      setStatus('connecting', 'Calling...');
      showCallingUI();
      Notifications.startDialTone();

      activeCall = await device.connect({ params: { To: number } });

      activeCall.on('ringing', () => {
        setStatus('connecting', 'Ringing...');
      });

      activeCall.on('accept', () => {
        Notifications.stopDialTone();
        setStatus('on-call', 'On Call');
        startTimer();
        UI.toast('Call connected', 'success');
      });

      activeCall.on('disconnect', onCallEnded);
      activeCall.on('cancel', onCallEnded);
      activeCall.on('reject', onCallEnded);

      activeCall.on('error', (err) => {
        console.error('[Phone] Call error:', err);
        UI.toast(`Call error: ${err.message}`, 'error');
        onCallEnded();
      });

    } catch (err) {
      console.error('[Phone] Connect error:', err);
      UI.toast(`Failed to place call: ${err.message}`, 'error');
      onCallEnded();
    }
  }

  // ── Incoming call ─────────────────────────────────────────────────────────
  function handleIncomingCall(call) {
    const from = call.parameters.From || 'Unknown';

    Notifications.startRingtone();
    Notifications.showBrowserNotification('Incoming Call', `From: ${from}`);

    // Populate overlay
    document.getElementById('incoming-number').textContent = from;

    // Try to look up contact name
    API.contacts.lookup(from)
      .then((contact) => {
        document.getElementById('incoming-name').textContent = contact.name;
      })
      .catch(() => {
        document.getElementById('incoming-name').textContent = '';
      });

    const overlay = document.getElementById('incoming-overlay');
    overlay.classList.add('active');

    function cleanup() {
      Notifications.stopRingtone();
      overlay.classList.remove('active');
    }

    document.getElementById('btn-answer').onclick = () => {
      cleanup();
      call.accept();
      activeCall = call;
      showCallingUI();
      setStatus('on-call', 'On Call');
      startTimer();
      UI.switchToTab('dialpad');

      call.on('disconnect', onCallEnded);
      call.on('cancel', onCallEnded);
      call.on('error', (err) => {
        console.error('[Phone] Incoming call error:', err);
        onCallEnded();
      });
    };

    document.getElementById('btn-decline').onclick = () => {
      cleanup();
      call.reject();
    };

    call.on('cancel', cleanup);
    call.on('disconnect', cleanup);
  }

  // ── Call ended ────────────────────────────────────────────────────────────
  function onCallEnded() {
    Notifications.stopDialTone();
    Notifications.stopRingtone();
    Notifications.playHangup();
    stopTimer();
    showIdleUI();
    setStatus('ready', 'Ready');
    activeCall = null;

    // Refresh call log if that tab is active
    document.dispatchEvent(new CustomEvent('callEnded'));
  }

  // ── Hangup ────────────────────────────────────────────────────────────────
  function hangup() {
    if (activeCall) {
      activeCall.disconnect();
    }
  }

  // ── Mute ─────────────────────────────────────────────────────────────────
  function toggleMute() {
    if (!activeCall) return;
    isMuted = !isMuted;
    activeCall.mute(isMuted);
    updateMuteButton();
    UI.toast(isMuted ? 'Muted' : 'Unmuted', 'info');
  }

  // ── Dialpad init ──────────────────────────────────────────────────────────
  function initDialpad() {
    const display = document.getElementById('number-display');
    const keys = document.querySelectorAll('.dial-key');
    const backspaceBtn = document.getElementById('btn-backspace');
    const callBtn = document.getElementById('btn-call');
    const hangupBtn = document.getElementById('btn-hangup');
    const muteBtn = document.getElementById('btn-mute');
    const volumeSlider = document.getElementById('volume-slider');

    keys.forEach((key) => {
      key.addEventListener('click', () => {
        const digit = key.dataset.digit;
        if (!digit) return;
        Notifications.playDtmf(digit);
        display.value += digit;
        if (activeCall) {
          activeCall.sendDigits(digit);
        }
      });
    });

    backspaceBtn.addEventListener('click', () => {
      display.value = display.value.slice(0, -1);
    });

    callBtn.addEventListener('click', () => {
      const number = display.value.trim();
      if (!number) {
        UI.toast('Enter a phone number', 'warning');
        return;
      }
      placeCall(number);
    });

    hangupBtn.addEventListener('click', hangup);

    if (muteBtn) muteBtn.addEventListener('click', toggleMute);

    if (volumeSlider) {
      volumeSlider.addEventListener('input', () => {
        Notifications.setVolume(parseFloat(volumeSlider.value));
      });
    }

    // Allow typing in the number display
    display.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const number = display.value.trim();
        if (number && !activeCall) placeCall(number);
      }
    });
  }

  // ── Public API ────────────────────────────────────────────────────────────
  function init() {
    initDialpad();
    initDevice();
  }

  function dialNumber(number) {
    const display = document.getElementById('number-display');
    if (display) display.value = number;
    UI.switchToTab('dialpad');
  }

  return { init, dialNumber, hangup };
})();
