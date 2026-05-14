const fs = require('fs');
const path = 'c:/Users/Hp/Desktop/vital event register/frontend/src/locales/am/translation.json';
let text = fs.readFileSync(path, 'utf8');
const endContent = `,
    "forgot_password": "የይለፍ ቃልዎን ረስተዋል",
    "reset_here": "እዚህ ያስተካክሉ",
    "forgot_password_title": "የይለፍ ቃልዎን መልሰው ያግኙ",
    "forgot_password_desc": "የይለፍ ቃል ማስተካከያ ሊንክ እንዲላክልዎ የተመዘገቡበትን ኢሜይል ያስገቡ።",
    "please_enter_email": "እባክዎን የኢሜይል አድራሻዎን ያስገቡ",
    "reset_link_sent": "የይለፍ ቃል ማስተካከያ ሊንክ ወደ ኢሜይልዎ ተልኳል",
    "error_sending_reset": "ሊንኩን በመላክ ላይ ስህተት ተከስቷል",
    "email_sent_title": "ኢሜይልዎን ይመልከቱ",
    "email_sent_desc": "ወደ ኢሜይልዎ የይለፍ ቃል ማስተካከያ ሊንክ ልከናል። እንደገና ለመግባት በኢሜይሉ ውስጥ ያሉትን መመሪያዎች ይከተሉ።",
    "check_spam_folder": "ኢሜይሉ ካልደረስዎ፣ እባክዎ የስፓም (spam) ሳጥንዎን ይመልከቱ።",
    "remember_password": "የይለፍ ቃልዎ ትዝ ብሎዎታል?",
    "back_to_login": "ወደ መግቢያ ገጽ ይመለሱ",
    "sending": "በመላክ ላይ...",
    "send_reset_link": "አስተካክል ሊንክ ላክ",
    "reset_password_title": "አዲስ የይለፍ ቃል ያስገቡ",
    "reset_password_desc": "መለያዎን ለመጠበቅ አዲስና ጠንካራ የይለፍ ቃል ይፍጠሩ።",
    "new_password": "አዲስ የይለፍ ቃል",
    "confirm_new_password": "አዲሱን የይለፍ ቃል ያረጋግጡ",
    "enter_new_password": "አዲሱን የይለፍ ቃል እዚህ ያስገቡ",
    "password_min_6": "የይለፍ ቃል ቢያንስ 6 ፊደላት መሆን አለበት",
    "passwords_do_not_match": "የይለፍ ቃላቱ አይጣጣሙም",
    "password_reset_success": "የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀይሯል",
    "error_resetting_password": "የይለፍ ቃል ሲቀየር ስህተት ተከስቷል",
    "resetting": "በመቀየር ላይ...",
    "reset_password_btn": "የይለፍ ቃል ቀይር",
    "redirecting_to_login": "በተሳካ ሁኔታ ተቀይሯል! ወደ መግቢያ ገጽ በመመለስ ላይ..."
}`;

if (text.trim().endsWith('}')) {
    text = text.trim().slice(0, -1) + endContent + '\n}';
    fs.writeFileSync(path, text);
    console.log('✅ Amharic translations updated');
} else {
    console.log('⚠️ File did not end as expected');
}
