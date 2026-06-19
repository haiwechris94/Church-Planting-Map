/**
 * African Countries Configuration
 * Comprehensive configuration for all 54 African countries
 * Includes ISO codes, names, geographic data, and GADM availability
 * 
 * Data sources:
 * - ISO 3166-1 alpha-3 country codes
 * - GADM (Global Administrative Areas) database
 * - Geographic coordinates and areas from authoritative sources
 */

const AFRICAN_COUNTRIES = {
  // ============================================
  // NORTH AFRICA
  // ============================================
  DZA: {
    code: 'DZA',
    name: 'Algeria',
    nameFr: 'Algérie',
    nameLocal: 'الجزائر',
    region: 'North Africa',
    subregion: 'Maghreb',
    capital: 'Algiers',
    capitalFr: 'Alger',
    area: 2381741, // km²
    center: [2.6325, 28.0339], // [longitude, latitude]
    bounds: [-8.6689, 18.9681, 11.9999, 37.0898], // [minLng, minLat, maxLng, maxLat]
    gadmAvailable: true,
    gadmLevels: 4,
    adminLevels: {
      1: { name: 'Wilayas', nameEn: 'Provinces', count: 58 },
      2: { name: 'Daïras', nameEn: 'Districts', count: 553 },
      3: { name: 'Communes', nameEn: 'Municipalities', count: 1541 }
    },
    languages: ['Arabic', 'Berber', 'French'],
    currency: 'DZD'
  },

  EGY: {
    code: 'EGY',
    name: 'Egypt',
    nameFr: 'Égypte',
    nameLocal: 'مصر',
    region: 'North Africa',
    subregion: 'Nile Valley',
    capital: 'Cairo',
    capitalFr: 'Le Caire',
    area: 1002450,
    center: [29.8200, 26.8206],
    bounds: [24.6981, 21.7254, 36.8948, 31.6671],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Muhafazat', nameEn: 'Governorates', count: 27 },
      2: { name: 'Marakiz', nameEn: 'Districts', count: 339 }
    },
    languages: ['Arabic'],
    currency: 'EGP'
  },

  LBY: {
    code: 'LBY',
    name: 'Libya',
    nameFr: 'Libye',
    nameLocal: 'ليبيا',
    region: 'North Africa',
    subregion: 'Maghreb',
    capital: 'Tripoli',
    capitalFr: 'Tripoli',
    area: 1759540,
    center: [17.2283, 26.3351],
    bounds: [9.3870, 19.5084, 25.1466, 33.1680],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Shabiyat', nameEn: 'Districts', count: 22 },
      2: { name: 'Baladiyat', nameEn: 'Municipalities', count: 100 }
    },
    languages: ['Arabic'],
    currency: 'LYD'
  },

  MAR: {
    code: 'MAR',
    name: 'Morocco',
    nameFr: 'Maroc',
    nameLocal: 'المغرب',
    region: 'North Africa',
    subregion: 'Maghreb',
    capital: 'Rabat',
    capitalFr: 'Rabat',
    area: 446550,
    center: [-7.0926, 31.7917],
    bounds: [-13.1688, 27.6667, -0.9916, 35.9225],
    gadmAvailable: true,
    gadmLevels: 4,
    adminLevels: {
      1: { name: 'Régions', nameEn: 'Regions', count: 12 },
      2: { name: 'Provinces/Préfectures', nameEn: 'Provinces', count: 75 },
      3: { name: 'Communes', nameEn: 'Municipalities', count: 1503 }
    },
    languages: ['Arabic', 'Berber', 'French'],
    currency: 'MAD'
  },

  TUN: {
    code: 'TUN',
    name: 'Tunisia',
    nameFr: 'Tunisie',
    nameLocal: 'تونس',
    region: 'North Africa',
    subregion: 'Maghreb',
    capital: 'Tunis',
    capitalFr: 'Tunis',
    area: 163610,
    center: [9.5375, 33.8869],
    bounds: [7.5244, 30.2280, 11.5984, 37.3453],
    gadmAvailable: true,
    gadmLevels: 4,
    adminLevels: {
      1: { name: 'Gouvernorats', nameEn: 'Governorates', count: 24 },
      2: { name: 'Délégations', nameEn: 'Delegations', count: 264 },
      3: { name: 'Secteurs', nameEn: 'Sectors', count: 2073 }
    },
    languages: ['Arabic', 'French'],
    currency: 'TND'
  },

  SDN: {
    code: 'SDN',
    name: 'Sudan',
    nameFr: 'Soudan',
    nameLocal: 'السودان',
    region: 'North Africa',
    subregion: 'Nile Valley',
    capital: 'Khartoum',
    capitalFr: 'Khartoum',
    area: 1861484,
    center: [30.2176, 12.8628],
    bounds: [21.8145, 8.6844, 38.5849, 22.2320],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Wilayat', nameEn: 'States', count: 18 },
      2: { name: 'Mahaliyat', nameEn: 'Localities', count: 189 }
    },
    languages: ['Arabic', 'English'],
    currency: 'SDG'
  },

  SSD: {
    code: 'SSD',
    name: 'South Sudan',
    nameFr: 'Soudan du Sud',
    nameLocal: 'South Sudan',
    region: 'East Africa',
    subregion: 'Nile Valley',
    capital: 'Juba',
    capitalFr: 'Djouba',
    area: 644329,
    center: [31.3070, 6.8770],
    bounds: [23.4408, 3.4888, 35.9480, 12.2364],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'States', nameEn: 'States', count: 10 },
      2: { name: 'Counties', nameEn: 'Counties', count: 79 }
    },
    languages: ['English', 'Arabic'],
    currency: 'SSP'
  },

  // ============================================
  // WEST AFRICA
  // ============================================
  BEN: {
    code: 'BEN',
    name: 'Benin',
    nameFr: 'Bénin',
    nameLocal: 'Bénin',
    region: 'West Africa',
    subregion: 'Gulf of Guinea',
    capital: 'Porto-Novo',
    capitalFr: 'Porto-Novo',
    area: 114763,
    center: [2.3158, 9.3077],
    bounds: [0.7743, 6.2256, 3.8517, 12.4183],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Départements', nameEn: 'Departments', count: 12 },
      2: { name: 'Communes', nameEn: 'Communes', count: 77 }
    },
    languages: ['French'],
    currency: 'XOF'
  },

  BFA: {
    code: 'BFA',
    name: 'Burkina Faso',
    nameFr: 'Burkina Faso',
    nameLocal: 'Burkina Faso',
    region: 'West Africa',
    subregion: 'Sahel',
    capital: 'Ouagadougou',
    capitalFr: 'Ouagadougou',
    area: 274222,
    center: [-1.5616, 12.2383],
    bounds: [-5.5189, 9.4011, 2.4043, 15.0825],
    gadmAvailable: true,
    gadmLevels: 4,
    adminLevels: {
      1: { name: 'Régions', nameEn: 'Regions', count: 13 },
      2: { name: 'Provinces', nameEn: 'Provinces', count: 45 },
      3: { name: 'Départements', nameEn: 'Departments', count: 351 }
    },
    languages: ['French'],
    currency: 'XOF'
  },

  CPV: {
    code: 'CPV',
    name: 'Cape Verde',
    nameFr: 'Cap-Vert',
    nameLocal: 'Cabo Verde',
    region: 'West Africa',
    subregion: 'Atlantic Islands',
    capital: 'Praia',
    capitalFr: 'Praia',
    area: 4033,
    center: [-23.6052, 15.1201],
    bounds: [-25.3609, 14.8031, -22.6569, 17.2053],
    gadmAvailable: true,
    gadmLevels: 2,
    adminLevels: {
      1: { name: 'Concelhos', nameEn: 'Municipalities', count: 22 }
    },
    languages: ['Portuguese', 'Cape Verdean Creole'],
    currency: 'CVE'
  },

  CIV: {
    code: 'CIV',
    name: "Côte d'Ivoire",
    nameFr: "Côte d'Ivoire",
    nameLocal: "Côte d'Ivoire",
    region: 'West Africa',
    subregion: 'Gulf of Guinea',
    capital: 'Yamoussoukro',
    capitalFr: 'Yamoussoukro',
    area: 322463,
    center: [-5.5471, 7.5400],
    bounds: [-8.6019, 4.3571, -2.4949, 10.7400],
    gadmAvailable: true,
    gadmLevels: 4,
    adminLevels: {
      1: { name: 'Districts', nameEn: 'Districts', count: 14 },
      2: { name: 'Régions', nameEn: 'Regions', count: 31 },
      3: { name: 'Départements', nameEn: 'Departments', count: 108 }
    },
    languages: ['French'],
    currency: 'XOF'
  },

  GMB: {
    code: 'GMB',
    name: 'Gambia',
    nameFr: 'Gambie',
    nameLocal: 'The Gambia',
    region: 'West Africa',
    subregion: 'Senegambia',
    capital: 'Banjul',
    capitalFr: 'Banjul',
    area: 11295,
    center: [-15.3101, 13.4432],
    bounds: [-16.8251, 13.0648, -13.7977, 13.8268],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Divisions', nameEn: 'Divisions', count: 5 },
      2: { name: 'Districts', nameEn: 'Districts', count: 43 }
    },
    languages: ['English'],
    currency: 'GMD'
  },

  GHA: {
    code: 'GHA',
    name: 'Ghana',
    nameFr: 'Ghana',
    nameLocal: 'Ghana',
    region: 'West Africa',
    subregion: 'Gulf of Guinea',
    capital: 'Accra',
    capitalFr: 'Accra',
    area: 238533,
    center: [-1.0232, 7.9465],
    bounds: [-3.2607, 4.7389, 1.1998, 11.1667],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Regions', nameEn: 'Regions', count: 16 },
      2: { name: 'Districts', nameEn: 'Districts', count: 261 }
    },
    languages: ['English'],
    currency: 'GHS'
  },

  GIN: {
    code: 'GIN',
    name: 'Guinea',
    nameFr: 'Guinée',
    nameLocal: 'Guinée',
    region: 'West Africa',
    subregion: 'Gulf of Guinea',
    capital: 'Conakry',
    capitalFr: 'Conakry',
    area: 245857,
    center: [-9.6966, 9.9456],
    bounds: [-15.0813, 7.1906, -7.6411, 12.6746],
    gadmAvailable: true,
    gadmLevels: 4,
    adminLevels: {
      1: { name: 'Régions', nameEn: 'Regions', count: 8 },
      2: { name: 'Préfectures', nameEn: 'Prefectures', count: 33 },
      3: { name: 'Sous-préfectures', nameEn: 'Sub-prefectures', count: 304 }
    },
    languages: ['French'],
    currency: 'GNF'
  },

  GNB: {
    code: 'GNB',
    name: 'Guinea-Bissau',
    nameFr: 'Guinée-Bissau',
    nameLocal: 'Guiné-Bissau',
    region: 'West Africa',
    subregion: 'Senegambia',
    capital: 'Bissau',
    capitalFr: 'Bissau',
    area: 36125,
    center: [-15.1804, 11.8037],
    bounds: [-16.7149, 10.9246, -13.6365, 12.6846],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Regiões', nameEn: 'Regions', count: 9 },
      2: { name: 'Sectores', nameEn: 'Sectors', count: 37 }
    },
    languages: ['Portuguese', 'Crioulo'],
    currency: 'XOF'
  },

  LBR: {
    code: 'LBR',
    name: 'Liberia',
    nameFr: 'Libéria',
    nameLocal: 'Liberia',
    region: 'West Africa',
    subregion: 'Gulf of Guinea',
    capital: 'Monrovia',
    capitalFr: 'Monrovia',
    area: 111369,
    center: [-9.4295, 6.4281],
    bounds: [-11.4921, 4.3530, -7.3651, 8.5518],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Counties', nameEn: 'Counties', count: 15 },
      2: { name: 'Districts', nameEn: 'Districts', count: 90 }
    },
    languages: ['English'],
    currency: 'LRD'
  },

  MLI: {
    code: 'MLI',
    name: 'Mali',
    nameFr: 'Mali',
    nameLocal: 'Mali',
    region: 'West Africa',
    subregion: 'Sahel',
    capital: 'Bamako',
    capitalFr: 'Bamako',
    area: 1240192,
    center: [-3.9962, 17.5707],
    bounds: [-12.2426, 10.1595, 4.2673, 25.0002],
    gadmAvailable: true,
    gadmLevels: 4,
    adminLevels: {
      1: { name: 'Régions', nameEn: 'Regions', count: 10 },
      2: { name: 'Cercles', nameEn: 'Circles', count: 49 },
      3: { name: 'Communes', nameEn: 'Communes', count: 703 }
    },
    languages: ['French', 'Bambara'],
    currency: 'XOF'
  },

  MRT: {
    code: 'MRT',
    name: 'Mauritania',
    nameFr: 'Mauritanie',
    nameLocal: 'موريتانيا',
    region: 'West Africa',
    subregion: 'Sahel',
    capital: 'Nouakchott',
    capitalFr: 'Nouakchott',
    area: 1030700,
    center: [-10.9408, 21.0079],
    bounds: [-17.0665, 14.7155, -4.8276, 27.2981],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Wilayas', nameEn: 'Regions', count: 15 },
      2: { name: 'Moughataa', nameEn: 'Departments', count: 55 }
    },
    languages: ['Arabic', 'French'],
    currency: 'MRU'
  },

  NER: {
    code: 'NER',
    name: 'Niger',
    nameFr: 'Niger',
    nameLocal: 'Niger',
    region: 'West Africa',
    subregion: 'Sahel',
    capital: 'Niamey',
    capitalFr: 'Niamey',
    area: 1267000,
    center: [8.0817, 17.6078],
    bounds: [0.1660, 11.6960, 15.9990, 23.5250],
    gadmAvailable: true,
    gadmLevels: 4,
    adminLevels: {
      1: { name: 'Régions', nameEn: 'Regions', count: 8 },
      2: { name: 'Départements', nameEn: 'Departments', count: 63 },
      3: { name: 'Communes', nameEn: 'Communes', count: 266 }
    },
    languages: ['French', 'Hausa', 'Zarma'],
    currency: 'XOF'
  },

  NGA: {
    code: 'NGA',
    name: 'Nigeria',
    nameFr: 'Nigéria',
    nameLocal: 'Nigeria',
    region: 'West Africa',
    subregion: 'Gulf of Guinea',
    capital: 'Abuja',
    capitalFr: 'Abuja',
    area: 923768,
    center: [8.6753, 9.0820],
    bounds: [2.6684, 4.2714, 14.6800, 13.8920],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'States', nameEn: 'States', count: 37 },
      2: { name: 'LGAs', nameEn: 'Local Government Areas', count: 774 }
    },
    languages: ['English', 'Hausa', 'Yoruba', 'Igbo'],
    currency: 'NGN'
  },

  SEN: {
    code: 'SEN',
    name: 'Senegal',
    nameFr: 'Sénégal',
    nameLocal: 'Sénégal',
    region: 'West Africa',
    subregion: 'Senegambia',
    capital: 'Dakar',
    capitalFr: 'Dakar',
    area: 196722,
    center: [-14.4524, 14.4974],
    bounds: [-17.5353, 12.3072, -11.3558, 16.6919],
    gadmAvailable: true,
    gadmLevels: 4,
    adminLevels: {
      1: { name: 'Régions', nameEn: 'Regions', count: 14 },
      2: { name: 'Départements', nameEn: 'Departments', count: 45 },
      3: { name: 'Arrondissements', nameEn: 'Arrondissements', count: 123 }
    },
    languages: ['French', 'Wolof'],
    currency: 'XOF'
  },

  SLE: {
    code: 'SLE',
    name: 'Sierra Leone',
    nameFr: 'Sierra Leone',
    nameLocal: 'Sierra Leone',
    region: 'West Africa',
    subregion: 'Gulf of Guinea',
    capital: 'Freetown',
    capitalFr: 'Freetown',
    area: 71740,
    center: [-11.7799, 8.4606],
    bounds: [-13.3076, 6.9292, -10.2716, 10.0000],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Provinces', nameEn: 'Provinces', count: 5 },
      2: { name: 'Districts', nameEn: 'Districts', count: 16 }
    },
    languages: ['English', 'Krio'],
    currency: 'SLL'
  },

  TGO: {
    code: 'TGO',
    name: 'Togo',
    nameFr: 'Togo',
    nameLocal: 'Togo',
    region: 'West Africa',
    subregion: 'Gulf of Guinea',
    capital: 'Lomé',
    capitalFr: 'Lomé',
    area: 56785,
    center: [0.8248, 8.6195],
    bounds: [-0.1497, 6.1049, 1.8066, 11.1389],
    gadmAvailable: true,
    gadmLevels: 4,
    adminLevels: {
      1: { name: 'Régions', nameEn: 'Regions', count: 5 },
      2: { name: 'Préfectures', nameEn: 'Prefectures', count: 39 },
      3: { name: 'Cantons', nameEn: 'Cantons', count: 366 }
    },
    languages: ['French', 'Ewe', 'Kabye'],
    currency: 'XOF'
  },

  // ============================================
  // CENTRAL AFRICA
  // ============================================
  CMR: {
    code: 'CMR',
    name: 'Cameroon',
    nameFr: 'Cameroun',
    nameLocal: 'Cameroun',
    region: 'Central Africa',
    subregion: 'Gulf of Guinea',
    capital: 'Yaoundé',
    capitalFr: 'Yaoundé',
    area: 475442,
    center: [12.3547, 7.3697],
    bounds: [8.4994, 1.6559, 16.1921, 13.0780],
    gadmAvailable: true,
    gadmLevels: 4,
    adminLevels: {
      1: { name: 'Régions', nameEn: 'Regions', count: 10 },
      2: { name: 'Départements', nameEn: 'Departments', count: 58 },
      3: { name: 'Arrondissements', nameEn: 'Subdivisions', count: 360 }
    },
    languages: ['French', 'English'],
    currency: 'XAF',
    isDefault: true // Default country for backward compatibility
  },

  CAF: {
    code: 'CAF',
    name: 'Central African Republic',
    nameFr: 'République centrafricaine',
    nameLocal: 'Ködörösêse tî Bêafrîka',
    region: 'Central Africa',
    subregion: 'Central',
    capital: 'Bangui',
    capitalFr: 'Bangui',
    area: 622984,
    center: [20.9394, 6.6111],
    bounds: [14.4200, 2.2205, 27.4583, 11.0076],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Préfectures', nameEn: 'Prefectures', count: 17 },
      2: { name: 'Sous-préfectures', nameEn: 'Sub-prefectures', count: 71 }
    },
    languages: ['French', 'Sango'],
    currency: 'XAF'
  },

  TCD: {
    code: 'TCD',
    name: 'Chad',
    nameFr: 'Tchad',
    nameLocal: 'تشاد',
    region: 'Central Africa',
    subregion: 'Sahel',
    capital: "N'Djamena",
    capitalFr: "N'Djaména",
    area: 1284000,
    center: [18.7322, 15.4542],
    bounds: [13.4734, 7.4419, 24.0000, 23.4505],
    gadmAvailable: true,
    gadmLevels: 4,
    adminLevels: {
      1: { name: 'Régions', nameEn: 'Regions', count: 23 },
      2: { name: 'Départements', nameEn: 'Departments', count: 95 },
      3: { name: 'Sous-préfectures', nameEn: 'Sub-prefectures', count: 365 }
    },
    languages: ['French', 'Arabic'],
    currency: 'XAF'
  },

  COG: {
    code: 'COG',
    name: 'Congo',
    nameFr: 'Congo',
    nameLocal: 'Congo-Brazzaville',
    region: 'Central Africa',
    subregion: 'Congo Basin',
    capital: 'Brazzaville',
    capitalFr: 'Brazzaville',
    area: 342000,
    center: [15.8277, -0.2280],
    bounds: [11.2050, -5.0270, 18.6500, 3.7031],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Départements', nameEn: 'Departments', count: 12 },
      2: { name: 'Districts', nameEn: 'Districts', count: 86 }
    },
    languages: ['French', 'Lingala', 'Kituba'],
    currency: 'XAF'
  },

  COD: {
    code: 'COD',
    name: 'Democratic Republic of the Congo',
    nameFr: 'République démocratique du Congo',
    nameLocal: 'Congo-Kinshasa',
    region: 'Central Africa',
    subregion: 'Congo Basin',
    capital: 'Kinshasa',
    capitalFr: 'Kinshasa',
    area: 2344858,
    center: [21.7587, -4.0383],
    bounds: [12.2046, -13.4559, 31.3056, 5.3920],
    gadmAvailable: true,
    gadmLevels: 4,
    adminLevels: {
      1: { name: 'Provinces', nameEn: 'Provinces', count: 26 },
      2: { name: 'Territoires', nameEn: 'Territories', count: 145 },
      3: { name: 'Secteurs/Chefferies', nameEn: 'Sectors', count: 737 }
    },
    languages: ['French', 'Lingala', 'Swahili', 'Kikongo', 'Tshiluba'],
    currency: 'CDF'
  },

  GNQ: {
    code: 'GNQ',
    name: 'Equatorial Guinea',
    nameFr: 'Guinée équatoriale',
    nameLocal: 'Guinea Ecuatorial',
    region: 'Central Africa',
    subregion: 'Gulf of Guinea',
    capital: 'Malabo',
    capitalFr: 'Malabo',
    area: 28051,
    center: [10.2679, 1.6508],
    bounds: [5.6172, -1.4689, 11.3357, 3.7886],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Provincias', nameEn: 'Provinces', count: 8 },
      2: { name: 'Distritos', nameEn: 'Districts', count: 19 }
    },
    languages: ['Spanish', 'French', 'Portuguese'],
    currency: 'XAF'
  },

  GAB: {
    code: 'GAB',
    name: 'Gabon',
    nameFr: 'Gabon',
    nameLocal: 'Gabon',
    region: 'Central Africa',
    subregion: 'Gulf of Guinea',
    capital: 'Libreville',
    capitalFr: 'Libreville',
    area: 267668,
    center: [11.6094, -0.8037],
    bounds: [8.6954, -3.9785, 14.5024, 2.3226],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Provinces', nameEn: 'Provinces', count: 9 },
      2: { name: 'Départements', nameEn: 'Departments', count: 50 }
    },
    languages: ['French'],
    currency: 'XAF'
  },

  STP: {
    code: 'STP',
    name: 'São Tomé and Príncipe',
    nameFr: 'Sao Tomé-et-Príncipe',
    nameLocal: 'São Tomé e Príncipe',
    region: 'Central Africa',
    subregion: 'Gulf of Guinea Islands',
    capital: 'São Tomé',
    capitalFr: 'São Tomé',
    area: 964,
    center: [6.6131, 0.1864],
    bounds: [6.4701, -0.0135, 7.4663, 1.7013],
    gadmAvailable: true,
    gadmLevels: 2,
    adminLevels: {
      1: { name: 'Distritos', nameEn: 'Districts', count: 7 }
    },
    languages: ['Portuguese'],
    currency: 'STN'
  },

  // ============================================
  // EAST AFRICA
  // ============================================
  BDI: {
    code: 'BDI',
    name: 'Burundi',
    nameFr: 'Burundi',
    nameLocal: 'Uburundi',
    region: 'East Africa',
    subregion: 'Great Lakes',
    capital: 'Gitega',
    capitalFr: 'Gitega',
    area: 27834,
    center: [29.9189, -3.3731],
    bounds: [28.9930, -4.4693, 30.8500, -2.3100],
    gadmAvailable: true,
    gadmLevels: 4,
    adminLevels: {
      1: { name: 'Provinces', nameEn: 'Provinces', count: 18 },
      2: { name: 'Communes', nameEn: 'Communes', count: 119 },
      3: { name: 'Collines', nameEn: 'Hills', count: 2639 }
    },
    languages: ['Kirundi', 'French', 'English'],
    currency: 'BIF'
  },

  COM: {
    code: 'COM',
    name: 'Comoros',
    nameFr: 'Comores',
    nameLocal: 'Komori',
    region: 'East Africa',
    subregion: 'Indian Ocean Islands',
    capital: 'Moroni',
    capitalFr: 'Moroni',
    area: 1862,
    center: [43.8722, -11.6455],
    bounds: [43.2155, -12.4228, 44.5384, -11.3614],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Îles', nameEn: 'Islands', count: 3 },
      2: { name: 'Préfectures', nameEn: 'Prefectures', count: 17 }
    },
    languages: ['Comorian', 'Arabic', 'French'],
    currency: 'KMF'
  },

  DJI: {
    code: 'DJI',
    name: 'Djibouti',
    nameFr: 'Djibouti',
    nameLocal: 'جيبوتي',
    region: 'East Africa',
    subregion: 'Horn of Africa',
    capital: 'Djibouti',
    capitalFr: 'Djibouti',
    area: 23200,
    center: [42.5903, 11.8251],
    bounds: [41.7730, 10.9319, 43.4170, 12.7068],
    gadmAvailable: true,
    gadmLevels: 2,
    adminLevels: {
      1: { name: 'Régions', nameEn: 'Regions', count: 6 }
    },
    languages: ['French', 'Arabic', 'Somali', 'Afar'],
    currency: 'DJF'
  },

  ERI: {
    code: 'ERI',
    name: 'Eritrea',
    nameFr: 'Érythrée',
    nameLocal: 'ኤርትራ',
    region: 'East Africa',
    subregion: 'Horn of Africa',
    capital: 'Asmara',
    capitalFr: 'Asmara',
    area: 117600,
    center: [39.7823, 15.1794],
    bounds: [36.4387, 12.3596, 43.1346, 18.0033],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Zobas', nameEn: 'Regions', count: 6 },
      2: { name: 'Sub-zobas', nameEn: 'Sub-regions', count: 58 }
    },
    languages: ['Tigrinya', 'Arabic', 'English'],
    currency: 'ERN'
  },

  ETH: {
    code: 'ETH',
    name: 'Ethiopia',
    nameFr: 'Éthiopie',
    nameLocal: 'ኢትዮጵያ',
    region: 'East Africa',
    subregion: 'Horn of Africa',
    capital: 'Addis Ababa',
    capitalFr: 'Addis-Abeba',
    area: 1104300,
    center: [40.4897, 9.1450],
    bounds: [32.9975, 3.4041, 47.9882, 14.8942],
    gadmAvailable: true,
    gadmLevels: 4,
    adminLevels: {
      1: { name: 'Kilil', nameEn: 'Regional States', count: 11 },
      2: { name: 'Zones', nameEn: 'Zones', count: 93 },
      3: { name: 'Woredas', nameEn: 'Districts', count: 1000 }
    },
    languages: ['Amharic', 'Oromo', 'Tigrinya', 'Somali'],
    currency: 'ETB'
  },

  KEN: {
    code: 'KEN',
    name: 'Kenya',
    nameFr: 'Kenya',
    nameLocal: 'Kenya',
    region: 'East Africa',
    subregion: 'Great Lakes',
    capital: 'Nairobi',
    capitalFr: 'Nairobi',
    area: 580367,
    center: [37.9062, -0.0236],
    bounds: [33.9098, -4.6777, 41.8991, 5.0199],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Counties', nameEn: 'Counties', count: 47 },
      2: { name: 'Sub-counties', nameEn: 'Sub-counties', count: 290 }
    },
    languages: ['English', 'Swahili'],
    currency: 'KES'
  },

  MDG: {
    code: 'MDG',
    name: 'Madagascar',
    nameFr: 'Madagascar',
    nameLocal: 'Madagasikara',
    region: 'East Africa',
    subregion: 'Indian Ocean Islands',
    capital: 'Antananarivo',
    capitalFr: 'Antananarivo',
    area: 587041,
    center: [46.8691, -18.7669],
    bounds: [43.2254, -25.6071, 50.4837, -11.9452],
    gadmAvailable: true,
    gadmLevels: 4,
    adminLevels: {
      1: { name: 'Faritany', nameEn: 'Provinces', count: 6 },
      2: { name: 'Faritra', nameEn: 'Regions', count: 22 },
      3: { name: 'Distrika', nameEn: 'Districts', count: 119 }
    },
    languages: ['Malagasy', 'French'],
    currency: 'MGA'
  },

  MWI: {
    code: 'MWI',
    name: 'Malawi',
    nameFr: 'Malawi',
    nameLocal: 'Malaŵi',
    region: 'East Africa',
    subregion: 'Southern East Africa',
    capital: 'Lilongwe',
    capitalFr: 'Lilongwe',
    area: 118484,
    center: [34.3015, -13.2543],
    bounds: [32.6739, -17.1350, 35.9168, -9.3675],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Regions', nameEn: 'Regions', count: 3 },
      2: { name: 'Districts', nameEn: 'Districts', count: 28 }
    },
    languages: ['English', 'Chichewa'],
    currency: 'MWK'
  },

  MUS: {
    code: 'MUS',
    name: 'Mauritius',
    nameFr: 'Maurice',
    nameLocal: 'Moris',
    region: 'East Africa',
    subregion: 'Indian Ocean Islands',
    capital: 'Port Louis',
    capitalFr: 'Port-Louis',
    area: 2040,
    center: [57.5522, -20.3484],
    bounds: [56.5127, -20.5255, 63.5000, -10.3190],
    gadmAvailable: true,
    gadmLevels: 2,
    adminLevels: {
      1: { name: 'Districts', nameEn: 'Districts', count: 12 }
    },
    languages: ['English', 'French', 'Mauritian Creole'],
    currency: 'MUR'
  },

  MOZ: {
    code: 'MOZ',
    name: 'Mozambique',
    nameFr: 'Mozambique',
    nameLocal: 'Moçambique',
    region: 'East Africa',
    subregion: 'Southern East Africa',
    capital: 'Maputo',
    capitalFr: 'Maputo',
    area: 801590,
    center: [35.5296, -18.6657],
    bounds: [30.2138, -26.8686, 40.8400, -10.4712],
    gadmAvailable: true,
    gadmLevels: 4,
    adminLevels: {
      1: { name: 'Províncias', nameEn: 'Provinces', count: 11 },
      2: { name: 'Distritos', nameEn: 'Districts', count: 154 },
      3: { name: 'Postos Administrativos', nameEn: 'Administrative Posts', count: 419 }
    },
    languages: ['Portuguese'],
    currency: 'MZN'
  },

  RWA: {
    code: 'RWA',
    name: 'Rwanda',
    nameFr: 'Rwanda',
    nameLocal: 'Rwanda',
    region: 'East Africa',
    subregion: 'Great Lakes',
    capital: 'Kigali',
    capitalFr: 'Kigali',
    area: 26338,
    center: [29.8739, -1.9403],
    bounds: [28.8617, -2.8400, 30.8990, -1.0474],
    gadmAvailable: true,
    gadmLevels: 4,
    adminLevels: {
      1: { name: 'Intara', nameEn: 'Provinces', count: 5 },
      2: { name: 'Akarere', nameEn: 'Districts', count: 30 },
      3: { name: 'Imirenge', nameEn: 'Sectors', count: 416 }
    },
    languages: ['Kinyarwanda', 'French', 'English', 'Swahili'],
    currency: 'RWF'
  },

  SYC: {
    code: 'SYC',
    name: 'Seychelles',
    nameFr: 'Seychelles',
    nameLocal: 'Sesel',
    region: 'East Africa',
    subregion: 'Indian Ocean Islands',
    capital: 'Victoria',
    capitalFr: 'Victoria',
    area: 459,
    center: [55.4920, -4.6796],
    bounds: [46.2048, -10.2275, 56.2957, -3.7126],
    gadmAvailable: true,
    gadmLevels: 2,
    adminLevels: {
      1: { name: 'Districts', nameEn: 'Districts', count: 26 }
    },
    languages: ['Seychellois Creole', 'English', 'French'],
    currency: 'SCR'
  },

  SOM: {
    code: 'SOM',
    name: 'Somalia',
    nameFr: 'Somalie',
    nameLocal: 'Soomaaliya',
    region: 'East Africa',
    subregion: 'Horn of Africa',
    capital: 'Mogadishu',
    capitalFr: 'Mogadiscio',
    area: 637657,
    center: [46.1996, 5.1521],
    bounds: [40.9865, -1.6748, 51.4130, 11.9889],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Gobolka', nameEn: 'Regions', count: 18 },
      2: { name: 'Degmada', nameEn: 'Districts', count: 90 }
    },
    languages: ['Somali', 'Arabic'],
    currency: 'SOS'
  },

  TZA: {
    code: 'TZA',
    name: 'Tanzania',
    nameFr: 'Tanzanie',
    nameLocal: 'Tanzania',
    region: 'East Africa',
    subregion: 'Great Lakes',
    capital: 'Dodoma',
    capitalFr: 'Dodoma',
    area: 947303,
    center: [34.8888, -6.3690],
    bounds: [29.3270, -11.7612, 40.4449, -0.9854],
    gadmAvailable: true,
    gadmLevels: 4,
    adminLevels: {
      1: { name: 'Mikoa', nameEn: 'Regions', count: 31 },
      2: { name: 'Wilaya', nameEn: 'Districts', count: 184 },
      3: { name: 'Kata', nameEn: 'Wards', count: 3944 }
    },
    languages: ['Swahili', 'English'],
    currency: 'TZS'
  },

  UGA: {
    code: 'UGA',
    name: 'Uganda',
    nameFr: 'Ouganda',
    nameLocal: 'Uganda',
    region: 'East Africa',
    subregion: 'Great Lakes',
    capital: 'Kampala',
    capitalFr: 'Kampala',
    area: 241550,
    center: [32.2903, 1.3733],
    bounds: [29.5734, -1.4823, 35.0360, 4.2340],
    gadmAvailable: true,
    gadmLevels: 4,
    adminLevels: {
      1: { name: 'Regions', nameEn: 'Regions', count: 4 },
      2: { name: 'Districts', nameEn: 'Districts', count: 135 },
      3: { name: 'Counties', nameEn: 'Counties', count: 322 }
    },
    languages: ['English', 'Swahili', 'Luganda'],
    currency: 'UGX'
  },

  ZMB: {
    code: 'ZMB',
    name: 'Zambia',
    nameFr: 'Zambie',
    nameLocal: 'Zambia',
    region: 'East Africa',
    subregion: 'Southern East Africa',
    capital: 'Lusaka',
    capitalFr: 'Lusaka',
    area: 752612,
    center: [27.8493, -13.1339],
    bounds: [21.9994, -18.0795, 33.7057, -8.2243],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Provinces', nameEn: 'Provinces', count: 10 },
      2: { name: 'Districts', nameEn: 'Districts', count: 116 }
    },
    languages: ['English'],
    currency: 'ZMW'
  },

  ZWE: {
    code: 'ZWE',
    name: 'Zimbabwe',
    nameFr: 'Zimbabwe',
    nameLocal: 'Zimbabwe',
    region: 'East Africa',
    subregion: 'Southern East Africa',
    capital: 'Harare',
    capitalFr: 'Harare',
    area: 390757,
    center: [29.1549, -19.0154],
    bounds: [25.2373, -22.4241, 33.0683, -15.6087],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Provinces', nameEn: 'Provinces', count: 10 },
      2: { name: 'Districts', nameEn: 'Districts', count: 72 }
    },
    languages: ['English', 'Shona', 'Ndebele'],
    currency: 'ZWL'
  },

  // ============================================
  // SOUTHERN AFRICA
  // ============================================
  AGO: {
    code: 'AGO',
    name: 'Angola',
    nameFr: 'Angola',
    nameLocal: 'Angola',
    region: 'Southern Africa',
    subregion: 'South-Central Africa',
    capital: 'Luanda',
    capitalFr: 'Luanda',
    area: 1246700,
    center: [17.8739, -11.2027],
    bounds: [11.6791, -18.0421, 24.0821, -4.3880],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Províncias', nameEn: 'Provinces', count: 18 },
      2: { name: 'Municípios', nameEn: 'Municipalities', count: 164 }
    },
    languages: ['Portuguese'],
    currency: 'AOA'
  },

  BWA: {
    code: 'BWA',
    name: 'Botswana',
    nameFr: 'Botswana',
    nameLocal: 'Botswana',
    region: 'Southern Africa',
    subregion: 'Southern',
    capital: 'Gaborone',
    capitalFr: 'Gaborone',
    area: 581730,
    center: [24.6849, -22.3285],
    bounds: [19.9986, -26.9075, 29.3609, -17.7808],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Districts', nameEn: 'Districts', count: 17 },
      2: { name: 'Sub-districts', nameEn: 'Sub-districts', count: 28 }
    },
    languages: ['English', 'Setswana'],
    currency: 'BWP'
  },

  SWZ: {
    code: 'SWZ',
    name: 'Eswatini',
    nameFr: 'Eswatini',
    nameLocal: 'eSwatini',
    region: 'Southern Africa',
    subregion: 'Southern',
    capital: 'Mbabane',
    capitalFr: 'Mbabane',
    area: 17364,
    center: [31.4659, -26.5225],
    bounds: [30.7908, -27.3175, 32.1349, -25.7188],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Tigodzi', nameEn: 'Regions', count: 4 },
      2: { name: 'Tinkhundla', nameEn: 'Constituencies', count: 55 }
    },
    languages: ['Swazi', 'English'],
    currency: 'SZL'
  },

  LSO: {
    code: 'LSO',
    name: 'Lesotho',
    nameFr: 'Lesotho',
    nameLocal: 'Lesotho',
    region: 'Southern Africa',
    subregion: 'Southern',
    capital: 'Maseru',
    capitalFr: 'Maseru',
    area: 30355,
    center: [28.2336, -29.6100],
    bounds: [27.0114, -30.6756, 29.4557, -28.5708],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Districts', nameEn: 'Districts', count: 10 },
      2: { name: 'Constituencies', nameEn: 'Constituencies', count: 80 }
    },
    languages: ['Sesotho', 'English'],
    currency: 'LSL'
  },

  NAM: {
    code: 'NAM',
    name: 'Namibia',
    nameFr: 'Namibie',
    nameLocal: 'Namibia',
    region: 'Southern Africa',
    subregion: 'Southern',
    capital: 'Windhoek',
    capitalFr: 'Windhoek',
    area: 825615,
    center: [18.4904, -22.9576],
    bounds: [11.7157, -28.9706, 25.2567, -16.9599],
    gadmAvailable: true,
    gadmLevels: 3,
    adminLevels: {
      1: { name: 'Regions', nameEn: 'Regions', count: 14 },
      2: { name: 'Constituencies', nameEn: 'Constituencies', count: 121 }
    },
    languages: ['English', 'Afrikaans', 'German'],
    currency: 'NAD'
  },

  ZAF: {
    code: 'ZAF',
    name: 'South Africa',
    nameFr: 'Afrique du Sud',
    nameLocal: 'South Africa',
    region: 'Southern Africa',
    subregion: 'Southern',
    capital: 'Pretoria',
    capitalFr: 'Pretoria',
    area: 1221037,
    center: [22.9375, -30.5595],
    bounds: [16.4580, -34.8392, 32.8911, -22.1265],
    gadmAvailable: true,
    gadmLevels: 4,
    adminLevels: {
      1: { name: 'Provinces', nameEn: 'Provinces', count: 9 },
      2: { name: 'Districts', nameEn: 'District Municipalities', count: 52 },
      3: { name: 'Municipalities', nameEn: 'Local Municipalities', count: 226 }
    },
    languages: ['Zulu', 'Xhosa', 'Afrikaans', 'English', 'Sepedi', 'Tswana', 'Sesotho', 'Tsonga', 'Swazi', 'Venda', 'Ndebele'],
    currency: 'ZAR'
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get country by ISO code
 * @param {string} code - ISO 3166-1 alpha-3 country code
 * @returns {Object|null} - Country configuration or null
 */
function getCountryByCode(code) {
  if (!code) return null;
  return AFRICAN_COUNTRIES[code.toUpperCase()] || null;
}

/**
 * Get country by name (English or French)
 * @param {string} name - Country name
 * @returns {Object|null} - Country configuration or null
 */
function getCountryByName(name) {
  if (!name) return null;
  const normalizedName = name.toLowerCase().trim();
  
  for (const country of Object.values(AFRICAN_COUNTRIES)) {
    if (
      country.name.toLowerCase() === normalizedName ||
      country.nameFr.toLowerCase() === normalizedName ||
      (country.nameLocal && country.nameLocal.toLowerCase() === normalizedName)
    ) {
      return country;
    }
  }
  return null;
}

/**
 * Get all countries
 * @returns {Array} - Array of all country configurations
 */
function getAllCountries() {
  return Object.values(AFRICAN_COUNTRIES);
}

/**
 * Get countries by region
 * @param {string} region - Region name (e.g., 'West Africa', 'Central Africa')
 * @returns {Array} - Array of countries in the region
 */
function getCountriesByRegion(region) {
  if (!region) return [];
  const normalizedRegion = region.toLowerCase().trim();
  
  return Object.values(AFRICAN_COUNTRIES).filter(
    country => country.region.toLowerCase() === normalizedRegion
  );
}

/**
 * Get default country (Cameroon for backward compatibility)
 * @returns {Object} - Default country configuration
 */
function getDefaultCountry() {
  return AFRICAN_COUNTRIES.CMR;
}

/**
 * Get country list for API response
 * @returns {Array} - Simplified country list
 */
function getCountryList() {
  return Object.values(AFRICAN_COUNTRIES).map(country => ({
    code: country.code,
    name: country.name,
    nameFr: country.nameFr,
    region: country.region,
    capital: country.capital,
    area: country.area,
    gadmAvailable: country.gadmAvailable
  })).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get regions list
 * @returns {Array} - List of African regions
 */
function getRegions() {
  const regions = new Set();
  Object.values(AFRICAN_COUNTRIES).forEach(country => {
    regions.add(country.region);
  });
  return Array.from(regions).sort();
}

/**
 * Validate country code
 * @param {string} code - Country code to validate
 * @returns {boolean} - Whether the code is valid
 */
function isValidCountryCode(code) {
  if (!code) return false;
  return code.toUpperCase() in AFRICAN_COUNTRIES;
}

/**
 * Get GADM file path for a country
 * @param {string} countryCode - ISO country code
 * @param {number} level - Administrative level
 * @returns {string} - Expected GADM file path
 */
function getGADMFilePath(countryCode, level = 0) {
  const code = countryCode.toUpperCase();
  return `gadm41_${code}_${level}.json`;
}

/**
 * Get country area in km²
 * @param {string} countryCode - ISO country code
 * @returns {number} - Area in km²
 */
function getCountryArea(countryCode) {
  const country = getCountryByCode(countryCode);
  return country ? country.area : 0;
}

/**
 * Get country bounds
 * @param {string} countryCode - ISO country code
 * @returns {Array|null} - Bounds [minLng, minLat, maxLng, maxLat]
 */
function getCountryBounds(countryCode) {
  const country = getCountryByCode(countryCode);
  return country ? country.bounds : null;
}

/**
 * Get country center coordinates
 * @param {string} countryCode - ISO country code
 * @returns {Array|null} - Center [longitude, latitude]
 */
function getCountryCenter(countryCode) {
  const country = getCountryByCode(countryCode);
  return country ? country.center : null;
}

// ============================================
// EXPORTS
// ============================================
module.exports = {
  AFRICAN_COUNTRIES,
  getCountryByCode,
  getCountryByName,
  getAllCountries,
  getCountriesByRegion,
  getDefaultCountry,
  getCountryList,
  getRegions,
  isValidCountryCode,
  getGADMFilePath,
  getCountryArea,
  getCountryBounds,
  getCountryCenter,
  
  // Constants for backward compatibility
  DEFAULT_COUNTRY_CODE: 'CMR',
  TOTAL_COUNTRIES: 54
};
