import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import './LocationSelector.css';

// Location mapping object - ADD THIS
const locationMapping = {
  regions: {
    '1': 'Addis Ababa',
    '2': 'Afar',
    '3': 'Amhara',
    '4': 'Benishangul-Gumuz',
    '5': 'Dire Dawa',
    '6': 'Gambela',
    '7': 'Harari',
    '8': 'Oromia',
    '9': 'Sidama',
    '10': 'Somali',
    '11': 'South West Ethiopia Peoples',
    '12': 'Southern Nations, Nationalities, and Peoples',
    '13': 'Tigray'
  },
  zones: {
    '1_1': 'Addis Ketema',
    '1_2': 'Akaki Kaliti',
    '1_3': 'Arada',
    '1_4': 'Bole',
    '1_5': 'Gulele',
    '1_6': 'Kirkos',
    '1_7': 'Kolfe Keranio',
    '1_8': 'Lideta',
    '1_9': 'Nifas Silk-Lafto',
    '1_10': 'Yeka',
    '2_1': 'North afar',
    '2_2': 'South afar',
    '2_3': 'afar1',
    '2_4': 'afar2',
    '2_5': 'afar3',
    '2_6': 'afar4',
    '3_1': 'North Gondar',
    '3_2': 'South Gondar',
    '3_3': 'North Wollo',
    '3_4': 'South Wollo',
    '3_5': 'Oromia Special Zone',
    '3_6': 'Bahir Dar Special Zone',
    '3_7': 'Awi Zone',
    '3_8': 'East Gojjam',
    '3_9': 'West Gojjam',
    '3_10': 'Wag Hemra Zone',
    '8_1': 'East Shewa',
    '8_2': 'West Shewa',
    '8_3': 'North Shewa',
    '8_4': 'Arsi',
    '8_5': 'Bale',
    '8_6': 'Borana',
    '8_7': 'East Hararghe',
    '8_8': 'West Hararghe',
    '8_9': 'Illubabor',
    '8_10': 'Jimma'
  },
  woredas: {
    '1_1_1': 'Ammanuel Area',
    '1_1_2': 'American Gibi',
    '1_1_3': 'Ched Tera',
    '1_1_4': 'Doro Tera',
    '1_1_5': 'Korech Tera',
    '1_2_1': 'Saris',
    '1_2_2': 'Kaliti',
    '1_2_3': 'Adiss',
    '1_2_4': 'Kebena',
    '1_3_1': 'Arada woreda',
    '1_3_2': 'Arada woreda01',
    '1_3_3': 'Arada woreda02',
    '1_3_4': 'Arada woreda03',
    '1_3_5': 'Arada woreda04',
    '1_4_1': 'Bole woreda01',
    '1_4_2': 'Bole woreda02',
    '1_4_3': 'Bole woreda03',
    '1_4_4': 'Bole woreda04',
    '1_4_5': 'Bole woreda05',
    '2_1_1': 'NF Woreda01',
    '2_1_2': 'NF Woreda02',
    '2_1_3': 'NF Woreda03',
    '2_1_4': 'NF Woreda04',
    '2_1_5': 'NF Woreda05',
    '2_2_1': 'SF Woreda01',
    '2_2_2': 'SF Woreda02',
    '2_2_3': 'SF Woreda03',
    '2_2_4': 'SF Woreda04',
    '2_2_5': 'SF Woreda05',
    '2_3_1': 'afar1 Woreda01',
    '2_3_2': 'afar1 Woreda02',
    '2_3_3': 'afar1 Woreda03',
    '2_3_4': 'afar1 Woreda04',
    '2_3_5': 'afar1 Woreda05',
    '3_1_1': 'Gondar Zuria',
    '3_1_2': 'Dabat',
    '3_1_3': 'Debark',
    '3_1_4': 'Metema',
    '3_1_5': 'Quara',
    '3_2_1': 'SG woreda01',
    '3_2_2': 'SG woreda02',
    '3_2_3': 'SG woreda03',
    '3_2_4': 'SG woreda04',
    '3_2_5': 'SG woreda05',
    '3_3_1': 'NW woreda01',
    '3_3_2': 'NW woreda02',
    '3_3_3': 'NW woreda03',
    '3_3_4': 'NW woreda04',
    '3_3_5': 'NW woreda05',
    '3_4_1': 'Kombolcha',
    '3_4_2': 'Dessi',
    '3_4_3': 'Qalu',
    '3_4_4': 'Harbu',
    '3_4_5': 'Degan',
    '8_1_1': "Ada'a",
    '8_1_2': 'Liben',
    '8_1_3': 'Boset',
    '8_1_4': 'Gimbichu',
    '8_1_5': 'Lome',
    '8_4_1': 'Arsi1',
    '8_4_2': 'Arsi2',
    '8_4_3': 'Arsi3',
    '8_4_4': 'Arsi4',
    '8_4_5': 'Arsi5',
    '8_10_1': 'Jimma Town',
    '8_10_2': 'Agaro',
    '8_10_3': 'Seka Chekorsa',
    '8_10_4': 'Manna',
    '8_10_5': 'Gomma'
  },
  kebeles: {
    '1_1_1_1': 'Amanuel kebele01',
    '1_1_1_2': 'Amanuel kebele02',
    '1_1_1_3': 'Amanuel kebele03',
    '1_1_1_4': 'Amanuel kebele04',
    '1_2_1_1': 'Saris kebele',
    '1_2_1_2': 'Saris kebele02',
    '1_2_1_3': 'Saris kebele03',
    '1_2_1_4': 'Saris kebele04',
    '1_3_1_1': 'Arada kebele',
    '1_3_1_2': 'Arada kebele01',
    '1_3_1_3': 'Arada kebele02',
    '1_3_1_4': 'Arada kebele03',
    '1_4_1_1': 'Bole Medhanialem',
    '1_4_1_2': 'Bole Arabsa',
    '1_4_1_3': 'Bole Bulbula',
    '1_4_1_4': 'Bole Mikael',
    '1_10_1_1': 'Kebele 01',
    '1_10_1_2': 'Kebele 02',
    '1_10_1_3': 'Kebele 03',
    '1_10_1_4': 'Kebele 04',
    '2_1_1_1': 'NF kebele01',
    '2_1_1_2': 'NF kebele02',
    '2_1_1_3': 'NF kebele03',
    '2_1_1_4': 'NF kebele04',
    '2_2_1_1': 'SF kebele01',
    '2_2_1_2': 'SF kebele02',
    '2_2_1_3': 'SF kebele03',
    '2_2_1_4': 'SF kebele04',
    '2_3_1_1': 'afar1 kebele01',
    '2_3_1_2': 'afar1 kebele02',
    '2_3_1_3': 'afar1 kebele03',
    '2_3_1_4': 'afar1 kebele04',
    '3_1_1_1': 'Azezo Tekle Haimanot',
    '3_1_1_2': 'Maraki',
    '3_1_1_3': 'Sof Omar',
    '3_1_1_4': 'Woleka',
    '3_2_1_1': 'SG kebele01',
    '3_2_1_2': 'SG kebele02',
    '3_2_1_3': 'SG kebele03',
    '3_2_1_4': 'SG kebele04',
    '3_3_1_1': 'NW kebele01',
    '3_3_1_2': 'NW kebele02',
    '3_3_1_3': 'NW kebele03',
    '3_3_1_4': 'NW kebele04',
    '3_4_1_1': 'Kombolcha01',
    '3_4_1_2': 'Kombolcha02',
    '3_4_1_3': 'Kombolcha03',
    '3_4_1_4': 'Kombolcha04',
    '3_4_2_1': 'Dessi01',
    '3_4_2_2': 'Dessi02',
    '3_4_2_3': 'Dessi03',
    '3_4_2_4': 'Dessi04',
    '3_4_3_1': 'Qalu01',
    '3_4_3_2': 'Qalu02',
    '3_4_3_3': 'Qalu03',
    '3_4_3_4': 'Qalu04',
    '3_8_1_1': 'Kebele 01',
    '3_8_1_2': 'Kebele 02',
    '3_8_1_3': 'Kebele 03',
    '3_8_1_4': 'Kebele 04',
    '8_1_1_1': 'Bishoftu Town Kebele 01',
    '8_1_1_2': 'Bishoftu Town Kebele 02',
    '8_1_1_3': 'Bishoftu Town Kebele 03',
    '8_1_1_4': 'Bishoftu Town Kebele 04',
    '8_10_1_1': 'Jimma Kebele 01',
    '8_10_1_2': 'Jimma Kebele 02',
    '8_10_1_3': 'Jimma Kebele 03',
    '8_10_1_4': 'Jimma Kebele 04'
  }
};

/**
 * Universal helper to get location name from ID
 * @param {string} type - 'region', 'zone', 'woreda', or 'kebele'
 * @param {string} id - The location ID
 * @returns {string} - The human-readable name or the ID if not found
 */
const getLocationName = (type, id) => {
  if (!id) return '';

  const mapping = {
    region: locationMapping.regions,
    zone: locationMapping.zones,
    woreda: locationMapping.woredas,
    kebele: locationMapping.kebeles
  };

  const typeMapping = mapping[type];
  if (!typeMapping) return id;

  return typeMapping[id] || id;
};

// Complete Ethiopian administrative data - moved outside component
const ethiopianLocations = {
  regions: [
    { _id: '1', name: 'Addis Ababa' },
    { _id: '2', name: 'Afar' },
    { _id: '3', name: 'Amhara' },
    { _id: '4', name: 'Benishangul-Gumuz' },
    { _id: '5', name: 'Dire Dawa' },
    { _id: '6', name: 'Gambela' },
    { _id: '7', name: 'Harari' },
    { _id: '8', name: 'Oromia' },
    { _id: '9', name: 'Sidama' },
    { _id: '10', name: 'Somali' },
    { _id: '11', name: 'South West Ethiopia Peoples' },
    { _id: '12', name: 'Southern Nations, Nationalities, and Peoples' },
    { _id: '13', name: 'Tigray' }
  ],
  zones: {
    '1': [
      { _id: '1_1', name: 'Addis Ketema' },
      { _id: '1_2', name: 'Akaki Kaliti' },
      { _id: '1_3', name: 'Arada' },
      { _id: '1_4', name: 'Bole' },
      { _id: '1_5', name: 'Gulele' },
      { _id: '1_6', name: 'Kirkos' },
      { _id: '1_7', name: 'Kolfe Keranio' },
      { _id: '1_8', name: 'Lideta' },
      { _id: '1_9', name: 'Nifas Silk-Lafto' },
      { _id: '1_10', name: 'Yeka' }
    ],
    '2': [
      { _id: '2_1', name: 'North afar' },
      { _id: '2_2', name: 'South afar' },
      { _id: '2_3', name: 'afar1' },
      { _id: '2_4', name: 'afar2' },
      { _id: '2_5', name: 'afar3' },
      { _id: '2_6', name: 'afar4' },
    ],
    '3': [
      { _id: '3_1', name: 'North Gondar' },
      { _id: '3_2', name: 'South Gondar' },
      { _id: '3_3', name: 'North Wollo' },
      { _id: '3_4', name: 'South Wollo' },
      { _id: '3_5', name: 'Oromia Special Zone' },
      { _id: '3_6', name: 'Bahir Dar Special Zone' },
      { _id: '3_7', name: 'Awi Zone' },
      { _id: '3_8', name: 'East Gojjam' },
      { _id: '3_9', name: 'West Gojjam' },
      { _id: '3_10', name: 'Wag Hemra Zone' }
    ],
    '8': [
      { _id: '8_1', name: 'East Shewa' },
      { _id: '8_2', name: 'West Shewa' },
      { _id: '8_3', name: 'North Shewa' },
      { _id: '8_4', name: 'Arsi' },
      { _id: '8_5', name: 'Bale' },
      { _id: '8_6', name: 'Borana' },
      { _id: '8_7', name: 'East Hararghe' },
      { _id: '8_8', name: 'West Hararghe' },
      { _id: '8_9', name: 'Illubabor' },
      { _id: '8_10', name: 'Jimma' }
    ]
  },
  woredas: {
    '1_1': [
      { _id: '1_1_1', name: 'Ammanuel Area' },
      { _id: '1_1_2', name: 'American Gibi' },
      { _id: '1_1_3', name: 'Ched Tera' },
      { _id: '1_1_4', name: 'Doro Tera' },
      { _id: '1_1_5', name: 'Korech Tera' },
    ],
    '1_2': [
      { _id: '1_2_1', name: 'Saris' },
      { _id: '1_2_2', name: 'Kaliti' },
      { _id: '1_2_3', name: 'Adiss' },
      { _id: '1_2_4', name: 'Kebena' }
    ],
    '1_3': [
      { _id: '1_3_1', name: 'Arada woreda' },
      { _id: '1_3_2', name: 'Arada woreda01' },
      { _id: '1_3_3', name: 'Arada woreda02' },
      { _id: '1_3_4', name: 'Arada woreda03' },
      { _id: '1_3_5', name: 'Arada woreda04' }
    ],
    '1_4': [
      { _id: '1_4_1', name: 'Bole woreda01' },
      { _id: '1_4_2', name: 'Bole woreda02' },
      { _id: '1_4_3', name: 'Bole woreda03' },
      { _id: '1_4_4', name: 'Bole woreda04' },
      { _id: '1_4_5', name: 'Bole woreda05' }
    ],
    '2_1': [
      { _id: '2_1_1', name: 'NF Woreda01' },
      { _id: '2_1_2', name: 'NF Woreda02' },
      { _id: '2_1_3', name: 'NF Woreda03' },
      { _id: '2_1_4', name: 'NF Woreda04' },
      { _id: '2_1_5', name: 'NF Woreda05' }
    ],
    '2_2': [
      { _id: '2_2_1', name: 'SF Woreda01' },
      { _id: '2_2_2', name: 'SF Woreda02' },
      { _id: '2_2_3', name: 'SF Woreda03' },
      { _id: '2_2_4', name: 'SF Woreda04' },
      { _id: '2_2_5', name: 'SF Woreda05' }
    ],
    '2_3': [
      { _id: '2_3_1', name: 'afar1 Woreda01' },
      { _id: '2_3_2', name: 'afar1 Woreda02' },
      { _id: '2_3_3', name: 'afar1 Woreda03' },
      { _id: '2_3_4', name: 'afar1 Woreda04' },
      { _id: '2_3_5', name: 'afar1 Woreda05' }
    ],
    '3_1': [
      { _id: '3_1_1', name: 'Gondar Zuria' },
      { _id: '3_1_2', name: 'Dabat' },
      { _id: '3_1_3', name: 'Debark' },
      { _id: '3_1_4', name: 'Metema' },
      { _id: '3_1_5', name: 'Quara' }
    ],
    '3_2': [
      { _id: '3_2_1', name: 'SG woreda01' },
      { _id: '3_2_2', name: 'SG woreda02' },
      { _id: '3_2_3', name: 'SG woreda03' },
      { _id: '3_2_4', name: 'SG woreda04' },
      { _id: '3_2_5', name: 'SG woreda05' }
    ],
    '3_3': [
      { _id: '3_3_1', name: 'NW woreda01' },
      { _id: '3_3_2', name: 'NW woreda02' },
      { _id: '3_3_3', name: 'NW woreda03' },
      { _id: '3_3_4', name: 'NW woreda04' },
      { _id: '3_3_5', name: 'NW woreda05' }
    ], '3_4': [
      { _id: '3_4_1', name: 'Kombolcha' },
      { _id: '3_4_2', name: 'Dessi' },
      { _id: '3_4_3', name: 'Qalu' },
      { _id: '3_4_4', name: 'Harbu' },
      { _id: '3_4_5', name: 'Degan' }

    ],
    '8_1': [
      { _id: '8_1_1', name: 'Ada\'a' },
      { _id: '8_1_2', name: 'Liben' },
      { _id: '8_1_3', name: 'Boset' },
      { _id: '8_1_4', name: 'Gimbichu' },
      { _id: '8_1_5', name: 'Lome' }
    ],
    '8_4': [
      { _id: '8_4_1', name: 'Arsi1' },
      { _id: '8_4_2', name: 'Arsi2' },
      { _id: '8_4_3', name: 'Arsi3' },
      { _id: '8_4_4', name: 'Arsi4' },
      { _id: '8_4_5', name: 'Arsi5' }
    ],
    '8_10': [
      { _id: '8_10_1', name: 'Jimma Town' },
      { _id: '8_10_2', name: 'Agaro' },
      { _id: '8_10_3', name: 'Seka Chekorsa' },
      { _id: '8_10_4', name: 'Manna' },
      { _id: '8_10_5', name: 'Gomma' }
    ]
  },
  kebeles: {
    '1_1_1': [
      { _id: '1_1_1_1', name: 'Amanuel kebele01' },
      { _id: '1_1_1_2', name: 'Amanuel kebele02' },
      { _id: '1_1_1_3', name: 'Amanuel kebele03' },
      { _id: '1_1_1_4', name: 'Amanuel kebele04' }
    ],
    '1_2_1': [
      { _id: '1_2_1_1', name: 'Saris kebele01' },
      { _id: '1_2_1_2', name: 'Saris kebele02' },
      { _id: '1_2_1_3', name: 'Saris kebele03' },
      { _id: '1_2_1_4', name: 'Saris kebele04' }
    ],
    '1_3_1': [
      { _id: '1_3_1_1', name: 'Arada kebele' },
      { _id: '1_3_1_2', name: 'Arada kebele01' },
      { _id: '1_3_1_3', name: 'Arada kebele02' },
      { _id: '1_3_1_4', name: 'Arada kebele03' }
    ],
    '1_4_1': [
      { _id: '1_4_1_1', name: 'Bole Medhanialem' },
      { _id: '1_4_1_2', name: 'Bole Arabsa' },
      { _id: '1_4_1_3', name: 'Bole Bulbula' },
      { _id: '1_4_1_4', name: 'Bole Mikael' }
    ],
    '1_10_1': [
      { _id: '1_10_1_1', name: 'Kebele 01' },
      { _id: '1_10_1_2', name: 'Kebele 02' },
      { _id: '1_10_1_3', name: 'Kebele 03' },
      { _id: '1_10_1_4', name: 'Kebele 04' }
    ],
    '2_1_1': [
      { _id: '2_1_1_1', name: 'NF kebele01' },
      { _id: '2_1_1_2', name: 'NF kebele02' },
      { _id: '2_1_1_3', name: 'NF kebele03' },
      { _id: '2_1_1_4', name: 'NF kebele04' }
    ],
    '2_2_1': [
      { _id: '2_2_1_1', name: 'SF kebele01' },
      { _id: '2_2_1_2', name: 'SF kebele02' },
      { _id: '2_2_1_3', name: 'SF kebele03' },
      { _id: '2_2_1_4', name: 'SF kebele04' }
    ],
    '2_3_1': [
      { _id: '2_3_1_1', name: 'afar1 kebele01' },
      { _id: '2_3_1_2', name: 'afar1 kebele02' },
      { _id: '2_3_1_3', name: 'afar1 kebele03' },
      { _id: '2_3_1_4', name: 'afar1 kebele04' }
    ],
    '3_1_1': [
      { _id: '3_1_1_1', name: 'Azezo Tekle Haimanot' },
      { _id: '3_1_1_2', name: 'Maraki' },
      { _id: '3_1_1_3', name: 'Sof Omar' },
      { _id: '3_1_1_4', name: 'Woleka' }
    ],
    '3_2_1': [
      { _id: '3_2_1_1', name: 'SG kebele01' },
      { _id: '3_2_1_2', name: 'SG kebele02' },
      { _id: '3_2_1_3', name: 'SG kebele03' },
      { _id: '3_2_1_4', name: 'SG kebele04' }
    ],
    '3_3_1': [
      { _id: '3_3_1_1', name: 'NW kebele01' },
      { _id: '3_3_1_2', name: 'NW kebele02' },
      { _id: '3_3_1_3', name: 'NW kebele03' },
      { _id: '3_3_1_4', name: 'NW kebele04' }
    ],
    '3_4_1': [
      { _id: '3_4_1_1', name: 'Kombolcha01' },
      { _id: '3_4_1_2', name: 'Kombolcha02' },
      { _id: '3_4_1_3', name: 'Kombolcha03' },
      { _id: '3_4_1_4', name: 'Kombolcha04' }
    ],
    '3_4_2': [
      { _id: '3_4_2_1', name: 'Dessi01' },
      { _id: '3_4_2_2', name: 'Dessi02' },
      { _id: '3_4_2_3', name: 'Dessi03' },
      { _id: '3_4_2_4', name: 'Dessi04' }
    ],
    '3_4_3': [
      { _id: '3_4_3_1', name: 'Qalu01' },
      { _id: '3_4_3_2', name: 'Qalu02' },
      { _id: '3_4_3_3', name: 'Qalu03' },
      { _id: '3_4_3_4', name: 'Qalu04' }
    ],
    '3_8_1': [
      { _id: '3_8_1_1', name: 'Kebele 01' },
      { _id: '3_8_1_2', name: 'Kebele 02' },
      { _id: '3_8_1_3', name: 'Kebele 03' },
      { _id: '3_8_1_4', name: 'Kebele 04' }
    ],
    '8_1_1': [
      { _id: '8_1_1_1', name: 'Bishoftu Town Kebele 01' },
      { _id: '8_1_1_2', name: 'Bishoftu Town Kebele 02' },
      { _id: '8_1_1_3', name: 'Bishoftu Town Kebele 03' },
      { _id: '8_1_1_4', name: 'Bishoftu Town Kebele 04' }
    ],
    '8_10_1': [
      { _id: '8_10_1_1', name: 'Jimma Kebele 01' },
      { _id: '8_10_1_2', name: 'Jimma Kebele 02' },
      { _id: '8_10_1_3', name: 'Jimma Kebele 03' },
      { _id: '8_10_1_4', name: 'Jimma Kebele 04' }
    ]
  }
};

// Function to convert location codes to names
const convertLocationCodesToNames = (location) => {
  if (!location) return location;

  const converted = { ...location };

  // Convert region code to name
  if (converted.region && locationMapping.regions[converted.region]) {
    converted.region = locationMapping.regions[converted.region];
    converted.regionCode = location.region; // Keep original code for reference
  }

  // Convert zone code to name
  if (converted.zone && locationMapping.zones[converted.zone]) {
    converted.zone = locationMapping.zones[converted.zone];
    converted.zoneCode = location.zone; // Keep original code for reference
  }

  // Convert woreda code to name if needed
  if (converted.woreda && locationMapping.woredas[converted.woreda]) {
    converted.woreda = locationMapping.woredas[converted.woreda];
    converted.woredaCode = location.woreda;
  }

  return converted;
};

// Function to convert location names to codes (for queries)
const convertLocationNamesToCodes = (location) => {
  if (!location) return location;

  const converted = { ...location };

  // Find region code for name
  if (converted.region) {
    const regionEntry = Object.entries(locationMapping.regions).find(
      ([code, name]) => name === converted.region
    );
    if (regionEntry) {
      converted.region = regionEntry[0]; // Use code
      converted.regionName = regionEntry[1]; // Keep name
    }
  }

  // Find zone code for name
  if (converted.zone) {
    const zoneEntry = Object.entries(locationMapping.zones).find(
      ([code, name]) => name === converted.zone
    );
    if (zoneEntry) {
      converted.zone = zoneEntry[0]; // Use code
      converted.zoneName = zoneEntry[1]; // Keep name
    }
  }

  return converted;
};

const LocationSelector = ({ onLocationChange, initialLocation, hideLevels = [] }) => {
  const { t } = useTranslation();
  const [locations, setLocations] = useState({
    regions: ethiopianLocations.regions,
    zones: [],
    woredas: [],
    kebeles: []
  });

  const [selected, setSelected] = useState(initialLocation || {
    region: '',
    zone: '',
    woreda: '',
    kebele: ''
  });

  const [loading, setLoading] = useState({
    regions: false,
    zones: false,
    woredas: false,
    kebeles: false
  });

  const handleChange = useCallback((level, value) => {
    const newSelected = {
      ...selected,
      [level]: value
    };

    // Strict reset of child selections and their option lists
    if (level === 'region') {
      newSelected.zone = '';
      newSelected.woreda = '';
      newSelected.kebele = '';
      setLocations(prev => ({
        ...prev,
        zones: [],
        woredas: [],
        kebeles: []
      }));
    } else if (level === 'zone') {
      newSelected.woreda = '';
      newSelected.kebele = '';
      setLocations(prev => ({
        ...prev,
        woredas: [],
        kebeles: []
      }));
    } else if (level === 'woreda') {
      newSelected.kebele = '';
      setLocations(prev => ({
        ...prev,
        kebeles: []
      }));
    }

    const regionName = ethiopianLocations.regions.find(r => r._id === newSelected.region)?.name || '';
    const zoneName = (ethiopianLocations.zones[newSelected.region] || []).find(z => z._id === newSelected.zone)?.name || '';
    const woredaName = (ethiopianLocations.woredas[newSelected.zone] || []).find(w => w._id === newSelected.woreda)?.name || '';
    const kebeleName = (ethiopianLocations.kebeles[newSelected.woreda] || []).find(k => k._id === newSelected.kebele)?.name || '';

    const payload = {
      ...newSelected,
      regionName,
      zoneName,
      woredaName,
      kebeleName
    };

    console.log(`Location ${level} changed to:`, value, payload);
    setSelected(newSelected);
    onLocationChange(payload);
  }, [selected, onLocationChange]);

  useEffect(() => {
    setLocations(prev => ({ ...prev, regions: ethiopianLocations.regions }));
  }, []);

  // Pre-populate cascade dropdowns on mount when initialLocation is provided
  useEffect(() => {
    if (!initialLocation) return;
    
    // Resolve codes if names were provided
    let resolvedRegion = initialLocation.regionCode || initialLocation.region;
    let resolvedZone = initialLocation.zoneCode || initialLocation.zone;
    let resolvedWoreda = initialLocation.woredaCode || initialLocation.woreda;
    let resolvedKebele = initialLocation.kebeleCode || initialLocation.kebele;

    // Fix: If the values look like names, try to find their codes
    const regionsMapping = ethiopianLocations.regions;
    if (resolvedRegion && isNaN(resolvedRegion) && !locationMapping.regions[resolvedRegion]) {
      const foundRegion = regionsMapping.find(r => r.name === resolvedRegion);
      if (foundRegion) resolvedRegion = foundRegion._id;
    }

    if (resolvedZone && isNaN(resolvedZone.split('_')[0]) && resolvedRegion) {
      const foundZone = (ethiopianLocations.zones[resolvedRegion] || []).find(z => z.name === resolvedZone);
      if (foundZone) resolvedZone = foundZone._id;
    }

    if (resolvedWoreda && isNaN(resolvedWoreda.split('_')[0]) && resolvedZone) {
      const foundWoreda = (ethiopianLocations.woredas[resolvedZone] || []).find(w => w.name === resolvedWoreda);
      if (foundWoreda) resolvedWoreda = foundWoreda._id;
    }

    if (resolvedKebele && isNaN(resolvedKebele.split('_')[0]) && resolvedWoreda) {
      const foundKebele = (ethiopianLocations.kebeles[resolvedWoreda] || []).find(k => k.name === resolvedKebele);
      if (foundKebele) resolvedKebele = foundKebele._id;
    }

    if (!resolvedRegion) return;

    // Load zones for the pre-selected region
    const preZones = ethiopianLocations.zones[resolvedRegion] || [];
    const preWoredas = resolvedZone ? (ethiopianLocations.woredas[resolvedZone] || []) : [];
    const preKebeles = resolvedWoreda ? (ethiopianLocations.kebeles[resolvedWoreda] || []) : [];

    setLocations(prev => ({
      ...prev,
      zones: preZones,
      woredas: preWoredas,
      kebeles: preKebeles
    }));

    // Update internal selected state with resolved codes
    const newSelected = {
      region: resolvedRegion,
      zone: resolvedZone,
      woreda: resolvedWoreda,
      kebele: resolvedKebele
    };
    setSelected(newSelected);

    // Also emit the full location payload to parent so formData is in sync
    const regionName = ethiopianLocations.regions.find(r => r._id === resolvedRegion)?.name || '';
    const zoneName = resolvedZone ? (ethiopianLocations.zones[resolvedRegion] || []).find(z => z._id === resolvedZone)?.name || '' : '';
    const woredaName = resolvedZone && resolvedWoreda ? (ethiopianLocations.woredas[resolvedZone] || []).find(w => w._id === resolvedWoreda)?.name || '' : '';
    const kebeleName = resolvedWoreda && resolvedKebele ? (ethiopianLocations.kebeles[resolvedWoreda] || []).find(k => k._id === resolvedKebele)?.name || '' : '';

    onLocationChange({
      ...initialLocation,
      region: resolvedRegion,
      zone: resolvedZone,
      woreda: resolvedWoreda,
      kebele: resolvedKebele,
      regionName,
      zoneName,
      woredaName,
      kebeleName,
      isAutoFilled: true
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchZones = useCallback((regionId) => {
    console.log('🔄 Fetching zones for region:', regionId);
    if (!regionId) return;

    setLoading(prev => ({ ...prev, zones: true }));

    const localZones = ethiopianLocations.zones[regionId] || [];
    console.log('📍 Available zones for region', regionId, ':', localZones);

    // Minor delay for UX feel (like it's loading)
    setTimeout(() => {
      setLocations(prev => ({
        ...prev,
        zones: localZones
      }));
      setLoading(prev => ({ ...prev, zones: false }));
      console.log('✅ Zones loaded:', localZones.length, 'zones');
    }, 100);
  }, []);

  const fetchWoredas = useCallback((zoneId) => {
    console.log('🔄 Fetching woredas for zone:', zoneId);
    if (!zoneId) return;

    setLoading(prev => ({ ...prev, woredas: true }));

    const localWoredas = ethiopianLocations.woredas[zoneId] || [];
    console.log('📍 Available woredas for zone', zoneId, ':', localWoredas);

    setTimeout(() => {
      setLocations(prev => ({
        ...prev,
        woredas: localWoredas
      }));
      setLoading(prev => ({ ...prev, woredas: false }));
      console.log('✅ Woredas loaded:', localWoredas.length, 'woredas');
    }, 100);
  }, []);

  const fetchKebeles = useCallback((woredaId) => {
    console.log('🔄 Fetching kebeles for woreda:', woredaId);
    if (!woredaId) return;

    setLoading(prev => ({ ...prev, kebeles: true }));

    const localKebeles = ethiopianLocations.kebeles[woredaId] || [];
    console.log('📍 Available kebeles for woreda', woredaId, ':', localKebeles);

    setTimeout(() => {
      setLocations(prev => ({
        ...prev,
        kebeles: localKebeles
      }));
      setLoading(prev => ({ ...prev, kebeles: false }));
      console.log('✅ Kebeles loaded:', localKebeles.length, 'kebeles');
    }, 100);
  }, []);

  const renderRegionSelector = useCallback(() => (
    <div className="form-group">
      <label>{t('region_label')}: *</label>
      <select
        value={selected.region}
        onChange={(e) => handleChange('region', e.target.value)}
        disabled={loading.regions}
      >
        <option value="">{t('select_region')}</option>
        {locations.regions.map(region => (
          <option key={region._id} value={region._id}>
            {t(region.name)}
          </option>
        ))}
      </select>
    </div>
  ), [selected.region, loading.regions, locations.regions, handleChange, t]);

  const renderZoneSelector = useCallback(() => {
    if (hideLevels.includes('zone')) return null;

    return (
      <div className="form-group">
        <label>{t('zone_label')}: *</label>
        <select
          value={selected.zone}
          onChange={(e) => handleChange('zone', e.target.value)}
          disabled={loading.zones || !selected.region}
        >
          <option value="">{selected.region ? t('select_zone') : t('select_region_first')}</option>
          {locations.zones.map(zone => (
            <option key={zone._id} value={zone._id}>
              {t(zone.name)}
            </option>
          ))}
        </select>
      </div>
    );
  }, [hideLevels, selected.zone, loading.zones, selected.region, locations.zones, handleChange, t]);

  const renderWoredaSelector = useCallback(() => {
    if (hideLevels.includes('woreda')) return null;

    return (
      <div className="form-group">
        <label>{t('woreda_label')}: *</label>
        <select
          value={selected.woreda}
          onChange={(e) => handleChange('woreda', e.target.value)}
          disabled={loading.woredas || !selected.zone}
        >
          <option value="">{selected.zone ? t('select_woreda') : t('select_zone_first')}</option>
          {locations.woredas.map(woreda => (
            <option key={woreda._id} value={woreda._id}>
              {t(woreda.name)}
            </option>
          ))}
        </select>
      </div>
    );
  }, [hideLevels, selected.woreda, loading.woredas, selected.zone, locations.woredas, handleChange, t]);

  const renderKebeleSelector = useCallback(() => {
    if (hideLevels.includes('kebele')) return null;

    return (
      <div className={`form-group ${selected.kebele && 'is-autofilled'}`}>
        <label>{t('kebele_label')}: * {selected.kebele && <span className="autofill-badge" style={{ fontSize: '0.7rem', padding: '2px 6px', backgroundColor: '#e6fffa', color: '#2c7a7b', borderRadius: '4px', marginLeft: '8px', border: '1px solid #b2f5ea' }}>✓ Auto-filled</span>}</label>
        <select
          value={selected.kebele}
          onChange={(e) => handleChange('kebele', e.target.value)}
          disabled={loading.kebeles || !selected.woreda}
        >
          <option value="">{selected.woreda ? t('select_kebele') : t('select_woreda_first')}</option>
          {locations.kebeles.map(kebele => (
            <option key={kebele._id} value={kebele._id}>
              {t(kebele.name)}
            </option>
          ))}
        </select>
      </div>
    );
  }, [hideLevels, selected.kebele, loading.kebeles, selected.woreda, locations.kebeles, handleChange, t]);

  // Handle initialization and changes in parents
  useEffect(() => {
    if (selected.region) {
      fetchZones(selected.region);
    }
  }, [selected.region, fetchZones]);

  useEffect(() => {
    if (selected.zone) {
      fetchWoredas(selected.zone);
    }
  }, [selected.zone, fetchWoredas]);

  useEffect(() => {
    if (selected.woreda) {
      fetchKebeles(selected.woreda);
    }
  }, [selected.woreda, fetchKebeles]);

  return useMemo(() => (
    <div className="location-selector">
      <div className="location-path-info">
        <small>{t('step_by_step_selection')}</small>
      </div>
      {renderRegionSelector()}
      {renderZoneSelector()}
      {renderWoredaSelector()}
      {renderKebeleSelector()}
    </div>
  ), [renderRegionSelector, renderZoneSelector, renderWoredaSelector, renderKebeleSelector, t]);

};

// Export the helper functions as well
export default LocationSelector;
export { convertLocationCodesToNames, convertLocationNamesToCodes, locationMapping, getLocationName };