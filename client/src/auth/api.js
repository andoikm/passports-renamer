function getErrorMessage(err) {
  if (!err) return 'Request failed';
  if (typeof err === 'string') return err;
  return err?.message || 'Request failed';
}

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export async function getMe() {
  const res = await fetch('/api/auth/me', {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) {
    const data = await parseJsonSafe(res);
    throw new Error(data?.message || `Auth check failed (${res.status})`);
  }
  return res.json();
}

export async function login({ username, password }) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await parseJsonSafe(res);
    throw new Error(data?.message || `Login failed (${res.status})`);
  }
  return res.json();
}

export async function register({ username, password }) {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await parseJsonSafe(res);
    throw new Error(data?.message || `Registration failed (${res.status})`);
  }
  return res.json();
}

export async function logout() {
  const res = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
  // Logout endpoint can be best-effort.
  if (!res.ok) {
    const data = await parseJsonSafe(res);
    throw new Error(getErrorMessage(data));
  }
  return res.json().catch(() => ({}));
}

