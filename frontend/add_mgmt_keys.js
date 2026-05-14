const fs = require('fs');
const enPath = 'c:/Users/Hp/Desktop/vital event register/frontend/src/locales/en/translation.json';
const amPath = 'c:/Users/Hp/Desktop/vital event register/frontend/src/locales/am/translation.json';

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const amData = JSON.parse(fs.readFileSync(amPath, 'utf8'));

const translations = {
    // Create Zone Form
    "enter_zone_name_error": ["Please enter a zone name", "እባክዎ የዞን ስም ያስገቡ"],
    "zone_account_created_success": ["Zone Representative account created successfully! They can login after you activate their account.", "የዞን ተወካይ መለያ በተሳካ ሁኔታ ተፈጥሯል! መለያቸውን ካነቁ በኋላ መግባት ይችላሉ።"],
    "error_creating_zone_rep": ["Error creating zone representative", "የዞን ተወካይ በመፍጠር ላይ ስህተት"],
    "create_zone_rep_account": ["Create Zone Representative Account", "የዞን ተወካይ መለያ ይፍጠሩ"],
    "create_zone_rep_desc": ["Create accounts for Zone Representatives in your region. They will manage woreda representatives.", "በክልልዎ ውስጥ ለሚኖሩ የዞን ተወካዮች መለያዎችን ይፍጠሩ። እነሱ የወረዳ ተወካዮችን ያስተዳድራሉ።"],
    "zone_assignment": ["Zone Assignment", "የዞን ምደባ"],
    "zone_name_asterisk": ["Zone Name: *", "የዞን ስም: *"],
    "enter_zone_name": ["Enter zone name", "የዞን ስም ያስገቡ"],
    "zone_created_in_your_region": ["Zone will be created in your region:", "ዞኑ በክልልዎ ውስጥ ይፈጠራል:"],
    "eg_zone_statistics_office": ["e.g., Zone Statistics Office", "ለምሳሌ፣ የዞን ስታቲስቲክስ ቢሮ"],
    "zone_office_address_placeholder": ["Zone office physical address", "የዞን ቢሮ አካላዊ አድራሻ"],
    "zone_account_created_inactive": ["The zone representative account will be created but inactive", "የዞን ተወካይ መለያ ይፈጠራል ነገር ግን ንቁ አይሆንም"],
    "activate_account_zone_management": ["You need to activate the account from the Zone Management page", "ከዞን አስተዳደር ገጽ መለያውን ማንቃት ያስፈልግዎታል"],
    "zone_reps_create_woreda_reps": ["Zone representatives can then create Woreda representatives", "የዞን ተወካዮች በመቀጠል የወረዳ ተወካዮችን መፍጠር ይችላሉ"],
    "creating_zone_account_btn": ["Creating Zone Account...", "የዞን መለያ በመፍጠር ላይ..."],
    "create_zone_rep_btn": ["Create Zone Representative", "የዞን ተወካይ ይፍጠሩ"],

    // Zone Management
    "error_fetching_zone_reps": ["Error fetching zone representatives", "የዞን ተወካዮችን በማምጣት ላይ ስህተት"],
    "error_fetching_pending_zone_reps": ["Error fetching pending zone representatives", "በመጠባበቅ ላይ ያሉ የዞን ተወካዮችን በማምጣት ላይ ስህተት"],
    "zone_rep_activated_success": ["Zone Representative activated successfully", "የዞን ተወካይ በተሳካ ሁኔታ ነቅቷል"],
    "error_activating_zone_rep": ["Error activating zone representative", "የዞን ተወካይን በማንቃት ላይ ስህተት"],
    "loading_zone_reps": ["Loading zone representatives...", "የዞን ተወካዮችን በመጫን ላይ..."],
    "zone_reps_management": ["Zone Representatives Management", "የዞን ተወካዮች አስተዳደር"],
    "all_zones": ["All Zones", "ሁሉም ዞኖች"],
    "no_pending_zone_reps": ["No pending zone representatives", "በመጠባበቅ ላይ ያሉ የዞን ተወካዮች የሉም"],
    "no_zone_reps_found": ["No zone representatives found", "ምንም የዞን ተወካዮች አልተገኙም"],
    "zone_label": ["Zone:", "ዞን:"],

    // Woreda form
    "enter_woreda_name_error": ["Please enter a woreda name", "እባክዎ የወረዳ ስም ያስገቡ"],
    "woreda_account_created_success": ["Woreda Representative account created successfully! They can login after you activate their account.", "የወረዳ ተወካይ መለያ በተሳካ ሁኔታ ተፈጥሯል! መለያቸውን ካነቁ በኋላ መግባት ይችላሉ።"],
    "error_creating_woreda_rep": ["Error creating woreda representative", "የወረዳ ተወካይ በመፍጠር ላይ ስህተት"],
    "create_woreda_rep_account": ["Create Woreda Representative Account", "የወረዳ ተወካይ መለያ ይፍጠሩ"],
    "create_woreda_rep_desc": ["Create accounts for Woreda Representatives in your zone. They will manage kebele representatives.", "በዞንዎ ውስጥ ለሚኖሩ የወረዳ ተወካዮች መለያዎችን ይፍጠሩ። እነሱ የቀበሌ ተወካዮችን ያስተዳድራሉ።"],
    "woreda_assignment": ["Woreda Assignment", "የወረዳ ምደባ"],
    "woreda_name_asterisk": ["Woreda Name: *", "የወረዳ ስም: *"],
    "enter_woreda_name": ["Enter woreda name", "የወረዳ ስም ያስገቡ"],
    "woreda_created_in_your_zone": ["Woreda will be created in your zone:", "ወረዳው በዞንዎ ውስጥ ይፈጠራል:"],
    "eg_woreda_statistics_office": ["e.g., Woreda Statistics Office", "ለምሳሌ፣ የወረዳ ስታቲስቲክስ ቢሮ"],
    "woreda_office_address_placeholder": ["Woreda office physical address", "የወረዳ ቢሮ አካላዊ አድራሻ"],
    "woreda_account_created_inactive": ["The woreda representative account will be created but inactive", "የወረዳ ተወካይ መለያ ይፈጠራል ነገር ግን ንቁ አይሆንም"],
    "activate_account_woreda_management": ["You need to activate the account from the Woreda Management page", "ከወረዳ አስተዳደር ገጽ መለያውን ማንቃት ያስፈልግዎታል"],
    "woreda_reps_create_kebele_reps": ["Woreda representatives can then create Kebele representatives", "የወረዳ ተወካዮች በመቀጠል የቀበሌ ተወካዮችን መፍጠር ይችላሉ"],
    "creating_woreda_account_btn": ["Creating Woreda Account...", "የወረዳ መለያ በመፍጠር ላይ..."],
    "create_woreda_rep_btn": ["Create Woreda Representative", "የወረዳ ተወካይ ይፍጠሩ"],

    // Woreda Management
    "error_fetching_woreda_reps": ["Error fetching woreda representatives", "የወረዳ ተወካዮችን በማምጣት ላይ ስህተት"],
    "error_fetching_pending_woreda_reps": ["Error fetching pending woreda representatives", "በመጠባበቅ ላይ ያሉ የወረዳ ተወካዮችን በማምጣት ላይ ስህተት"],
    "woreda_rep_activated_success": ["Woreda Representative activated successfully", "የወረዳ ተወካይ በተሳካ ሁኔታ ነቅቷል"],
    "error_activating_woreda_rep": ["Error activating woreda representative", "የወረዳ ተወካይን በማንቃት ላይ ስህተት"],
    "loading_woreda_reps": ["Loading woreda representatives...", "የወረዳ ተወካዮችን በመጫን ላይ..."],
    "woreda_reps_management": ["Woreda Representatives Management", "የወረዳ ተወካዮች አስተዳደር"],
    "all_woredas": ["All Woredas", "ሁሉም ወረዳዎች"],
    "no_pending_woreda_reps": ["No pending woreda representatives", "በመጠባበቅ ላይ ያሉ የወረዳ ተወካዮች የሉም"],
    "no_woreda_reps_found": ["No woreda representatives found", "ምንም የወረዳ ተወካዮች አልተገኙም"],
    "woreda_label": ["Woreda:", "ወረዳ:"],

    // Kebele form
    "enter_kebele_name_error": ["Please enter a kebele name", "እባክዎ የቀበሌ ስም ያስገቡ"],
    "kebele_account_created_success": ["Kebele Representative account created successfully! They can login after you activate their account.", "የቀበሌ ተወካይ መለያ በተሳካ ሁኔታ ተፈጥሯል! መለያቸውን ካነቁ በኋላ መግባት ይችላሉ።"],
    "error_creating_kebele_rep": ["Error creating kebele representative", "የቀበሌ ተወካይ በመፍጠር ላይ ስህተት"],
    "create_kebele_rep_account": ["Create Kebele Representative Account", "የቀበሌ ተወካይ መለያ ይፍጠሩ"],
    "create_kebele_rep_desc": ["Create accounts for Kebele Representatives in your woreda. They handle the front-line registrations.", "በወረዳዎ ውስጥ ለሚኖሩ የቀበሌ ተወካዮች መለያዎችን ይፍጠሩ። እነሱ ዋናዎቹን ምዝገባዎች ያስተዳድራሉ።"],
    "kebele_assignment": ["Kebele Assignment", "የቀበሌ ምደባ"],
    "kebele_name_asterisk": ["Kebele Name: *", "የቀበሌ ስም: *"],
    "enter_kebele_name": ["Enter kebele name", "የቀበሌ ስም ያስገቡ"],
    "kebele_created_in_your_woreda": ["Kebele will be created in your woreda:", "ቀበሌው በወረዳዎ ውስጥ ይፈጠራል:"],
    "eg_kebele_statistics_office": ["e.g., Kebele Office", "ለምሳሌ፣ የቀበሌ ቢሮ"],
    "kebele_office_address_placeholder": ["Kebele office physical address", "የቀበሌ ቢሮ አካላዊ አድራሻ"],
    "kebele_account_created_inactive": ["The kebele representative account will be created but inactive", "የቀበሌ ተወካይ መለያ ይፈጠራል ነገር ግን ንቁ አይሆንም"],
    "activate_account_kebele_management": ["You need to activate the account from the Kebele Management page", "ከቀበሌ አስተዳደር ገጽ መለያውን ማንቃት ያስፈልግዎታል"],
    "kebele_reps_handle_registrations": ["Kebele representatives will handle citizen and event registrations directly", "የቀበሌ ተወካዮች የዜጎችን እና የኩነቶችን ምዝገባዎች በቀጥታ ያስተዳድራሉ"],
    "creating_kebele_account_btn": ["Creating Kebele Account...", "የቀበሌ መለያ በመፍጠር ላይ..."],
    "create_kebele_rep_btn": ["Create Kebele Representative", "የቀበሌ ተወካይ ይፍጠሩ"],

    // Kebele Management
    "error_fetching_kebele_reps": ["Error fetching kebele representatives", "የቀበሌ ተወካዮችን በማምጣት ላይ ስህተት"],
    "error_fetching_pending_kebele_reps": ["Error fetching pending kebele representatives", "በመጠባበቅ ላይ ያሉ የቀበሌ ተወካዮችን በማምጣት ላይ ስህተት"],
    "kebele_rep_activated_success": ["Kebele Representative activated successfully", "የቀበሌ ተወካይ በተሳካ ሁኔታ ነቅቷል"],
    "error_activating_kebele_rep": ["Error activating kebele representative", "የቀበሌ ተወካይን በማንቃት ላይ ስህተት"],
    "loading_kebele_reps": ["Loading kebele representatives...", "የቀበሌ ተወካዮችን በመጫን ላይ..."],
    "kebele_reps_management": ["Kebele Representatives Management", "የቀበሌ ተወካዮች አስተዳደር"],
    "all_kebeles": ["All Kebeles", "ሁሉም ቀበሌዎች"],
    "no_pending_kebele_reps": ["No pending kebele representatives", "በመጠባበቅ ላይ ያሉ የቀበሌ ተወካዮች የሉም"],
    "no_kebele_reps_found": ["No kebele representatives found", "ምንም የቀበሌ ተወካዮች አልተገኙም"],
    "kebele_label": ["Kebele:", "ቀበሌ:"]

};

for (const [key, [enVal, amVal]] of Object.entries(translations)) {
    if (!enData[key]) enData[key] = enVal;
    if (!amData[key]) amData[key] = amVal;
}

fs.writeFileSync(enPath, JSON.stringify(enData, null, 4));
fs.writeFileSync(amPath, JSON.stringify(amData, null, 4));
