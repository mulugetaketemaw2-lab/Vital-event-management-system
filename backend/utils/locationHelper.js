// Location mapping and helper functions for backend
const locationMapping = {
    regions: {
        '1': 'Addis Ababa', '2': 'Afar', '3': 'Amhara', '4': 'Benishangul-Gumuz', '5': 'Dire Dawa',
        '6': 'Gambela', '7': 'Harari', '8': 'Oromia', '9': 'Sidama', '10': 'Somali',
        '11': 'South West Ethiopia Peoples', '12': 'Southern Nations, Nationalities, and Peoples', '13': 'Tigray'
    },
    zones: {
        '1_1': 'Addis Ketema', '1_2': 'Akaki Kaliti', '1_3': 'Arada', '1_4': 'Bole', '1_5': 'Gulele',
        '1_6': 'Kirkos', '1_7': 'Kolfe Keranio', '1_8': 'Lideta', '1_9': 'Nifas Silk-Lafto', '1_10': 'Yeka',
        '2_1': 'North afar', '2_2': 'South afar', '2_3': 'afar1', '2_4': 'afar2', '2_5': 'afar3', '2_6': 'afar4',
        '3_1': 'North Gondar', '3_2': 'South Gondar', '3_3': 'North Wollo', '3_4': 'South Wollo',
        '3_5': 'Oromia Special Zone', '3_6': 'Bahir Dar Special Zone', '3_7': 'Awi Zone', '3_8': 'East Gojjam',
        '3_9': 'West Gojjam', '3_10': 'Wag Hemra Zone',
        '8_1': 'East Shewa', '8_2': 'West Shewa', '8_3': 'North Shewa', '8_4': 'Arsi', '8_5': 'Bale',
        '8_6': 'Borana', '8_7': 'East Hararghe', '8_8': 'West Hararghe', '8_9': 'Illubabor', '8_10': 'Jimma'
    },
    woredas: {
        '1_1_1': 'Ammanuel Area', '1_1_2': 'American Gibi', '1_1_3': 'Ched Tera', '1_1_4': 'Doro Tera', '1_1_5': 'Korech Tera',
        '1_2_1': 'Saris', '1_2_2': 'Kaliti', '1_2_3': 'Adiss', '1_2_4': 'Kebena',
        '1_3_1': 'Arada woreda', '1_3_2': 'Arada woreda01', '1_3_3': 'Arada woreda02', '1_3_4': 'Arada woreda03', '1_3_5': 'Arada woreda04',
        '1_4_1': 'Bole woreda01', '1_4_2': 'Bole woreda02', '1_4_3': 'Bole woreda03', '1_4_4': 'Bole woreda04', '1_4_5': 'Bole woreda05',
        '2_1_1': 'NF Woreda01', '2_1_2': 'NF Woreda02', '2_1_3': 'NF Woreda03', '2_1_4': 'NF Woreda04', '2_1_5': 'NF Woreda05',
        '2_2_1': 'SF Woreda01', '2_2_2': 'SF Woreda02', '2_2_3': 'SF Woreda03', '2_2_4': 'SF Woreda04', '2_2_5': 'SF Woreda05',
        '2_3_1': 'afar1 Woreda01', '2_3_2': 'afar1 Woreda02', '2_3_3': 'afar1 Woreda03',
        '3_1_1': 'Gondar Zuria', '3_1_2': 'Dabat', '3_1_3': 'Debark', '3_1_4': 'Metema', '3_1_5': 'Quara',
        '3_2_1': 'SG woreda01', '3_2_2': 'SG woreda02', '3_2_3': 'SG woreda03', '3_2_4': 'SG woreda04', '3_2_5': 'SG woreda05',
        '3_3_1': 'NW woreda01', '3_3_2': 'NW woreda02', '3_3_3': 'NW woreda03', '3_3_4': 'NW woreda04', '3_3_5': 'NW woreda05',
        '3_4_1': 'Kombolcha', '3_4_2': 'Dessi', '3_4_3': 'Qalu', '3_4_4': 'Harbu', '3_4_5': 'Degan',
        '8_1_1': "Ada'a", '8_10_1': 'Jimma Town'
    },
    kebeles: {
        '1_1_1_1': 'Amanuel kebele01', '1_1_1_2': 'Amanuel kebele02', '1_1_1_3': 'Amanuel kebele03', '1_1_1_4': 'Amanuel kebele04',
        '1_2_1_1': 'Saris kebele01', '1_4_1_1': 'Bole Medhanialem', '1_10_1_1': 'Kebele 01',
        '3_1_1_1': 'Azezo Tekle Haimanot', '3_4_1_1': 'Kombolcha01', '3_4_1_2': 'Kombolcha02', '3_4_1_3': 'Kombolcha03', '3_4_1_4': 'Kombolcha04',
        '8_1_1_1': 'Bishoftu Town Kebele 01', '8_10_1_1': 'Jimma Kebele 01'
    }
};

const convertLocationCodesToNames = (location) => {
    if (!location) return location;
    const converted = { ...location };

    // Function to handle each level
    const processLevel = (field, mapping) => {
        const val = converted[field];
        if (!val) return;

        if (mapping[val]) {
            // It's a code
            converted[`${field}Code`] = val;
            converted[field] = mapping[val];
            converted[`${field}Name`] = mapping[val];
        } else {
            // It might be a name already
            const code = Object.keys(mapping).find(k => mapping[k].toLowerCase() === val.toLowerCase());
            if (code) {
                converted[`${field}Code`] = code;
                converted[`${field}Name`] = val;
            }
        }
    };

    processLevel('region', locationMapping.regions);
    processLevel('zone', locationMapping.zones);
    processLevel('woreda', locationMapping.woredas);
    processLevel('kebele', locationMapping.kebeles);

    return converted;
};

const getRegex = (val) => {
    if (!val) return null;
    let pattern = String(val).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Handle common variations in Ethiopia (e.g., Kombolcha vs Kombolicha)
    if (pattern.match(/Kombolcha/i)) pattern = pattern.replace(/Kombolcha/i, 'Kombol[i]?cha');
    if (pattern.match(/Kombolicha/i)) pattern = pattern.replace(/Kombolicha/i, 'Kombol[i]?cha');
    
    // Handle variable spacing (e.g. "Kebele 01" vs "Kebele01")
    pattern = pattern.replace(/\s+/g, '\\s*');
    
    // Add \s* around numbers specifically
    pattern = pattern.replace(/(\d+)/g, '\\s*$1\\s*');

    return new RegExp(`^${pattern}$`, 'i');
};

const buildJurisdictionQuery = (location, role) => {
    if (!location) return {};
    
    const query = {};
    const levels = ['region', 'zone', 'woreda', 'kebele'];
    const roleToLevelIdx = {
        'national': -1,
        'region': 0, 'region_representative': 0,
        'zone': 1, 'zone_representative': 1,
        'woreda': 2, 'woreda_representative': 2,
        'kebele': 3, 'kebele_representative': 3,
        'citizen': null
    };

    const targetLevelIdx = roleToLevelIdx[role];
    if (targetLevelIdx === -1 || targetLevelIdx === null) return {};

    // For each level up to the user's level, we need a match
    const andParts = [];
    for (let i = 0; i <= targetLevelIdx; i++) {
        const level = levels[i];
        const name = location[`${level}Name`] || location[level];
        const code = location[`${level}Code`];
        
        const orParts = [];
        if (name) {
            const regex = getRegex(name);
            orParts.push({ [`location.${level}`]: regex });
            orParts.push({ [`location.${level}Name`]: regex });
        }
        if (code) {
            orParts.push({ [`location.${level}`]: code });
            orParts.push({ [`location.${level}Code`]: code });
        }

        if (orParts.length > 0) {
            andParts.push({ $or: orParts });
        }
    }

    const jurisdictionQuery = andParts.length > 0 ? { $and: andParts } : {};
    console.log(`[buildJurisdictionQuery] Role: ${role}, Location: ${JSON.stringify(location)}, Resulting Query: ${JSON.stringify(jurisdictionQuery)}`);
    return jurisdictionQuery;
};

const convertLocationNamesToCodes = (location) => {
    if (!location) return location;
    const converted = { ...location };

    if (converted.region) {
        const entry = Object.entries(locationMapping.regions).find(([k, v]) => v.toLowerCase() === converted.region.toLowerCase());
        if (entry) converted.regionCode = entry[0];
    }
    if (converted.zone) {
        const entry = Object.entries(locationMapping.zones).find(([k, v]) => v.toLowerCase() === converted.zone.toLowerCase());
        if (entry) converted.zoneCode = entry[0];
    }
    if (converted.woreda) {
        const entry = Object.entries(locationMapping.woredas).find(([k, v]) => v.toLowerCase() === converted.woreda.toLowerCase());
        if (entry) converted.woredaCode = entry[0];
    }
    if (converted.kebele) {
        const entry = Object.entries(locationMapping.kebeles).find(([k, v]) => v.toLowerCase() === converted.kebele.toLowerCase());
        if (entry) converted.kebeleCode = entry[0];
    }
    return converted;
};

const validateLocationHierarchy = (location) => {
    if (!location) return true;

    // Only validate using explicit codes — NOT names
    // Codes are numeric-based like '1', '1_1', '1_1_1', '1_1_1_1'
    // If no codes are available, skip validation (location names are allowed)
    const region = location.regionCode;
    const zone = location.zoneCode;
    const woreda = location.woredaCode;
    const kebele = location.kebeleCode;

    // If no codes at all, validation passes (names-only location is acceptable)
    if (!region && !zone && !woreda && !kebele) {
        return true;
    }

    // Only validate parent-child relationship when both levels have codes
    if (zone && region && !zone.startsWith(`${region}_`)) {
        console.warn(`Hierarchy breach: Zone ${zone} does not belong to Region ${region}`);
        return false;
    }

    if (woreda && zone && !woreda.startsWith(`${zone}_`)) {
        console.warn(`Hierarchy breach: Woreda ${woreda} does not belong to Zone ${zone}`);
        return false;
    }

    if (kebele && woreda && !kebele.startsWith(`${woreda}_`)) {
        console.warn(`Hierarchy breach: Kebele ${kebele} does not belong to Woreda ${woreda}`);
        return false;
    }

    return true;
};

const isLocationMatch = (loc1, loc2, level) => {
    if (!loc1 || !loc2) return false;
    
    // Check codes first (exact)
    const code1 = loc1[`${level}Code`] || (level === 'region' ? loc1.region : level === 'zone' ? loc1.zone : level === 'woreda' ? loc1.woreda : level === 'kebele' ? loc1.kebele : null);
    const code2 = loc2[`${level}Code`] || (level === 'region' ? loc2.region : level === 'zone' ? loc2.zone : level === 'woreda' ? loc2.woreda : level === 'kebele' ? loc2.kebele : null);
    
    if (code1 && code2 && String(code1) === String(code2)) return true;
    
    // Check names with regex
    const name1 = loc1[`${level}Name`] || loc1[level];
    const name2 = loc2[`${level}Name`] || loc2[level];
    
    if (name1 && name2) {
        const regex = getRegex(name1);
        return regex.test(name2);
    }
    
    return false;
};

module.exports = {
    locationMapping,
    convertLocationCodesToNames,
    convertLocationNamesToCodes,
    validateLocationHierarchy,
    getRegex,
    buildJurisdictionQuery,
    isLocationMatch
};
