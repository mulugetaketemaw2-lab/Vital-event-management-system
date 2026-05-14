const fs = require('fs');

const enPath = 'c:/Users/Hp/Desktop/vital event register/frontend/src/locales/en/translation.json';
const amPath = 'c:/Users/Hp/Desktop/vital event register/frontend/src/locales/am/translation.json';

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const amData = JSON.parse(fs.readFileSync(amPath, 'utf8'));

const eventReviewStrings = {
    // EventReview.js component translations
    "error_loading_events": ["Error loading events", "ክስተቶችን በመጫን ላይ ስህተት ተፈጥሯል"],
    "please_upload_image": ["Please upload an image file", "እባክዎ የምስል ፋይል ስቀል"],
    "officer_name_required": ["Officer name is required for approval", "ለማጽደቅ የኃላፊው ስም ያስፈልጋል"],
    "official_seal_required": ["Official seal is required for approval", "ለማጽደቅ ይፋዊ ማኅተም ያስፈልጋል"],
    "officer_signature_required": ["Officer signature is required for approval", "ለማጽደቅ የኃላፊው ፊርማ ያስፈልጋል"],
    "successfully": ["successfully", "በተሳካ ሁኔታ"],
    "error_reviewing_event": ["Error reviewing event", "ክስተቱን በመገምገም ላይ ስህተት ተፈጥሯል"],
    "approval_details": ["Approval Details", "የማጽደቅ ዝርዝሮች"],
    "officer_name": ["Officer Name", "የኃላፊው ስም"],
    "enter_officer_full_name": ["Enter officer full name", "የኃላፊውን ሙሉ ስም ያስገቡ"],
    "upload_official_seal_signature": ["Upload Official Seal & Signature", "ይፋዊ ማኅተም እና ፊርማ ስቀል"],
    "seal_stamp": ["Seal / Stamp", "ማኅተም"],
    "officer_signature": ["Officer Signature", "የኃላፊው ፊርማ"],
    "approving_officer": ["Approving Officer", "አጽዳቂ ኃላፊ"],
    "seal": ["Seal", "ማኅተም"],
    "signature": ["Signature", "ፊርማ"],
    "no_events_found_category": ["No events found in this category.", "በዚህ ምድብ ውስጥ ምንም ክስተቶች አልተገኙም።"],
    "vital_event": ["Vital Event", "ወሳኝ ኩነት"],
    "unnamed_child": ["Unnamed Child", "ስም ያልተሰጠው ልጅ"],
    "unnamed_deceased": ["Unnamed Deceased", "ስም ያልተሰጠው ሟች"],
    "event_details": ["Event Details", "የክስተት ዝርዝሮች"],
    "deceased_profile_picture": ["Deceased Profile Picture", "የሟች የፊት ምስል"],
    "child_profile_photo": ["Child's Profile Photo", "የልጁ የትውልድ ምስል"],
    "husband_photo": ["Husband's Photo", "የባል ምስል"],
    "wife_photo": ["Wife's Photo", "የሚስት ምስል"],
    "father_photo": ["Father's Photo", "የአባት ምስል"],
    "mother_photo": ["Mother's Photo", "የእናት ምስል"],
    "view_max_quality": ["View Max Quality", "በከፍተኛ ጥራት እይ"],
    "registration_location_details": ["Registration Location Details", "የምዝገባ ቦታ ዝርዝሮች"],
    "na": ["N/A", "ተፈጻሚ የማይሆን"],
    "national_id_number": ["National ID Number", "ብሔራዊ መታወቂያ ቁጥር"],
    "event_date": ["Event Date", "የክስተት ቀን"],
    "registrant": ["Registrant", "መዝጋቢ"],
    "status_level": ["Status Level", "የሁኔታ ደረጃ"],
    "full_registration_details": ["Full Registration Details", "ሙሉ የምዝገባ ዝርዝሮች"],
    "view_file": ["View File", "ፋይል እይ"],
    "supporting_evidence": ["Supporting Evidence (Registration)", "ድጋፍ ሰጪ ማስረጃ (ምዝገባ)"],
    "proof_of_id": ["Proof of ID (PDF)", "የመታወቂያ ማረጋገጫ (ፒዲኤፍ)"],
    "support_doc": ["Support Doc", "ድጋፍ ሰጪ ሰነድ"],
    "history": ["History", "ታሪክ"],
    "comments": ["Comments", "አስተያየቶች"],
    "cancel": ["Cancel", "ሰርዝ"],
    "loading_events": ["Loading events...", "ክስተቶችን በመጫን ላይ..."],

    // Auto-translated field names for Event Details based on regex `replace(/([A-Z])/g, '_$1').toLowerCase()`
    "first_name": ["First Name", "ስም"],
    "last_name": ["Last Name", "የአባት ስም"],
    "date_of_birth": ["Date of Birth", "የተወለደበት ቀን"],
    "gender": ["Gender", "ፆታ"],
    "marital_status": ["Marital Status", "የጋብቻ ሁኔታ"],
    "child_name": ["Child Name", "የልጅ ስም"],
    "weight_at_birth": ["Weight at Birth", "ክብደት (ኪ.ግ)"],
    "place_of_birth": ["Place of Birth", "የትውልድ ቦታ"],
    "father_name": ["Father Name", "የአባት ስም"],
    "mother_name": ["Mother Name", "የእናት ስም"],
    "father_occupation": ["Father Occupation", "የአባት ስራ"],
    "mother_occupation": ["Mother Occupation", "የእናት ስራ"],
    "father_education": ["Father Education", "የአባት ትምህርት"],
    "mother_education": ["Mother Education", "የእናት ትምህርት"],
    "hospital_name": ["Hospital Name", "የሆስፒታል ስም"],
    "doctor_name": ["Doctor Name", "የዶክተር ስም"],
    "birth_type": ["Birth Type", "የትውልድ አይነት"],
    "number_of_children": ["Number of Children", "የልጆች ብዛት"],
    "birth_order": ["Birth Order", "የትውልድ ቅደም ተከተል"],
    "deceased_name": ["Deceased Name", "የሟች ስም"],
    "date_of_death": ["Date of Death", "የሞተበት ቀን"],
    "cause_of_death": ["Cause of Death", "የሞት ምክኒያት"],
    "place_of_death": ["Place of Death", "የሞተበት ቦታ"],
    "husband_name": ["Husband's Name", "የባል ስም"],
    "wife_name": ["Wife's Name", "የሚስት ስም"],
    "date_of_marriage": ["Date of Marriage", "የጋብቻ ቀን"],
    "place_of_marriage": ["Place of Marriage", "የጋብቻ ቦታ"],
    "divorced_husband_name": ["Husband's Name", "የባል ስም"],
    "divorced_wife_name": ["Wife's Name", "የሚስት ስም"],
    "date_of_divorce": ["Date of Divorce", "የፍቺ ቀን"],
    "court_name": ["Court Name", "የፍርድ ቤት ስም"],
    "adopted_child_name": ["Adopted Child Name", "የተረከበው ልጅ ስም"],
    "adoptive_father_name": ["Adoptive Father Name", "አሳዳጊ አባት ስም"],
    "adoptive_mother_name": ["Adoptive Mother Name", "አሳዳጊ እናት ስም"],
    "date_of_adoption": ["Date of Adoption", "የጉዲፈቻ ቀን"]
};

for (const [key, [enVal, amVal]] of Object.entries(eventReviewStrings)) {
    if (!enData[key]) enData[key] = enVal;
    if (!amData[key]) amData[key] = amVal;
}

fs.writeFileSync(enPath, JSON.stringify(enData, null, 4));
fs.writeFileSync(amPath, JSON.stringify(amData, null, 4));

console.log('Translations updated successfully!');
