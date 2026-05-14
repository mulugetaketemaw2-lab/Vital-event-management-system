const ExcelJS = require('exceljs');
const path = require('path');

/**
 * Standardized Excel Report Generator
 * @param {Object} data - { metadata, summary, details }
 * @param {express.Response} res - Express response object
 */
exports.generateExcelReport = async (data, res) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Standardized Report');

  const { metadata, summary, details } = data;

  // --- A. Header Section (Metadata) ---
  worksheet.mergeCells('A1:F1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA - VITAL EVENTS REPORT';
  titleCell.font = { bold: true, size: 14 };
  titleCell.alignment = { horizontal: 'center' };

  worksheet.addRow(['Reporting Level:', metadata.level]);
  worksheet.addRow(['Reporting Period:', metadata.period]);
  worksheet.addRow(['Administrative Path:', metadata.path]);
  worksheet.addRow(['Generated Date:', new Date().toLocaleString()]);
  worksheet.addRow([]); // Spacer

  // --- B. Summary Table (Area Focus) ---
  const summaryStartRow = 7;
  worksheet.getCell(`A${summaryStartRow}`).value = 'SUMMARY TABLE';
  worksheet.getCell(`A${summaryStartRow}`).font = { bold: true };
  
  const summaryHeaderRow = summaryStartRow + 1;
  const summaryHeaders = ['Event Type', 'Total Registrations', 'Male', 'Female', 'Growth %'];
  worksheet.getRow(summaryHeaderRow).values = summaryHeaders;
  worksheet.getRow(summaryHeaderRow).font = { bold: true };
  worksheet.getRow(summaryHeaderRow).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  summary.forEach((item, index) => {
    const row = worksheet.addRow([
      item.type.toUpperCase(),
      item.total,
      item.male || 0,
      item.female || 0,
      item.growth || '0%'
    ]);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  });

  // Add Grand Total
  const grandTotalEvents = details.length;
  const totalRow = worksheet.addRow(['GRAND TOTAL', grandTotalEvents, '', '', '']);
  totalRow.font = { bold: true };
  totalRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

  // --- B2. Regional Breakdown (For National Level only) ---
  if (metadata.level === 'NATIONAL' && details.length > 0) {
    worksheet.addRow([]); // Spacer
    const regionSummaryRow = worksheet.lastRow.number + 1;
    worksheet.getCell(`A${regionSummaryRow}`).value = 'REGIONAL ACTIVITY BREAKDOWN';
    worksheet.getCell(`A${regionSummaryRow}`).font = { bold: true };

    const regionHeaderRow = regionSummaryRow + 1;
    worksheet.getRow(regionHeaderRow).values = ['Region Name', 'Registration Count', 'Percentage of Total'];
    worksheet.getRow(regionHeaderRow).font = { bold: true };
    worksheet.getRow(regionHeaderRow).eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = { style: 'thin' };
    });

    // Count by region
    const regionCounts = {};
    details.forEach(item => {
      const reg = item.region || 'Unknown';
      regionCounts[reg] = (regionCounts[reg] || 0) + 1;
    });

    Object.entries(regionCounts)
      .sort((a, b) => b[1] - a[1]) // Sort by count desc
      .forEach(([region, count]) => {
        const perc = ((count / grandTotalEvents) * 100).toFixed(1) + '%';
        const row = worksheet.addRow([region, count, perc]);
        row.eachCell(cell => { cell.border = { style: 'thin' }; });
      });
  }

  worksheet.addRow([]); // Spacer

  // --- C. Registrant Detail Table ---
  const detailsStartRow = worksheet.lastRow.number + 2;
  worksheet.getCell(`A${detailsStartRow}`).value = 'DETAILED REGISTRANT RECORD';
  worksheet.getCell(`A${detailsStartRow}`).font = { bold: true, size: 12 };

  const detailsHeaderRow = detailsStartRow + 1;
  const detailsHeaders = [
    'No.', 
    'Full Name', 
    'Event Type', 
    'Gender',
    'Registration Date', 
    'Certificate #', 
    'Kebele', 
    'Woreda', 
    'Zone',
    'Region',
    'Official ID'
  ];
  worksheet.getRow(detailsHeaderRow).values = detailsHeaders;
  worksheet.getRow(detailsHeaderRow).font = { bold: true };
  worksheet.getRow(detailsHeaderRow).eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' } // Indigo color
    };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    cell.border = { style: 'thin' };
  });

  details.forEach((item, index) => {
    const row = worksheet.addRow([
      index + 1,
      item.fullName,
      item.eventType,
      item.gender || 'N/A',
      new Date(item.registrationDate).toLocaleDateString(),
      item.certificateNo || 'N/A',
      item.kebele || 'N/A',
      item.woreda || 'N/A',
      item.zone || 'N/A',
      item.region || 'N/A',
      item.representativeId || 'System'
    ]);
    row.eachCell((cell) => {
      cell.border = { style: 'thin' };
    });
  });

  // Formatting columns
  worksheet.columns.forEach((col, i) => {
    if (i === 0) col.width = 8;
    else if (i === 1) col.width = 35;
    else col.width = 20;
  });

  // Set response headers and send
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=Report_${metadata.level}_${metadata.period}.xlsx`);

  await workbook.xlsx.write(res);
  res.end();
};
