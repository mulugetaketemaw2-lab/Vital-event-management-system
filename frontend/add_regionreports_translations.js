const fs = require('fs');

const enPath = 'c:/Users/Hp/Desktop/vital event register/frontend/src/locales/en/translation.json';
const amPath = 'c:/Users/Hp/Desktop/vital event register/frontend/src/locales/am/translation.json';

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const amData = JSON.parse(fs.readFileSync(amPath, 'utf8'));

const regionReportsStrings = {
    // RegionReports translation
    "no_auth_token_login": ["No authentication token found. Please login again.", "ምንም የማረጋገጫ ቶከን አልተገኘም። እባክዎ እንደገና ይግቡ።"],
    "failed_to_load_overview_data": ["Failed to load overview data", "አጠቃላይ መረጃ መጫን አልተሳካም"],
    "region_report": ["Region Report", "የክልል ሪፖርት"],
    "24_hours_average": ["24 hours average", "የ24 ሰዓታት አማካይ"],
    "report_generated_successfully": ["Report generated successfully", "ሪፖርቱ በተሳካ ሁኔታ ተፈጥሯል"],
    "error_generating_report": ["Error generating report", "ሪፖርቱን በማመንጨት ላይ ስህተት ተፈጥሯል"],
    "20_hours_average": ["20 hours average", "የ20 ሰዓታት አማካይ"],
    "no_report_data_to_send": ["No report data available to send", "ለማን የተዘጋጀ የሪፖርት መረጃ የለም"],
    "report_sent_to_national": ["Report successfully sent to National level. Report ID:", "ሪፖርቱ በተሳካ ሁኔታ ለብሔራዊ ደረጃ ተልኳል። የሪፖርት መታወቂያ፡"],
    "failed_to_send_report_national": ["Failed to send report to National level", "ሪፖርቱን ለብሔራዊ ደረጃ መላክ አልተሳካም"],
    "report_downloaded_successfully": ["Report downloaded successfully", "ሪፖርቱ በተሳካ ሁኔታ ወርዷል"],
    "no_report_data_available": ["No report data available", "ምንም የሪፖርት መረጃ የለም"],
    "regional_report_summary": ["Regional Report Summary", "የክልል ሪፖርት ማጠቃለያ"],
    "report_title": ["Report Title", "የሪፖርት ርዕስ"],
    "period_label": ["Period", "ወቅት"],
    "generated_on": ["Generated On", "የተፈጠረበት ጊዜ"],
    "executive_summary": ["Executive Summary", "አስፈፃሚ ምህጻረ ቃል"],
    "avg_processing_time": ["Average Processing Time", "አማካይ የማስኬጃ ጊዜ"],
    "events_by_type": ["Events by Type", "ክስተቶች በዓይነት"],
    "event_type": ["Event Type", "የክስተት ዓይነት"],
    "count": ["Count", "ብዛት"],
    "percentage": ["Percentage", "መቶኛ"],
    "events_by_status": ["Events by Status", "ክስተቶች በሁኔታ"],
    "status_label": ["Status", "ሁኔታ"],
    "citizens_by_status": ["Citizens by Status", "ዜጎች በሁኔታ"],
    "events_by_zone": ["Events by Zone", "ክስተቶች በዞን"],
    "event_count": ["Event Count", "የክስተት ብዛት"],
    "percentage_of_total": ["Percentage of Total", "ከአጠቃላዩ መቶኛ"],
    "citizens_by_zone": ["Citizens by Zone", "ዜጎች በዞን"],
    "citizen_count": ["Citizen Count", "የዜጋ ብዛት"],
    "excel_report_downloaded_successfully": ["Excel report downloaded successfully", "የኤክሴል ሪፖርት በተሳካ ሁኔታ ወርዷል"],
    "failed_to_generate_excel": ["Failed to generate Excel report", "የኤክሴል ሪፖርት ማመንጨት አልተሳካም"],
    "print_dialog_opened": ["Print dialog opened", "የማተሚያ መገናኛ ተከፍቷል"],
    "detailed_analysis": ["Detailed Analysis", "ዝርዝር ትንታኔ"],
    "by_zone": ["By Zone", "በዞን"],
    "report_preview": ["Report Preview", "የሪፖርት ቅድመ-እይታ"],
    "back_to_generator": ["Back to Generator", "ወደ አምራች ተመለስ"],
    "download_text": ["Download Text", "ጽሑፍ አውርድ"],
    "download_excel": ["Download Excel", "ኤክሴል አውርድ"],
    "print": ["Print", "አትም"],
    "send_to_national": ["Send to National", "ለብሔራዊ ላክ"],
    "key_insights": ["Key Insights", "ቁልፍ ግንዛቤዎች"],
    "high_approval_rate": ["High Approval Rate", "ከፍተኛ የማጽደቅ መጠን"],
    "most_events_approved_first_submission": ["Most events are approved on first submission across zones", "አብዛኛዎቹ ክስተቶች በዞኖች ውስጥ በመጀመሪያ ማስረከቢያ ላይ ይፀድቃሉ"],
    "processing_time": ["Processing Time", "የማስኬጃ ጊዜ"],
    "avg_review_time_acceptable": ["Average review time is within acceptable limits", "አማካይ የግምገማ ጊዜ ተቀባይነት ባለው ገደብ ውስጥ ነው"],
    "trend": ["Trend", "አዝማሚያ"],
    "region_events_consistent_patterns": ["Region-wide events show consistent patterns across zones", "በክልል ውስጥ ያሉ ክስተቶች በዞኖች ውስጥ ወጥ የሆኑ ቅጦችን ያሳያሉ"],
    "recommendation": ["Recommendation", "ምክር"],
    "consider_standardized_training": ["Consider standardized training for under-performing zones", "በደካማ የሚሰሩ ዞኖች ላይ የተስተካከለ ስልጠና ለመስጠት ያስቡበት"],
    "prepared_by": ["Prepared by", "አዘጋጅ"],
    "representative": ["Representative", "ተወካይ"],
    "notes": ["Notes", "ማስታወሻዎች"],
    "report_generated_automatically": ["This report is generated automatically by the Vital Events System", "ይህ ሪፖርት አውቶማቲካዊ በሆነ መንገድ በወሳኝ ኩነት ሥርዓት ይፈጠራል"],
    "data_accurate_as_of_date": ["Data is accurate as of the generation date", "መረጃው ከተፈጠረበት ቀን ጀምሮ ትክክለኛ ነው"],
    "for_questions_contact_region": ["For questions, contact the region office", "ለጥያቄዎች፣ የክልልን ጽሕፈት ቤት ያነጋግሩ"],
    "generate_region_reports": ["Generate Region Reports", "የክልል ሪፖርቶችን አመንጭ"],
    "create_manage_region_reports_desc": ["Create and manage reports for your region's vital events statistics", "ለክልልዎ የወሳኝ ክስተት ስታቲስቲክስ ሪፖርቶችን ይፍጠሩ እና ያቀናብሩ"],
    "current_overview": ["Current Overview", "የአሁኑ አጠቃላይ እይታ"],
    "overview_data_could_not_be_loaded": ["Overview data could not be loaded. You can still generate reports below.", "የአጠቃላይ እይታ መረጃ መጫን አልተቻለም። አሁንም ከታች ሪፖርቶችን ማመንጨት ይችላሉ።"],
    "select_report_type": ["Select Report Type", "የሪፖርት ዓይነት ይምረጡ"],
    "daily_report": ["Daily Report", "ዕለታዊ ሪፖርት"],
    "summary_of_today_events": ["Summary of today's events", "የዛሬ ክስተቶች ማጠቃለያ"],
    "weekly_report": ["Weekly Report", "ሳምንታዊ ሪፖርት"],
    "weekly_summary_trends": ["Weekly summary and trends", "ሳምንታዊ ማጠቃለያ እና አዝማሚያዎች"],
    "monthly_report": ["Monthly Report", "ወርሃዊ ሪፖርት"],
    "comprehensive_monthly_analysis": ["Comprehensive monthly analysis", "አጠቃላይ ወርሃዊ ትንታኔ"],
    "quarterly_report": ["Quarterly Report", "ሩብ ዓመት ሪፖርት"],
    "quarterly_performance_review": ["Quarterly performance review", "ሩብ ዓመት የአፈፃፀም ግምገማ"],
    "select_period": ["Select Period", "ጊዜ ይምረጡ"],
    "start_date": ["Start Date", "የመነሻ ቀን"],
    "end_date": ["End Date", "የመጨረሻ ቀን"],
    "last_7_days": ["Last 7 Days", "ያለፉት 7 ቀናት"],
    "last_30_days": ["Last 30 Days", "ያለፉት 30 ቀናት"],
    "this_month": ["This Month", "ይህ ወር"],
    "report_options": ["Report Options", "የሪፖርት ምርጫዎች"],
    "include_detailed_event_breakdown": ["Include detailed event breakdown", "ዝርዝር የክስተት መከፋፈልን ያካትቱ"],
    "include_approval_rejection_analysis": ["Include approval/rejection analysis", "የማጽደቅ/መከልከል ትንታኔን ያካትቱ"],
    "include_citizen_demographic_data": ["Include citizen demographic data", "የዜጋ የትውልድ መረጃን ያካትቱ"],
    "include_recommendations": ["Include recommendations", "ምክሮችን ያካትቱ"],
    "generating": ["Generating...", "በማመንጨት ላይ..."],
    "generate_report": ["Generate Report", "ሪፖርት አመንጭ"]
};

for (const [key, [enVal, amVal]] of Object.entries(regionReportsStrings)) {
    if (!enData[key]) enData[key] = enVal;
    if (!amData[key]) amData[key] = amVal;
}

fs.writeFileSync(enPath, JSON.stringify(enData, null, 4));
fs.writeFileSync(amPath, JSON.stringify(amData, null, 4));

console.log('Translations updated successfully!');
