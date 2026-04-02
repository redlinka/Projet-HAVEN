import { useEffect, useState } from "react";
import "../styles/components/history.css";

interface GameEntry {
  _id: string;
  game: string;
  mode: string;
  difficulty: string;
  points: number;
  playedAt: string;
  expiresAt: string;
  used: boolean;
}

export default function History() {
  const [history, setHistory] = useState<GameEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sessionToken');
    if (!token) {
      setLoading(false);
      return;
    }

  
    fetch('/api-node/history', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
  
    .then(response => {
      if (!response.ok) throw new Error("Auth failed");
      return response.json();
    })
  
    .then(data => {
      setHistory(Array.isArray(data) ? [...data].reverse() : []);
      setLoading(false);
    })
    
    .catch(err => {
      console.error("History Fetch Error:", err);
      setLoading(false);
    });
  }, []);

  const totalEarned = history.reduce((acc, curr) => acc + curr.points, 0);
  const totalRemaining = history.reduce((acc, curr) => {
    const isExpired = new Date() > new Date(curr.expiresAt);
    return (!curr.used && !isExpired) ? acc + curr.points : acc;
  }, 0);

  return (
    <div className="history-page">
      <div className="history-header">
        <h1 className="history-title">Game History</h1>
        <div className="history-subtitle">Track your performance and rewards</div>
        
        {!loading && history.length > 0 && (
          <div className="history-stats">
            <div className="stat-item">
              <span className="stat-label">TOTAL EARNED</span>
              <span className="stat-value">{totalEarned} <small>PTS</small></span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item highlight">
              <span className="stat-label">AVAILABLE TO USE</span>
              <span className="stat-value">{totalRemaining} <small>PTS</small></span>
            </div>
          </div>
        )}
      </div>

      <div className="history-list">
        {loading ? (
          <div className="status-msg">Loading sessions...</div>
        ) : history.length === 0 ? (
          <div className="status-msg">No games recorded yet.</div>
        ) : (
          history.map((item) => {
            const isExpired = new Date() > new Date(item.expiresAt);
            const isDone = item.used || isExpired;

            return (
              <div key={item._id} className={`history-card ${isDone ? 'is-disabled' : 'is-active'}`}>
                <div className="card-left">
                  <span className="game-name">{item.game}</span>
                  <div className="game-details">
                    <span className="detail-tag">MODE: <b>{item.mode}</b></span>
                    <span className="detail-tag">DIFF: <b>{item.difficulty}</b></span>
                  </div>
                  <span className="game-date">
                    {new Date(item.playedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="card-right">
                  <div className="points-container">
                    <span className="points-nb">{item.points}</span>
                    <span className="points-unit">PTS</span>
                  </div>
                  {isDone && <span className="status-label">{item.used ? 'USED' : 'EXPIRED'}</span>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}