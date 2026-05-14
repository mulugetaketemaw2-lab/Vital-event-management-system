const fs = require('fs');

const enPath = 'c:/Users/Hp/Desktop/vital event register/frontend/src/locales/en/translation.json';
const amPath = 'c:/Users/Hp/Desktop/vital event register/frontend/src/locales/am/translation.json';

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const amData = JSON.parse(fs.readFileSync(amPath, 'utf8'));

const kebeleReportStrings = {
    // KebeleReports.js component translations
    "no_report_to_send": ["No report generated to send", "ለመላክ የተዘጋጀ ሪፖርት የለም"],
    "report_sent_to_woreda": ["Report sent to Woreda Representative successfully", "ሪፖርቱ ለወረዳ ተወካይ በተሳካ ሁኔታ ተልኳል"],
    "failed_to_send_report": ["Failed to send report", "ሪፖርቱን መላክ አልተሳካም"],
    "failed_to_send_report_woreda": ["Failed to send report to woreda", "ሪፖርቱን ለወረዳ መላክ አልተሳካም"],
    "report_downloaded": ["Report downloaded", "ሪፖርቱ ወርዷል"],
    "report_sent_to_printer": ["Report sent to printer", "ሪፖርቱ ወደ ማተሚያ ተልኳል"],
    "generate_kebele_reports": ["Generate Kebele Reports", "የቀበሌ ሪፖርቶችን አመንጭ"],
    "create_manage_kebele_reports_desc": ["Create and manage reports for your kebele's vital events statistics", "ለቀበሌዎ የወሳኝ ኩነት ስታቲስቲክስ ሪፖርቶችን ይፍጠሩ እና ያቀናብሩ"],
    "your_kebele_name": ["Your Kebele Name", "የእርስዎ ቀበሌ ስም"],
    "events_consistent_patterns": ["events show consistent patterns", "ክስተቶች ወጥ የሆኑ አዝማሚያዎችን ያሳያሉ"],
    "kebele_representative": ["Kebele Representative", "የቀበሌ ተወካይ"],
    "for_questions_contact_kebele": ["For questions, contact the kebele office", "ለጥያቄዎች፣ የቀበሌውን ቢሮ ያነጋግሩ"],
    "reporting_guidelines": ["Reporting Guidelines", "የሪፖርት አቀራረብ መመሪያዎች"],
    "report_frequency": ["Report Frequency:", "የሪፖርት ድግግሞሽ ፦"],
    "daily_reports_label": ["Daily Reports:", "ዕለታዊ ሪፖርቶች ፦"],
    "daily_monitoring_desc": ["For daily monitoring and quick updates", "ለዕለታዊ ክትትል እና ፈጣን ማሻሻያዎች"],
    "weekly_reports_label": ["Weekly Reports:", "ሳምንታዊ ሪፖርቶች ፦"],
    "woreda_coordination_desc": ["For Woreda coordination meetings", "ለወረዳ ማስተባበሪያ ስብሰባዎች"],
    "monthly_reports_label": ["Monthly Reports:", "ወርሃዊ ሪፖርቶች ፦"],
    "official_records_desc": ["For official records and planning", "ለኦፊሴላዊ መዛግብት እና ዕቅድ"],
    "quarterly_reports_label": ["Quarterly Reports:", "የሩብ ዓመት ሪፖርቶች ፦"],
    "performance_review_desc": ["For performance review and analysis", "ለአፈፃፀም ግምገማ እና ትንተና"],
    "important_notes": ["Important Notes:", "አስፈላጊ ማስታወሻዎች ፦"],
    "ensure_data_accuracy": ["Ensure data accuracy before generating reports", "ሪፖርቶችን ከማመንጨትዎ በፊት የውሂብ ትክክለኛነትን ያረጋግጡ"],
    "send_reports_promptly": ["Send reports to Woreda Representative promptly", "ሪፖርቶችን ለወረዳ ተወካይ በፍጥነት ይላኩ"],
    "keep_copies_reports": ["Keep copies of all generated reports", "የተፈጠሩትን ሁሉንም ሪፖርቶች ቅጂዎች ያስቀምጡ"],
    "use_reports_planning": ["Use reports for planning and improvement", "ሪፖርቶችን ለዕቅድ እና ማሻሻያ ይጠቀሙ"]
};

for (const [key, [enVal, amVal]] of Object.entries(kebeleReportStrings)) {
    if (!enData[key]) enData[key] = enVal;
    if (!amData[key]) amData[key] = amVal;
}

fs.writeFileSync(enPath, JSON.stringify(enData, null, 4));
fs.writeFileSync(amPath, JSON.stringify(amData, null, 4));

console.log('Kebele Reports translations updated successfully!');
