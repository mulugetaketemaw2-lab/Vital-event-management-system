const fs = require('fs');

const enPath = 'c:/Users/Hp/Desktop/vital event register/frontend/src/locales/en/translation.json';
const amPath = 'c:/Users/Hp/Desktop/vital event register/frontend/src/locales/am/translation.json';

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const amData = JSON.parse(fs.readFileSync(amPath, 'utf8'));

const woredaReportStrings = {
    // WoredaReports.js component translations
    "woreda_report": ["Woreda Report", "የወረዳ ሪፖርት"],
    "report_sent_to_zone": ["Report successfully sent to Zone level. Report ID:", "ሪፖርቱ በተሳካ ሁኔታ ለዞን ደረጃ ተልኳል። የሪፖርት መታወቂያ፡"],
    "failed_to_send_report_zone": ["Failed to send report to Zone level", "ሪፖርቱን ለዞን ደረጃ መላክ አልተሳካም"],
    "send_to_zone": ["Send to Zone", "ወደ ዞን ላክ"],
    "by_kebele": ["By Kebele", "በቀበሌ"],
    "events_by_kebele": ["Events by Kebele", "ክስተቶች በቀበሌ"],
    "citizens_by_kebele": ["Citizens by Kebele", "ዜጎች በቀበሌ"],
    "weekly_events_consistent_patterns": ["Weekly events show consistent patterns across kebeles", "ሳምንታዊ ክስተቶች በቀበሌዎች ውስጥ ወጥ የሆኑ አዝማሚያዎችን ያሳያሉ"],
    "consider_outreach_under_registered": ["Consider outreach for under-registered event types", "በዝቅተኛ ደረጃ ለተመዘገቡ የክስተት ዓይነቶች የግንዛቤ ማስጨበጫ ያስቡ"],
    "most_events_approved_first_submission": ["Most events are approved on first submission", "አብዛኛዎቹ ክስተቶች በመጀመሪያ ማመልከቻ ላይ ይጸድቃሉ"],
    "woreda_representative": ["Woreda Representative", "የወረዳ ተወካይ"],
    "for_questions_contact_woreda": ["For questions, contact the woreda office", "ለጥያቄዎች፣ የወረዳውን ቢሮ ያነጋግሩ"],
    "generate_woreda_reports": ["Generate Woreda Reports", "የወረዳ ሪፖርቶችን አመንጭ"],
    "create_manage_woreda_reports_desc": ["Create and manage reports for your woreda's vital events statistics", "ለወረዳዎ የወሳኝ ኩነት ስታቲስቲክስ ሪፖርቶችን ይፍጠሩ እና ያቀናብሩ"]
};

for (const [key, [enVal, amVal]] of Object.entries(woredaReportStrings)) {
    if (!enData[key]) enData[key] = enVal;
    if (!amData[key]) amData[key] = amVal;
}

fs.writeFileSync(enPath, JSON.stringify(enData, null, 4));
fs.writeFileSync(amPath, JSON.stringify(amData, null, 4));

console.log('Woreda Reports translations updated successfully!');
