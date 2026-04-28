import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [apps, setApps] = useState([]);
  const [activeTab, setActiveTab] = useState('logs');
  const [filter, setFilter] = useState({ appId: '', level: '', type: '' });

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

  const fetchData = async () => {
    if (!isLoggedIn) return;
    try {
      const logsRes = await fetch(`/api/logs-view?appId=${filter.appId}&level=${filter.level}&type=${filter.type}`);
      const logsData = await logsRes.json();
      if (logsData.success) setLogs(logsData.data);

      const appsRes = await fetch('/api/apps-view');
      const appsData = await appsRes.json();
      if (appsData.success) setApps(appsData.data);
    } catch (err) {
      console.error('Failed to fetch data', err);
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
      const interval = setInterval(fetchData, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, filter]);

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
            <button className={activeTab === 'heartbeats' ? 'active' : ''} onClick={() => setActiveTab('heartbeats')}>Heartbeats</button>
            <button className={activeTab === 'apps' ? 'active' : ''} onClick={() => setActiveTab('apps')}>Apps</button>
          </nav>
        </div>
        <button className="logout-btn" onClick={() => {
          localStorage.removeItem('logManagerAuth');
          setIsLoggedIn(false);
        }}>Logout</button>
      </header>

      <main>
        {activeTab === 'logs' && (
          <section className="logs-section">
            <div className="filters">
              <input 
                placeholder="App ID" 
                value={filter.appId} 
                onChange={(e) => setFilter({...filter, appId: e.target.value})} 
              />
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
            </div>
            <table className="logs-table">
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

        {activeTab === 'heartbeats' && (
          <section className="heartbeats-section">
            <table className="apps-table">
              <thead>
                <tr>
                  <th>App Name</th>
                  <th>App ID</th>
                  <th>Last Heartbeat</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((app, i) => (
                  <tr key={i}>
                    <td>{app.name}</td>
                    <td>{app.appId}</td>
                    <td>{app.lastHeartbeat ? new Date(app.lastHeartbeat).toLocaleString() : 'Never'}</td>
                    <td>
                      <span className={`status-badge ${app.status?.toLowerCase()}`}>
                        {app.status || 'UNKNOWN'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {activeTab === 'apps' && (
          <section className="apps-mgmt">
            <h2>App Management</h2>
            <p>Register new applications and manage API keys here.</p>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
