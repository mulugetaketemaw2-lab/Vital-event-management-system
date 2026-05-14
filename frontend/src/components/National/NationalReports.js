import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import './NationalReports.css';
import StandardizedExcelReport from '../Common/StandardizedExcelReport';

const NationalReports = () => {
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
  const [showMinistryModal, setShowMinistryModal] = useState(false);
  const [selectedMinistry, setSelectedMinistry] = useState(null);

  const ministriesList = [
    {
        id: 'moh',
        name: 'Ministry of Health',
        icon: '🏥',
        email: 'reports@moh.gov.et',
        telegram: '@MoHEthiopia',
        whatsapp: '+251 911 000 000',
        color: '#ef4444'
    },
    {
        id: 'csa',
        name: 'National Population Census Agency',
        icon: '📊',
        email: 'info@statsethiopia.gov.et',
        telegram: '@StatEthiopia',
        whatsapp: '+251 911 111 111',
        color: '#3b82f6'
    },
    {
        id: 'moe',
        name: 'Ministry of Education',
        icon: '🎓',
        email: 'info@moe.gov.et',
        telegram: '@MoEEthiopia',
        whatsapp: '+251 911 222 222',
        color: '#f59e0b'
    },
    {
        id: 'mfa',
        name: 'Ministry of Foreign Affairs',
        icon: '🌍',
        email: 'info@mfa.gov.et',
        telegram: '@MFAEthiopia',
        whatsapp: '+251 911 333 333',
        color: '#10b981'
    },
    {
        id: 'moj',
        name: 'Ministry of Justice',
        icon: '⚖️',
        email: 'info@moj.gov.et',
        telegram: '@JusticeEthiopia',
        whatsapp: '+251 911 444 444',
        color: '#6366f1'
    },
    {
        id: 'mor',
        name: 'Ministry of Revenue',
        icon: '💰',
        email: 'info@mor.gov.et',
        telegram: '@RevenuesEthiopia',
        whatsapp: '+251 911 555 555',
        color: '#f43f5e'
    },
    {
        id: 'nid',
        name: 'National ID Program (NIDP)',
        icon: '🆔',
        email: 'info@id.gov.et',
        telegram: '@FaydaEthiopia',
        whatsapp: '+251 911 666 666',
        color: '#8b5cf6'
    },
    {
        id: 'mof',
        name: 'Ministry of Finance',
        icon: '🏦',
        email: 'info@mofed.gov.et',
        telegram: '@MoFEthiopia',
        whatsapp: '+251 911 777 777',
        color: '#0ea5e9'
    }
  ];

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

      const response = await axios.get(`${API_URL}/auth/national/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setOverviewData(response.data.data);
    } catch (error) {
      console.error('Error fetching overview data:', error);
      toast.error(t('failed_load_overview_data'));
    }
  };

  const generateReport = async () => {
    try {
      setGenerating(true);
      const token = localStorage.getItem('token');

      const response = await axios.post(`${API_URL}/auth/national/generate-report`, {
        reportType: 'all',
        startDate: period.startDate,
        endDate: period.endDate,
        format: 'json',
        options: reportOptions
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const reportData = {
        title: `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} National Report`,
        type: reportType,
        period,
        generatedOn: new Date().toLocaleDateString(),
        country: 'Ethiopia',
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
          processingTime: '24 hours average',
          approvalRate: response.data.data.events?.total > 0 ?
            Math.round((response.data.data.events.completed / response.data.data.events.total) * 100) + '%' : '0%',
          byRegion: response.data.data.events?.byRegion || {},
          citizensByRegion: response.data.data.citizens?.byRegion || {},
          details: response.data.data.events?.details || []
        }
      };

      setGeneratedReport(reportData);
      toast.success(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} report generated successfully`);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error(t('failed_to_generate_report') || 'Failed to generate report');
      setGeneratedReport(null);
    } finally {
      setGenerating(false);
    }
  };

  const sendToMinistry = () => {
    setShowMinistryModal(true);
  };

  const handleSendAction = (method, target) => {
    let url = '';
    const reportTitle = generatedReport?.title || 'National Vital Event Report';
    
    if (method === 'Email') {
      url = `mailto:${target}?subject=${encodeURIComponent(reportTitle)}&body=${encodeURIComponent("Please find the attached report regarding Ethiopia's vital events statistics.")}`;
    } else if (method === 'Telegram') {
      const username = target.startsWith('@') ? target.substring(1) : target;
      url = `https://t.me/${username}`;
    } else if (method === 'WhatsApp') {
      const phone = target.replace(/[^0-9+]/g, '');
      url = `https://wa.me/${phone}`;
    }

    if (url) {
      window.open(url, '_blank');
      toast.info(`Opening ${method} to transmit report...`);
    } else {
      toast.success(`Report successfully sent to ${selectedMinistry.name} via ${method}`);
    }
    
    setTimeout(() => {
        setShowMinistryModal(false);
        setSelectedMinistry(null);
    }, 600);
  };

  const downloadReport = () => {
    const reportText = formatReportForDownload();
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}-national-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success(t('report_downloaded_success'));
  };

  const downloadPDF = () => {
    try {
      const { jsPDF } = require('jspdf');
      require('jspdf-autotable');
      const doc = new jsPDF();
      
      const title = `FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA - ${reportType.toUpperCase()} REPORT`;
      const timestamp = new Date().toLocaleString();
      
      doc.setFontSize(16);
      doc.setTextColor(30, 64, 175);
      doc.text(title, 105, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Period: ${generatedReport.period.startDate} - ${generatedReport.period.endDate}`, 105, 30, { align: 'center' });
      doc.text(`Generated: ${timestamp} | Region: National`, 105, 35, { align: 'center' });
      
      // Executive Summary
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('EXECUTIVE SUMMARY', 15, 50);
      
      const summaryData = [
        ['Metrics', 'Value'],
        ['Total Events', generatedReport.content.totalEvents],
        ['Total Citizens', generatedReport.content.totalCitizens],
        ['Approval Rate', generatedReport.content.approvalRate],
        ['Avg Processing Time', generatedReport.content.processingTime]
      ];
      
      doc.autoTable({
        startY: 55,
        head: [['Metric', 'Quantity']],
        body: summaryData.slice(1),
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }
      });
      
      // Events by Type
      doc.text('EVENTS BY TYPE', 15, doc.lastAutoTable.finalY + 15);
      const eventsTable = Object.entries(generatedReport.content.eventsByType).map(([type, count]) => [
        type.charAt(0).toUpperCase() + type.slice(1),
        count
      ]);
      
      doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Event Type', 'Count']],
        body: eventsTable,
        theme: 'grid'
      });
      
      // Detailed Registrant List
      if (generatedReport.content.details && generatedReport.content.details.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.text('REGISTRANT DETAILS LIST', 15, 20);
        
        const detailsTable = generatedReport.content.details.map(d => [
            d.fullName,
            d.eventType,
            new Date(d.registrationDate).toLocaleDateString(),
            d.certificateNo,
            d.gender,
            d.location
        ]);
        
        doc.autoTable({
            startY: 25,
            head: [['Full Name', 'Event Type', 'Reg Date', 'Certificate #', 'Gender', 'Location']],
            body: detailsTable,
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129] },
            styles: { fontSize: 8 }
        });
      }
      
      doc.save(`National_Report_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success(t('pdf_downloaded_success') || 'PDF report downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(t('failed_to_generate_pdf') || 'Failed to generate PDF');
    }
  };

  const downloadExcel = () => {
    try {
      const XLSX = require('xlsx');
      const wb = XLSX.utils.book_new();
      
      // Summary Sheet
      const summary = [
        ['NATIONAL REPORT SUMMARY'],
        ['Period', `${generatedReport.period.startDate} - ${generatedReport.period.endDate}`],
        ['Generated', new Date().toLocaleString()],
        [],
        ['Metric', 'Value'],
        ['Total Events', generatedReport.content.totalEvents],
        ['Total Citizens', generatedReport.content.totalCitizens],
        ['Approval Rate', generatedReport.content.approvalRate]
      ];
      const ws_summary = XLSX.utils.aoa_to_sheet(summary);
      XLSX.utils.book_append_sheet(wb, ws_summary, "Summary");
      
      // Breakdown Sheet
      const breakdown = [['Event Type', 'Count']];
      Object.entries(generatedReport.content.eventsByType).forEach(([type, count]) => {
        breakdown.push([type.toUpperCase(), count]);
      });
      const ws_breakdown = XLSX.utils.aoa_to_sheet(breakdown);
      XLSX.utils.book_append_sheet(wb, ws_breakdown, "Breakdown");
      
      // Registrant Details Sheet
      if (generatedReport.content.details && generatedReport.content.details.length > 0) {
        const details = [['Full Name', 'Event Type', 'Registration Date', 'Certificate No', 'Gender', 'Location']];
        generatedReport.content.details.forEach(d => {
            details.push([
                d.fullName,
                d.eventType,
                new Date(d.registrationDate).toLocaleDateString(),
                d.certificateNo,
                d.gender,
                d.location
            ]);
        });
        const ws_details = XLSX.utils.aoa_to_sheet(details);
        XLSX.utils.book_append_sheet(wb, ws_details, "Registrant Details");
      }
      
      XLSX.writeFile(wb, `National_Report_Book_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success(t('excel_book_downloaded') || 'Excel Book downloaded successfully');
    } catch (error) {
      console.error('Error downloading Excel Book:', error);
      toast.error('Failed to generate Excel Book');
    }
  };

  const downloadDoc = () => {
    const reportText = formatReportForDownload();
    const htmlContent = `
      <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: Arial, sans-serif;">
          <h1 style="color: #1e40af; text-align: center;">FEDERAL NATIONAL REPORT</h1>
          <p style="text-align: center;"><b>Period:</b> ${generatedReport.period.startDate} - ${generatedReport.period.endDate}</p>
          <hr />
          <pre style="font-family: inherit; font-size: 14px;">${reportText}</pre>
        </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `National_Report_${reportType}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(t('doc_downloaded_success') || 'Document downloaded successfully');
  };

  const printReport = () => {
    window.print();
    toast.success(t('print_dialog_opened'));
  };

  const formatReportForDownload = () => {
    if (!generatedReport) return '';

    let report = `${generatedReport.title}\n`;
    report += `Period: ${generatedReport.period.startDate} - ${generatedReport.period.endDate}\n`;
    report += `Generated on: ${generatedReport.generatedOn} | Country: ${generatedReport.country}\n\n`;

    report += `EXECUTIVE SUMMARY\n`;
    report += `Total Events: ${generatedReport.content.totalEvents}\n`;
    report += `Total Citizens: ${generatedReport.content.totalCitizens}\n`;
    report += `Approval Rate: ${generatedReport.content.approvalRate}\n`;
    report += `Average Processing Time: ${generatedReport.content.processingTime}\n\n`;

    report += `DETAILED ANALYSIS\n`;
    report += `Events by Type:\n`;
    Object.entries(generatedReport.content.eventsByType).forEach(([type, count]) => {
      report += `  ${type.charAt(0).toUpperCase() + type.slice(1)}: ${count}\n`;
    });

    report += `\nEvents by Status:\n`;
    Object.entries(generatedReport.content.eventsByStatus).forEach(([status, count]) => {
      report += `  ${status.charAt(0).toUpperCase() + status.slice(1)}: ${count}\n`;
    });

    Object.entries(generatedReport.content.byRegion).forEach(([region, count]) => {
      report += `  ${region}: ${count} events\n`;
    });

    if (generatedReport.content.details && generatedReport.content.details.length > 0) {
        report += `\nREGISTRANT DETAILS LIST\n`;
        report += `--------------------------------------------------------------------------------\n`;
        report += `Name                 | Type       | Date       | Cert #     | Location\n`;
        report += `--------------------------------------------------------------------------------\n`;
        generatedReport.content.details.forEach(d => {
            const name = d.fullName.padEnd(20).substring(0, 20);
            const type = d.eventType.padEnd(10).substring(0, 10);
            const date = new Date(d.registrationDate).toLocaleDateString().padEnd(10);
            const cert = (d.certificateNo || 'N/A').padEnd(10).substring(0, 10);
            report += `${name} | ${type} | ${date} | ${cert} | ${d.location}\n`;
        });
    }

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
      <div className="national-reports-container">
        <div className="report-preview-header">
          <h2>📋 {t('report_preview')}</h2>
          <div className="report-actions">
            <button onClick={resetReport} className="back-btn">
              ← {t('back_to_generator')}
            </button>
            <button onClick={downloadDoc} className="doc-btn" style={{ background: '#2563eb', color: 'white' }}>
              📄 {t('download_doc_report') || 'DOC'}
            </button>
            <button onClick={downloadPDF} className="pdf-btn" style={{ background: '#dc2626', color: 'white' }}>
              📕 {t('download_pdf_report') || 'PDF'}
            </button>
            <button onClick={downloadExcel} className="book-btn" style={{ background: '#10b981', color: 'white' }}>
              📖 {t('download_book_report') || 'BOOK'}
            </button>
            <button onClick={downloadReport} className="download-btn">
              📥 {t('download_btn')}
            </button>
            <button onClick={printReport} className="print-btn">
              🖨️ {t('print_btn')}
            </button>
            <button onClick={sendToMinistry} className="send-btn">
              📤 {t('send_to_ministry')}
            </button>
          </div>
        </div>

        <div className="report-preview-content">
          <div className="report-header">
            <h3>{generatedReport.title}</h3>
            <p><strong>Period:</strong> {generatedReport.period.startDate} - {generatedReport.period.endDate}</p>
            <p><strong>Generated on:</strong> {generatedReport.generatedOn} | <strong>Country:</strong> {generatedReport.country}</p>
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
                <p>{t('national_approval_rate')}</p>
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
                    <span className="data-label">{type.charAt(0).toUpperCase() + type.slice(1)}:</span>
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
                    <span className="data-label">{status.charAt(0).toUpperCase() + status.slice(1)}:</span>
                    <span className="data-value">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="analysis-section">
              <h5>{t('by_region')}</h5>
              <div className="data-grid">
                {Object.entries(generatedReport.content.byRegion).map(([region, count]) => (
                  <div key={region} className="data-item">
                    <span className="data-label">{region}:</span>
                    <span className="data-value">{count} events</span>
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
                  <p>{t('most_events_approved_first_time')}</p>
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
                  <p>{t('national_events_consistent_patterns')}</p>
                </div>
              </div>
              <div className="insight-item">
                <span className="insight-icon">💡</span>
                <div>
                  <strong>{t('recommendation')}</strong>
                  <p>{t('consider_standardized_training')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="report-footer">
            <p><strong>{t('prepared_by')}</strong> {t('national_representative')}</p>
            <div className="report-notes">
              <p><strong>{t('notes')}</strong></p>
              <ul>
                <li>{t('report_generated_auto')}</li>
                <li>{t('data_accurate_as_of')}</li>
                <li>{t('contact_ministry_health')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="national-reports-container">
      <div className="reports-header">
        <h2>📈 {t('generate_national_reports_title')}</h2>
        <p>{t('create_manage_reports_ethiopia')}</p>
      </div>

      <StandardizedExcelReport />

      {overviewData && (
        <div className="overview-section">
          <h3>📈 {t('current_overview')}</h3>
          <div className="overview-stats">
            <div className="overview-stat">
              <h4>{overviewData.stats.citizens.total}</h4>
              <p>{t('total_citizens_with_count', { count: overviewData.stats.citizens.total }) || t('total_citizens')}</p>
              <small>{overviewData.stats.citizens.pending} {t('pending').toLowerCase()}</small>
            </div>
            <div className="overview-stat">
              <h4>{overviewData.stats.events.total}</h4>
              <p>{t('total_events_with_count', { count: overviewData.stats.events.total }) || t('total_events')}</p>
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
              <span className="radio-description">{t('summary_of_todays_events')}</span>
            </label>
            <label className="report-type-option">
              <input
                type="radio"
                value="weekly"
                checked={reportType === 'weekly'}
                onChange={(e) => setReportType(e.target.value)}
              />
              <span className="radio-label">📆 {t('weekly_report')}</span>
              <span className="radio-description">{t('weekly_summary_and_trends')}</span>
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
                value="semi-annual"
                checked={reportType === 'semi-annual'}
                onChange={(e) => setReportType(e.target.value)}
              />
              <span className="radio-label">🌓 {t('semi_annual_report') || 'Semi-Annual Report'}</span>
              <span className="radio-description">{t('six_month_performance_review') || 'Six-month cumulative performance review'}</span>
            </label>
            <label className="report-type-option">
              <input
                type="radio"
                value="annual"
                checked={reportType === 'annual'}
                onChange={(e) => setReportType(e.target.value)}
              />
              <span className="radio-label">🌟 {t('annual_report') || 'Annual Report'}</span>
              <span className="radio-description">{t('full_year_statistical_summary') || 'Full year nationwide statistical summary'}</span>
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
              <button onClick={() => setQuickPeriod(180)} className="quick-period-btn">{t('last_6_months') || 'Last 6 Months'}</button>
              <button onClick={() => setQuickPeriod(365)} className="quick-period-btn">{t('last_year') || 'Last Year'}</button>
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
              <span>{t('include_detailed_breakdown')}</span>
            </label>
            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={reportOptions.includeApprovalAnalysis}
                onChange={(e) => setReportOptions({ ...reportOptions, includeApprovalAnalysis: e.target.checked })}
              />
              <span>{t('include_approval_analysis')}</span>
            </label>
            <label className="option-checkbox">
              <input
                type="checkbox"
                checked={reportOptions.includeDemographicData}
                onChange={(e) => setReportOptions({ ...reportOptions, includeDemographicData: e.target.checked })}
              />
              <span>{t('include_citizen_demographic')}</span>
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

      {/* Ministry Selection Modal */}
      {showMinistryModal && (
          <div 
              onClick={() => { setShowMinistryModal(false); setSelectedMinistry(null); }}
              style={{
                  position: 'fixed',
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(15, 23, 42, 0.6)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  animation: 'fadeIn 0.2s ease-out',
                  padding: '20px'
              }}
          >
              <div 
                  onClick={(e) => e.stopPropagation()}
                  style={{
                      background: '#ffffff',
                      width: '100%',
                      maxWidth: '550px',
                      maxHeight: '90vh',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: '24px',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                      position: 'relative'
                  }}
              >
                  <div style={{ padding: '25px 30px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderTopLeftRadius: '24px', borderTopRightRadius: '24px' }}>
                      <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                          📤 {t('send_to_ministry') || 'Send to Ministry'}
                      </h3>
                      <button 
                          onClick={() => { setShowMinistryModal(false); setSelectedMinistry(null); }}
                          style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8', padding: '5px' }}
                      >
                          ✖
                      </button>
                  </div>
                  
                  <div style={{ padding: '30px', overflowY: 'auto' }}>
                      {!selectedMinistry ? (
                          <div>
                              <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '15px', fontWeight: '500' }}>
                                  {t('select_ministry_desc') || 'Select a government ministry or institution to transmit this report to.'}
                              </p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  {ministriesList.map(ministry => (
                                      <button
                                          key={ministry.id}
                                          onClick={() => setSelectedMinistry(ministry)}
                                          style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '15px',
                                              padding: '16px 20px',
                                              background: '#ffffff',
                                              border: '2px solid #e2e8f0',
                                              borderRadius: '16px',
                                              cursor: 'pointer',
                                              transition: 'all 0.2s ease',
                                              textAlign: 'left'
                                          }}
                                          onMouseOver={(e) => {
                                              e.currentTarget.style.borderColor = ministry.color;
                                              e.currentTarget.style.boxShadow = `0 4px 15px ${ministry.color}20`;
                                              e.currentTarget.style.transform = 'translateY(-2px)';
                                          }}
                                          onMouseOut={(e) => {
                                              e.currentTarget.style.borderColor = '#e2e8f0';
                                              e.currentTarget.style.boxShadow = 'none';
                                              e.currentTarget.style.transform = 'translateY(0)';
                                          }}
                                      >
                                          <div style={{ 
                                              width: '45px', height: '45px', borderRadius: '12px', 
                                              background: `${ministry.color}15`, display: 'flex', 
                                              alignItems: 'center', justifyContent: 'center', fontSize: '22px' 
                                          }}>
                                              {ministry.icon}
                                          </div>
                                          <span style={{ fontSize: '16px', fontWeight: '700', color: '#334155' }}>
                                              {ministry.name}
                                          </span>
                                          <span style={{ marginLeft: 'auto', color: '#cbd5e1' }}>▶</span>
                                      </button>
                                  ))}
                              </div>
                          </div>
                      ) : (
                          <div>
                              <div style={{ 
                                  display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px',
                                  padding: '15px', background: `${selectedMinistry.color}10`, borderRadius: '16px', border: `1px solid ${selectedMinistry.color}30`
                              }}>
                                  <div style={{ 
                                      width: '50px', height: '50px', borderRadius: '12px', 
                                      background: selectedMinistry.color, color: 'white', display: 'flex', 
                                      alignItems: 'center', justifyContent: 'center', fontSize: '24px' 
                                  }}>
                                      {selectedMinistry.icon}
                                  </div>
                                  <div>
                                      <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{selectedMinistry.name}</h4>
                                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Select transmission method</p>
                                  </div>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                                  <button
                                      onClick={() => handleSendAction('Email', selectedMinistry.email)}
                                      style={{
                                          display: 'flex', alignItems: 'center', gap: '15px', padding: '16px',
                                          background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '14px',
                                          cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left'
                                      }}
                                      onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#94a3b8'; }}
                                      onMouseOut={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                                  >
                                      <div style={{ fontSize: '24px' }}>📧</div>
                                      <div>
                                          <div style={{ fontSize: '15px', fontWeight: '700', color: '#334155' }}>Send via Official Email</div>
                                          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{selectedMinistry.email}</div>
                                      </div>
                                  </button>

                                  <button
                                      onClick={() => handleSendAction('Telegram', selectedMinistry.telegram)}
                                      style={{
                                          display: 'flex', alignItems: 'center', gap: '15px', padding: '16px',
                                          background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '14px',
                                          cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left'
                                      }}
                                      onMouseOver={(e) => { e.currentTarget.style.background = '#e0f2fe'; e.currentTarget.style.borderColor = '#7dd3fc'; }}
                                      onMouseOut={(e) => { e.currentTarget.style.background = '#f0f9ff'; e.currentTarget.style.borderColor = '#bae6fd'; }}
                                  >
                                      <div style={{ fontSize: '24px', color: '#0ea5e9' }}>✈️</div>
                                      <div>
                                          <div style={{ fontSize: '15px', fontWeight: '700', color: '#0369a1' }}>Send via Telegram</div>
                                          <div style={{ fontSize: '13px', color: '#0284c7', marginTop: '2px' }}>{selectedMinistry.telegram}</div>
                                      </div>
                                  </button>

                                  <button
                                      onClick={() => handleSendAction('WhatsApp', selectedMinistry.whatsapp)}
                                      style={{
                                          display: 'flex', alignItems: 'center', gap: '15px', padding: '16px',
                                          background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '14px',
                                          cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left'
                                      }}
                                      onMouseOver={(e) => { e.currentTarget.style.background = '#dcfce7'; e.currentTarget.style.borderColor = '#86efac'; }}
                                      onMouseOut={(e) => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = '#bbf7d0'; }}
                                  >
                                      <div style={{ fontSize: '24px', color: '#22c55e' }}>💬</div>
                                      <div>
                                          <div style={{ fontSize: '15px', fontWeight: '700', color: '#166534' }}>Send via WhatsApp</div>
                                          <div style={{ fontSize: '13px', color: '#15803d', marginTop: '2px' }}>{selectedMinistry.whatsapp}</div>
                                      </div>
                                  </button>
                              </div>
                              
                              <button 
                                  onClick={() => setSelectedMinistry(null)}
                                  style={{ 
                                      width: '100%', padding: '12px', marginTop: '20px', 
                                      background: 'none', border: 'none', color: '#64748b', 
                                      fontWeight: '600', cursor: 'pointer', fontSize: '14px' 
                                  }}
                              >
                                  ← Back to Ministry List
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default NationalReports;
