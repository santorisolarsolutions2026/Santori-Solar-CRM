import type { Prisma } from '@/generated/prisma/client';

export interface LocalityRule {
  addresses: string[];
  pinCodes?: string[];
  exclusions?: string[];
  customCondition?: Prisma.LeadWhereInput;
}

export const LOCALITY_KEYWORD_RULES: Record<string, LocalityRule> = {
  // --- VARANASI ---
  kandwa: { addresses: ['kandwa', 'kandawa'] },
  dafi: { addresses: ['dafi'] },
  akhari: { addresses: ['akhari'] },
  mirzamurad: { addresses: ['mirzamurad'] },
  'kachhwa road': { addresses: ['kachhwa', 'kachwa'] },
  chitaipur: { addresses: ['chitaipur'] },
  susuwahi: { addresses: ['susuwahi'] },
  sewapuri: {
    addresses: ['sewapuri', 'bharahua'],
    pinCodes: ['221403'],
  },
  kapsethi: { addresses: ['kapsethi'] },
  'seer goverdhanpur': { addresses: ['seer', 'seer goverdhan', 'seer govardhan'] },
  bhagwanpur: { addresses: ['bhagwanpur'] },
  lohta: { addresses: ['lohta', 'lohata'] },
  bazardiha: { addresses: ['bazardiha', 'bazardeeha', 'bajardiha', 'barjdiha'] },
  sunderpur: { addresses: ['sunderpur', 'sundarpur', 'kaushlesh nagar', 'kaushleshnagar', 'brij enclave'] },
  naria: { addresses: ['naria', 'nariya'] },
  'mohan sarai': { addresses: ['mohan sarai', 'mohansarai'] },
  nagwa: { addresses: ['nagwa'] },
  'samne ghat': { addresses: ['samne ghat', 'samneghat'] },
  lanka: {
    addresses: ['lanka', 'bhu', 'durgakund'],
    pinCodes: ['221005'],
    exclusions: [
      'assi', 'nagwa', 'samne ghat', 'samneghat', 'seer', 'seer goverdhan',
      'bhagwanpur', 'susuwahi', 'naria', 'sunderpur', 'ramana', 'tikari',
      'kardhana', 'karasana', 'mangalpur', 'chitaipur', 'kandwa'
    ],
  },
  assi: { addresses: ['assi', 'ravindrapuri'] },
  sigra: {
    addresses: ['sigra', 'sidgiri'],
    pinCodes: ['221010', '221002'],
    exclusions: ['mahmoorganj', 'dlw', 'blw', 'kakarmatta', 'manduadih', 'cantt', 'nadesar'],
  },
  mahmoorganj: { addresses: ['mahmoorganj', 'rath yatra', 'fatman', 'gurubagh'] },
  bhelupur: {
    addresses: ['bhelupur', 'shivala', 'kamachha'],
    pinCodes: ['221001'],
    exclusions: ['sonarpura', 'khojwan', 'dashashwamedh', 'chowk', 'godowlia', 'luxa'],
  },
  sonarpura: { addresses: ['sonarpura', 'khojwan', 'khojwa', 'khochawa', 'chaukighat', 'chauki ghat'] },
  dlw: { addresses: ['dlw', 'blw', 'kakarmatta', 'banaras locomotive'] },
  manduadih: { addresses: ['manduadih', 'maduadih'] },
  kakarmatta: { addresses: ['kakarmatta'] },
  dashashwamedh: { addresses: ['dashashwamedh', 'dasaswamedh', 'godowlia', 'luxa', 'kodai chowki', 'kodai chauki', 'kodai ki chowki', 'kadoi chowki', 'kodaichowki'] },
  chowk: {
    addresses: ['chowk', 'chauk', 'maidagin', 'thatheri', 'chaukhamba', 'chahmama', 'bansphatak', 'gheehatta', 'kachauri gali', 'raja darwaza', 'govindpura'],
    exclusions: [
      'ramnagar', 'ram nagar', 'ram naga', 'ranagar', 'hathi', 'chaukhandi', 'chowkhandi', 'chaukhani',
      'chaukahandi', 'chaukhanrdi', 'chaukaha', 'chaukadhi', 'chavkhndi', 'chavkhadi', 'chavkhade', 'chaukandi',
      'chaukhan di', 'chaukhanfi', 'chaukhade', 'chaukhadi', 'chavkhnd', 'chaukhnd', 'kotwa', 'kotava',
      'ramna', 'ramana', 'coraut', 'koraut', 'sarnath', 'sewapuri', 'barasta',
      'murari', 'police', 'poolice', 'pulice', 'kodai', 'kadoi', 'bazardiha', 'bajardiha', 'chitaipur',
      'sonarpura', 'kandwa', 'amara', 'amra', 'bankat', 'khojawan', 'khojwan', 'khojwa', 'naria', 'nariya',
      'kashipur', 'chaukighat', 'chauki ghat', 'shahanshahpur', 'milki'
    ],
  },
  chaukhandi: {
    addresses: [
      'chaukhandi', 'chowkhandi', 'chaukhand', 'chaukhani', 'chaukahandi', 'chaukhanrdi',
      'chaukaha', 'chaukadhi', 'chavkhndi', 'chavkhadi', 'chavkhade', 'chaukandi',
      'chaukhan di', 'chaukhanfi', 'chaukhade', 'chaukhadi', 'chavkhnd', 'chaukhnd'
    ],
  },
  'raja talab': {
    addresses: ['raja talab', 'rajatalab', 'shahanshahpur'],
    pinCodes: ['221307'],
    exclusions: [
      'mirzamurad', 'mohan sarai', 'mohansarai', 'kachhwa', 'sewapuri', 'kapsethi',
      'gangapur', 'koraut', 'jansa', 'birbhanpur', 'jakhini', 'harsos', 'kashipur',
      'benipur', 'sajoi', 'jayapur', 'mehdiganj', 'rakhauna', 'rohania'
    ],
  },
  rohania: { addresses: ['rohania', 'rohaniya'] },
  ramnagar: { addresses: ['ramnagar', 'ram nagar', 'tengra', 'parawo', 'padav', 'padao', ' पड़ाव', 'ram naga', 'ranagar'], pinCodes: ['221008'] },
  babatpur: {
    addresses: ['babatpur'],
    pinCodes: ['221011'],
    exclusions: ['harahua', 'pindra', 'badagaon', 'baragaon', 'chaubepur', 'cholapur', 'sindhora', 'jalhupur'],
  },
  harahua: {
    addresses: ['harahua'],
    exclusions: ['bharahua'],
  },
  shivpur: { addresses: ['shivpur', 'orderly', 'tarna', 'gilat bazar'], pinCodes: ['221003'] },
  sarnath: { addresses: ['sarnath'], pinCodes: ['221007'] },
  ashapur: { addresses: ['ashapur'] },
  pandeypur: { addresses: ['pandeypur', 'akatha', 'lalpur', 'premchand nagar'] },
  paharia: { addresses: ['paharia', 'pahariya', 'ashapur', 'gayatri nagar'] },
  nadesar: { addresses: ['nadesar', 'chaukaghat'] },
  cantt: { addresses: ['cantt'] },
  chaubepur: { addresses: ['chaubepur', 'chaubeypur', 'kadipur', 'munari'] },
  cholapur: { addresses: ['cholapur'], pinCodes: ['221101'] },
  badagaon: { addresses: ['badagaon', 'baragaon'] },
  pindra: { addresses: ['pindra', 'phoolpur'] },
  mughalsarai: { addresses: ['mughalsarai', 'pt deen dayal'] },
  chandauli: { addresses: ['chandauli', 'sakaldiha', 'chakia'] },
  bhadohi: { addresses: ['bhadohi', 'aurai', 'gyanpur'] },
  gangapur: { addresses: ['gangapur'], pinCodes: ['221302'] },
  koraut: { addresses: ['koraut', 'korauta'] },
  jansa: { addresses: ['jansa', 'jansha'] },
  bachchhaon: { addresses: ['bachchhaon', 'bachhanw', 'bachhawn'] },
  sindhora: { addresses: ['sindhora'], pinCodes: ['221106'] },
  jalhupur: { addresses: ['jalhupur'], pinCodes: ['221105'] },
  birbhanpur: { addresses: ['birbhanpur'] },
  jakhini: { addresses: ['jakhini', 'jakkhini'] },
  kurahua: { addresses: ['kurahua', 'kurahwa'] },
  harsos: { addresses: ['harsos'] },
  kashipur: { addresses: ['kashipur'] },
  benipur: { addresses: ['benipur'] },
  sajoi: { addresses: ['sajoi'] },
  'amra khairachak': { addresses: ['amra', 'khaira chak'] },
  kotwa: { addresses: ['kotwa'] },
  chhitauni: { addresses: ['chhitauni'] },
  ganjari: { addresses: ['ganjari'] },
  jagatpur: { addresses: ['jagatpur'] },
  jayapur: { addresses: ['jayapur'] },
  kesharipur: { addresses: ['kesharipur'] },
  mehdiganj: { addresses: ['mehdiganj'] },
  rakhauna: { addresses: ['rakhauna'] },
  ramana: { addresses: ['ramana', 'ramna', 'malahiya ramna'] },
  tikari: { addresses: ['tikari'] },
  kardhana: { addresses: ['kardhana', 'karasana'] },
  mangalpur: { addresses: ['mangalpur'] },
  hathi: {
    addresses: ['hathi'],
    exclusions: ['chaukhandi', 'chowkhandi', 'chaukhani', 'chaukhand', 'chaukhade', 'chaukhadi', 'chavkhndi'],
  },
  naipura: { addresses: ['naipura'] },
  khewali: { addresses: ['khewali'] },
  chhittupur: { addresses: ['chhittupur', 'chittupur', 'chhitoopur', 'murari chowk', 'murari chauk'] },
  bankat: { addresses: ['bankat'] },
  thathara: { addresses: ['thathara', 'thathra', 'thatara'] },
  hariharpur: { addresses: ['hariharpur'] },
  chakarpanpur: { addresses: ['chakarpanpur'] },
  ghamhapur: { addresses: ['ghamhapur'] },
  dayapur: { addresses: ['dayapur'] },
  tendui: { addresses: ['tendui'] },
  bhatsar: { addresses: ['bhatsar'] },
  haribhanpur: { addresses: ['haribhanpur'] },
  kalikabara: { addresses: ['kalikabara'] },
  guria: { addresses: ['guria'] },
  kerakatpur: { addresses: ['kerakatpur'] },
  harpalpur: { addresses: ['harpalpur'] },
  bhitari: { addresses: ['bhitari'] },
  deipur: { addresses: ['deipur'] },
  dhannipur: { addresses: ['dhannipur'] },
  gorai: { addresses: ['gorai'] },
  sakalpur: { addresses: ['sakalpur'] },
  khajuri: { addresses: ['khajuri'] },
  chandapur: { addresses: ['chandapur'] },
  mahangipur: { addresses: ['mahangipur', 'mahagipur'] },
  barki: { addresses: ['barki', 'baraki'] },
  raghunathpur: { addresses: ['raghunathpur'] },
  bhikhampur: { addresses: ['bhikhampur'] },
  dindaspur: { addresses: ['dindaspur'] },
  kaneri: { addresses: ['kaneri'] },
  sarauni: { addresses: ['sarauni', 'saruni', 'sihorawa'] },
  maniyaripur: { addresses: ['maniyaripur'] },

  // --- PRAYAGRAJ ---
  shankargarh: { addresses: ['shankargarh', 'shankergarh', 'shanker garh', 'shankar garh', 'sankargarh', 'jasra'], pinCodes: ['212107', '212108'] },
  bara: {
    addresses: ['bara', 'baraalld'],
    exclusions: ['bharatganj', 'baragaon', 'baraut', 'baramadpur', 'jasra', 'karchana', 'karchhana'],
  },
  naribari: { addresses: ['naribari'] },
  jasra: { addresses: ['jasra'] },
  naini: {
    addresses: ['naini', 'chheoki', 'sandawa', 'ada colony', 'a.d.a'],
    pinCodes: ['211008'],
    exclusions: [
      'arail', 'chaka', 'dhanuha', 'kharkauni', 'babura', 'dandupur', 'palpur',
      'mungari', 'mohabbatganj', 'karchana', 'karchhana', 'shankargarh', 'jasra',
      'jari', 'panasa', 'madauka', 'pipraon', 'majhiar', 'karma', 'bheerpur', 'balapur'
    ],
  },
  meja: {
    addresses: ['meja', 'urwa', 'sirsa'],
    pinCodes: ['212302'],
    exclusions: ['karchana', 'karchhana'],
  },
  bharatganj: { addresses: ['bharatganj'] },
  karchana: { addresses: ['karchana', 'karchhana', 'karchhanaalld'], pinCodes: ['212301'] },
  jhunsi: {
    addresses: ['jhunsi', 'jhusi'],
    customCondition: {
      OR: [
        { address: { contains: 'jhunsi', mode: 'insensitive' } },
        { address: { contains: 'jhusi', mode: 'insensitive' } },
        {
          AND: [
            { pinCode: '211019' },
            { address: { not: { contains: 'naini' } } },
          ],
        },
        {
          AND: [
            { address: { contains: 'andawa', mode: 'insensitive' } },
            { address: { not: { contains: 'sandawa' } } },
            { address: { not: { contains: 'mandawa' } } },
          ],
        },
      ],
    },
  },
  nawabganj: { addresses: ['nawabganj', 'kaurihar', 'kaudihar'] },
  ghoorpur: { addresses: ['ghoorpur', 'iradatganj'] },
  'civil lines': { addresses: ['civil lines', 'high court', 'mg marg'], pinCodes: ['211001'] },
  phaphamau: { addresses: ['phaphamau'], pinCodes: ['211013'] },
  shantipuram: { addresses: ['shantipuram'] },
  katra: { addresses: ['katra', 'university'], pinCodes: ['211002'] },
  mumfordganj: { addresses: ['mumfordganj'] },
  dhoomanganj: { addresses: ['dhoomanganj', 'subedarganj'], pinCodes: ['211011'] },
  mundera: { addresses: ['mundera'] },
  bamrauli: { addresses: ['bamrauli'] },
  manauri: { addresses: ['manauri'] },
  kareli: { addresses: ['kareli'], pinCodes: ['211016'] },
  gaughat: { addresses: ['gaughat'] },
  'gtb nagar': { addresses: ['gtb nagar'] },
  attarsuiya: { addresses: ['attarsuiya', 'meerapur', 'rani mandi', 'muthiganj', 'zero road'] },
  kydganj: { addresses: ['kydganj'] },
  bhawapur: { addresses: ['bhawapur'] },
  colonelganj: { addresses: ['colonelganj'] },
  'beli gaon': { addresses: ['beli gaon', 'beligaon'] },
  beligaon: { addresses: ['beli gaon', 'beligaon'] },
  koraon: { addresses: ['koraon', 'pasna', 'kohdar'], pinCodes: ['212306'] },
  handia: { addresses: ['handia', 'dhanupur'], pinCodes: ['221503'] },
  saidabad: { addresses: ['saidabad'] },
  soraon: { addresses: ['soraon', 'holagarh'], pinCodes: ['212502'] },
  mauaima: { addresses: ['mauaima'] },
  teliyarganj: { addresses: ['teliyarganj', 'mnnit'], pinCodes: ['211004'] },
  govindpuram: {
    addresses: ['govindpuram'],
    pinCodes: ['211008'],
  },
  govindpur: {
    addresses: ['govindpur'],
    exclusions: ['govindpuram', 'naini'],
    pinCodes: ['211004'],
  },
  daraganj: { addresses: ['daraganj', 'dara ganj'] },
  'tagore town': { addresses: ['tagore town'] },
  'george town': { addresses: ['george town'] },
  allahpur: { addresses: ['allahpur', 'alopi'], pinCodes: ['211006'] },
  rajrooppur: { addresses: ['rajrooppur'] },
  'preetam nagar': { addresses: ['preetam nagar'] },
  kalindipuram: { addresses: ['kalindipuram'] },
  sahson: { addresses: ['sahson', 'hanumanganj'] },
  chaka: { addresses: ['chaka'] },
  arail: { addresses: ['arail'] },
  babura: { addresses: ['babura'] },
  dandupur: { addresses: ['dandupur', 'palpur'] },
  dhanuha: { addresses: ['dhanuha'] },
  kharkauni: { addresses: ['kharkauni'] },
  mungari: { addresses: ['mungari', 'mungary'] },
  mohabbatganj: { addresses: ['mohabbatganj'] },
  jari: { addresses: ['jari'] },
  panasa: { addresses: ['panasa'] },
  phulpur: { addresses: ['phulpur', 'phoolpur'] },
  pipalgaon: { addresses: ['pipalgaon'] },
  jhalwa: { addresses: ['jhalwa', 'iiit'] },
  salori: { addresses: ['salori'] },
  allenganj: { addresses: ['allenganj'] },
  madauka: { addresses: ['madauka', 'madouka'] },
  pipraon: { addresses: ['pipraon', 'pipraw'] },
  majhiar: { addresses: ['majhiar'] },
  karma: { addresses: ['karma'] },
  bheerpur: { addresses: ['bheerpur'] },
  balapur: { addresses: ['balapur'] },
  bhagwatpur: { addresses: ['bhagwatpur', 'bhagawatpur'] },
  chaukatha: { addresses: ['chaukatha', 'chaukhata', 'chauka tha'] },
  khuldabad: { addresses: ['khuldabad'] },
  'stanley road': { addresses: ['stanley road'] },
  'chatham lines': { addresses: ['chatham lines'] },
  shivkuti: { addresses: ['shivkuti'] },
  mehdauri: { addresses: ['mehdauri'] },
  'ashok nagar': { addresses: ['ashok nagar'] },
  sohbatiyabagh: { addresses: ['sohbatiya bagh', 'sohbatiabagh'] },
  rasoolabad: { addresses: ['rasoolabad', 'rasulabad'] },

  // --- LUCKNOW ---
  'gomti nagar': { addresses: ['gomti nagar', 'gomtinagar'], pinCodes: ['226010'] },
  alambagh: { addresses: ['alambagh'], pinCodes: ['226005'] },
  hazratganj: { addresses: ['hazratganj'], pinCodes: ['226001'] },
  'indira nagar': { addresses: ['indira nagar', 'indiranagar'], pinCodes: ['226016'] },
  aliganj: { addresses: ['aliganj'], pinCodes: ['226024'] },

  // --- KANPUR ---
  kalyanpur: { addresses: ['kalyanpur'], pinCodes: ['208017'] },
  'kidwai nagar': { addresses: ['kidwai nagar'], pinCodes: ['208011'] },
};

export const VARANASI_DISCRETE_LOCALITIES = [
  'kandwa', 'dafi', 'akhari', 'mirzamurad', 'kachhwa road', 'chitaipur', 'susuwahi',
  'sewapuri', 'kapsethi', 'seer goverdhanpur', 'bhagwanpur', 'lohta', 'bazardiha',
  'sunderpur', 'naria', 'mohan sarai', 'nagwa', 'samne ghat', 'lanka', 'assi',
  'sigra', 'mahmoorganj', 'bhelupur', 'sonarpura', 'dlw', 'manduadih', 'kakarmatta',
  'dashashwamedh', 'chaukhandi', 'chowk', 'raja talab', 'rohania', 'ramnagar', 'babatpur',
  'harahua', 'shivpur', 'sarnath', 'ashapur', 'pandeypur', 'paharia', 'nadesar',
  'cantt', 'chaubepur', 'cholapur', 'badagaon', 'pindra', 'mughalsarai', 'chandauli',
  'bhadohi', 'gangapur', 'koraut', 'jansa', 'bachchhaon', 'sindhora', 'jalhupur',
  'birbhanpur', 'jakhini', 'kurahua', 'harsos', 'kashipur', 'benipur', 'sajoi',
  'amra khairachak', 'kotwa', 'chhitauni', 'ganjari', 'jagatpur', 'jayapur',
  'kesharipur', 'mehdiganj', 'rakhauna', 'ramana', 'tikari', 'kardhana',
  'mangalpur', 'hathi', 'naipura', 'khewali', 'chhittupur', 'bankat', 'thathara',
  'hariharpur', 'chakarpanpur', 'ghamhapur', 'dayapur', 'tendui', 'bhatsar',
  'haribhanpur', 'kalikabara', 'guria', 'kerakatpur', 'harpalpur', 'bhitari',
  'deipur', 'dhannipur', 'gorai', 'sakalpur', 'khajuri', 'chandapur', 'mahangipur',
  'barki', 'raghunathpur', 'bhikhampur', 'dindaspur', 'kaneri', 'sarauni', 'maniyaripur',
];

export const PRAYAGRAJ_DISCRETE_LOCALITIES = [
  'shankargarh', 'bara', 'naribari', 'jasra', 'naini', 'meja', 'bharatganj',
  'karchana', 'jhunsi', 'nawabganj', 'ghoorpur', 'civil lines', 'phaphamau',
  'shantipuram', 'katra', 'mumfordganj', 'dhoomanganj', 'mundera', 'bamrauli',
  'manauri', 'kareli', 'gaughat', 'gtb nagar', 'attarsuiya', 'kydganj', 'bhawapur',
  'colonelganj', 'beli gaon', 'beligaon', 'koraon', 'handia', 'saidabad', 'soraon',
  'mauaima', 'teliyarganj', 'govindpuram', 'govindpur', 'daraganj', 'tagore town',
  'george town', 'allahpur', 'rajrooppur', 'preetam nagar', 'kalindipuram', 'sahson',
  'chaka', 'arail', 'babura', 'dandupur', 'dhanuha', 'kharkauni', 'mungari',
  'mohabbatganj', 'jari', 'panasa', 'phulpur', 'pipalgaon', 'jhalwa', 'salori',
  'allenganj', 'madauka', 'pipraon', 'majhiar', 'karma', 'bheerpur', 'balapur',
  'bhagwatpur', 'chaukatha', 'khuldabad', 'stanley road', 'chatham lines', 'shivkuti',
  'mehdauri', 'ashok nagar', 'sohbatiyabagh', 'rasoolabad',
];

export const LUCKNOW_DISCRETE_LOCALITIES = [
  'gomti nagar', 'alambagh', 'hazratganj', 'indira nagar', 'aliganj',
];

export const KANPUR_DISCRETE_LOCALITIES = [
  'kalyanpur', 'civil lines', 'kidwai nagar',
];

/**
 * Builds a Prisma WhereInput condition for a single locality key
 */
export function buildSingleLocalityCondition(key: string): Prisma.LeadWhereInput | null {
  const trimmed = key.trim().toLowerCase();
  const rule = LOCALITY_KEYWORD_RULES[trimmed];
  if (!rule) {
    return { address: { contains: trimmed, mode: 'insensitive' } };
  }
  if (rule.customCondition) {
    return rule.customCondition;
  }
  const matchItems: Prisma.LeadWhereInput[] = [];
  rule.addresses.forEach((addr) => {
    matchItems.push({ address: { contains: addr, mode: 'insensitive' } });
  });

  if (rule.pinCodes && rule.pinCodes.length > 0) {
    rule.pinCodes.forEach((pin) => {
      matchItems.push({ pinCode: pin });
    });
  }

  if (matchItems.length === 0) return null;

  const baseMatch: Prisma.LeadWhereInput =
    matchItems.length === 1 ? matchItems[0] : { OR: matchItems };

  if (rule.exclusions && rule.exclusions.length > 0) {
    return {
      AND: [
        baseMatch,
        {
          NOT: rule.exclusions.map((ex) => ({
            address: { contains: ex, mode: 'insensitive' },
          })),
        },
      ],
    };
  }

  return baseMatch;
}

/**
 * Builds Prisma WhereInput conditions for a list of localities.
 * Supports discrete locality rules as well as General City Wards fallback exclusion.
 */
export function buildLocalityWhereConditions(
  localities: string[],
  cityContext?: string
): Prisma.LeadWhereInput[] {
  const localityOrConditions: Prisma.LeadWhereInput[] = [];

  localities.forEach((loc: string) => {
    let city = cityContext || '';
    let raw = loc;
    if (loc.includes('::')) {
      const parts = loc.split('::');
      city = parts[0];
      raw = parts[1];
    }
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed) return;

    if (
      trimmed === 'general city wards' ||
      trimmed === 'other / general area' ||
      trimmed === 'general'
    ) {
      // Determine discrete list to exclude based on city context
      const c = city.trim().toLowerCase();
      let discreteKeys: string[] = [];

      if (c.includes('prayagraj') || c.includes('allahabad')) {
        discreteKeys = PRAYAGRAJ_DISCRETE_LOCALITIES;
      } else if (c.includes('varanasi') || c.includes('banaras') || c.includes('kashi')) {
        discreteKeys = VARANASI_DISCRETE_LOCALITIES;
      } else if (c.includes('lucknow')) {
        discreteKeys = LUCKNOW_DISCRETE_LOCALITIES;
      } else if (c.includes('kanpur')) {
        discreteKeys = KANPUR_DISCRETE_LOCALITIES;
      } else {
        // Fallback: exclude all discrete localities across known cities
        discreteKeys = [
          ...PRAYAGRAJ_DISCRETE_LOCALITIES,
          ...VARANASI_DISCRETE_LOCALITIES,
          ...LUCKNOW_DISCRETE_LOCALITIES,
          ...KANPUR_DISCRETE_LOCALITIES,
        ];
      }

      const discreteConditions: Prisma.LeadWhereInput[] = [];
      discreteKeys.forEach((key) => {
        const cond = buildSingleLocalityCondition(key);
        if (cond) discreteConditions.push(cond);
      });

      if (discreteConditions.length > 0) {
        localityOrConditions.push({
          NOT: [
            {
              OR: discreteConditions,
            },
          ],
        });
      }
      return;
    }

    const cond = buildSingleLocalityCondition(trimmed);
    if (cond) {
      localityOrConditions.push(cond);
    }
  });

  return localityOrConditions;
}

