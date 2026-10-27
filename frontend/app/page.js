'use client';

import { useState } from 'react';

// Empty = same origin (bundled deploy); set to http://localhost:5000 for `next dev`.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

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
      const res = await fetch(`${API_BASE_URL}/suns/health`);
      if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
      setHealth(await res.json());
    } catch (err) {
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
      // 503 still carries a JSON status body, so don't treat it as a network error.
      const res = await fetch(`${API_BASE_URL}/suns/db`);
      setDb(await res.json());
    } catch (err) {
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
