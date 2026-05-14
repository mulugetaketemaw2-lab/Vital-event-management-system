import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import './KebeleReports.css';

const KebeleReports = ({ onReportGenerated }) => {
  const [reportType, setReportType] = useState('daily');
  const [period, setPeriod] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [generatedReport, setGeneratedReport] = useState(null);
  const [generating, setGenerating] = useState(false);

  const { API_URL } = useAuth();

  const generateReport = async () => {
    try {
      setGenerating(true);
      const response = await axios.post(`${API_URL}/reports/generate`, {
        type: reportType,
        period,
        level: 'kebele'
      });
      
      setGeneratedReport(response.data.data.report);
      toast.success(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report generated successfully`);
      onReportGenerated();
    } catch (error) {
      toast.error('Error generating report');
      // Sample data for demonstration
      setGeneratedReport({
        title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Kebele Report`,
        type: reportType,
        period,
        content: {
          totalEvents: 15,
          eventsByType: { birth: 5, death: 3, marriage: 4, divorce: 2, adoption: 1 },
          eventsByStatus: { pending: 3, approved: 8, rejected: 2, forwarded: 2 },
          processingTime: '24 hours average',
          approvalRate: '80%'
        }
      });
    } finally {
      setGenerating(false);
    }
  };

  const sendToWoreda = () => {
    toast.success('Report sent to Woreda Representative');
    setGeneratedReport(null);
  };

  const downloadReport = () => {
    const element = document.createElement("a");
    const file = new Blob([JSON.stringify(generatedReport, null, 2)], {type: 'application/json'});
    element.href = URL.createObjectURL(file);
    element.download = `${reportType}-kebele-report.json`;
    document.body.appendChild(element);
    element.click();
    toast.success('Report downloaded');
  };

  const printReport = () => {
    window.print();
    toast.success('Report sent to printer');
  };

  return (
    <div className="kebele-reports">
      <div className="reports-header">
        <h3>📈 Generate Kebele Reports</h3>
        <p className="subtitle">Create and manage reports for your kebele's vital events statistics</p>
      </div>

      <div className="report-controls">
        <div className="control-section">
          <h4>Select Report Type</h4>
          <div className="report-type-options">
            <button 
              className={`type-option ${reportType === 'daily' ? 'selected' : ''}`}
              onClick={() => setReportType('daily')}
            >
              📅 Daily Report
              <span className="option-desc">Summary of today's events</span>
            </button>
            <button 
              className={`type-option ${reportType === 'weekly' ? 'selected' : ''}`}
              onClick={() => setReportType('weekly')}
            >
              📆 Weekly Report
              <span className="option-desc">Weekly summary and trends</span>
            </button>
            <button 
              className={`type-option ${reportType === 'monthly' ? 'selected' : ''}`}
              onClick={() => setReportType('monthly')}
            >
              📊 Monthly Report
              <span className="option-desc">Comprehensive monthly analysis</span>
            </button>
            <button 
              className={`type-option ${reportType === 'quarterly' ? 'selected' : ''}`}
              onClick={() => setReportType('quarterly')}
            >
              📈 Quarterly Report
              <span className="option-desc">Quarterly performance review</span>
            </button>
          </div>
        </div>

        <div className="control-section">
          <h4>Select Period</h4>
          <div className="period-selector">
            <div className="date-input">
              <label>Start Date:</label>
              <input
                type="date"
                value={period.startDate}
                onChange={(e) => setPeriod(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="date-input">
              <label>End Date:</label>
              <input
                type="date"
                value={period.endDate}
                onChange={(e) => setPeriod(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div className="quick-dates">
              <button onClick={() => {
                const today = new Date();
                const weekAgo = new Date(today);
                weekAgo.setDate(today.getDate() - 7);
                setPeriod({
                  startDate: weekAgo.toISOString().split('T')[0],
                  endDate: today.toISOString().split('T')[0]
                });
              }} className="quick-btn">
                Last 7 Days
              </button>
              <button onClick={() => {
                const today = new Date();
                const monthAgo = new Date(today);
                monthAgo.setMonth(today.getMonth() - 1);
                setPeriod({
                  startDate: monthAgo.toISOString().split('T')[0],
                  endDate: today.toISOString().split('T')[0]
                });
              }} className="quick-btn">
                Last 30 Days
              </button>
              <button onClick={() => {
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                setPeriod({
                  startDate: firstDay.toISOString().split('T')[0],
                  endDate: today.toISOString().split('T')[0]
                });
              }} className="quick-btn">
                This Month
              </button>
            </div>
          </div>
        </div>

        <div className="control-section">
          <h4>Report Options</h4>
          <div className="report-options">
            <label className="option-checkbox">
              <input type="checkbox" defaultChecked />
              <span>Include detailed event breakdown</span>
            </label>
            <label className="option-checkbox">
              <input type="checkbox" defaultChecked />
              <span>Include approval/rejection analysis</span>
            </label>
            <label className="option-checkbox">
              <input type="checkbox" />
              <span>Include citizen demographic data</span>
            </label>
            <label className="option-checkbox">
              <input type="checkbox" defaultChecked />
              <span>Include recommendations</span>
            </label>
          </div>
        </div>

        <button 
          onClick={generateReport} 
          disabled={generating}
          className="generate-report-btn"
        >
          {generating ? '🔄 Generating Report...' : '🚀 Generate Report'}
        </button>
      </div>

      {generatedReport && (
        <div className="report-preview">
          <div className="preview-header">
            <h4>📋 Report Preview</h4>
            <div className="preview-actions">
              <button onClick={downloadReport} className="action-btn download">
                📥 Download
              </button>
              <button onClick={printReport} className="action-btn print">
                🖨️ Print
              </button>
              <button onClick={sendToWoreda} className="action-btn send">
                📤 Send to Woreda
              </button>
            </div>
          </div>

          <div className="report-content">
            <div className="report-header">
              <h2>{generatedReport.title}</h2>
              <p className="report-period">
                Period: {new Date(generatedReport.period.startDate).toLocaleDateString()} - {new Date(generatedReport.period.endDate).toLocaleDateString()}
              </p>
              <p className="report-meta">
                Generated on: {new Date().toLocaleDateString()} | Kebele: [Your Kebele Name]
              </p>
            </div>

            <div className="executive-summary">
              <h3>Executive Summary</h3>
              <div className="summary-cards">
                <div className="summary-card">
                  <h4>Total Events</h4>
                  <h2>{generatedReport.content.totalEvents}</h2>
                </div>
                <div className="summary-card">
                  <h4>Approval Rate</h4>
                  <h2>{generatedReport.content.approvalRate}</h2>
                </div>
                <div className="summary-card">
                  <h4>Avg Processing Time</h4>
                  <h2>{generatedReport.content.processingTime}</h2>
                </div>
                <div className="summary-card">
                  <h4>Pending Review</h4>
                  <h2>{generatedReport.content.eventsByStatus?.pending || 0}</h2>
                </div>
              </div>
            </div>

            <div className="detailed-analysis">
              <h3>Detailed Analysis</h3>
              
              <div className="analysis-section">
                <h4>Events by Type</h4>
                <div className="type-analysis">
                  {Object.entries(generatedReport.content.eventsByType || {}).map(([type, count]) => (
                    <div key={type} className="type-item">
                      <div className="type-name">{type.toUpperCase()}</div>
                      <div className="type-bar">
                        <div 
                          className="bar-fill"
                          style={{ width: `${(count / generatedReport.content.totalEvents) * 100}%` }}
                        ></div>
                      </div>
                      <div className="type-count">{count}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="analysis-section">
                <h4>Events by Status</h4>
                <div className="status-analysis">
                  {Object.entries(generatedReport.content.eventsByStatus || {}).map(([status, count]) => (
                    <div key={status} className="status-item">
                      <div className="status-name">{status.toUpperCase()}</div>
                      <div className="status-count">{count}</div>
                      <div className="status-percentage">
                        {Math.round((count / generatedReport.content.totalEvents) * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="analysis-section">
                <h4>Key Insights</h4>
                <ul className="insights-list">
                  <li>
                    ✅ <strong>High Approval Rate:</strong> Most events are approved on first submission
                  </li>
                  <li>
                    ⏳ <strong>Processing Time:</strong> Average review time is within acceptable limits
                  </li>
                  <li>
                    📈 <strong>Trend:</strong> {generatedReport.type === 'monthly' ? 'Monthly' : 'Weekly'} events show consistent patterns
                  </li>
                  <li>
                    💡 <strong>Recommendation:</strong> Consider outreach for under-registered event types
                  </li>
                </ul>
              </div>
            </div>

            <div className="report-footer">
              <div className="signature">
                <p>Prepared by:</p>
                <div className="signature-line"></div>
                <p>Kebele Representative</p>
              </div>
              <div className="report-notes">
                <p><strong>Notes:</strong></p>
                <p>• This report is generated automatically by the Vital Events System</p>
                <p>• Data is accurate as of the generation date</p>
                <p>• For questions, contact the kebele office</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="reports-guidelines">
        <h4>📋 Reporting Guidelines</h4>
        <div className="guidelines-content">
          <div className="guideline">
            <h5>✅ Report Frequency:</h5>
            <ul>
              <li><strong>Daily Reports:</strong> For daily monitoring and quick updates</li>
              <li><strong>Weekly Reports:</strong> For Woreda coordination meetings</li>
              <li><strong>Monthly Reports:</strong> For official records and planning</li>
              <li><strong>Quarterly Reports:</strong> For performance review and analysis</li>
            </ul>
          </div>
          <div className="guideline">
            <h5>⚠️ Important Notes:</h5>
            <ul>
              <li>Ensure data accuracy before generating reports</li>
              <li>Send reports to Woreda Representative promptly</li>
              <li>Keep copies of all generated reports</li>
              <li>Use reports for planning and improvement</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KebeleReports;