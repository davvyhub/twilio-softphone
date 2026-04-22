'use strict';

/**
 * API client — thin wrapper around fetch() that handles auth errors and JSON parsing.
 */
const API = (() => {
  async function request(method, path, body) {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    };
    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(path, options);

    if (res.status === 401) {
      // Session expired — redirect to login
      window.location.href = '/pages/login.html';
      throw new Error('Session expired');
    }

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      const err = new Error(data.error || data.message || `HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  return {
    get:    (path)         => request('GET',    path),
    post:   (path, body)   => request('POST',   path, body),
    put:    (path, body)   => request('PUT',    path, body),
    patch:  (path, body)   => request('PATCH',  path, body),
    delete: (path)         => request('DELETE', path),

    auth: {
      login:  (password)  => request('POST', '/api/auth/login',  { password }),
      logout: ()          => request('POST', '/api/auth/logout'),
      status: ()          => request('GET',  '/api/auth/status'),
    },

    token: {
      get: () => request('GET', '/api/token'),
    },

    calls: {
      list:       (params) => request('GET', `/api/calls?${new URLSearchParams(params)}`),
      stats:      ()       => request('GET', '/api/calls/stats'),
      get:        (id)     => request('GET', `/api/calls/${id}`),
      updateNote: (id, notes) => request('PATCH', `/api/calls/${id}/notes`, { notes }),
      delete:     (id)     => request('DELETE', `/api/calls/${id}`),
    },

    contacts: {
      list:   (params) => request('GET', `/api/contacts?${new URLSearchParams(params || {})}`),
      create: (data)   => request('POST',   '/api/contacts', data),
      get:    (id)     => request('GET',    `/api/contacts/${id}`),
      update: (id, d)  => request('PUT',    `/api/contacts/${id}`, d),
      delete: (id)     => request('DELETE', `/api/contacts/${id}`),
      lookup: (phone)  => request('GET',    `/api/contacts/lookup/${encodeURIComponent(phone)}`),
    },

    dashboard: {
      get: () => request('GET', '/api/dashboard'),
    },
  };
})();
