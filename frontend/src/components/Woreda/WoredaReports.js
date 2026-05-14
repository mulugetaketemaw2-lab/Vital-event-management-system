import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';
import './WoredaReports.css';
import StandardizedExcelReport from '../Common/StandardizedExcelReport';

const WoredaReports = () => {
  const { t } = useTranslation();
  const [reportType, setReportType] = useState('daily');
  const [period, setPeriod] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportOptions, setReportOptions] = useState({
    includeDetailedBreakdown: true,
    includeApprovalAnalysis: true,
    includeDemographicData: true,
    includeRecommendations: true
  });
  const [generatedReport, setGeneratedReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [overviewData, setOverviewData] = useState(null);

  const { currentUser, API_URL } = useAuth();

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const fetchOverviewData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error(t('token_not_found_login_again'));
        return;
      }

      console.log('Fetching woreda overview data...');
      const response = await axios.get(`${API_URL}/auth/woreda/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Overview data response:', response.data);
      setOverviewData(response.data.data);
    } catch (error) {
      console.error('Error fetching overview data:', error);

      if (error.response) {
        console.error('Error response:', error.response.data);
        toast.error(error.response.data.message || t('failed_load_overview_data'));
      } else if (error.request) {
        console.error('No response received:', error.request);
        toast.error(t('network_error_check_connection'));
      } else {
        console.error('Error:', error.message);
        toast.error(t('failed_load_overview_data'));
      }
    }
  };

  const generateReport = async () => {
    try {
      setGenerating(true);
      const token = localStorage.getItem('token');

      if (!token) {
        toast.error(t('token_not_found_login_again'));
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
      } catch (e) {
        toast.error(t('token_not_found_login_again'));
        return;
      }

      const response = await axios.post(`${API_URL}/auth/woreda/generate-report`, {
        reportType: 'all',
        startDate: period.startDate,
        endDate: period.endDate,
        format: 'json',
        options: reportOptions
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const reportTitle = reportType === 'daily' ? t('daily') : reportType === 'weekly' ? t('weekly') : reportType === 'monthly' ? t('monthly') : t('quarterly');

      const reportData = {
        title: `${reportTitle} ${t('woreda_report')}`,
        type: reportType,
        period,
        generatedOn: new Date().toLocaleDateString(),
        woreda: currentUser?.location?.woredaName || t('woreda'),
        content: {
          totalEvents: response.data.data.events?.total || 0,
          totalCitizens: response.data.data.citizens?.total || 0,
          eventsByType: response.data.data.events?.byType || {},
          eventsByStatus: {
            pending: 0,
            approved: response.data.data.events?.completed || 0,
            rejected: response.data.data.events?.rejected || 0,
            forwarded: 0
          },
          citizensByStatus: {
            pending: 0,
            approved: response.data.data.citizens?.approved || 0,
            rejected: response.data.data.citizens?.rejected || 0,
            verified: response.data.data.citizens?.verified || 0
          },
          processingTime: t('24_hours_average'),
          approvalRate: response.data.data.events?.total > 0 ?
            Math.round((response.data.data.events.completed / response.data.data.events.total) * 100) + '%' : '0%',
          byKebele: response.data.data.events?.byKebele || {},
          citizensByKebele: response.data.data.citizens?.byKebele || {},
          details: response.data.data.events?.details || []
        }
      };

      setGeneratedReport(reportData);
      toast.success(t('report_generated_successfully'));
    } catch (error) {
      console.error('Detailed error generating report:', error);
      toast.error(t('error_generating_report'));
      setGeneratedReport(null);
    } finally {
      setGenerating(false);
    }
  };

  const sendToZone = async () => {
    if (!generatedReport) {
      toast.error(t('no_report_data_to_send'));
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error(t('token_not_found_login_again'));
        return;
      }

      const reportData = {
        reportType: generatedReport.type,
        reportLevel: 'woreda',
        period: generatedReport.period,
        reportData: {
          citizens: generatedReport.content.citizensByStatus ? {
            total: generatedReport.content.totalCitizens,
            approved: generatedReport.content.citizensByStatus.approved,
            rejected: generatedReport.content.citizensByStatus.rejected,
            verified: generatedReport.content.citizensByStatus.verified,
            byKebele: generatedReport.content.citizensByKebele || {}
          } : {},
          events: generatedReport.content.eventsByStatus ? {
            total: generatedReport.content.totalEvents,
            completed: generatedReport.content.eventsByStatus.approved,
            rejected: generatedReport.content.eventsByStatus.rejected,
            byType: generatedReport.content.eventsByType || {},
            byStatus: generatedReport.content.eventsByStatus,
            byKebele: generatedReport.content.eventsByKebele || {}
          } : {}
        },
        notes: `Woreda ${generatedReport.type} report for period ${generatedReport.period.startDate} - ${generatedReport.period.endDate}`
      };

      const response = await axios.post(
        `${API_URL}/report-transmission/send`,
        reportData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success(`${t('report_sent_to_zone')} ${response.data.data.reportId}`);
    } catch (error) {
      console.error('Error sending report to zone:', error);
      toast.error(t('failed_to_send_report_zone'));
    }
  };

  const downloadReport = () => {
    const reportText = formatReportForDownload();
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-woreda-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success(t('report_downloaded_successfully'));
  };

  const printReport = () => {
    window.print();
    toast.success(t('print_dialog_opened'));
  };

  const formatReportForDownload = () => {
    if (!generatedReport) return '';

    let report = `${generatedReport.title}\n`;
    report += `${t('period')}: ${generatedReport.period.startDate} - ${generatedReport.period.endDate}\n`;
    report += `${t('generated_on')}: ${generatedReport.generatedOn} | ${t('woreda')}: ${generatedReport.woreda}\n\n`;

    report += `${t('executive_summary').toUpperCase()}\n`;
    report += `${t('total_events')}: ${generatedReport.content.totalEvents}\n`;
    report += `${t('total_citizens')}: ${generatedReport.content.totalCitizens}\n`;
    report += `${t('approval_rate')}: ${generatedReport.content.approvalRate}\n`;
    report += `${t('avg_processing_time')}: ${generatedReport.content.processingTime}\n\n`;

    report += `${t('detailed_analysis').toUpperCase()}\n`;
    report += `${t('events_by_type')}:\n`;
    Object.entries(generatedReport.content.eventsByType).forEach(([type, count]) => {
      report += `  ${t(type.toLowerCase())}: ${count}\n`;
    });

    report += `\n${t('events_by_status')}:\n`;
    Object.entries(generatedReport.content.eventsByStatus).forEach(([status, count]) => {
      report += `  ${t(status.toLowerCase())}: ${count}\n`;
    });

    report += `\n${t('by_kebele')}:\n`;
    Object.entries(generatedReport.content.byKebele).forEach(([kebele, count]) => {
      report += `  ${kebele}: ${count} ${t('events').toLowerCase()}\n`;
    });

    return report;
  };

  const setQuickPeriod = (days) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    setPeriod({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
  };

  const resetReport = () => {
    setGeneratedReport(null);
    setReportType('daily');
    setPeriod({
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    });
  };

  if (generatedReport) {
    return (
      <div className="woreda-reports-container">
        <div className="report-preview-header">
          <h2>📋 {t('report_preview')}</h2>
          <div className="report-actions">
            <button onClick={resetReport} className="back-btn">
              ← {t('back_to_generator')}
            </button>
            <button onClick={downloadReport} className="download-btn">
              📥 {t('download')}
            </button>
            <button onClick={printReport} className="print-btn">
              🖨️ {t('print')}
            </button>
            <button onClick={sendToZone} className="send-btn">
              📤 {t('send_to_zone')}
            </button>
          </div>
        </div>

        <div className="report-preview-content">
          <div className="report-header">
            <h3>{generatedReport.title}</h3>
            <p><strong>{t('period')}:</strong> {generatedReport.period.startDate} - {generatedReport.period.endDate}</p>
            <p><strong>{t('generated_on')}:</strong> {generatedReport.generatedOn} | <strong>{t('woreda')}:</strong> {generatedReport.woreda}</p>
          </div>

          <div className="executive-summary">
            <h4>{t('executive_summary')}</h4>
            <div className="summary-grid">
              <div className="summary-item">
                <h5>{generatedReport.content.totalEvents}</h5>
                <p>{t('total_events')}</p>
              </div>
              <div className="summary-item">
                <h5>{generatedReport.content.totalCitizens}</h5>
                <p>{t('total_citizens')}</p>
              </div>
              <div className="summary-item">
                <h5>{generatedReport.content.approvalRate}</h5>
                <p>{t('approval_rate')}</p>
              </div>
              <div className="summary-item">
                <h5>{generatedReport.content.processingTime}</h5>
                <p>{t('avg_processing_time')}</p>
              </div>
            </div>
          </div>

          <div className="detailed-analysis">
            <h4>{t('detailed_analysis')}</h4>

            <div className="analysis-section">
              <h5>{t('events_by_type')}</h5>
              <div className="data-grid">
                {Object.entries(generatedReport.content.eventsByType).map(([type, count]) => (
                  <div key={type} className="data-item">
                    <span className="data-label">{t(type.toLowerCase())}:</span>
                    <span className="data-value">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="analysis-section">
              <h5>{t('events_by_status')}</h5>
              <div className="data-grid">
                {Object.entries(generatedReport.content.eventsByStatus).map(([status, count]) => (
                  <div key={status} className="data-item">
                    <span className="data-label">{t(status.toLowerCase())}:</span>
                    <span className="data-value">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="analysis-section">
              <h5>{t('by_kebele')}</h5>
              <div className="data-grid">
                {Object.entries(generatedReport.content.byKebele).map(([kebele, count]) => (
                  <div key={kebele} className="data-item">
                    <span className="data-label">{kebele}:</span>
                    <span className="data-value">{count} {t('events').toLowerCase()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="key-insights">
            <h4>{t('key_insights')}</h4>
            <div className="insights-list">
              <div className="insight-item">
                <span className="insight-icon">✅</span>
                <div>
                  <strong>{t('high_approval_rate')}</strong>
                  <p>{t('most_events_approved_first_submission')}</p>
                </div>
              </div>
              <div className="insight-item">
                <span className="insight-icon">⏳</span>
                <div>
                  <strong>{t('processing_time_key')}</strong>
                  <p>{t('avg_review_time_acceptable')}</p>
                </div>
              </div>
              <div className="insight-item">
                <span className="insight-icon">📈</span>
                <div>
                  <strong>{t('trend')}</strong>
                  <p>{t('weekly_events_consistent_patterns')}</p>
                </div>
              </div>
              <div className="insight-item">
                <span className="insight-icon">💡</span>
                <div>
                  <strong>{t('recommendation')}</strong>
                  <p>{t('consider_outreach_under_registered')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="report-footer">
            <p><strong>{t('prepared_by')}:</strong> {t('woreda_representative')}</p>
            <div className="report-notes">
              <p><strong>{t('notes')}</strong></p>
              <ul>
                <li>{t('report_generated_automatically')}</li>
                <li>{t('data_accurate_as_of_date')}</li>
                <li>{t('for_questions_contact_woreda')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="woreda-reports-container">
      <div className="reports-header">
        <h2>📈 {t('generate_woreda_reports')}</h2>
        <p>{t('create_manage_woreda_reports_desc')}</p>
      </div>

      <StandardizedExcelReport />

      {overviewData && (
        <div className="overview-section">
          <h3>📈 {t('current_overview')}</h3>
          <div className="overview-stats">
            <div className="overview-stat">
              <h4>{overviewData.stats.citizens.total}</h4>
              <p>{t('total_citizens')}</p>
              <small>{overviewData.stats.citizens.pending} {t('pending').toLowerCase()}</small>
            </div>
            <div className="overview-stat">
              <h4>{overviewData.stats.events.total}</h4>
              <p>{t('total_events')}</p>
              <small>{overviewData.stats.events.pending} {t('pending').toLowerCase()}</small>
            </div>
            <div className="overview-stat">
              <h4>{overviewData.stats.citizens.approved}</h4>
              <p>{t('approved_citizens')}</p>
            </div>
            <div className="overview-stat">
              <h4>{overviewData.stats.events.approved}</h4>
              <p>{t('completed_events')}</p>
            </div>
          </div>
        </div>
      )}

      {!overviewData && (
        <div className="overview-section">
          <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
            <p>{t('overview_data_could_not_be_loaded')}</p>
          </div>
        </div>
      )}

      <div className="report-generator">
        <div className="generator-section">
          <h3>{t('select_report_type')}</h3>
          <div className="report-types">
            <label className="report-type-option">
              <input
                type="radio"
                value="daily"
                checked={reportType === 'daily'}
                onChange={(e) => setReportType(e.target.value)}
              />
              <span className="radio-label">📅 {t('daily_report')}</span>
              <span className="radio-description">{t('summary_of_today_events')}</span>
            </label>
            <label className="report-type-option">
              <input
                type="radio"
                value="weekly"
                checked={reportType === 'weekly'}
                onChange={(e) => setReportType(e.target.value)}
              />
              <span className="radio-label">📆 {t('weekly_report')}</span>
              <span className="radio-description">{t('weekly_summary_trends')}</span>
            </label>
            <label className="report-type-option">
              <input
                type="radio"
                value="monthly"
                checked={reportType === 'monthly'}
                onChange={(e) => setReportType(e.target.value)}
              />
              <span className="radio-label">📊 {t('monthly_report')}</span>
              <span className="radio-description">{t('comprehensive_monthly_analysis')}</span>
            </label>
            <label className="report-type-option">
              <input
                type="radio"
                value="quarterly"
                checked={reportType === 'quarterly'}
                onChange={(e) => setReportType(e.target.value)}
              />
              <span className="radio-label">📈 {t('quarterly_report')}</span>
              <span className="radio-description">{t('quarterly_performance_review')}</span>
            </label>
          </div>
        </div>

        <div className="generator-section">
          <h3>{t('select_period')}</h3>
          <div className="period-selection">
            <div className="date-inputs">
              <div className="date-input">
                <label>{t('start_date')}</label>
                <input
                  type="date"
                  value={period.startDate}
                  onChange={(e) => setPeriod({ ...period, startDate: e.target.value })}
                />
              </div>
              <div className="date-input">
                <label>{t('end_date')}</label>
                <input
                  type="date"
                  value={period.endDate}
                  onChange={(e) => setPeriod({ ...period, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="quick-periods">
              <button onClick={() => setQuickPeriod(7)} className="quick-period-btn">{t('last_7_days')}</button>
              <button onClick={() => setQuickPeriod(30)} className="quick-period-btn">{t('last_30_days')}</button>
              <button onClick={() => setQuickPeriod(new Date().getDate() - 1)} className="quick-period-btn">{t('this_month')}</button>
            </div>
          </div>
        </div>

        <div className="generator-section">
          <h3>{t('report_options')}</h3>
          <div className="report-options">
            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={reportOptions.includeDetailedBreakdown}
                onChange={(e) => setReportOptions({ ...reportOptions, includeDetailedBreakdown: e.target.checked })}
              />
              <span>{t('include_detailed_event_breakdown')}</span>
            </label>
            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={reportOptions.includeApprovalAnalysis}
                onChange={(e) => setReportOptions({ ...reportOptions, includeApprovalAnalysis: e.target.checked })}
              />
              <span>{t('include_approval_rejection_analysis')}</span>
            </label>
            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={reportOptions.includeDemographicData}
                onChange={(e) => setReportOptions({ ...reportOptions, includeDemographicData: e.target.checked })}
              />
              <span>{t('include_citizen_demographic_data')}</span>
            </label>
            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={reportOptions.includeRecommendations}
                onChange={(e) => setReportOptions({ ...reportOptions, includeRecommendations: e.target.checked })}
              />
              <span>{t('include_recommendations')}</span>
            </label>
          </div>
        </div>

        <div className="generate-section">
          <button
            onClick={generateReport}
            disabled={generating}
            className="generate-btn"
          >
            {generating ? t('generating') : `🚀 ${t('generate_report')}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WoredaReports;
