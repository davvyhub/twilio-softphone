'use strict';

/**
 * Call Log module — handles the Recent Calls tab.
 */
const CallLog = (() => {
  let currentPage = 1;
  let currentFilter = 'all';
  let currentSearch = '';
  let totalPages = 1;
  let searchDebounceTimer = null;

  // ── Render table ─────────────────────────────────────────────────────────
  async function load(resetPage = false) {
    if (resetPage) currentPage = 1;

    const tbody = document.getElementById('calls-tbody');
    const paginationInfo = document.getElementById('pagination-info');

    try {
      const data = await API.calls.list({
        page: currentPage,
        limit: 20,
        filter: currentFilter,
        search: currentSearch,
      });

      totalPages = data.pages || 1;

      // Update pagination info
      if (paginationInfo) {
        paginationInfo.textContent = `${data.total} call${data.total !== 1 ? 's' : ''} · Page ${data.page} of ${Math.max(1, data.pages)}`;
      }

      // Update prev/next buttons
      const prevBtn = document.getElementById('btn-prev-page');
      const nextBtn = document.getElementById('btn-next-page');
      if (prevBtn) prevBtn.disabled = currentPage <= 1;
      if (nextBtn) nextBtn.disabled = currentPage >= totalPages;

      if (!data.calls || data.calls.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7">
              <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <p>No calls found</p>
              </div>
            </td>
          </tr>`;
        return;
      }

      tbody.innerHTML = data.calls.map((call) => renderRow(call)).join('');
      attachRowListeners();

      // Update missed badge
      const stats = await API.calls.stats();
      UI.setMissedBadge(stats.missed || 0);

    } catch (err) {
      console.error('[CallLog] Load error:', err);
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--accent-red);padding:24px;">Failed to load calls</td></tr>`;
    }
  }

  function renderRow(call) {
    const missed = ['no-answer', 'busy', 'failed'];
    const isMissed = missed.includes(call.status) && call.direction === 'inbound';
    const displayName = UI.escapeHtml(call.contact_name || '');
    const displayNum  = call.direction === 'inbound' ? call.from_number : call.to_number;

    return `
      <tr class="${isMissed ? 'missed' : ''}" data-id="${call.id}" data-number="${UI.escapeHtml(displayNum)}">
        <td><span class="call-icon">${UI.callDirectionIcon(call.direction, call.status)}</span></td>
        <td>
          ${displayName ? `<span class="call-contact-name">${displayName}</span>` : ''}
          <span class="call-number">${UI.escapeHtml(displayNum)}</span>
        </td>
        <td>${UI.callStatusBadge(call.status, call.direction)}</td>
        <td class="call-duration">${UI.formatDuration(call.duration_sec)}</td>
        <td class="call-time" title="${UI.formatDateTime(call.created_at)}">${UI.formatRelativeTime(call.created_at)}</td>
        <td>
          <div class="row-actions">
            <button class="btn btn-sm btn-secondary btn-callback" title="Call Back">📞</button>
            <button class="btn btn-sm btn-secondary btn-note" title="Add Note">📝</button>
            <button class="btn btn-sm btn-ghost btn-delete-call" title="Delete">🗑️</button>
          </div>
        </td>
      </tr>`;
  }

  function attachRowListeners() {
    document.querySelectorAll('.btn-callback').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = btn.closest('tr');
        const number = row.dataset.number;
        if (number) Phone.dialNumber(number);
      });
    });

    document.querySelectorAll('.btn-note').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = btn.closest('tr');
        openNoteModal(parseInt(row.dataset.id, 10), row.dataset.number);
      });
    });

    document.querySelectorAll('.btn-delete-call').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('tr');
        const id = parseInt(row.dataset.id, 10);
        if (!confirm('Delete this call record?')) return;
        try {
          await API.calls.delete(id);
          UI.toast('Call record deleted', 'success');
          load();
        } catch (err) {
          UI.toast('Failed to delete call', 'error');
        }
      });
    });
  }

  // ── Note modal ────────────────────────────────────────────────────────────
  function openNoteModal(callId, callNumber) {
    const overlay = document.getElementById('note-modal-overlay');
    const infoEl = document.getElementById('note-call-info');
    const textarea = document.getElementById('note-textarea');
    const saveBtn = document.getElementById('btn-save-note');

    if (infoEl) infoEl.textContent = callNumber || '';
    if (textarea) textarea.value = '';

    // Load existing note
    API.calls.get(callId).then((call) => {
      if (textarea && call.notes) textarea.value = call.notes;
    }).catch(() => {});

    saveBtn.onclick = async () => {
      try {
        await API.calls.updateNote(callId, textarea.value.trim());
        UI.toast('Note saved', 'success');
        UI.closeModal(overlay);
        load();
      } catch (err) {
        UI.toast('Failed to save note', 'error');
      }
    };

    UI.openModal(overlay);
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        load(true);
      });
    });

    // Search
    const searchInput = document.getElementById('calls-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
          currentSearch = searchInput.value.trim();
          load(true);
        }, 350);
      });
    }

    // Pagination
    const prevBtn = document.getElementById('btn-prev-page');
    const nextBtn = document.getElementById('btn-next-page');
    if (prevBtn) prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; load(); } });
    if (nextBtn) nextBtn.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; load(); } });

    // Note modal close
    const noteOverlay = document.getElementById('note-modal-overlay');
    if (noteOverlay) UI.initModalClose(noteOverlay);

    // Reload when tab is switched to this tab
    document.addEventListener('tabChange', (e) => {
      if (e.detail.tab === 'calls') load();
    });

    // Reload after a call ends
    document.addEventListener('callEnded', () => {
      setTimeout(() => load(), 1500);
    });

    load();
  }

  return { init, load };
})();
