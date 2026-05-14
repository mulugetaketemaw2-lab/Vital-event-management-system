const fs = require('fs');

const enPath = 'c:/Users/Hp/Desktop/vital event register/frontend/src/locales/en/translation.json';
const amPath = 'c:/Users/Hp/Desktop/vital event register/frontend/src/locales/am/translation.json';

const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const amData = JSON.parse(fs.readFileSync(amPath, 'utf8'));

// Regions mapped to Amharic
const regions = {
    'Addis Ababa': 'አዲስ አበባ',
    'Afar': 'አፋር',
    'Amhara': 'አማራ',
    'Benishangul-Gumuz': 'ቤኒሻንጉል ጉምዝ',
    'Dire Dawa': 'ድሬ ዳዋ',
    'Gambela': 'ጋምቤላ',
    'Harari': 'ሐረሪ',
    'Oromia': 'ኦሮሚያ',
    'Sidama': 'ሲዳማ',
    'Somali': 'ሱማሌ',
    'South West Ethiopia Peoples': 'የደቡብ ምዕራብ ኢትዮጵያ ህዝቦች',
    'Southern Nations, Nationalities, and Peoples': 'ደቡብ ብሔሮች ብሔረሰቦችና ህዝቦች',
    'Tigray': 'ትግራይ'
};

const commonStrings = {
    'birth': ['Birth', 'ልደት'],
    'death': ['Death', 'ሞት'],
    'marriage': ['Marriage', 'ጋብቻ'],
    'divorce': ['Divorce', 'ፍቺ'],
    'adoption': ['Adoption', 'ጉዲፈቻ'],
    'Registration completed successfully!': ['Registration completed successfully!', 'ምዝገባ በተሳካ ሁኔታ ተጠናቋል!'],
    'Event registered successfully!': ['Event registered successfully!', 'ክስተቱ በተሳካ ሁኔታ ተመዝግቧል!'],
    'Error registering event': ['Error registering event', 'ክስተት በመመዝገብ ላይ ስህተት'],
    'please_select_event_type': ['Please select an event type to register', 'እባክዎ ለመመዝገብ የክስተት አይነት ይምረጡ'],
    'select_event_type': ['Select Event Type', 'የክስተት አይነት ይምረጡ']
};

for (const [key, amVal] of Object.entries(regions)) {
    if (!enData[key]) enData[key] = key;
    if (!amData[key]) amData[key] = amVal;
}

for (const [key, [enVal, amVal]] of Object.entries(commonStrings)) {
    if (!enData[key]) enData[key] = enVal;
    if (!amData[key]) amData[key] = amVal;
}

fs.writeFileSync(enPath, JSON.stringify(enData, null, 4));
fs.writeFileSync(amPath, JSON.stringify(amData, null, 4));

console.log('Translations updated successfully!');
