const fs = require('fs');

const enPath = 'c:/Users/Hp/Desktop/vital event register/frontend/src/locales/en/translation.json';
const amPath = 'c:/Users/Hp/Desktop/vital event register/frontend/src/locales/am/translation.json';

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const amData = JSON.parse(fs.readFileSync(amPath, 'utf8'));

const eventStatsStrings = {
    // EventStatistics component translations
    "failed_to_load_statistics": ["Failed to load statistics.", "ስታቲስቲክስ መጫን አልተሳካም።"],
    "total_registration_statistics": ["Total Registration Statistics", "አጠቃላይ የምዝገባ ስታቲስቲክስ"],
    "last_week": ["Last Week", "ያለፈው ሳምንት"],
    "last_month": ["Last Month", "ያለፈው ወር"],
    "last_quarter": ["Last Quarter", "ያለፈው ሩብ"],
    "last_year": ["Last Year", "ያለፈው ዓመት"],
    "all_time": ["All Time", "ለሁሉም ጊዜ"],
    "refreshing": ["Refreshing...", "በማደስ ላይ..."],
    "total_events_stats": ["Total Events", "አጠቃላይ ክስተቶች"],
    "all_events_jurisdiction": ["All events in your jurisdiction", "በስልጣን ክልልዎ ያሉ ሁሉም ክስተቶች"],
    "pending_review_stats": ["Pending Review", "ግምገማ በመጠባበቅ ላይ"],
    "awaiting_action": ["Awaiting your action", "የእርስዎን እርምጃ በመጠባበቅ ላይ"],
    "approval_rate_stats": ["Approval Rate", "የማጽደቅ መጠን"],
    "approved_events_stats": ["approved events", "የጸደቁ ክስተቶች"],
    "processing_time_stats": ["Processing Time", "የማስኬጃ ጊዜ"],
    "avg_review_time_stats": ["Average review time", "አማካይ የግምገማ ጊዜ"],
    "monthly_trends": ["Monthly Trends", "ወርሃዊ አዝማሚያዎች"],
    "export_statistics": ["Export Statistics", "ስታቲስቲክስ ላክ"],
    "print_report": ["Print Report", "ሪፖርት አትም"],
    "insights_recommendations": ["Insights & Recommendations", "ግንዛቤዎች እና ምክሮች"],
    "high_pending_load": ["High Pending Load", "ከፍተኛ የተንጠለጠሉ ብዛት"],
    "you_have_pending_events": ["You have {{count}} events waiting for review.", "ለግምገማ የሚጠብቁ {{count}} ክስተቶች አሉዎት።"],
    "consider_allocating_time": ["Consider allocating more time for review tasks.", "ለግምገማ ተግባራት ተጨማሪ ጊዜ ለመመደብ ያስቡበት።"],
    "rejection_analysis": ["Rejection Analysis", "የውድቅነት ትንታኔ"],
    "events_rejected": ["{{count}} events were rejected.", "{{count}} ክስተቶች ውድቅ ተደርገዋል።"],
    "review_rejection_reasons": ["Review rejection reasons to identify common issues.", "የተለመዱ ችግሮችን ለመለየት የውድቅነት ምክንያቶችን ይገምግሙ።"],
    "good_work": ["Good Work", "ጥሩ ስራ"],
    "successfully_approved_events": ["You've successfully approved {{count}} events", "በተሳካ ሁኔታ {{count}} ክስተቶችን አጽድቀዋል"],
    "forwarded_to_next_level": ["and forwarded them to the next level.", "እና ወደ ቀጣዩ ደረጃ አስተላልፈዋል።"],
    "no_events_yet": ["No Events Yet", "እስካሁን ምንም ክስተቶች የሉም"],
    "no_registrations_submitted": ["No registrations or events have been submitted.", "ምንም አይነት ምዝገባዎች ወይም ክስተቶች አልቀረቡም።"],
    "encourage_registrations": ["Consider community outreach to encourage registrations.", "ምዝገባዎችን ለማበረታታት ከህብረተሰቡ ጋር ለመስራት ያስቡበት።"]
};

for (const [key, [enVal, amVal]] of Object.entries(eventStatsStrings)) {
    if (!enData[key]) enData[key] = enVal;
    if (!amData[key]) amData[key] = amVal;
}

fs.writeFileSync(enPath, JSON.stringify(enData, null, 4));
fs.writeFileSync(amPath, JSON.stringify(amData, null, 4));

console.log('Translations updated successfully!');
