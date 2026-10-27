'use client';

import { useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';

export default function Home() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <main>
      <h1>Welcome to SunSaloon</h1>
      <p>Frontend .env message: {process.env.CUSTOM_MESSAGE || '(not loaded)'}</p>

      <button onClick={checkHealth} disabled={loading}>
        {loading ? 'Checking...' : 'Check API Health'}
      </button>

      {health && (
        <div className="result">
          <p><strong>{health.status}</strong></p>
          <p>Backend .env message: {health.customMessage}</p>
        </div>
      )}
      {error && <p className="error">Error: {error}</p>}
    </main>
  );
}
