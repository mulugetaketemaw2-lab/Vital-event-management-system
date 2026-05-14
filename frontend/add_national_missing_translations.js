const fs = require('fs');

const enPath = 'c:/Users/Hp/Desktop/vital event register/frontend/src/locales/en/translation.json';
const amPath = 'c:/Users/Hp/Desktop/vital event register/frontend/src/locales/am/translation.json';

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const amData = JSON.parse(fs.readFileSync(amPath, 'utf8'));

const commonStrings = {
    'filter_by_region': ['Filter by Region', 'በክልል አጣራ'],
    'view': ['View', 'እይታ'],
    'citizen_birth_registration': ['Citizen Birth Registration', 'የዜጋ ልደት ምዝገባ'],
    'vital_event_registration': ['Vital Event Registration', 'የኩነት ምዝገባ'],
    'all': ['All', 'ሁሉንም'],
    'citizen_birth_registrations_title': ['Citizen Birth Registrations', 'የዜጋ ልደት ምዝገባዎች'],
    'vital_event_registrations_title': ['Vital Event Registrations', 'የኩነቶች ምዝገባዎች'],
    'report_inbox': ['Report Inbox', 'ሪፖርት ገቢ'],
    'records_tab': ['Records', 'መዝገቦች'],
    'All': ['All', 'ሁሉንም'],
    "Southern Nations, Nationalities, and Peoples' Region": ["Southern Nations, Nationalities, and Peoples' Region", "የደቡብ ብሔሮች ብሔረሰቦችና ህዝቦች ክልል"],
    "South West Ethiopia Peoples' Region": ["South West Ethiopia Peoples' Region", "የደቡብ ምዕራብ ኢትዮጵያ ህዝቦች ክልል"]
};

for (const [key, [enVal, amVal]] of Object.entries(commonStrings)) {
    if (!enData[key]) enData[key] = enVal;
    if (!amData[key]) amData[key] = amVal;
}

fs.writeFileSync(enPath, JSON.stringify(enData, null, 4));
fs.writeFileSync(amPath, JSON.stringify(amData, null, 4));

console.log('Translations updated successfully!');
