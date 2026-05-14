/**
 * Simple Phonetic Transliterator for Amharic
 * Converts common phonetic patterns to Ethiopic characters
 */

const mapping = {
    // basic vowels
    'a': '\u12a0', // አ
    'u': '\u12a1', // ኡ
    'i': '\u12a2', // ኢ
    'e': '\u12a4', // ኤ
    'o': '\u12a6', // ኦ

    // consonants + vowels
    'he': '\u1200', // ሀ
    'hu': '\u1201', // ሁ
    'hi': '\u1202', // ሂ
    'ha': '\u1203', // ሃ
    'ho': '\u1206', // ሆ

    'le': '\u1208', // ለ
    'lu': '\u1209', // ሉ
    'li': '\u120a', // ሊ
    'la': '\u120b', // ላ
    'lo': '\u120e', // ሎ

    'me': '\u1218', // መ
    'mu': '\u1219', // ሙ
    'mi': '\u121a', // ሚ
    'ma': '\u121b', // ማ
    'mo': '\u121e', // ሞ

    're': '\u1228', // ረ
    'ru': '\u1229', // ሩ
    'ri': '\u122a', // ሪ
    'ra': '\u122b', // ራ
    'ro': '\u122e', // ሮ

    'se': '\u1230', // ሰ
    'su': '\u1231', // ሱ
    'si': '\u1232', // ሲ
    'sa': '\u1233', // ሳ
    'so': '\u1236', // ሶ

    'she': '\u1238', // ሸ
    'shu': '\u1239', // ሹ
    'shi': '\u123a', // ሺ
    'sha': '\u123b', // ሻ
    'sho': '\u123e', // ሾ

    'ke': '\u12a8', // ከ
    'ku': '\u12a9', // ኩ
    'ki': '\u12aa', // ኪ
    'ka': '\u12ab', // ካ
    'ko': '\u12ae', // ኮ

    'be': '\u1260', // በ
    'bu': '\u1261', // ቡ
    'bi': '\u1262', // ቢ
    'ba': '\u1263', // ባ
    'bo': '\u1266', // ቦ

    'te': '\u1270', // ተ
    'tu': '\u1271', // ቱ
    'ti': '\u1272', // ቲ
    'ta': '\u1273', // ታ
    'to': '\u1276', // ቶ

    'ne': '\u1290', // ነ
    'nu': '\u1291', // ኑ
    'ni': '\u1292', // ኒ
    'na': '\u1293', // ና
    'no': '\u1296', // ኖ

    'ye': '\u12e8', // የ
    'yu': '\u12e9', // ዩ
    'yi': '\u12ea', // ዪ
    'ya': '\u12eb', // ያ
    'yo': '\u12ee', // ዮ

    'de': '\u12f0', // ደ
    'du': '\u12f1', // ዱ
    'di': '\u12f2', // ዲ
    'da': '\u12f3', // ዳ
    'do': '\u12f6', // ዶ

    'ge': '\u1308', // ገ
    'gu': '\u1309', // ጉ
    'gi': '\u130a', // ጊ
    'ga': '\u130b', // ጋ
    'go': '\u130e', // ጎ

    'fe': '\u1348', // ፈ
    'fu': '\u1349', // ፉ
    'fi': '\u134a', // ፊ
    'fa': '\u134b', // ፋ
    'fo': '\u134e', // ፎ
};

/**
 * Very basic phonetic transliterator.
 * Replace this with a full library for production use.
 */
export const transliterate = (text) => {
    let result = text;
    // This is a naive implementation that just replaces multi-char patterns
    // Sorted by length to replace longer patterns first (e.g., 'she' before 'se')
    const keys = Object.keys(mapping).sort((a, b) => b.length - a.length);

    for (const key of keys) {
        const regex = new RegExp(key, 'gi');
        result = result.replace(regex, mapping[key]);
    }

    return result;
};
