import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import './ReportGenerator.css';

const ReportGenerator = ({ level }) => {
  const [reportType, setReportType] = useState('daily');
  const [generatedReport, setGeneratedReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const { API_URL } = useAuth();

  const generateReport = async () => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_URL}/reports/generate`, {
        type: reportType
      });
      
      setGeneratedReport(response.data.data.report);
      toast.success('Report generated successfully');
    } catch (error) {
      toast.error('Error generating report');
    } finally {
      setLoading(false);
    }
  };

  const sendReport = async () => {
    try {
      // In a real app, you would select who to send to
      // For now, we'll send to the next level
      await axios.patch(`${API_URL}/reports/${generatedReport._id}/send`, {
        sentTo: 'next-level-user-id' // This would be dynamic
      });
      
      toast.success('Report sent successfully');
      setGeneratedReport(null);
    } catch (error) {
      toast.error('Error sending report');
    }
  };

  return (
    <div className="report-generator">
      <div className="report-controls">
        <div className="form-group">
          <label>Report Type:</label>
          <select 
            value={reportType} 
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="daily">Daily Report</option>
            <option value="weekly">Weekly Report</option>
            <option value="monthly">Monthly Report</option>
            <option value="yearly">Yearly Report</option>
          </select>
        </div>

        <button 
          onClick={generateReport} 
          disabled={loading}
          className="generate-btn"
        >
          {loading ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      {generatedReport && (
        <div className="report-preview">
          <h3>Report Preview</h3>
          <div className="report-content">
            <p><strong>Title:</strong> {generatedReport.title}</p>
            <p><strong>Type:</strong> {generatedReport.type}</p>
            <p><strong>Period:</strong> {new Date(generatedReport.period.startDate).toLocaleDateString()} - {new Date(generatedReport.period.endDate).toLocaleDateString()}</p>
            
            <div className="report-stats">
              <h4>Statistics:</h4>
              <pre>{JSON.stringify(generatedReport.content, null, 2)}</pre>
            </div>
          </div>

          <button onClick={sendReport} className="send-btn">
            Send to {getNextLevel(level)} Representative
          </button>
        </div>
      )}
    </div>
  );
};

const getNextLevel = (currentLevel) => {
  const levels = {
    kebele: 'Woreda',
    woreda: 'Zone',
    zone: 'Region',
    region: 'National',
    // national: 'System Administrator'
  };
  return levels[currentLevel] || 'Next Level';
};

export default ReportGenerator;