import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import './KebeleReports.css';
import StandardizedExcelReport from '../Common/StandardizedExcelReport';

const KebeleReports = ({ onReportGenerated }) => {
  const { t } = useTranslation();
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

      const reportTitle = reportType === 'daily' ? t('daily') : reportType === 'weekly' ? t('weekly') : reportType === 'monthly' ? t('monthly') : t('quarterly');
      toast.success(`${reportTitle} ${t('report_generated_successfully').toLowerCase()}`);
      onReportGenerated();
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(t('failed_to_generate_report'));
      setGeneratedReport(null);
    } finally {
      setGenerating(false);
    }
  };

  const sendToWoreda = async () => {
    if (!generatedReport) {
      toast.error(t('no_report_to_send'));
      return;
    }

    try {
      setGenerating(true);
      const token = localStorage.getItem('token');

      const reportData = {
        reportType: reportType,
        reportLevel: 'kebele',
        period: period,
        reportData: generatedReport.content,
        notes: `Kebele report for ${period.startDate} to ${period.endDate}`
      };

      const response = await axios.post(
        `${API_URL}/report-transmission/send`,
        reportData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.status === 'success') {
        toast.success(t('report_sent_to_woreda'));
        setGeneratedReport(null);
        onReportGenerated();
      } else {
        toast.error(t('failed_to_send_report'));
      }
    } catch (error) {
      console.error('Error sending report to woreda:', error);
      toast.error(error.response?.data?.message || t('failed_to_send_report_woreda'));
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = () => {
    const element = document.createElement("a");
    const file = new Blob([JSON.stringify(generatedReport, null, 2)], { type: 'application/json' });
    element.href = URL.createObjectURL(file);
    element.download = `${reportType}-kebele-report.json`;
    document.body.appendChild(element);
    element.click();
    toast.success(t('report_downloaded'));
  };

  const printReport = () => {
    window.print();
    toast.success(t('report_sent_to_printer'));
  };

  return (
    <div className="kebele-reports">
      <div className="reports-header">
        <h3>📈 {t('generate_kebele_reports')}</h3>
        <p className="subtitle">{t('create_manage_kebele_reports_desc')}</p>
      </div>

      <StandardizedExcelReport />

      <div className="report-controls">
        <div className="control-section">
          <h4>{t('select_report_type')}</h4>
          <div className="report-type-options">
            <button
              className={`type-option ${reportType === 'daily' ? 'selected' : ''}`}
              onClick={() => setReportType('daily')}
            >
              📅 {t('daily_report')}
              <span className="option-desc">{t('summary_of_today_events')}</span>
            </button>
            <button
              className={`type-option ${reportType === 'weekly' ? 'selected' : ''}`}
              onClick={() => setReportType('weekly')}
            >
              📆 {t('weekly_report')}
              <span className="option-desc">{t('weekly_summary_trends')}</span>
            </button>
            <button
              className={`type-option ${reportType === 'monthly' ? 'selected' : ''}`}
              onClick={() => setReportType('monthly')}
            >
              📊 {t('monthly_report')}
              <span className="option-desc">{t('comprehensive_monthly_analysis')}</span>
            </button>
            <button
              className={`type-option ${reportType === 'quarterly' ? 'selected' : ''}`}
              onClick={() => setReportType('quarterly')}
            >
              📈 {t('quarterly_report')}
              <span className="option-desc">{t('quarterly_performance_review')}</span>
            </button>
          </div>
        </div>

        <div className="control-section">
          <h4>{t('select_period')}</h4>
          <div className="period-selector">
            <div className="date-input">
              <label>{t('start_date')}</label>
              <input
                type="date"
                value={period.startDate}
                onChange={(e) => setPeriod(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className="date-input">
              <label>{t('end_date')}</label>
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
                {t('last_7_days')}
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
                {t('last_30_days')}
              </button>
              <button onClick={() => {
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                setPeriod({
                  startDate: firstDay.toISOString().split('T')[0],
                  endDate: today.toISOString().split('T')[0]
                });
              }} className="quick-btn">
                {t('this_month')}
              </button>
            </div>
          </div>
        </div>

        <div className="control-section">
          <h4>{t('report_options')}</h4>
          <div className="report-options">
            <label className="option-checkbox">
              <input type="checkbox" defaultChecked />
              <span>{t('include_detailed_event_breakdown')}</span>
            </label>
            <label className="option-checkbox">
              <input type="checkbox" defaultChecked />
              <span>{t('include_approval_rejection_analysis')}</span>
            </label>
            <label className="option-checkbox">
              <input type="checkbox" />
              <span>{t('include_citizen_demographic_data')}</span>
            </label>
            <label className="option-checkbox">
              <input type="checkbox" defaultChecked />
              <span>{t('include_recommendations')}</span>
            </label>
          </div>
        </div>

        <button
          onClick={generateReport}
          disabled={generating}
          className="generate-report-btn"
        >
          {generating ? `🔄 ${t('generating_report')}...` : `🚀 ${t('generate_report')}`}
        </button>
      </div>

      {generatedReport && (
        <div className="report-preview">
          <div className="preview-header">
            <h4>📋 {t('report_preview')}</h4>
            <div className="preview-actions">
              <button onClick={downloadReport} className="action-btn download">
                📥 {t('download')}
              </button>
              <button onClick={printReport} className="action-btn print">
                🖨️ {t('print')}
              </button>
              <button onClick={sendToWoreda} className="action-btn send">
                📤 {t('send_to_woreda')}
              </button>
            </div>
          </div>

          <div className="report-content">
            <div className="report-header">
              <h2>{generatedReport.title}</h2>
              <p className="report-period">
                {t('period')}: {new Date(generatedReport.period.startDate).toLocaleDateString()} - {new Date(generatedReport.period.endDate).toLocaleDateString()}
              </p>
              <p className="report-meta">
                {t('generated_on')}: {new Date().toLocaleDateString()} | {t('kebele')}: [{t('your_kebele_name')}]
              </p>
            </div>

            <div className="executive-summary">
              <h3>{t('executive_summary')}</h3>
              <div className="summary-cards">
                <div className="summary-card">
                  <h4>{t('total_events')}</h4>
                  <h2>{generatedReport.content.totalEvents}</h2>
                </div>
                <div className="summary-card">
                  <h4>{t('approval_rate')}</h4>
                  <h2>{generatedReport.content.approvalRate}</h2>
                </div>
                <div className="summary-card">
                  <h4>{t('avg_processing_time')}</h4>
                  <h2>{generatedReport.content.processingTime}</h2>
                </div>
                <div className="summary-card">
                  <h4>{t('pending_review')}</h4>
                  <h2>{generatedReport.content.eventsByStatus?.pending || 0}</h2>
                </div>
              </div>
            </div>

            <div className="detailed-analysis">
              <h3>{t('detailed_analysis')}</h3>

              <div className="analysis-section">
                <h4>{t('events_by_type')}</h4>
                <div className="type-analysis">
                  {Object.entries(generatedReport.content.eventsByType || {}).map(([type, count]) => (
                    <div key={type} className="type-item">
                      <div className="type-name">{t(type.toLowerCase()).toUpperCase()}</div>
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
                <h4>{t('events_by_status')}</h4>
                <div className="status-analysis">
                  {Object.entries(generatedReport.content.eventsByStatus || {}).map(([status, count]) => (
                    <div key={status} className="status-item">
                      <div className="status-name">{t(status.toLowerCase()).toUpperCase()}</div>
                      <div className="status-count">{count}</div>
                      <div className="status-percentage">
                        {Math.round((count / generatedReport.content.totalEvents) * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="analysis-section">
                <h4>{t('key_insights')}</h4>
                <ul className="insights-list">
                  <li>
                    ✅ <strong>{t('high_approval_rate')}</strong> {t('most_events_approved_first_submission')}
                  </li>
                  <li>
                    ⏳ <strong>{t('processing_time_key')}</strong> {t('avg_review_time_acceptable')}
                  </li>
                  <li>
                    📈 <strong>{t('trend')}</strong> {generatedReport.type === 'monthly' ? t('monthly') : t('weekly')} {t('events_consistent_patterns')}
                  </li>
                  <li>
                    💡 <strong>{t('recommendation')}</strong> {t('consider_outreach_under_registered')}
                  </li>
                </ul>
              </div>

              {generatedReport.content.details && generatedReport.content.details.length > 0 && (
                <div className="analysis-section">
                  <h4>📜 {t('registrant_details_list') || 'Registrant Details List'}</h4>
                  <div style={{ overflowX: 'auto', marginTop: '15px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                          <th style={{ padding: '12px', textAlign: 'left' }}>{t('full_name')}</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>{t('event_type')}</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>{t('date')}</th>
                          <th style={{ padding: '12px', textAlign: 'left' }}>{t('certificate_no')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generatedReport.content.details.map((d, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px', fontWeight: '600' }}>{d.fullName}</td>
                            <td style={{ padding: '12px' }}><span className={`type-tag ${d.eventType?.toLowerCase()}`}>{d.eventType}</span></td>
                            <td style={{ padding: '12px' }}>{new Date(d.registrationDate).toLocaleDateString()}</td>
                            <td style={{ padding: '12px', fontFamily: 'monospace' }}>{d.certificateNo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="report-footer">
              <div className="signature">
                <p>{t('prepared_by')}</p>
                <div className="signature-line"></div>
                <p>{t('kebele_representative')}</p>
              </div>
              <div className="report-notes">
                <p><strong>{t('notes')}</strong></p>
                <p>• {t('report_generated_automatically')}</p>
                <p>• {t('data_accurate_as_of_date')}</p>
                <p>• {t('for_questions_contact_kebele')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="reports-guidelines">
        <h4>📋 {t('reporting_guidelines')}</h4>
        <div className="guidelines-content">
          <div className="guideline">
            <h5>✅ {t('report_frequency')}</h5>
            <ul>
              <li><strong>{t('daily_reports_label')}</strong> {t('daily_monitoring_desc')}</li>
              <li><strong>{t('weekly_reports_label')}</strong> {t('woreda_coordination_desc')}</li>
              <li><strong>{t('monthly_reports_label')}</strong> {t('official_records_desc')}</li>
              <li><strong>{t('quarterly_reports_label')}</strong> {t('performance_review_desc')}</li>
            </ul>
          </div>
          <div className="guideline">
            <h5>⚠️ {t('important_notes')}</h5>
            <ul>
              <li>{t('ensure_data_accuracy')}</li>
              <li>{t('send_reports_promptly')}</li>
              <li>{t('keep_copies_reports')}</li>
              <li>{t('use_reports_planning')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KebeleReports;