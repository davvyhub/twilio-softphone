'use strict';

/**
 * UI helpers — tab switching, modal management, toasts, formatting utilities.
 */
const UI = (() => {

  // ── Tab switching ────────────────────────────────────────────────────────
  function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-content');

    tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        tabBtns.forEach((b) => b.classList.remove('active'));
        tabPanels.forEach((p) => p.classList.remove('active'));
        btn.classList.add('active');
        const panel = document.getElementById(`tab-${target}`);
        if (panel) panel.classList.add('active');
        // Fire a custom event so other modules can react
        document.dispatchEvent(new CustomEvent('tabChange', { detail: { tab: target } }));
      });
    });
  }

  function switchToTab(tabName) {
    const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (btn) btn.click();
  }

  // ── Modal ────────────────────────────────────────────────────────────────
  function openModal(overlay) {
    overlay.classList.add('open');
    const firstInput = overlay.querySelector('input, textarea, select');
    if (firstInput) setTimeout(() => firstInput.focus(), 120);
  }

  function closeModal(overlay) {
    overlay.classList.remove('open');
  }

  function initModalClose(overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay);
    });
    const closeBtn = overlay.querySelector('[data-close-modal]');
    if (closeBtn) closeBtn.addEventListener('click', () => closeModal(overlay));
  }

  // ── Toast notifications ──────────────────────────────────────────────────
  let toastContainer;

  function getToastContainer() {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  }

  function toast(message, type = 'info', duration = 4000) {
    const container = getToastContainer();

    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };

    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.innerHTML = `<span>${icons[type] || 'ℹ'}</span><span>${escapeHtml(message)}</span>`;

    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));

    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 250);
    }, duration);
  }

  // ── Formatting ───────────────────────────────────────────────────────────
  function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function formatRelativeTime(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';

    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr  = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60)  return 'Just now';
    if (diffMin < 60)  return `${diffMin}m ago`;
    if (diffHr  < 24)  return `${diffHr}h ago`;
    if (diffDay === 1) return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (diffDay <  7)  return `${diffDay}d ago`;

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString([], {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  function callStatusBadge(status, direction) {
    const missed = ['no-answer', 'busy', 'failed'];
    if (missed.includes(status) && direction === 'inbound') {
      return `<span class="badge badge-red">Missed</span>`;
    }
    const map = {
      completed:   '<span class="badge badge-green">Completed</span>',
      'in-progress': '<span class="badge badge-blue">Active</span>',
      initiated:   '<span class="badge badge-yellow">Initiated</span>',
      ringing:     '<span class="badge badge-yellow">Ringing</span>',
      'no-answer': '<span class="badge badge-gray">No Answer</span>',
      busy:        '<span class="badge badge-gray">Busy</span>',
      failed:      '<span class="badge badge-red">Failed</span>',
      canceled:    '<span class="badge badge-gray">Canceled</span>',
    };
    return map[status] || `<span class="badge badge-gray">${escapeHtml(status)}</span>`;
  }

  function callDirectionIcon(direction, status) {
    const missed = ['no-answer', 'busy', 'failed'];
    if (missed.includes(status) && direction === 'inbound') return '❌';
    if (direction === 'inbound') return '📲';
    return '📞';
  }

  function setMissedBadge(count) {
    const badge = document.getElementById('missed-badge');
    if (!badge) return;
    badge.textContent = count > 0 ? count : '';
    badge.classList.toggle('visible', count > 0);
  }

  return {
    initTabs,
    switchToTab,
    openModal,
    closeModal,
    initModalClose,
    toast,
    formatDuration,
    formatRelativeTime,
    formatDateTime,
    escapeHtml,
    callStatusBadge,
    callDirectionIcon,
    setMissedBadge,
  };
})();
