'use strict';

/**
 * App entry point — initializes all modules, handles logout,
 * renders the Dashboard tab, and wires everything together.
 */

// ── Dashboard ─────────────────────────────────────────────────────────────
const Dashboard = (() => {
  async function load() {
    try {
      const data = await API.dashboard.get();

      // Stats cards
      setText('dash-today-calls',   data.todayCalls    ?? 0);
      setText('dash-missed-today',  data.missedToday   ?? 0);
      setText('dash-total-minutes', data.totalMinutes  ?? 0);
      setText('dash-total-all',     data.totalAllTime  ?? 0);

      // Recent calls
      renderRecentCalls(data.recentCalls || []);

      // Calls by hour chart
      renderHourChart(data.callsByHour || []);

    } catch (err) {
      console.error('[Dashboard] Load error:', err);
    }
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function renderRecentCalls(calls) {
    const list = document.getElementById('dash-recent-calls');
    if (!list) return;

    if (!calls.length) {
      list.innerHTML = `<div class="empty-state" style="padding:20px 0"><p>No calls yet</p></div>`;
      return;
    }

    list.innerHTML = calls.map((call) => {
      const missed = ['no-answer', 'busy', 'failed'];
      const isMissed = missed.includes(call.status) && call.direction === 'inbound';
      const displayNum = call.direction === 'inbound' ? call.from_number : call.to_number;
      return `
        <div class="dash-recent-row ${isMissed ? 'missed' : ''}">
          <span class="call-icon">${UI.callDirectionIcon(call.direction, call.status)}</span>
          <div style="flex:1;min-width:0">
            <div class="call-contact-name" style="font-size:13px">${UI.escapeHtml(call.contact_name || displayNum)}</div>
            <div class="call-number">${UI.escapeHtml(displayNum)}</div>
          </div>
          <div style="text-align:right">
            ${UI.callStatusBadge(call.status, call.direction)}
            <div class="call-time" style="margin-top:3px">${UI.formatRelativeTime(call.created_at)}</div>
          </div>
        </div>`;
    }).join('');
  }

  function renderHourChart(hourData) {
    const chart = document.getElementById('hour-chart');
    if (!chart) return;

    const max = Math.max(...hourData.map((h) => h.count), 1);

    chart.innerHTML = hourData.map((h) => {
      const pct = Math.round((h.count / max) * 100);
      const label = h.hour === 0 ? '12a' : h.hour < 12 ? `${h.hour}a` : h.hour === 12 ? '12p' : `${h.hour - 12}p`;
      return `
        <div class="hour-bar-wrap" title="${h.count} call${h.count !== 1 ? 's' : ''} at ${label}">
          <div class="hour-bar" style="height:${pct}%"></div>
          <div class="hour-label">${label}</div>
        </div>`;
    }).join('');
  }

  return { load };
})();

// ── App bootstrap ─────────────────────────────────────────────────────────
(async function bootstrap() {
  // Check auth status
  try {
    const status = await API.auth.status();
    if (!status.loggedIn) {
      window.location.href = '/pages/login.html';
      return;
    }
  } catch {
    window.location.href = '/pages/login.html';
    return;
  }

  // Request browser notification permission
  Notifications.requestNotificationPermission();

  // Init UI tabs
  UI.initTabs();

  // Init modules
  Phone.init();
  CallLog.init();
  Contacts.init();

  // Load dashboard on startup
  Dashboard.load();
  document.addEventListener('tabChange', (e) => {
    if (e.detail.tab === 'dashboard') Dashboard.load();
  });

  // Logout
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await API.auth.logout();
        window.location.href = '/pages/login.html';
      } catch {
        window.location.href = '/pages/login.html';
      }
    });
  }
})();
