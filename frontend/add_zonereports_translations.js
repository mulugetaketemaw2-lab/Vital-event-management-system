const fs = require('fs');

const enPath = 'c:/Users/Hp/Desktop/vital event register/frontend/src/locales/en/translation.json';
const amPath = 'c:/Users/Hp/Desktop/vital event register/frontend/src/locales/am/translation.json';

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const amData = JSON.parse(fs.readFileSync(amPath, 'utf8'));

const zoneReportStrings = {
    // ZoneReports.js component translations
    "zone_report": ["Zone Report", "የዞን ሪፖርት"],
    "report_sent_to_region": ["Report successfully sent to Regional level. Report ID:", "ሪፖርቱ በተሳካ ሁኔታ ለክልል ደረጃ ተልኳል። የሪፖርት መታወቂያ፡"],
    "failed_to_send_report_region": ["Failed to send report to Regional level", "ሪፖርቱን ለክልል ደረጃ መላክ አልተሳካም"],
    "zone_report_summary": ["Zone Report Summary", "የዞን ሪፖርት ማጠቃለያ"],
    "most_events_approved_first_submission_zone": ["Most events are approved on first submission across woredas", "አብዛኛዎቹ クስተቶች በወረዳዎች ውስጥ በመጀመሪያ ማመልከቻ ላይ ይጸድቃሉ"],
    "zone_events_consistent_patterns": ["Zone-wide events show consistent patterns across woredas", "በዞን አቀፍ ደረጃ ያሉ ክስተቶች በወረዳዎች ውስጥ ወጥ የሆኑ አዝማሚያዎችን ያሳያሉ"],
    "zone_representative": ["Zone Representative", "የዞን ተወካይ"],
    "for_questions_contact_zone_office": ["For questions, contact the zone office", "ለጥያቄዎች፣ የዞን ቢሮን ያነጋግሩ"],
    "generate_zone_reports": ["Generate Zone Reports", "የዞን ሪፖርቶችን አመንጭ"],
    "create_manage_zone_reports_desc": ["Create and manage reports for your zone's vital events statistics", "ለዞንዎ የወሳኝ ኩነት ስታቲስቲክስ ሪፖርቶችን ይፍጠሩ እና ያቀናብሩ"]
};

for (const [key, [enVal, amVal]] of Object.entries(zoneReportStrings)) {
    if (!enData[key]) enData[key] = enVal;
    if (!amData[key]) amData[key] = amVal;
}

fs.writeFileSync(enPath, JSON.stringify(enData, null, 4));
fs.writeFileSync(amPath, JSON.stringify(amData, null, 4));

console.log('Zone Reports translations updated successfully!');
