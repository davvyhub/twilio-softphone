'use strict';

/**
 * Contacts module — handles the Contacts tab.
 */
const Contacts = (() => {
  let editingId = null;
  let searchDebounceTimer = null;

  // ── Load & render ─────────────────────────────────────────────────────────
  async function load(search = '') {
    const grid = document.getElementById('contacts-grid');
    if (!grid) return;

    try {
      const data = await API.contacts.list(search ? { search } : {});
      const contacts = data.contacts || [];

      if (contacts.length === 0) {
        grid.innerHTML = `
          <div class="empty-state" style="grid-column:1/-1">
            <div class="empty-state-icon">👤</div>
            <p>${search ? 'No contacts match your search' : 'No contacts yet. Add your first contact!'}</p>
          </div>`;
        return;
      }

      grid.innerHTML = contacts.map(renderCard).join('');
      attachCardListeners();
    } catch (err) {
      console.error('[Contacts] Load error:', err);
      grid.innerHTML = `<div style="color:var(--accent-red);padding:24px;">Failed to load contacts</div>`;
    }
  }

  function getInitials(name) {
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0] || '')
      .join('')
      .toUpperCase();
  }

  function renderCard(contact) {
    return `
      <div class="contact-card" data-id="${contact.id}">
        <div class="contact-card-top">
          <div class="contact-avatar">${UI.escapeHtml(getInitials(contact.name))}</div>
          <div class="contact-info">
            <div class="contact-name">${UI.escapeHtml(contact.name)}</div>
            ${contact.company ? `<div class="contact-company">${UI.escapeHtml(contact.company)}</div>` : ''}
          </div>
        </div>
        <div class="contact-details">
          <div class="contact-detail-row">
            <span class="contact-detail-icon">📞</span>
            <span class="contact-detail-value">${UI.escapeHtml(contact.phone)}</span>
          </div>
          ${contact.email ? `
          <div class="contact-detail-row">
            <span class="contact-detail-icon">✉️</span>
            <span class="contact-detail-value">${UI.escapeHtml(contact.email)}</span>
          </div>` : ''}
        </div>
        <div class="contact-card-actions">
          <button class="btn btn-sm btn-primary btn-call-contact" data-phone="${UI.escapeHtml(contact.phone)}">📞 Call</button>
          <button class="btn btn-sm btn-secondary btn-edit-contact">Edit</button>
          <button class="btn btn-sm btn-danger btn-delete-contact">Delete</button>
        </div>
      </div>`;
  }

  function attachCardListeners() {
    document.querySelectorAll('.btn-call-contact').forEach((btn) => {
      btn.addEventListener('click', () => {
        Phone.dialNumber(btn.dataset.phone);
      });
    });

    document.querySelectorAll('.btn-edit-contact').forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.contact-card');
        openModal(parseInt(card.dataset.id, 10));
      });
    });

    document.querySelectorAll('.btn-delete-contact').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const card = btn.closest('.contact-card');
        const id = parseInt(card.dataset.id, 10);
        if (!confirm('Delete this contact?')) return;
        try {
          await API.contacts.delete(id);
          UI.toast('Contact deleted', 'success');
          load(document.getElementById('contacts-search')?.value.trim() || '');
        } catch (err) {
          UI.toast('Failed to delete contact', 'error');
        }
      });
    });
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  function openModal(id = null) {
    editingId = id;
    const overlay = document.getElementById('contact-modal-overlay');
    const title = document.getElementById('contact-modal-title');
    const form = document.getElementById('contact-form');

    form.reset();
    title.textContent = id ? 'Edit Contact' : 'Add Contact';

    if (id) {
      API.contacts.get(id).then((contact) => {
        document.getElementById('cf-name').value    = contact.name    || '';
        document.getElementById('cf-phone').value   = contact.phone   || '';
        document.getElementById('cf-email').value   = contact.email   || '';
        document.getElementById('cf-company').value = contact.company || '';
        document.getElementById('cf-notes').value   = contact.notes   || '';
      }).catch(() => UI.toast('Failed to load contact', 'error'));
    }

    UI.openModal(overlay);
  }

  async function saveContact() {
    const data = {
      name:    document.getElementById('cf-name').value.trim(),
      phone:   document.getElementById('cf-phone').value.trim(),
      email:   document.getElementById('cf-email').value.trim(),
      company: document.getElementById('cf-company').value.trim(),
      notes:   document.getElementById('cf-notes').value.trim(),
    };

    if (!data.name || !data.phone) {
      UI.toast('Name and phone number are required', 'warning');
      return;
    }

    try {
      if (editingId) {
        await API.contacts.update(editingId, data);
        UI.toast('Contact updated', 'success');
      } else {
        await API.contacts.create(data);
        UI.toast('Contact added', 'success');
      }

      const overlay = document.getElementById('contact-modal-overlay');
      UI.closeModal(overlay);
      load(document.getElementById('contacts-search')?.value.trim() || '');
    } catch (err) {
      UI.toast(err.message || 'Failed to save contact', 'error');
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init() {
    // Add contact button
    const addBtn = document.getElementById('btn-add-contact');
    if (addBtn) addBtn.addEventListener('click', () => openModal(null));

    // Save contact button
    const saveBtn = document.getElementById('btn-save-contact');
    if (saveBtn) saveBtn.addEventListener('click', saveContact);

    // Contact form submit via Enter
    const form = document.getElementById('contact-form');
    if (form) {
      form.addEventListener('submit', (e) => { e.preventDefault(); saveContact(); });
    }

    // Modal close
    const overlay = document.getElementById('contact-modal-overlay');
    if (overlay) UI.initModalClose(overlay);

    // Search
    const searchInput = document.getElementById('contacts-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
          load(searchInput.value.trim());
        }, 350);
      });
    }

    // Load when tab shown
    document.addEventListener('tabChange', (e) => {
      if (e.detail.tab === 'contacts') load();
    });

    load();
  }

  return { init, load };
})();
