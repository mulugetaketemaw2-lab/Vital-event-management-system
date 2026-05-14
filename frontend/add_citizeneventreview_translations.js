const fs = require('fs');

const enPath = 'c:/Users/Hp/Desktop/vital event register/frontend/src/locales/en/translation.json';
const amPath = 'c:/Users/Hp/Desktop/vital event register/frontend/src/locales/am/translation.json';

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const amData = JSON.parse(fs.readFileSync(amPath, 'utf8'));

const commonStrings = {
    // CitizenEventReview translations
    'please_log_in_to_access': ['Please log in to access this page', 'ይምዝገቡ ወደዚህ ገጽ ለመግባት እባክዎ ይግቡ'],
    'failed_to_load_citizens': ['Failed to load citizens', 'ዜጎችን መጫን አልተሳካም'],
    'error_loading_citizens': ['Error loading citizens', 'ዜጎችን በመጫን ላይ ስህተት ተከስቷል'],
    'please_upload_image': ['Please upload an image file (JPG, PNG)', 'እባክዎ የምስል ፋይል ስቀል ይስቀሉ (JPG, PNG)'],
    'officer_name_required': ['Officer Name is required for approval', 'ለማጽደቅ የኦፊሰር ስም ያስፈልጋል'],
    'official_seal_required': ['Official Seal is required', 'ይፋዊ ማኅተም ያስፈልጋል'],
    'officer_signature_required_draw': ['Officer Signature is required — please draw your signature', 'የኦፊሰር ፊርማ ያስፈልጋል — እባክዎ ፊርማዎን ይሳሉ'],
    'citizen_registration_approved': ['Citizen registration approved', 'የዜጋ ምዝገባ ጸድቋል'],
    'citizen_registration_rejected': ['Citizen registration rejected', 'የዜጋ ምዝገባ ውድቅ ተደርጓል'],
    'error_reviewing_citizen': ['Error reviewing citizen', 'ዜጋን በመገምገም ላይ ስህተት ተከስቷል'],
    'loading_citizen_registrations_review': ['Loading citizen registrations for review...', 'የዜጋ ምዝገባዎችን ለግምገማ በመጫን ላይ...'],
    'no_citizen_submissions': ['There are currently no citizen registration submissions in this category.', 'በአሁኑ ጊዜ በዚህ ምድብ ውስጥ ምንም የዜጋ ምዝገባ ምዝገባዎች የሉም።'],
    'you_can_also': ['You can also ', 'እንዲሁም ይችላሉ '],
    'refresh': ['refresh', 'አድስ'],
    'to_check_new_submissions': [' to check for new submissions.', ' አዳዲስ ምዝገባዎችን ለመመልከት።'],
    'your_current_jurisdiction': ['Your Current Jurisdiction', 'የአሁኑ የእርስዎ ሥልጣን'],
    'not_assigned': ['Not assigned', 'አልተመደበም'],
    'citizen_registration_review': ['Citizen Registration Review', 'የዜጋ ምዝገባ ግምገማ'],
    'review_verify_citizens_desc': ['Review and verify citizen registrations from your kebele.', 'ከቀበሌዎ የዜጋ ምዝገባዎችን ይገምግሙ እና ያረጋግጡ።'],
    'approved_citizens_can_submit': ['Approved citizens can then submit vital events.', 'የጸደቁ ዜጎች ከዚያ ወሳኝ ክስተቶችን ማቅረብ ይችላሉ።'],
    'pending_registrations': ['Pending Registrations', 'በመጠባበቅ ላይ ያሉ ምዝገባዎች'],
    'registered_on': ['Registered', 'ተመዝግቧል'],
    'gender': ['Gender', 'ፆታ'],
    'occupation': ['Occupation', 'ሥራ'],
    'education': ['Education', 'ትምህርት'],
    'marital_status': ['Marital Status', 'የጋብቻ ሁኔታ'],
    'hide_details': ['Hide Details', 'ዝርዝሮችን ደብቅ'],
    'view_full_details': ['View Full Details', 'ሙሉ ዝርዝሮችን ይመልከቱ'],
    'location_details': ['Location Details', 'የአካባቢ ዝርዝሮች'],
    'family_information': ['Family Information', 'የቤተሰብ መረጃ'],
    'fathers_name': ['Father\'s Name', 'የአባት ስም'],
    'mothers_name': ['Mother\'s Name', 'የእናት ስም'],
    'fathers_occupation': ['Father\'s Occupation', 'የአባት ሥራ'],
    'mothers_occupation': ['Mother\'s Occupation', 'የእናት ሥራ'],
    'residential_address': ['Residential Address', 'የመኖሪያ አድራሻ'],
    'house_number': ['House Number', 'የቤት ቁጥር'],
    'specific_location': ['Specific Location', 'የተለየ አካባቢ'],
    'kebele_approval_initial': ['Kebele Approval (Initial Verification)', 'የቀበሌ ማረጋገጫ (የመጀመሪያ ማረጋገጫ)'],
    'approving_officer': ['Approving Officer', 'የሚያጸድቅ ኦፊሰር'],
    'approved_at': ['Approved At', 'የጸደቀበት ጊዜ'],
    'officer_signature': ['Officer Signature', 'የኦፊሰር ፊርማ'],
    'woreda_approval_tier2': ['Woreda Approval (Tier 2 Verification)', 'የወረዳ ማረጋገጫ (የሁለተኛ ደረጃ ማረጋገጫ)'],
    'woreda_seal': ['Woreda Seal', 'የወረዳ ማኅተም'],
    'woreda_officer_signature': ['Woreda Officer Signature', 'የወረዳ ኦፊሰር ፊርማ'],
    'id_card_pdf': ['ID Card PDF', 'መታወቂያ ካርድ (PDF)'],
    'view_pdf': ['View PDF', 'PDF ይመልከቱ'],
    'supporting_document': ['Supporting Document', 'ደጋፊ ሰነድ'],
    'view_document': ['View Document', 'ሰነድ ይመልከቱ'],
    'select_action': ['Select Action', 'እርምጃ ይምረጡ'],
    'approve_registration': ['Approve Registration', 'ምዝገባን ማጽደቅ'],
    'reject_registration': ['Reject Registration', 'ምዝገባን ውድቅ ማድረግ'],
    'level_approval_details': ['Level Approval Details', 'የደረጃ ማጽደቂያ ዝርዝሮች'],
    'enter_approving_officer_name': ['Enter approving officer\'s full name', 'የሚያጸድቀውን ኦፊሰር ሙሉ ስም ያስገቡ'],
    'review_comments': ['Review Comments', 'የግምገማ አስተያየቶች'],
    'add_verification_notes': ['Add verification notes or rejection reasons...', 'የማረጋገጫ ማስታወሻዎችን ወይም የመከልከል ምክንያቶችን ያክሉ...'],
    'processing': ['Processing...', 'በማስኬድ ላይ...'],
    'complete_approval': ['Complete Approval', 'ማጽደቅን ያጠናቅቁ'],
    'confirm_rejection': ['Confirm Rejection', 'ውድቅ ማድረግን ያረጋግጡ'],
    'cancel': ['Cancel', 'ሰርዝ'],
    'start_review_process': ['Start Review Process', 'የግምገማ ሂደትን ይጀምሩ'],
    'no_citizens_in_level': ['No {{filter}} citizen registrations found at the {{level}} level.', 'በ{{level}} ደረጃ ምንም {{filter}} የዜጋ ምዝገባዎች አልተገኙም።'],
    'citizen_registration_review_guidelines': ['Citizen Registration Review Guidelines', 'የዜጋ ምዝገባ ግምገማ መመሪያዎች'],
    'when_to_approve': ['When to Approve', 'መቼ ማጽደቅ እንዳለበት'],
    'guideline_approve_1': ['All personal info is complete and accurate', 'ሁሉም የግል መረጃ የተሟላ እና ትክክለኛ ነው'],
    'guideline_approve_2': ['3×4 profile photo is clear and identifiable', 'የ3×4 መገለጫ ፎტო ግልጽ እና ሊታወቅ የሚችል ነው'],
    'guideline_approve_3': ['ID number is valid and matches records', 'የመታወቂያ ቁጥሩ ትክክለኛ ነው እና ከመዝገቦች ጋር ይዛመዳል'],
    'guideline_approve_4': ['Within your {{level}} jurisdiction', 'በ{{level}} ስልጣንዎ ውስጥ'],
    'guideline_approve_5': ['Required documents are provided and valid', 'አስፈላጊ ሰነዶች ቀርበዋል እና ትክክለኛ ናቸው'],
    'when_to_reject': ['When to Reject', 'መቼ ውድቅ መደረግ እንዳለበት'],
    'guideline_reject_1': ['Missing or unclear identification photo', 'የጠፋ ወይም ግልጽ ያልሆነ የመታወቂያ ፎტო'],
    'guideline_reject_2': ['Invalid or incorrect ID number', 'ልክ ያልሆነ ወይም የተሳሳተ የመታወቂያ ቁጥር'],
    'guideline_reject_3': ['Citizen not residing in your {{level}}', 'ዜጋው በ{{level}}ዎ ውስጥ አይኖርም'],
    'guideline_reject_4': ['Suspected fraudulent information', 'የተጠረጠረ የማጭበርበሪያ መረጃ'],
    'guideline_reject_5': ['Missing required supporting documents', 'የጎደሉ አስፈላጊ የድጋፍ ሰነዶች'],
    'important_notes': ['Important Notes', 'አስፈላጊ ማስታወሻዎች'],
    'important_note_1': ['Approved citizens can immediately start submitting vital events', 'የጸደቁ ዜጎች ወዲያውኑ ወሳኝ ክስተቶችን ማቅረብ መጀመር ይችላሉ'],
    'important_note_2': ['Rejected citizens will receive your comments for correction', 'ውድቅ የተደረጉ ዜጎች ለማስተካከል አስተያየቶችዎን ይቀበላሉ'],
    'important_note_3': ['Keep records of all approvals/rejections for audit purposes', 'ለሁሉም ማፅደቆች/መከልከሎች ለኦዲት ዓላማዎች መዝገቦችን ያስቀምጡ']
};

for (const [key, [enVal, amVal]] of Object.entries(commonStrings)) {
    if (!enData[key]) enData[key] = enVal;
    if (!amData[key]) amData[key] = amVal;
}

fs.writeFileSync(enPath, JSON.stringify(enData, null, 4));
fs.writeFileSync(amPath, JSON.stringify(amData, null, 4));

console.log('Translations updated successfully!');
