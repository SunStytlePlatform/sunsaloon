'use client';

import { useState } from 'react';

// Empty = same origin (bundled deploy); set to http://localhost:5000 for `next dev`.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const REQUEST_TIMEOUT_MS = 10_000;

// Normalises network failures, timeouts and non-JSON responses into readable errors.
async function fetchJson(path) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (err) {
    if (err.name === 'TimeoutError') throw new Error('Request timed out - the server did not respond');
    throw new Error('Unable to reach the server - check that the backend is running');
  }

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Unexpected response from server (status ${res.status})`);
  }
  return { ok: res.ok, status: res.status, data };
}

export default function Home() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [db, setDb] = useState(null);
  const [dbError, setDbError] = useState('');
  const [dbLoading, setDbLoading] = useState(false);

  async function checkHealth() {
    setLoading(true);
    setError('');
    setHealth(null);
    try {
      const { ok, status, data } = await fetchJson('/suns/health');
      if (!ok) throw new Error(data?.error || `Request failed with status ${status}`);
      setHealth(data);
    } catch (err) {
      console.error('Health check failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function checkDb() {
    setDbLoading(true);
    setDbError('');
    setDb(null);
    try {
      const { ok, status, data } = await fetchJson('/suns/db');
      // 503 still carries a DB status body; anything else without `connected` is a real error.
      if (!ok && typeof data?.connected !== 'boolean') {
        throw new Error(data?.error || `Request failed with status ${status}`);
      }
      setDb(data);
    } catch (err) {
      console.error('DB check failed:', err);
      setDbError(err.message);
    } finally {
      setDbLoading(false);
    }
  }

  return (
    <main>
      <h1>Welcome to SunSaloon</h1>
      <p>Frontend .env message: {process.env.CUSTOM_MESSAGE || '(not loaded)'}</p>

      <div className="actions">
        <button onClick={checkHealth} disabled={loading}>
          {loading ? 'Checking...' : 'Check API Health'}
        </button>
        <button onClick={checkDb} disabled={dbLoading}>
          {dbLoading ? 'Checking...' : 'Check DB'}
        </button>
      </div>

      {health && (
        <div className="result">
          <p><strong>{health.status}</strong></p>
          <p>Backend .env message: {health.customMessage}</p>
        </div>
      )}
      {error && <p className="error">Error: {error}</p>}

      {db && (
        <div className="result">
          <p className={db.connected ? 'success' : 'error'}>
            <strong>Database: {db.connected ? 'Connected' : 'Not connected'}</strong>
          </p>
          <p>{db.message}</p>
          <p>Checked at {db.checkedAt}</p>
        </div>
      )}
      {dbError && <p className="error">Error: {dbError}</p>}
    </main>
  );
}
