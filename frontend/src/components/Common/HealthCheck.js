import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const HealthCheck = () => {
  const [healthStatus, setHealthStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const { API_URL } = useAuth();

  const checkHealth = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/health');
      setHealthStatus({
        status: 'success',
        data: response.data
      });
    } catch (error) {
      setHealthStatus({
        status: 'error',
        message: error.response?.data?.message || error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '1rem', border: '1px solid #ccc', margin: '1rem 0' }}>
      <h3>API Health Check</h3>
      <button onClick={checkHealth} disabled={loading}>
        {loading ? 'Checking...' : 'Check API Health'}
      </button>
      
      {healthStatus && (
        <div style={{ marginTop: '1rem' }}>
          {healthStatus.status === 'success' ? (
            <div style={{ color: 'green' }}>
              <strong>✅ API is healthy</strong>
              <pre>{JSON.stringify(healthStatus.data, null, 2)}</pre>
            </div>
          ) : (
            <div style={{ color: 'red' }}>
              <strong>❌ API Error:</strong> {healthStatus.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HealthCheck;