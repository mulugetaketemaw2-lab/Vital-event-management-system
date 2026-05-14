import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import './RegionReports.css';
import StandardizedExcelReport from '../Common/StandardizedExcelReport';

const RegionReports = () => {
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
        toast.error(t('no_auth_token_login'));
        return;
      }

      const response = await axios.get(`${API_URL}/auth/regional/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setOverviewData(response.data.data);
    } catch (error) {
      console.error('Error fetching overview data:', error);
      toast.error(t('failed_to_load_overview_data'));
    }
  };

  const generateReport = async () => {
    try {
      setGenerating(true);
      const token = localStorage.getItem('token');

      const response = await axios.post(`${API_URL}/auth/regional/generate-report`, {
        reportType: 'all',
        startDate: period.startDate,
        endDate: period.endDate,
        format: 'json',
        options: reportOptions
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const reportData = {
        title: `${t(reportType)} ${t('region_report')}`,
        type: reportType,
        period,
        generatedOn: new Date().toLocaleDateString(),
        region: currentUser?.location?.regionName || t('region'),
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
          byZone: response.data.data.events?.byZone || {},
          citizensByZone: response.data.data.citizens?.byZone || {},
          details: response.data.data.events?.details || []
        }
      };

      setGeneratedReport(reportData);
      toast.success(t('report_generated_successfully'));
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(t('error_generating_report'));
      setGeneratedReport(null);
    } finally {
      setGenerating(false);
    }
  };

  const sendToNational = async () => {
    if (!generatedReport) {
      toast.error(t('no_report_data_to_send'));
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error(t('no_auth_token_login'));
        return;
      }

      const reportData = {
        reportType: generatedReport.type,
        reportLevel: 'region',
        period: generatedReport.period,
        reportData: {
          citizens: generatedReport.content.citizensByStatus ? {
            total: generatedReport.content.totalCitizens,
            approved: generatedReport.content.citizensByStatus.approved,
            rejected: generatedReport.content.citizensByStatus.rejected,
            verified: generatedReport.content.citizensByStatus.verified,
            byZone: generatedReport.content.byZone || {}
          } : {},
          events: generatedReport.content.eventsByStatus ? {
            total: generatedReport.content.totalEvents,
            completed: generatedReport.content.eventsByStatus.approved,
            rejected: generatedReport.content.eventsByStatus.rejected,
            byType: generatedReport.content.eventsByType || {},
            byStatus: generatedReport.content.eventsByStatus,
            byZone: generatedReport.content.byZone || {}
          } : {}
        },
        notes: `Regional ${generatedReport.type} report for period ${generatedReport.period.startDate} - ${generatedReport.period.endDate}`
      };

      const response = await axios.post(
        `${API_URL}/report-transmission/send`,
        reportData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success(`${t('report_sent_to_national')} ${response.data.data.reportId}`);
    } catch (error) {
      console.error('Error sending report to national:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error(t('failed_to_send_report_national'));
      }
    }
  };

  const downloadReport = () => {
    const reportText = formatReportForDownload();
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-region-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success(t('report_downloaded_successfully'));
  };

  const downloadExcelReport = () => {
    if (!generatedReport) {
      toast.error(t('no_report_data_available'));
      return;
    }

    try {
      // Create workbook
      const wb = XLSX.utils.book_new();

      // Summary Sheet
      const summaryData = [
        [t('regional_report_summary')],
        [],
        [t('report_title'), generatedReport.title],
        [t('period_label'), `${generatedReport.period.startDate} - ${generatedReport.period.endDate}`],
        [t('generated_on'), generatedReport.generatedOn],
        [t('region'), generatedReport.region],
        [],
        [t('executive_summary')],
        [t('total_events'), generatedReport.content.totalEvents],
        [t('total_citizens'), generatedReport.content.totalCitizens],
        [t('approval_rate'), generatedReport.content.approvalRate],
        [t('avg_processing_time'), generatedReport.content.processingTime]
      ];

      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, t('summary'));

      // Events by Type Sheet
      const eventsByTypeData = [
        [t('events_by_type')],
        [],
        [t('event_type'), t('count'), t('percentage')]
      ];

      const totalEvents = generatedReport.content.totalEvents || 1;
      Object.entries(generatedReport.content.eventsByType).forEach(([type, count]) => {
        const percentage = ((count / totalEvents) * 100).toFixed(1) + '%';
        eventsByTypeData.push([
          t(type),
          count,
          percentage
        ]);
      });

      const eventsByTypeWs = XLSX.utils.aoa_to_sheet(eventsByTypeData);
      XLSX.utils.book_append_sheet(wb, eventsByTypeWs, t('events_by_type'));

      // Events by Status Sheet
      const eventsByStatusData = [
        [t('events_by_status')],
        [],
        [t('status_label'), t('count'), t('percentage')]
      ];

      Object.entries(generatedReport.content.eventsByStatus).forEach(([status, count]) => {
        const percentage = ((count / totalEvents) * 100).toFixed(1) + '%';
        eventsByStatusData.push([
          t(status),
          count,
          percentage
        ]);
      });

      const eventsByStatusWs = XLSX.utils.aoa_to_sheet(eventsByStatusData);
      XLSX.utils.book_append_sheet(wb, eventsByStatusWs, t('events_by_status'));

      // Citizens by Status Sheet
      const citizensByStatusData = [
        [t('citizens_by_status')],
        [],
        [t('status_label'), t('count'), t('percentage')]
      ];

      const totalCitizens = generatedReport.content.totalCitizens || 1;
      Object.entries(generatedReport.content.citizensByStatus).forEach(([status, count]) => {
        const percentage = ((count / totalCitizens) * 100).toFixed(1) + '%';
        citizensByStatusData.push([
          t(status),
          count,
          percentage
        ]);
      });

      const citizensByStatusWs = XLSX.utils.aoa_to_sheet(citizensByStatusData);
      XLSX.utils.book_append_sheet(wb, citizensByStatusWs, t('citizens_by_status'));

      // By Zone Sheet
      if (generatedReport.content.byZone && Object.keys(generatedReport.content.byZone).length > 0) {
        const byZoneData = [
          [t('events_by_zone')],
          [],
          [t('zone'), t('event_count'), t('percentage_of_total')]
        ];

        Object.entries(generatedReport.content.byZone).forEach(([zone, count]) => {
          const percentage = ((count / totalEvents) * 100).toFixed(1) + '%';
          byZoneData.push([zone, count, percentage]);
        });

        const byZoneWs = XLSX.utils.aoa_to_sheet(byZoneData);
        XLSX.utils.book_append_sheet(wb, byZoneWs, t('events_by_zone'));
      }

      // Citizens by Zone Sheet
      if (generatedReport.content.citizensByZone && Object.keys(generatedReport.content.citizensByZone).length > 0) {
        const citizensByZoneData = [
          [t('citizens_by_zone')],
          [],
          [t('zone'), t('citizen_count'), t('percentage_of_total')]
        ];

        Object.entries(generatedReport.content.citizensByZone).forEach(([zone, count]) => {
          const percentage = ((count / totalCitizens) * 100).toFixed(1) + '%';
          citizensByZoneData.push([zone, count, percentage]);
        });

        const citizensByZoneWs = XLSX.utils.aoa_to_sheet(citizensByZoneData);
        XLSX.utils.book_append_sheet(wb, citizensByZoneWs, t('citizens_by_zone'));
      }

      // Generate Excel file
      const fileName = `${reportType}-region-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast.success(t('excel_report_downloaded_successfully'));
    } catch (error) {
      console.error('Error generating Excel report:', error);
      toast.error(t('failed_to_generate_excel'));
    }
  };

  const printReport = () => {
    window.print();
    toast.success(t('print_dialog_opened'));
  };

  const formatReportForDownload = () => {
    if (!generatedReport) return '';

    let report = `${generatedReport.title}\n`;
    report += `${t('period_label')}: ${generatedReport.period.startDate} - ${generatedReport.period.endDate}\n`;
    report += `${t('generated_on')}: ${generatedReport.generatedOn} | ${t('region')}: ${generatedReport.region}\n\n`;

    report += `${t('executive_summary').toUpperCase()}\n`;
    report += `${t('total_events')}: ${generatedReport.content.totalEvents}\n`;
    report += `${t('total_citizens')}: ${generatedReport.content.totalCitizens}\n`;
    report += `${t('approval_rate')}: ${generatedReport.content.approvalRate}\n`;
    report += `${t('avg_processing_time')}: ${generatedReport.content.processingTime}\n\n`;

    report += `${t('detailed_analysis').toUpperCase()}\n`;
    report += `${t('events_by_type')}:\n`;
    Object.entries(generatedReport.content.eventsByType).forEach(([type, count]) => {
      report += `  ${t(type)}: ${count}\n`;
    });

    report += `\n${t('events_by_status')}:\n`;
    Object.entries(generatedReport.content.eventsByStatus).forEach(([status, count]) => {
      report += `  ${t(status)}: ${count}\n`;
    });

    report += `\n${t('by_zone')}:\n`;
    Object.entries(generatedReport.content.byZone).forEach(([zone, count]) => {
      report += `  ${zone}: ${count} ${t('events_tab')}\n`;
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
      <div className="region-reports-container">
        <div className="report-preview-header">
          <h2>📋 {t('report_preview')}</h2>
          <div className="report-actions">
            <button onClick={resetReport} className="back-btn">
              ← {t('back_to_generator')}
            </button>
            <button onClick={downloadReport} className="download-btn">
              ⬇️ {t('download_text')}
            </button>
            <button onClick={downloadExcelReport} className="excel-btn">
              📊 {t('download_excel')}
            </button>
            <button onClick={printReport} className="print-btn">
              🖨️ {t('print')}
            </button>
            <button onClick={sendToNational} className="send-btn">
              📤 {t('send_to_national')}
            </button>
          </div>
        </div>

        <div className="report-preview-content">
          <div className="report-header">
            <h3>{generatedReport.title}</h3>
            <p><strong>{t('period_label')}:</strong> {generatedReport.period.startDate} - {generatedReport.period.endDate}</p>
            <p><strong>{t('generated_on')}:</strong> {generatedReport.generatedOn} | <strong>{t('region')}:</strong> {generatedReport.region}</p>
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
                    <span className="data-label">{t(type)}:</span>
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
                    <span className="data-label">{t(status)}:</span>
                    <span className="data-value">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="analysis-section">
              <h5>{t('by_zone')}</h5>
              <div className="data-grid">
                {Object.entries(generatedReport.content.byZone).map(([zone, count]) => (
                  <div key={zone} className="data-item">
                    <span className="data-label">{zone}:</span>
                    <span className="data-value">{count} {t('events_tab').toLowerCase()}</span>
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
                  <strong>{t('high_approval_rate')}:</strong>
                  <p>{t('most_events_approved_first_submission')}</p>
                </div>
              </div>
              <div className="insight-item">
                <span className="insight-icon">⏳</span>
                <div>
                  <strong>{t('processing_time')}:</strong>
                  <p>{t('avg_review_time_acceptable')}</p>
                </div>
              </div>
              <div className="insight-item">
                <span className="insight-icon">📈</span>
                <div>
                  <strong>{t('trend')}:</strong>
                  <p>{t('region_events_consistent_patterns')}</p>
                </div>
              </div>
              <div className="insight-item">
                <span className="insight-icon">💡</span>
                <div>
                  <strong>{t('recommendation')}:</strong>
                  <p>{t('consider_standardized_training')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="report-footer">
            <p><strong>{t('prepared_by')}:</strong> {t('region')} {t('representative')}</p>
            <div className="report-notes">
              <p><strong>{t('notes')}:</strong></p>
              <ul>
                <li>{t('report_generated_automatically')}</li>
                <li>{t('data_accurate_as_of_date')}</li>
                <li>{t('for_questions_contact_region')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="region-reports-container">
      <div className="reports-header">
        <h2>📈 {t('generate_region_reports')}</h2>
        <p>{t('create_manage_region_reports_desc')}</p>
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
                <label>{t('start_date')}:</label>
                <input
                  type="date"
                  value={period.startDate}
                  onChange={(e) => setPeriod({ ...period, startDate: e.target.value })}
                />
              </div>
              <div className="date-input">
                <label>{t('end_date')}:</label>
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

export default RegionReports;
