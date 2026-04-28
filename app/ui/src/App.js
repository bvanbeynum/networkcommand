import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [apps, setApps] = useState([]);
  const [errorSummary, setErrorSummary] = useState([]);
  const [activeTab, setActiveTab] = useState('logs');
  const [filter, setFilter] = useState({ appId: '', level: '', type: '' });
  
  // New App Form State
  const [newApp, setNewApp] = useState({ name: '', appId: '' });

  const fetchData = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      if (activeTab === 'logs') {
        const logsRes = await fetch(`/api/logs-view?appId=${filter.appId}&level=${filter.level}&type=${filter.type}`);
        const logsData = await logsRes.json();
        if (logsData.success) setLogs(logsData.data);
      }

      if (activeTab === 'apps') {
        const appsRes = await fetch('/api/apps-view');
        const appsData = await appsRes.json();
        if (appsData.success) setApps(appsData.data);
      }

      if (activeTab === 'errors') {
        const summaryRes = await fetch('/api/errors-summary');
        const summaryData = await summaryRes.json();
        if (summaryData.success) setErrorSummary(summaryData.data);
      }
    } catch (err) {
      console.error('Failed to fetch data', err);
    }
  }, [isLoggedIn, activeTab, filter.appId, filter.level, filter.type]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const result = await response.json();
      if (result.success) {
        setIsLoggedIn(true);
        localStorage.setItem('logManagerAuth', 'true');
      } else {
        setError('Invalid password');
      }
    } catch (err) {
      setError('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApp = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newApp)
      });
      const result = await res.json();
      if (result.success) {
        setNewApp({ name: '', appId: '' });
        fetchData();
      } else {
        alert(result.error);
      }
    } catch (err) {
      alert('Failed to create app');
    }
  };

  useEffect(() => {
    if (localStorage.getItem('logManagerAuth') === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, fetchData]);

  if (!isLoggedIn) {
    return (
      <div className="login-container">
        <form onSubmit={handleLogin} className="login-form">
          <h1>LogManager Login</h1>
          <input 
            type="password" 
            placeholder="Enter Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Verifying...' : 'Login'}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-left">
          <h1>LogManager</h1>
          <nav>
            <button className={activeTab === 'logs' ? 'active' : ''} onClick={() => setActiveTab('logs')}>Logs</button>
            <button className={activeTab === 'errors' ? 'active' : ''} onClick={() => setActiveTab('errors')}>Error Groups</button>
            <button className={activeTab === 'apps' ? 'active' : ''} onClick={() => setActiveTab('apps')}>App Management</button>
          </nav>
        </div>
        <button className="logout-btn" onClick={() => {
          localStorage.removeItem('logManagerAuth');
          setIsLoggedIn(false);
        }}>Logout</button>
      </header>

      <main>
        {activeTab === 'logs' && (
          <section>
            <div className="filters">
              <input placeholder="App ID" value={filter.appId} onChange={(e) => setFilter({...filter, appId: e.target.value})} />
              <select value={filter.level} onChange={(e) => setFilter({...filter, level: e.target.value})}>
                <option value="">All Levels</option>
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
              </select>
              <select value={filter.type} onChange={(e) => setFilter({...filter, type: e.target.value})}>
                <option value="">All Types</option>
                <option value="WEB_APP">WEB_APP</option>
                <option value="JOB">JOB</option>
                <option value="ERROR">ERROR</option>
              </select>
              <button onClick={fetchData}>Refresh</button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>App</th>
                  <th>Level</th>
                  <th>Type</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? logs.map((log, i) => (
                  <tr key={i} className={`level-${log.level?.toLowerCase()}`}>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td>{log.appId}</td>
                    <td>{log.level}</td>
                    <td>{log.type}</td>
                    <td>{log.message}</td>
                  </tr>
                )) : <tr><td colSpan={5}>No logs found</td></tr>}
              </tbody>
            </table>
          </section>
        )}

        {activeTab === 'errors' && (
          <section>
            <h2>Error Summary (Top 20)</h2>
            <table>
              <thead>
                <tr>
                  <th>Occurrences</th>
                  <th>App(s)</th>
                  <th>Message</th>
                  <th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {errorSummary.map((err, i) => (
                  <tr key={i}>
                    <td>{err.count}</td>
                    <td>{err.appIds.join(', ')}</td>
                    <td>{err.message}</td>
                    <td>{new Date(err.lastSeen).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {activeTab === 'apps' && (
          <section className="apps-mgmt">
            <div className="card">
              <h3>Register New Application</h3>
              <form onSubmit={handleCreateApp} className="inline-form">
                <input placeholder="App Name (e.g. My Website)" value={newApp.name} onChange={e => setNewApp({...newApp, name: e.target.value})} required />
                <input placeholder="Unique ID (e.g. website-01)" value={newApp.appId} onChange={e => setNewApp({...newApp, appId: e.target.value})} required />
                <button type="submit">Create App & Key</button>
              </form>
            </div>
            
            <h3>Existing Applications</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>App ID</th>
                  <th>API Key</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((app, i) => (
                  <tr key={i}>
                    <td>{app.name}</td>
                    <td>{app.appId}</td>
                    <td><code className="api-key">{app.apiKey}</code></td>
                    <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
