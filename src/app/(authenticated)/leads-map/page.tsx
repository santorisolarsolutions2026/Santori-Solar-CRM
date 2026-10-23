'use client';

import 'leaflet/dist/leaflet.css';
import React, { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  Globe2,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  Loader2,
  Compass,
  Sparkles,
  Building2,
  RefreshCw,
  Crosshair,
  CheckCircle2,
  XCircle,
  Users,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Layers,
  Zap,
  CheckSquare,
  Square,
  X,
  UserCheck,
  User,
  ArrowRight,
  SlidersHorizontal,
  Check,
  Copy,
  ExternalLink,
  Eye,
  Phone,
} from 'lucide-react';

interface DivisionSummary {
  name: string;
  total: number;
  active: number;
  inactive: number;
  unassigned: number;
  assigned: number;
}

interface CitySummary {
  name: string;
  state: string;
  total: number;
  active: number;
  inactive: number;
  unassigned: number;
  assigned: number;
  divisions: DivisionSummary[];
}

interface StateSummary {
  name: string;
  total: number;
  active: number;
  inactive: number;
  unassigned: number;
  assigned: number;
  cities: CitySummary[];
}

interface GeoDataResponse {
  success: boolean;
  summary: {
    totalLeads: number;
    totalActive: number;
    totalInactive: number;
    totalUnassigned: number;
    totalAssigned: number;
    activePercentage: number;
    inactivePercentage: number;
    unassignedPercentage: number;
    assignedPercentage: number;
    totalStates: number;
    totalCities: number;
  };
  states: StateSummary[];
  cities: CitySummary[];
}

// Exact Real-World GPS Coordinates (Latitude, Longitude) for Single Discrete Localities (OSM Centroids)
const LOCALITY_GPS_COORDINATES: Record<string, { lat: number; lng: number; sector: string }> = {
  // --- VARANASI SINGLE DISCRETE LOCALITIES ---
  kandwa: { lat: 25.2635, lng: 82.9554, sector: 'South Outer (Bypass)' },
  dafi: { lat: 25.2582, lng: 82.9856, sector: 'South Outer (NH19 Bypass)' },
  akhari: { lat: 25.2520, lng: 82.9625, sector: 'South Outer' },
  mirzamurad: { lat: 25.2325, lng: 82.7842, sector: 'South-West (GT Road)' },
  'kachhwa road': { lat: 25.2280, lng: 82.7680, sector: 'South-West Outer' },
  chitaipur: { lat: 25.2754, lng: 82.9682, sector: 'South (Chitaipur Cross)' },
  susuwahi: { lat: 25.2705, lng: 82.9785, sector: 'South (Near BHU)' },
  sewapuri: { lat: 25.3355, lng: 82.7892, sector: 'South-West Tehsil' },
  kapsethi: { lat: 25.3280, lng: 82.7540, sector: 'South-West Rural' },
  'seer goverdhanpur': { lat: 25.2682, lng: 82.9984, sector: 'South (Sant Ravidas)' },
  bhagwanpur: { lat: 25.2715, lng: 83.0035, sector: 'South Riverfront' },
  lohta: { lat: 25.3284, lng: 82.9252, sector: 'West (Handloom Hub)' },
  bazardiha: { lat: 25.3012, lng: 82.9824, sector: 'West Urban' },
  sunderpur: { lat: 25.2894, lng: 82.9815, sector: 'South-Central' },
  naria: { lat: 25.2850, lng: 82.9920, sector: 'South-Central (BHU Road)' },
  'mohan sarai': { lat: 25.2562, lng: 82.8894, sector: 'South-West (Ring Road)' },
  nagwa: { lat: 25.2785, lng: 83.0084, sector: 'Ganga South Bank' },
  'samne ghat': { lat: 25.2720, lng: 83.0152, sector: 'Samne Ghat Bridge' },
  lanka: { lat: 25.2811, lng: 82.9988, sector: 'BHU Main Gate / Lanka' },
  assi: { lat: 25.2925, lng: 83.0062, sector: 'Assi Ghat Corridor' },
  sigra: { lat: 25.3113, lng: 82.9852, sector: 'Sigra Commercial Hub' },
  mahmoorganj: { lat: 25.3080, lng: 82.9750, sector: 'Mahmoorganj Residential' },
  bhelupur: { lat: 25.3020, lng: 82.9960, sector: 'Bhelupur Core' },
  sonarpura: { lat: 25.3035, lng: 83.0045, sector: 'Sonarpura Market' },
  dlw: { lat: 25.2950, lng: 82.9640, sector: 'BLW Locomotive Township' },
  manduadih: { lat: 25.3001, lng: 82.9649, sector: 'Banaras Railway Station' },
  kakarmatta: { lat: 25.2985, lng: 82.9715, sector: 'Kakarmatta Flyover' },
  dashashwamedh: { lat: 25.3075, lng: 83.0085, sector: 'Dashashwamedh Ghat & Godowlia' },
  chaukhandi: { lat: 25.3350, lng: 82.8050, sector: 'Chaukhandi (West Varanasi / Hathibazar)' },
  chowk: { lat: 25.3115, lng: 83.0125, sector: 'Chowk & Maidagin' },
  'raja talab': { lat: 25.2638, lng: 82.8511, sector: 'Raja Talab Tehsil' },
  rohania: { lat: 25.2680, lng: 82.9050, sector: 'Rohania Market' },
  ramnagar: { lat: 25.2697, lng: 83.0245, sector: 'Ramnagar Fort & Industrial' },
  babatpur: { lat: 25.4540, lng: 82.8805, sector: 'LBS International Airport' },
  harahua: { lat: 25.3850, lng: 82.9280, sector: 'Harahua / Airport Highway' },
  shivpur: { lat: 25.3560, lng: 82.9620, sector: 'Shivpur / Orderly Bazar' },
  sarnath: { lat: 25.3776, lng: 83.0276, sector: 'Sarnath Heritage Zone' },
  ashapur: { lat: 25.3620, lng: 83.0250, sector: 'Ashapur Crossing' },
  pandeypur: { lat: 25.3450, lng: 83.0080, sector: 'Pandeypur Crossing' },
  paharia: { lat: 25.3580, lng: 83.0150, sector: 'Paharia Mandi Area' },
  nadesar: { lat: 25.3340, lng: 82.9820, sector: 'Nadesar & Chaukaghat' },
  cantt: { lat: 25.3280, lng: 82.9860, sector: 'Varanasi Cantt Station / Mall' },
  chaubepur: { lat: 25.4380, lng: 83.1020, sector: 'North-East (Ghazipur Road)' },
  cholapur: { lat: 25.4720, lng: 82.9980, sector: 'North Rural Tehsil' },
  badagaon: { lat: 25.4210, lng: 82.8120, sector: 'North-West (Badagaon)' },
  pindra: { lat: 25.4850, lng: 82.8250, sector: 'Pindra Tehsil' },
  mughalsarai: { lat: 25.2810, lng: 83.1180, sector: 'DDU Nagar Railway Junction' },
  chandauli: { lat: 25.2610, lng: 83.2680, sector: 'Chandauli District HQ' },
  bhadohi: { lat: 25.4210, lng: 82.5710, sector: 'Bhadohi Carpet City' },
  gangapur: { lat: 25.2280, lng: 82.8680, sector: 'Gangapur Nagar Panchayat (South-West)' },
  koraut: { lat: 25.3340, lng: 82.8950, sector: 'Koraut Rural Market' },
  jansa: { lat: 25.3520, lng: 82.8250, sector: 'Jansa Market & Highway' },
  bachchhaon: { lat: 25.2480, lng: 82.9450, sector: 'Bachchhaon / Akhari Link' },
  sindhora: { lat: 25.5350, lng: 82.9450, sector: 'Sindhora Tehsil & Market' },
  jalhupur: { lat: 25.4250, lng: 83.0850, sector: 'Jalhupur / Chaubepur Block' },
  birbhanpur: { lat: 25.2380, lng: 82.8350, sector: 'Birbhanpur / GT Road' },
  jakhini: { lat: 25.2150, lng: 82.8850, sector: 'Jakhini / Araziline Block' },
  kurahua: { lat: 25.2550, lng: 82.9750, sector: 'Kurahua (Dafi Bypass Link)' },
  harsos: { lat: 25.2340, lng: 82.8980, sector: 'Harsos / Araziline' },
  kashipur: { lat: 25.3210, lng: 82.9180, sector: 'Kashipur / Lohta Corridor' },
  benipur: { lat: 25.2620, lng: 82.9150, sector: 'Benipur / Rohania Link' },
  sajoi: { lat: 25.2410, lng: 82.8420, sector: 'Sajoi / Raja Talab Belt' },
  'amra khairachak': { lat: 25.2650, lng: 82.9480, sector: 'Amra Khairachak / Bypass' },
  kotwa: { lat: 25.3420, lng: 82.9120, sector: 'Kotwa Handloom Belt' },
  chhitauni: { lat: 25.3380, lng: 82.9050, sector: 'Chhitauni Village' },
  ganjari: { lat: 25.2510, lng: 82.8480, sector: 'Ganjari (Stadium Site)' },
  jagatpur: { lat: 25.2750, lng: 82.9180, sector: 'Jagatpur PG College / Rohania' },
  jayapur: { lat: 25.2250, lng: 82.8220, sector: 'Jayapur (Adarsh Gram)' },
  kesharipur: { lat: 25.2980, lng: 82.9520, sector: 'Kesharipur / DLW-Manduadih' },
  mehdiganj: { lat: 25.2680, lng: 82.8420, sector: 'Mehdiganj (Raja Talab Bypass)' },
  rakhauna: { lat: 25.2480, lng: 82.8120, sector: 'Rakhauna Village' },
  ramana: { lat: 25.2530, lng: 83.0210, sector: 'Ramana / Ganga South Ring Road' },
  tikari: { lat: 25.2780, lng: 82.9520, sector: 'Tikari / Kashi Vidyapeeth' },
  kardhana: { lat: 25.2210, lng: 82.8650, sector: 'Kardhana / Araziline' },
  mangalpur: { lat: 25.2580, lng: 82.8710, sector: 'Mangalpur / GT Road' },
  hathi: { lat: 25.3210, lng: 82.8150, sector: 'Hathi Bazaar' },
  naipura: { lat: 25.2890, lng: 82.9480, sector: 'Naipura Kalan' },
  khewali: { lat: 25.3310, lng: 82.9050, sector: 'Khewali / Lohta Belt' },
  chhittupur: { lat: 25.2910, lng: 82.9910, sector: 'Chhittupur / BHU Road' },
  bankat: { lat: 25.3120, lng: 82.8020, sector: 'Bankat / Sewapuri' },
  thathara: { lat: 25.3180, lng: 82.7810, sector: 'Thathara / Sewapuri' },
  hariharpur: { lat: 25.2847, lng: 82.9288, sector: 'Hariharpur' },
  chakarpanpur: { lat: 25.3150, lng: 82.7910, sector: 'Chakarpanpur' },
  ghamhapur: { lat: 25.2690, lng: 82.9250, sector: 'Ghamhapur' },
  dayapur: { lat: 25.2753, lng: 82.9234, sector: 'Dayapur' },
  tendui: { lat: 25.2510, lng: 82.7950, sector: 'Tendui' },
  bhatsar: { lat: 25.2410, lng: 82.7720, sector: 'Bhatsar' },
  haribhanpur: { lat: 25.2340, lng: 82.7810, sector: 'Haribhanpur' },
  kalikabara: { lat: 25.2280, lng: 82.7910, sector: 'Kalikabara' },
  guria: { lat: 25.3220, lng: 82.7750, sector: 'Guria' },
  kerakatpur: { lat: 25.2410, lng: 82.8610, sector: 'Araziline / Raja Talab' },
  harpalpur: { lat: 25.3240, lng: 82.7680, sector: 'Sewapuri / Kapsethi' },
  bhitari: { lat: 25.3050, lng: 82.9150, sector: 'Kashi Vidyapeeth / Lohta' },
  deipur: { lat: 25.3120, lng: 82.8850, sector: 'Lohta / Kapsethi Corridor' },
  dhannipur: { lat: 25.4410, lng: 83.0520, sector: 'North-East (Chaubepur/Cholapur)' },
  gorai: { lat: 25.4120, lng: 82.8450, sector: 'North-West (Badagaon)' },
  sakalpur: { lat: 25.3950, lng: 82.9420, sector: 'Harahua / Airport Highway' },
  khajuri: { lat: 25.3380, lng: 82.9980, sector: 'Pandeypur / Cantt Link' },
  chandapur: { lat: 25.3180, lng: 82.9350, sector: 'Lohta / Handloom Park' },
  mahangipur: { lat: 25.2610, lng: 82.8980, sector: 'Rohania / Raja Talab' },
  barki: { lat: 25.2350, lng: 82.8550, sector: 'Raja Talab South' },
  raghunathpur: { lat: 25.4620, lng: 83.0180, sector: 'Cholapur Block' },
  bhikhampur: { lat: 25.3290, lng: 82.7720, sector: 'Sewapuri Tehsil' },
  dindaspur: { lat: 25.3250, lng: 82.9180, sector: 'Lohta Handloom Belt' },
  kaneri: { lat: 25.2480, lng: 82.8620, sector: 'Raja Talab Belt' },
  sarauni: { lat: 25.3780, lng: 82.9120, sector: 'Harahua / Airport Belt' },
  maniyaripur: { lat: 25.2890, lng: 82.8720, sector: 'West Outer (Raja Talab)' },

  // --- PRAYAGRAJ SINGLE DISCRETE LOCALITIES ---
  shankargarh: { lat: 25.1840, lng: 81.6020, sector: 'Prayagraj South (Rewa Road)' },
  bara: { lat: 25.1983, lng: 81.6577, sector: 'Bara Tehsil & Power Plant' },
  naribari: { lat: 25.0806, lng: 81.7433, sector: 'Naribari Market (Rewa Road)' },
  jasra: { lat: 25.2780, lng: 81.6920, sector: 'Jasra Market (Bara Tehsil)' },
  naini: { lat: 25.3900, lng: 81.8640, sector: 'Naini Industrial Area & ADA' },
  meja: { lat: 25.1420, lng: 82.1150, sector: 'Meja Tehsil Road' },
  bharatganj: { lat: 25.1210, lng: 82.1380, sector: 'Bharatganj Town' },
  karchana: { lat: 25.2890, lng: 81.9320, sector: 'Karchana Tehsil' },
  jhunsi: { lat: 25.4310, lng: 81.9050, sector: 'Jhunsi (Trans-Ganga East)' },
  nawabganj: { lat: 25.6420, lng: 81.7120, sector: 'Nawabganj (Lucknow Highway)' },
  ghoorpur: { lat: 25.3210, lng: 81.7850, sector: 'Ghoorpur / Yamuna South' },
  'civil lines': { lat: 25.4523, lng: 81.8330, sector: 'Civil Lines Commercial Core' },
  phaphamau: { lat: 25.5210, lng: 81.8550, sector: 'Phaphamau Bridge / North' },
  shantipuram: { lat: 25.5340, lng: 81.8500, sector: 'Shantipuram Housing Scheme' },
  katra: { lat: 25.4656, lng: 81.8520, sector: 'Katra / University Zone' },
  mumfordganj: { lat: 25.4753, lng: 81.8544, sector: 'Mumfordganj Residential' },
  dhoomanganj: { lat: 25.4450, lng: 81.7824, sector: 'Dhoomanganj / GT Road' },
  mundera: { lat: 25.4360, lng: 81.7610, sector: 'Mundera Mandi' },
  bamrauli: { lat: 25.4410, lng: 81.7340, sector: 'Bamrauli Airport / Air Force' },
  manauri: { lat: 25.4580, lng: 81.6850, sector: 'Manauri Air Force Station' },
  kareli: { lat: 25.4180, lng: 81.8210, sector: 'Kareli Scheme' },
  gaughat: { lat: 25.4285, lng: 81.8415, sector: 'Gaughat / Yamuna North Bank' },
  'gtb nagar': { lat: 25.4250, lng: 81.8150, sector: 'GTB Nagar Residential' },
  attarsuiya: { lat: 25.4350, lng: 81.8380, sector: 'Attarsuiya / Old City' },
  kydganj: { lat: 25.4341, lng: 81.8610, sector: 'Kydganj / Old City Riverfront' },
  bhawapur: { lat: 25.4380, lng: 81.8480, sector: 'Bhawapur' },
  colonelganj: { lat: 25.4553, lng: 81.8624, sector: 'Colonelganj Square' },
  beligaon: { lat: 25.4650, lng: 81.8420, sector: 'Beli Gaon' },
  koraon: { lat: 24.9850, lng: 82.0620, sector: 'Koraon Far South Tehsil' },
  handia: { lat: 25.3620, lng: 82.1850, sector: 'Handia (Varanasi Highway)' },
  saidabad: { lat: 25.3850, lng: 82.0850, sector: 'Saidabad Market' },
  soraon: { lat: 25.5820, lng: 81.8520, sector: 'Soraon Tehsil (NH30)' },
  mauaima: { lat: 25.7010, lng: 81.9210, sector: 'Mauaima Town (Pratapgarh Rd)' },
  teliyarganj: { lat: 25.4979, lng: 81.8586, sector: 'Teliyarganj / MNNIT Gate' },
  govindpur: { lat: 25.4839, lng: 81.8759, sector: 'Govindpur Housing (North)' },
  govindpuram: { lat: 25.3980, lng: 81.8650, sector: 'Govindpuram (Naini Sector)' },
  allahpur: { lat: 25.4529, lng: 81.8718, sector: 'Allahpur (Near Sangam)' },
  daraganj: { lat: 25.4365, lng: 81.8752, sector: 'Daraganj Market & Buxi Bandh' },
  'tagore town': { lat: 25.4570, lng: 81.8637, sector: 'Tagore Town' },
  'george town': { lat: 25.4505, lng: 81.8564, sector: 'George Town' },
  rajrooppur: { lat: 25.4364, lng: 81.7873, sector: 'Rajrooppur Residential' },
  'preetam nagar': { lat: 25.4320, lng: 81.7920, sector: 'Preetam Nagar Colony' },
  kalindipuram: { lat: 25.4297, lng: 81.7867, sector: 'Kalindipuram Awas Vikas' },
  sahson: { lat: 25.5120, lng: 81.9680, sector: 'Sahson Crossing' },
  chaka: { lat: 25.3780, lng: 81.8480, sector: 'Chaka Block / FCI Road' },
  arail: { lat: 25.4180, lng: 81.8780, sector: 'Arail Ghat / Sangam South' },
  kharkauni: { lat: 25.3850, lng: 81.8540, sector: 'Kharkauni / Naini' },
  dandupur: { lat: 25.3680, lng: 81.8250, sector: 'Dandupur / Palpur Market' },
  jari: { lat: 25.2150, lng: 81.6520, sector: 'Jari Bazaar (Rewa Road)' },
  mungari: { lat: 25.3120, lng: 81.9150, sector: 'Mungari Industrial Area' },
  dhanuha: { lat: 25.3950, lng: 81.8720, sector: 'Dhanuha / Naini' },
  panasa: { lat: 25.2950, lng: 81.9820, sector: 'Panasa / Yamuna Bank' },
  mohabbatganj: { lat: 25.4050, lng: 81.8680, sector: 'Mohabbatganj / Yamuna Bank' },
  babura: { lat: 25.3720, lng: 81.8380, sector: 'Babura / Naini Corridor' },
  phulpur: { lat: 25.5520, lng: 82.0850, sector: 'Phulpur Tehsil' },
  pipalgaon: { lat: 25.4450, lng: 81.7520, sector: 'Pipalgaon / West Prayagraj' },
  jhalwa: { lat: 25.4325, lng: 81.7724, sector: 'Jhalwa / IIIT Allahabad' },
  salori: { lat: 25.4780, lng: 81.8680, sector: 'Salori / Ganga Bank' },
  allenganj: { lat: 25.4645, lng: 81.8642, sector: 'Allenganj / University Area' },
  madauka: { lat: 25.4032, lng: 81.8262, sector: 'Madauka / Yamuna South' },
  pipraon: { lat: 25.3850, lng: 81.8150, sector: 'Pipraon / Rewa Road' },
  majhiar: { lat: 25.1787, lng: 81.5196, sector: 'Majhiar' },
  karma: { lat: 25.3210, lng: 81.7480, sector: 'Karma Market / Ghoorpur Link' },
  bheerpur: { lat: 25.2510, lng: 82.0250, sector: 'Bheerpur / Karchana East' },
  balapur: { lat: 25.3890, lng: 81.8920, sector: 'Balapur / Naini East' },
  bhagwatpur: { lat: 25.4380, lng: 81.7150, sector: 'Bhagwatpur / Airport Outer' },
  chaukatha: { lat: 25.2650, lng: 81.8950, sector: 'Chaukatha / Bagbana (Karchana Tehsil)' },
  khuldabad: { lat: 25.4425, lng: 81.8210, sector: 'Khuldabad Heritage' },
  'stanley road': { lat: 25.4650, lng: 81.8380, sector: 'Stanley Road / Cantonment' },
  'chatham lines': { lat: 25.4710, lng: 81.8480, sector: 'Chatham Lines / Katra North' },
  shivkuti: { lat: 25.4850, lng: 81.8610, sector: 'Shivkuti / Ganga Bank' },
  mehdauri: { lat: 25.4920, lng: 81.8510, sector: 'Mehdauri / Teliyarganj' },
  'ashok nagar': { lat: 25.4580, lng: 81.8250, sector: 'Ashok Nagar Residential' },
  sohbatiyabagh: { lat: 25.4460, lng: 81.8620, sector: 'Sohbatiyabagh / Rambagh' },
  rasoolabad: { lat: 25.4880, lng: 81.8650, sector: 'Rasoolabad Ghat Road' },

  // --- LUCKNOW ---
  'gomti nagar': { lat: 26.8500, lng: 80.9900, sector: 'Trans-Gomti Planned' },
  hazratganj: { lat: 26.8467, lng: 80.9460, sector: 'Hazratganj Central' },
  alambagh: { lat: 26.8150, lng: 80.9020, sector: 'Alambagh Transport Hub' },
  'indira nagar': { lat: 26.8850, lng: 80.9850, sector: 'Indira Nagar Colony' },
  aliganj: { lat: 26.8900, lng: 80.9400, sector: 'Aliganj Residential' },

  // --- KANPUR ---
  kalyanpur: { lat: 26.5020, lng: 80.2450, sector: 'Kalyanpur / IIT Kanpur' },
  'kidwai nagar': { lat: 26.4350, lng: 80.3350, sector: 'Kidwai Nagar Commercial' },
};

// City Center Fallbacks
const CITY_CENTER_COORDINATES: Record<string, [number, number]> = {
  varanasi: [25.3176, 82.9739],
  prayagraj: [25.4358, 81.8463],
  allahabad: [25.4358, 81.8463],
  lucknow: [26.8467, 80.9462],
  kanpur: [26.4499, 80.3319],
  gorakhpur: [26.7606, 83.3732],
  mirzapur: [25.1337, 82.5644],
  jaunpur: [25.7464, 82.6837],
  chandauli: [25.2610, 83.2680],
  bhadohi: [25.4210, 82.5710],
};



function getLocalityGPS(divisionName: string) {
  const key = divisionName.toLowerCase().trim();
  if (LOCALITY_GPS_COORDINATES[key]) {
    return LOCALITY_GPS_COORDINATES[key];
  }
  for (const [k, coords] of Object.entries(LOCALITY_GPS_COORDINATES)) {
    if (key.includes(k) || k.includes(key)) {
      return coords;
    }
  }
  return null; // Return null for unmapped "General City Wards" so no fake pin is plotted!
}

export default function LeadsMapPage() {
  const router = useRouter();
  const { user, loading: authLoading, hasPermission } = useAuth();

  const [data, setData] = useState<GeoDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedCity, setSelectedCity] = useState<CitySummary | null>(null);
  const [selectedLocality, setSelectedLocality] = useState<DivisionSummary | null>(null);
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});
  const [expandedCities, setExpandedCities] = useState<Record<string, boolean>>({});
  const [mapStyle, setMapStyle] = useState<'satellite' | 'street'>('street');
  const [isFullscreenMap, setIsFullscreenMap] = useState<boolean>(false);

  // Multi-locality Selection for Smart Allocation
  const [selectedLocalities, setSelectedLocalities] = useState<string[]>([]);
  const [teamMembers, setTeamMembers] = useState<{
    id: number;
    name: string;
    role: string;
    reportsTo?: number | null;
    department?: { id: number; name: string } | null;
    designation?: { name: string } | null;
  }[]>([]);

  // Quick Assign Modal States (Method A)
  const [showQuickAssignModal, setShowQuickAssignModal] = useState(false);
  const [assigneeId, setAssigneeId] = useState('');
  const [assignCount, setAssignCount] = useState('');
  const [assignPriority, setAssignPriority] = useState<'oldest' | 'newest'>('oldest');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSuccessMsg, setAssignSuccessMsg] = useState<string | null>(null);
  const [assignErrorMsg, setAssignErrorMsg] = useState<string | null>(null);

  // GPS Coordinate Search & Inspector States
  const [coordInput, setCoordInput] = useState('');
  const [inspectedCoord, setInspectedCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [copiedCoord, setCopiedCoord] = useState(false);
  const [coordError, setCoordError] = useState<string | null>(null);

  // Leaflet Map Refs
  const [mapReady, setMapReady] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayersGroupRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const targetGroupRef = useRef<any>(null);
  const inspectCoordRef = useRef<any>(null);
  const appliedStyleRef = useRef<string>('');

  const canAccessMap =
    user?.role === 'admin' ||
    user?.role === 'director' ||
    user?.role === 'sales_head' ||
    (user?.role === 'manager' && (user?.department?.name === 'Sales' || !user?.department?.name)) ||
    user?.department?.name === 'IT' ||
    hasPermission('admin:access') ||
    hasPermission('admin:analytics_view') ||
    hasPermission('sales:lead_assign') ||
    hasPermission('reports:view');

  const isAdmin =
    user?.role === 'admin' ||
    user?.role === 'director' ||
    user?.department?.name === 'IT' ||
    hasPermission('admin:access');

  // Hierarchy-scoped assignable team members
  const assignableTeamMembers = useMemo(() => {
    if (!user) return [];
    if (isAdmin) return teamMembers;

    // Subordinate tree traversal
    const subIds = new Set<number>();
    let added = true;
    while (added) {
      added = false;
      for (const m of teamMembers) {
        if (!subIds.has(m.id)) {
          if (m.reportsTo === user.id || (m.reportsTo && subIds.has(m.reportsTo))) {
            subIds.add(m.id);
            added = true;
          }
        }
      }
    }

    const filtered = teamMembers.filter((m) => subIds.has(m.id));
    if (filtered.length > 0) return filtered;

    // Safe fallback for Sales team members
    return teamMembers.filter(
      (m) =>
        m.id !== user.id &&
        m.role !== 'admin' &&
        m.role !== 'director' &&
        (!m.department || m.department.name === 'Sales' || m.department.name === 'PSA')
    );
  }, [teamMembers, user, isAdmin]);

  const applyGeoData = (json: GeoDataResponse, isInitial = false) => {
    setData(json);
    if (isInitial && json.states && json.states.length > 0) {
      setExpandedStates({ [json.states[0].name]: true });
      if (json.states[0].cities.length > 0) {
        const firstCity: CitySummary = json.states[0].cities[0];
        setSelectedCity(firstCity);
        // Select first mapped locality
        const firstMapped = firstCity.divisions.find(
          (d: DivisionSummary) => getLocalityGPS(d.name) !== null
        );
        if (firstMapped) {
          setSelectedLocality(firstMapped);
        }
      }
    }
  };

  const fetchData = async (forceFresh = false) => {
    // 0ms SWR Cache Hit: Instantly show cached territory data on navigation
    if (!forceFresh && typeof window !== 'undefined') {
      try {
        const cachedRaw = sessionStorage.getItem('crm_geo_summary_cache_v1');
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached && cached.data) {
            applyGeoData(cached.data, !data && !selectedCity);
            setLoading(false);
            // If cached within last 3 minutes, avoid redundant background fetch
            if (Date.now() - (cached.timestamp || 0) < 3 * 60 * 1000) {
              return;
            }
          }
        }
      } catch {}
    }

    if (!data) setLoading(true);
    try {
      const res = await fetch(`/api/v1/leads/geo-summary${forceFresh ? '?fresh=true' : ''}`);
      const contentType = res.headers.get('content-type');
      if (!res.ok || !contentType || !contentType.includes('application/json')) {
        return;
      }
      const json = await res.json();
      if (json.success) {
        applyGeoData(json, !data && !selectedCity);
        try {
          sessionStorage.setItem(
            'crm_geo_summary_cache_v1',
            JSON.stringify({ data: json, timestamp: Date.now() })
          );
        } catch {}
      }
    } catch {
      // Suppress network disconnect logs during local dev server restarts
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    if (typeof window !== 'undefined') {
      try {
        const cachedRaw = sessionStorage.getItem('crm_team_members_cache_v1');
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached && Array.isArray(cached.data)) {
            setTeamMembers(cached.data);
            if (Date.now() - (cached.timestamp || 0) < 5 * 60 * 1000) {
              return;
            }
          }
        }
      } catch {}
    }

    try {
      const res = await fetch('/api/v1/users?include_inactive=false');
      const contentType = res.headers.get('content-type');
      if (!res.ok || !contentType || !contentType.includes('application/json')) {
        return;
      }
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTeamMembers(json.data);
        try {
          sessionStorage.setItem(
            'crm_team_members_cache_v1',
            JSON.stringify({ data: json.data, timestamp: Date.now() })
          );
        } catch {}
      }
    } catch {
      // Suppress network disconnect logs during local dev server restarts
    }
  };

  useEffect(() => {
    if (user && canAccessMap) {
      fetchData();
      fetchTeamMembers();
    }
  }, [user, canAccessMap]);

  // Preview Area Leads Modal States & In-Memory Fast Page Cache
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewLeads, setPreviewLeads] = useState<any[]>([]);
  const [previewFilterType, setPreviewFilterType] = useState<'unassigned' | 'active' | 'inactive' | 'all'>('unassigned');
  const [previewCounts, setPreviewCounts] = useState({ total: 0, unassigned: 0, active: 0, inactive: 0 });
  const [previewPage, setPreviewPage] = useState(1);
  const [previewPagination, setPreviewPagination] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 });
  const [previewTargetLocalities, setPreviewTargetLocalities] = useState<string[]>([]);
  const [previewTargetCity, setPreviewTargetCity] = useState<string>('');
  const previewCacheRef = useRef<Map<string, any>>(new Map());

  // Lock background scrolling when Quick Assign Modal, Preview Modal, or Fullscreen Map is active
  useEffect(() => {
    if (showQuickAssignModal || showPreviewModal || isFullscreenMap) {
      document.body.style.overflow = 'hidden';
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      const mainEl = document.querySelector('main');
      if (mainEl) mainEl.style.overflow = '';
    };
  }, [showQuickAssignModal, showPreviewModal, isFullscreenMap]);

  // Fullscreen Map resize and Escape key handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreenMap) {
        setIsFullscreenMap(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreenMap]);

  useEffect(() => {
    const timer1 = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 100);
    const timer2 = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 300);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isFullscreenMap]);

  const fetchPreviewLeads = async (
    page = 1,
    filterType: 'unassigned' | 'active' | 'inactive' | 'all' = previewFilterType,
    targetLocs?: string[],
    targetCity?: string
  ) => {
    const locs = targetLocs || previewTargetLocalities;
    const city = targetCity || previewTargetCity || selectedCity?.name || 'Varanasi';
    if (locs.length === 0) return;

    const cleanLocs = locs.map((k) => (k.includes('::') ? k.split('::')[1] : k));
    const sortedKey = Array.from(new Set(cleanLocs)).sort().join('|');
    const cacheKey = `${city}::${sortedKey}::${filterType}::${page}`;

    // Instant in-memory cache hit (0ms network delay when paging back & forth)
    if (previewCacheRef.current.has(cacheKey)) {
      const cached = previewCacheRef.current.get(cacheKey);
      setPreviewLeads(cached.data || []);
      setPreviewPagination(cached.pagination || { total: 0, page: 1, limit: 25, totalPages: 1 });
      if (cached.counts) {
        setPreviewCounts(cached.counts);
      }
      setPreviewPage(page);
      return;
    }

    setPreviewLoading(true);
    try {
      const res = await fetch('/api/v1/leads/territory-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          localities: Array.from(new Set(cleanLocs)),
          filterType,
          page,
          limit: 25,
        }),
      });
      const contentType = res.headers.get('content-type');
      if (!res.ok || !contentType || !contentType.includes('application/json')) {
        setPreviewLeads([]);
        return;
      }
      const json = await res.json();
      if (json.success) {
        previewCacheRef.current.set(cacheKey, json);
        setPreviewLeads(json.data || []);
        setPreviewPagination(json.pagination || { total: 0, page: 1, limit: 25, totalPages: 1 });
        if (json.counts) {
          setPreviewCounts(json.counts);
        }
        setPreviewPage(page);
      } else {
        setPreviewLeads([]);
      }
    } catch {
      setPreviewLeads([]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleOpenPreviewModal = (
    filterType: 'unassigned' | 'active' | 'inactive' | 'all' = 'unassigned',
    customLocs?: string[],
    customCity?: string
  ) => {
    const targetLocs =
      customLocs ||
      (selectedLocalities.length > 0
        ? selectedLocalities
        : selectedLocality
        ? [getLocKey(selectedCity?.name || 'Varanasi', selectedLocality.name)]
        : []);
    if (targetLocs.length === 0) return;

    const firstKey = targetLocs[0];
    let cityName = customCity || selectedCity?.name || 'Varanasi';
    if (firstKey && firstKey.includes('::')) {
      const keyCity = firstKey.split('::')[0];
      const matchedCity = data?.cities?.find((c) => c.name.toLowerCase() === keyCity.toLowerCase());
      if (matchedCity) cityName = matchedCity.name;
    }

    setPreviewTargetLocalities(targetLocs);
    setPreviewTargetCity(cityName);
    setPreviewFilterType(filterType);
    setPreviewCounts({ total: 0, unassigned: 0, active: 0, inactive: 0 });
    setPreviewLeads([]);
    setPreviewPage(1);
    setPreviewPagination({ total: 0, page: 1, limit: 25, totalPages: 1 });
    setShowPreviewModal(true);
    fetchPreviewLeads(1, filterType, targetLocs, cityName);
  };

  // Locality Unique Key Generator (prevents collision across cities for common names like 'General City Wards')
  const getLocKey = (cityName: string, divName: string) =>
    `${cityName.toLowerCase().trim()}::${divName.toLowerCase().trim()}`;

  // Selection toggle functions (scoped strictly to one city at a time)
  const toggleLocality = (cityName: string, divName: string) => {
    const key = getLocKey(cityName, divName);
    const cityPrefix = `${cityName.toLowerCase().trim()}::`;
    if (!selectedCity || selectedCity.name.toLowerCase() !== cityName.toLowerCase()) {
      const matchedCity = data?.cities?.find((c) => c.name.toLowerCase() === cityName.toLowerCase());
      if (matchedCity) setSelectedCity(matchedCity);
    }
    setSelectedLocalities((prev) => {
      const sameCityPrev = prev.filter((k) => k.startsWith(cityPrefix));
      return sameCityPrev.includes(key)
        ? sameCityPrev.filter((k) => k !== key)
        : [...sameCityPrev, key];
    });
  };

  const selectAllCityLocalities = (city: CitySummary) => {
    setSelectedCity(city);
    const keys = city.divisions.map((d) => getLocKey(city.name, d.name));
    const allSelected = keys.length > 0 && keys.every((k) => selectedLocalities.includes(k));
    if (allSelected) {
      setSelectedLocalities([]);
    } else {
      setSelectedLocalities(keys);
    }
  };

  const clearLocalitySelection = () => {
    setSelectedLocalities([]);
  };

  // Compute selected leads summary
  const selectedSummary = useMemo(() => {
    if (!data?.cities || selectedLocalities.length === 0) {
      return { total: 0, active: 0, inactive: 0, unassigned: 0, assigned: 0, count: 0 };
    }
    let total = 0;
    let active = 0;
    let inactive = 0;
    let unassigned = 0;

    data.cities.forEach((ct) => {
      ct.divisions.forEach((div) => {
        const key = getLocKey(ct.name, div.name);
        if (selectedLocalities.includes(key)) {
          total += div.total;
          active += div.active || div.assigned || 0;
          inactive += div.inactive || 0;
          unassigned += div.unassigned;
        }
      });
    });

    return { total, active, inactive, unassigned, assigned: active, count: selectedLocalities.length };
  }, [data, selectedLocalities]);

  // Method A: Direct Quick Assign Submit
  const handleQuickAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigneeId) {
      setAssignErrorMsg('Please select an employee / caller.');
      return;
    }
    if (selectedLocalities.length === 0) {
      setAssignErrorMsg('No localities selected.');
      return;
    }

    setAssignLoading(true);
    setAssignErrorMsg(null);
    setAssignSuccessMsg(null);

    const firstKey = selectedLocalities[0];
    let cityName = selectedCity?.name || 'Varanasi';
    if (firstKey && firstKey.includes('::')) {
      const keyCity = firstKey.split('::')[0];
      const matchedCity = data?.cities?.find((c) => c.name.toLowerCase() === keyCity.toLowerCase());
      if (matchedCity) {
        cityName = matchedCity.name;
      } else if (keyCity) {
        cityName = keyCity.charAt(0).toUpperCase() + keyCity.slice(1);
      }
    }

    const cleanLocs = selectedLocalities.map((k) => (k.includes('::') ? k.split('::')[1] : k));

    const maxAllowed = Math.min(500, selectedSummary.unassigned || 500);
    const parsedCount = assignCount && Number(assignCount) > 0 ? Math.min(500, Number(assignCount)) : maxAllowed;

    try {
      const res = await fetch('/api/v1/leads/territory-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: cityName,
          localities: Array.from(new Set(cleanLocs)),
          assigneeId: Number(assigneeId),
          count: parsedCount,
          priority: assignPriority,
        }),
      });

      const contentType = res.headers.get('content-type');
      if (!res.ok || !contentType || !contentType.includes('application/json')) {
        setAssignErrorMsg('Server returned an unexpected response. Please try again.');
        return;
      }
      const json = await res.json();
      if (json.success) {
        setAssignSuccessMsg(json.message || 'Leads successfully assigned!');
        previewCacheRef.current.clear();
        fetchData(true);
        setTimeout(() => {
          setShowQuickAssignModal(false);
          setSelectedLocalities([]);
          setAssignSuccessMsg(null);
          setAssignCount('');
          setAssigneeId('');
        }, 1200);
      } else {
        setAssignErrorMsg(json.message || 'Failed to assign leads.');
      }
    } catch (err: any) {
      setAssignErrorMsg(err.message || 'Network error while assigning territory leads.');
    } finally {
      setAssignLoading(false);
    }
  };

  // GPS Coordinate Parser
  const parseCoordinates = (input: string): { lat: number; lng: number } | null => {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // Remove unwanted wrapping characters e.g. (), [], @, etc.
    const cleanStr = trimmed.replace(/[()\[\]@]/g, ' ');

    const parts = cleanStr.split(/[,;\s/]+/).map(Number).filter((n) => !isNaN(n));
    if (parts.length >= 2) {
      const lat = parts[0];
      const lng = parts[1];
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng };
      }
    }
    return null;
  };

  // Inspect / Place Custom Coordinate Marker on Map
  const handleInspectCoordinates = async (lat: number, lng: number, flyTo: boolean = true) => {
    if (!mapInstanceRef.current || !targetGroupRef.current) return;
    const L = (await import('leaflet')).default;
    const map = mapInstanceRef.current;
    const targetGroup = targetGroupRef.current;

    targetGroup.clearLayers();

    // Pulse Target Crosshair Marker
    const targetHtml = `
      <div class="custom-target-marker" style="
        position: relative;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      ">
        <div style="position: absolute; width: 40px; height: 40px; border-radius: 9999px; background: rgba(6, 182, 212, 0.25); border: 2px solid #06b6d4; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: absolute; width: 22px; height: 22px; border-radius: 9999px; background: rgba(14, 165, 233, 0.4); border: 2px solid #38bdf8;"></div>
        <div style="width: 8px; height: 8px; border-radius: 9999px; background: #ffffff; box-shadow: 0 0 8px #06b6d4;"></div>
      </div>
    `;

    const targetIcon = L.divIcon({
      html: targetHtml,
      className: 'leaflet-target-gps-pin',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const marker = L.marker([lat, lng], { icon: targetIcon }).addTo(targetGroup);

    // Popup content with direct Google Maps link
    const popupHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 200px; padding: 2px;">
        <div style="font-weight: 700; color: #0284c7; font-size: 12px; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
          <span>🎯 Exact GPS Location</span>
        </div>
        <div style="font-family: monospace; font-size: 11px; background: #0f172a; color: #38bdf8; padding: 6px 8px; border-radius: 6px; border: 1px solid #1e293b; margin-bottom: 6px;">
          <div><b>Lat:</b> ${lat.toFixed(6)}</div>
          <div><b>Lng:</b> ${lng.toFixed(6)}</div>
        </div>
        <div style="display: flex; gap: 4px;">
          <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" rel="noopener noreferrer" style="display: block; width: 100%; text-align: center; font-size: 10px; font-weight: 600; background: #0284c7; color: #ffffff; padding: 4px 6px; border-radius: 6px; text-decoration: none;">
            Open in Google Maps ↗
          </a>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml, { offset: [0, -15] }).openPopup();

    setInspectedCoord({ lat, lng });
    setCoordInput(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    setCoordError(null);

    if (flyTo) {
      map.flyTo([lat, lng], 17, { duration: 1.2 });
    }
  };

  useEffect(() => {
    inspectCoordRef.current = handleInspectCoordinates;
  });

  const handleGoToCoordinates = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCoordError(null);
    const parsed = parseCoordinates(coordInput);
    if (!parsed) {
      setCoordError('Invalid! Format: e.g. 25.3176, 82.9739');
      return;
    }
    handleInspectCoordinates(parsed.lat, parsed.lng, true);
  };

  const handleClearTarget = () => {
    if (targetGroupRef.current) {
      targetGroupRef.current.clearLayers();
    }
    setInspectedCoord(null);
    setCoordInput('');
    setCoordError(null);
  };

  const copyCoordinates = () => {
    if (!inspectedCoord) return;
    const text = `${inspectedCoord.lat.toFixed(6)}, ${inspectedCoord.lng.toFixed(6)}`;
    navigator.clipboard.writeText(text);
    setCopiedCoord(true);
    setTimeout(() => setCopiedCoord(false), 2000);
  };

  // Initialize Leaflet Map on Client Side
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isMounted = true;

    async function initLeafletMap() {
      const L = (await import('leaflet')).default;

      if (!mapInstanceRef.current && mapContainerRef.current && isMounted) {
        // Create Leaflet Map Instance
        const initialCenter: [number, number] = [25.3176, 82.9739]; // Default Varanasi
        const map = L.map(mapContainerRef.current, {
          center: initialCenter,
          zoom: 12,
          zoomControl: false,
          attributionControl: false,
          preferCanvas: true,
        });

        // Tile layer group for active map style (Satellite / Street)
        const tileLayersGroup = L.layerGroup().addTo(map);
        tileLayersGroupRef.current = tileLayersGroup;

        // Immediately mount matching active tile layer with optimal buffer & parallel CDN endpoints
        const initialLyrs = mapStyle === 'satellite' ? 'y' : 'm';
        L.tileLayer(`https://{s}.google.com/vt/lyrs=${initialLyrs}&x={x}&y={y}&z={z}`, {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: '&copy; Google Maps',
          updateWhenIdle: false,
          keepBuffer: 2,
          detectRetina: false,
        }).addTo(tileLayersGroup);
        appliedStyleRef.current = mapStyle;

        // Marker layer group
        const markersGroup = L.layerGroup().addTo(map);
        markersGroupRef.current = markersGroup;

        // Target layer group for custom coordinate inspector
        const targetGroup = L.layerGroup().addTo(map);
        targetGroupRef.current = targetGroup;

        mapInstanceRef.current = map;
        setMapReady(true);

        // Ensure Leaflet calculates viewport dimensions immediately to download tiles with zero delay
        setTimeout(() => {
          if (map) map.invalidateSize();
        }, 100);
        setTimeout(() => {
          if (map) map.invalidateSize();
        }, 350);
      }
    }

    initLeafletMap();

    return () => {
      isMounted = false;
    };
  }, []);

  // Update Leaflet Tile Layer when mapStyle changes (Google Satellite or Google Street)
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayersGroupRef.current) return;
    if (appliedStyleRef.current === mapStyle) return;

    async function applyTiles() {
      const L = (await import('leaflet')).default;
      const tileLayersGroup = tileLayersGroupRef.current;
      tileLayersGroup.clearLayers();

      const lyrsCode = mapStyle === 'satellite' ? 'y' : 'm';
      L.tileLayer(`https://{s}.google.com/vt/lyrs=${lyrsCode}&x={x}&y={y}&z={z}`, {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps',
        updateWhenIdle: false,
        keepBuffer: 2,
        detectRetina: false,
      }).addTo(tileLayersGroup);
      appliedStyleRef.current = mapStyle;

      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }

    applyTiles();
  }, [mapStyle]);

  // Update Leaflet Markers whenever selectedCity, selectedLocality or selectedLocalities change
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !markersGroupRef.current) return;

    const currentCity = selectedCity || (data?.cities && data.cities.length > 0 ? data.cities[0] : null);
    if (!currentCity) return;

    async function renderPins() {
      const L = (await import('leaflet')).default;
      const map = mapInstanceRef.current;
      const markersGroup = markersGroupRef.current;

      markersGroup.clearLayers();

      const cityKey = currentCity?.name.toLowerCase().trim() || 'varanasi';
      const cityCenter = CITY_CENTER_COORDINATES[cityKey] || [25.3176, 82.9739];

      const latLngList: [number, number][] = [];

      // Render discrete geolocated pins for ALL cities (Varanasi, Prayagraj, etc.)
      const allCities: CitySummary[] = data?.cities || (currentCity ? [currentCity] : []);

      allCities.forEach((city) => {
        const isCurrentCity = currentCity?.name.toLowerCase() === city.name.toLowerCase();
        const validLocalities = city.divisions.filter((div) => getLocalityGPS(div.name) !== null);

        validLocalities.forEach((div) => {
          const gps = getLocalityGPS(div.name)!;
          if (isCurrentCity) {
            latLngList.push([gps.lat, gps.lng]);
          }

          const isSelected = isCurrentCity && selectedLocality?.name === div.name;
          const isMultiSelected = selectedLocalities.includes(getLocKey(city.name, div.name));
          const isTargeted = isSelected || isMultiSelected;

          const pinFill = isTargeted ? '#e11d48' : '#ef4444';
          const pinStroke = '#ffffff';

          // Custom HTML Leaflet DivIcon: 3D Animated Pin Pointing Beacon (Slow up-down floating with ground shadow)
          const iconHtml = `
            <div class="custom-location-pin ${isTargeted ? 'pin-active-animated' : ''}" style="
              position: relative;
              width: 28px;
              height: 38px;
              cursor: pointer;
              z-index: ${isTargeted ? '999' : isCurrentCity ? '20' : '10'};
            ">
              ${isTargeted ? `
                <!-- Ground Target Ring & Pulsing Shadow -->
                <div class="pin-ground-shadow" style="
                  position: absolute;
                  bottom: -3px;
                  left: 50%;
                  width: 14px;
                  height: 6px;
                  margin-left: -7px;
                  background: rgba(0,0,0,0.55);
                  border-radius: 50%;
                  filter: blur(1px);
                  animation: pinShadowPulse 1.6s ease-in-out infinite;
                  z-index: -1;
                "></div>
                <div class="pin-ground-ring" style="
                  position: absolute;
                  bottom: -3px;
                  left: 50%;
                  width: 16px;
                  height: 8px;
                  margin-left: -8px;
                  border: 1.5px solid #f43f5e;
                  border-radius: 50%;
                  animation: pinRingPulse 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
                  z-index: -2;
                "></div>
              ` : ''}

              <!-- Floating Main Pin -->
              <div class="pin-head-body" style="
                position: relative;
                width: 28px;
                height: 38px;
                filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4)) ${isTargeted ? 'drop-shadow(0 0 8px rgba(225,29,72,0.6))' : ''};
                ${isTargeted ? 'animation: pinBounceSlow 1.6s ease-in-out infinite;' : 'transition: transform 0.2s ease;'};
              ">
                <svg viewBox="0 0 24 34" width="28" height="38" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0C5.372 0 0 5.372 0 12C0 20.25 12 34 12 34C12 34 24 20.25 24 12C24 5.372 18.628 0 12 0Z" 
                        fill="${pinFill}" />
                  <circle cx="12" cy="11.5" r="5" fill="${pinStroke}" />
                  <circle cx="12" cy="11.5" r="2.5" fill="${pinFill}" />
                </svg>
                <span style="
                  position: absolute;
                  top: -4px;
                  right: -10px;
                  background: #0f172a;
                  color: #ffffff;
                  border: 1.5px solid ${isTargeted ? '#f43f5e' : '#ef4444'};
                  font-size: 9px;
                  font-family: monospace;
                  font-weight: 700;
                  padding: 0 4px;
                  border-radius: 9999px;
                  white-space: nowrap;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.4);
                ">${div.total.toLocaleString()}</span>
              </div>
            </div>
          `;

          const customIcon = L.divIcon({
            html: iconHtml,
            className: 'leaflet-red-pin-marker',
            iconSize: [28, 38],
            iconAnchor: [14, 38],
          });

          const marker = L.marker([gps.lat, gps.lng], { icon: customIcon }).addTo(markersGroup);

          // Click on marker switches city if needed and selects locality
          marker.on('click', () => {
            if (!isCurrentCity) {
              setSelectedCity(city);
            }
            setSelectedLocality(div);
          });

          // Tooltip (Simple & Professional Dark Glass Card)
          marker.bindTooltip(
            `
            <div style="
              background: rgba(15, 23, 42, 0.96);
              backdrop-filter: blur(10px);
              border: 1px solid rgba(51, 65, 85, 0.85);
              border-radius: 10px;
              padding: 8px 10px;
              box-shadow: 0 10px 25px -4px rgba(0, 0, 0, 0.6), 0 2px 6px rgba(0,0,0,0.4);
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              min-width: 200px;
              color: #ffffff;
            ">
              <!-- Title & Total Leads -->
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 7px; padding-bottom: 6px; border-bottom: 1px solid rgba(51, 65, 85, 0.65);">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: ${isMultiSelected ? '#10b981' : '#f43f5e'}; box-shadow: 0 0 6px ${isMultiSelected ? '#10b981' : '#f43f5e'};"></span>
                  <span style="font-weight: 700; font-size: 12px; color: #ffffff; letter-spacing: -0.2px;">${div.name}</span>
                  <span style="font-size: 10.5px; font-weight: 500; color: #94a3b8;">(${city.name})</span>
                </div>
                <span style="
                  font-size: 10px;
                  font-weight: 700;
                  font-family: monospace;
                  padding: 1.5px 6px;
                  border-radius: 6px;
                  background: ${isMultiSelected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.18)'};
                  color: ${isMultiSelected ? '#34d399' : '#fb7185'};
                  border: 1px solid ${isMultiSelected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.35)'};
                  white-space: nowrap;
                ">${div.total.toLocaleString()} leads</span>
              </div>

              <!-- Metric Badges Row -->
              <div style="
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 4px;
                background: rgba(2, 6, 23, 0.55);
                padding: 5px 6px;
                border-radius: 6px;
                border: 1px solid rgba(30, 41, 59, 0.7);
                text-align: center;
              ">
                <div style="border-right: 1px solid rgba(51, 65, 85, 0.4); padding-right: 2px;">
                  <div style="color: #94a3b8; font-size: 8.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;">Active</div>
                  <div style="color: #10b981; font-weight: 700; font-size: 11px; font-family: monospace; margin-top: 1px;">${(div.active || div.assigned || 0).toLocaleString()}</div>
                </div>
                <div style="border-right: 1px solid rgba(51, 65, 85, 0.4); padding-right: 2px;">
                  <div style="color: #94a3b8; font-size: 8.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;">Free</div>
                  <div style="color: #facc15; font-weight: 700; font-size: 11px; font-family: monospace; margin-top: 1px;">${(div.unassigned || 0).toLocaleString()}</div>
                </div>
                <div>
                  <div style="color: #94a3b8; font-size: 8.5px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px;">Inactive</div>
                  <div style="color: #cbd5e1; font-weight: 700; font-size: 11px; font-family: monospace; margin-top: 1px;">${(div.inactive || 0).toLocaleString()}</div>
                </div>
              </div>

              <!-- Footer Action hint -->
              <div style="
                margin-top: 5px;
                font-size: 9px;
                font-weight: 600;
                color: ${isMultiSelected ? '#34d399' : '#64748b'};
                text-align: center;
                letter-spacing: 0.2px;
              ">
                ${isMultiSelected ? '✓ Selected in Allocation Batch' : 'Click to select / focus'}
              </div>
            </div>
          `,
            { direction: 'top', offset: [0, -36], className: 'custom-locality-tooltip' }
          );
        });
      });

      // Pan or Fit Bounds
      if (latLngList.length > 0) {
        if (selectedLocality && getLocalityGPS(selectedLocality.name)) {
          const target = getLocalityGPS(selectedLocality.name)!;
          map.flyTo([target.lat, target.lng], 13, { duration: 0.8 });
        } else {
          map.fitBounds(latLngList, { padding: [40, 40], maxZoom: 13 });
        }
      } else {
        map.setView(cityCenter, 12);
      }
    }

    renderPins();
  }, [selectedCity, selectedLocality, selectedLocalities, data, mapReady]);

  const toggleState = (stateName: string) => {
    setExpandedStates((prev) => ({ ...prev, [stateName]: !prev[stateName] }));
  };

  const toggleCity = (cityName: string) => {
    setExpandedCities((prev) => (prev[cityName] ? {} : { [cityName]: true }));
  };

  const handleCitySelect = (city: CitySummary) => {
    setSelectedCity(city);
    const firstMapped = city.divisions.find((d: DivisionSummary) => getLocalityGPS(d.name) !== null);
    if (firstMapped) {
      setSelectedLocality(firstMapped);
    } else {
      setSelectedLocality(null);
    }
  };

  const handleLocalitySelect = (locality: DivisionSummary) => {
    setSelectedLocality(locality);
    const gps = getLocalityGPS(locality.name);
    if (gps && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([gps.lat, gps.lng], 14, { duration: 0.8 });
    }
  };

  const zoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const zoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  const resetView = () => {
    if (mapInstanceRef.current && selectedCity) {
      const cityKey = selectedCity.name.toLowerCase().trim();
      const center = CITY_CENTER_COORDINATES[cityKey] || [25.3176, 82.9739];
      mapInstanceRef.current.setView(center, 12);
    }
  };

  // Filtered tree based on search query (optimized with useDeferredValue for 60fps responsiveness)
  const filteredStates = useMemo(() => {
    if (!data?.states) return [];
    if (!deferredSearch.trim()) return data.states;

    const q = deferredSearch.toLowerCase().trim();

    return data.states
      .map((st: StateSummary) => {
        const stateMatches = st.name.toLowerCase().includes(q);
        const matchingCities = st.cities
          .map((ct: CitySummary) => {
            const cityMatches = ct.name.toLowerCase().includes(q);
            const matchingDivisions = ct.divisions.filter((dv: DivisionSummary) =>
              dv.name.toLowerCase().includes(q)
            );
            if (cityMatches || matchingDivisions.length > 0 || stateMatches) {
              return {
                ...ct,
                divisions: matchingDivisions.length > 0 ? matchingDivisions : ct.divisions,
              };
            }
            return null;
          })
          .filter(Boolean) as CitySummary[];

        if (stateMatches || matchingCities.length > 0) {
          return {
            ...st,
            cities: matchingCities.length > 0 ? matchingCities : st.cities,
          };
        }
        return null;
      })
      .filter(Boolean) as StateSummary[];
  }, [data, deferredSearch]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  // Strict Access Gate
  if (!canAccessMap) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-[var(--bg-card)] border border-[var(--border-color)] border-t-white/60 dark:border-t-white/25 border-b-black/30 dark:border-b-black/70 rounded-2xl shadow-[0_22px_48px_-10px_rgba(0,0,0,0.35),0_10px_20px_-6px_rgba(0,0,0,0.2),inset_0_1.5px_0_rgba(255,255,255,0.45),inset_0_-2px_4px_rgba(0,0,0,0.18)] dark:shadow-[0_28px_60px_-12px_rgba(0,0,0,0.9),0_14px_26px_-6px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.7)] mt-6 max-w-xl mx-auto">
        <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Access Restricted</h2>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          The Geographic Territory Map is restricted to System Administrators and Sales Leadership.
        </p>
      </div>
    );
  }

  const summary = data?.summary || {
    totalLeads: 0,
    totalActive: 0,
    totalInactive: 0,
    totalUnassigned: 0,
    totalAssigned: 0,
    activePercentage: 0,
    inactivePercentage: 0,
    unassignedPercentage: 0,
    assignedPercentage: 0,
    totalStates: 0,
    totalCities: 0,
  };

  // Mapped vs Unmapped Leads for current selected city
  const cityMappedCount =
    selectedCity?.divisions
      .filter((d: DivisionSummary) => getLocalityGPS(d.name) !== null)
      .reduce((sum: number, d: DivisionSummary) => sum + d.total, 0) || 0;

  const cityUnmappedCount =
    selectedCity?.divisions
      .filter((d: DivisionSummary) => getLocalityGPS(d.name) === null)
      .reduce((sum: number, d: DivisionSummary) => sum + d.total, 0) || 0;

  return (
    <div 
      className="-m-4 sm:-m-6 p-4 sm:p-6 min-h-[calc(100vh-4rem)] space-y-6 pb-16 transition-all"
      style={{
        background: 'linear-gradient(115deg, #092c22 0%, #0d4a3b 30%, #0b5e52 58%, #087f8c 82%, #0284c7 100%)',
      }}
    >
      {/* Dynamic Keyframes for Map Pin Animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pinBounceSlow {
          0%, 100% {
            transform: translateY(0) scale(1.22);
          }
          50% {
            transform: translateY(-9px) scale(1.26);
          }
        }

        @keyframes pinShadowPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(0.65);
            opacity: 0.2;
          }
        }

        @keyframes pinRingPulse {
          0% {
            transform: scale(0.8);
            opacity: 0.8;
          }
          100% {
            transform: scale(2.3);
            opacity: 0;
          }
        }

        .leaflet-tooltip.custom-locality-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .leaflet-tooltip.custom-locality-tooltip:before {
          border-top-color: rgba(15, 23, 42, 0.96) !important;
        }
      `}} />

      {/* 1. Modern Ambient Hero Banner (Cyan-Emerald Gradient Mesh with Grain Texture) */}
      <div 
        className="relative overflow-hidden rounded-3xl p-6 sm:p-8 pb-14 sm:pb-16 shadow-2xl border border-white/20 text-white-force bg-black/25 backdrop-blur-xl"
        style={{
          background: 'linear-gradient(115deg, rgba(9, 44, 34, 0.75) 0%, rgba(13, 74, 59, 0.75) 30%, rgba(11, 94, 82, 0.75) 58%, rgba(8, 127, 140, 0.75) 82%, rgba(2, 132, 199, 0.75) 100%)',
          color: '#FFFFFF',
        }}
      >
        {/* Subtle Noise / Radial Glow Accent Overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay"
          style={{
            backgroundImage: `radial-gradient(circle at 85% 20%, rgba(34, 211, 238, 0.45) 0%, transparent 60%), radial-gradient(circle at 10% 80%, rgba(52, 211, 153, 0.35) 0%, transparent 50%)`,
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 text-white-force">
          {/* Title & Description */}
          <div className="space-y-1.5 max-w-xl text-white-force">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-black/25 backdrop-blur-md border border-white/20 rounded-xl text-cyan-300 shadow-inner">
                <Compass className="w-5 h-5" />
              </div>
              <h1 className="text-xl md:text-2xl font-black text-white-force tracking-tight drop-shadow-sm flex items-center gap-2.5" style={{ color: '#FFFFFF' }}>
                Territory Leads Map
                <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black/30 backdrop-blur-md text-cyan-200 border border-white/20 uppercase tracking-wider text-white-force" style={{ color: '#a5f3fc' }}>
                  Live Satellite & Street View
                </span>
              </h1>
            </div>
            <p className="text-xs text-white-force font-medium leading-relaxed pl-0.5" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
              Explore territory-wise lead distribution, inspect local areas and allocate leads to your team
            </p>
          </div>

          {/* Action Button: Live Sync / Refresh Glass Button with Active Status Dot */}
          <div className="flex items-center gap-2.5 text-white-force">
            <button
              onClick={() => fetchData(true)}
              disabled={loading}
              aria-label="Refresh analysis and sync live data"
              className="p-2.5 bg-white/15 hover:bg-white/30 backdrop-blur-md border border-white/30 hover:border-white/60 rounded-2xl text-white transition-all cursor-pointer shadow-md disabled:opacity-50 relative group shrink-0"
              title="Refresh Analysis (Live Database Sync)"
            >
              <RefreshCw className={`w-4 h-4 text-white group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-emerald-900/40 animate-pulse" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards (Overlapping Floating Cards - Light/Dark Adaptive) */}
      <div className="-mt-9 sm:-mt-11 relative z-20 px-2 sm:px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Total Leads Pool */}
        <div className="relative rounded-2xl group cursor-pointer select-none active:scale-[0.98] active:translate-y-1 transition-all duration-300">
          <div className="absolute -inset-1 rounded-2xl overflow-hidden blur-xl opacity-0 group-hover:opacity-65 dark:group-hover:opacity-75 transition-opacity duration-300 pointer-events-none">
            <div className="rainbow-conic-glow" />
          </div>
          <div className="relative z-10 w-full h-full rounded-2xl overflow-hidden border-2 border-black dark:border-white/10 group-hover:border-transparent p-[1.5px] transition-colors duration-300 shadow-[0_16px_32px_-6px_rgba(0,0,0,0.28),0_8px_16px_-4px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.85),0_8px_16px_-4px_rgba(0,0,0,0.65)]">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none overflow-hidden">
              <div className="rainbow-conic-glow" />
            </div>
            <div className="relative z-10 w-full h-full bg-[var(--bg-card)] dark:bg-[#0B1015]/95 group-hover:bg-white/85 dark:group-hover:bg-[#0B1015]/75 backdrop-blur-xl rounded-[14.5px] p-4 sm:p-5 flex flex-col justify-between transition-colors duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] dark:text-slate-400 uppercase tracking-wider">
                  Total Leads Pool
                </span>
                <Globe2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              
              <div className="my-2">
                <div className="text-2xl sm:text-3xl font-black font-mono text-[var(--text-primary)] dark:text-white tracking-tight">
                  {(summary.totalLeads || 0).toLocaleString()}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-400 dark:border-white/15">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/20">
                  Live Pool
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] dark:text-slate-400 truncate">
                  Across {summary.totalCities || 0} operational districts
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Active Pipeline */}
        <div className="relative rounded-2xl group cursor-pointer select-none active:scale-[0.98] active:translate-y-1 transition-all duration-300">
          <div className="absolute -inset-1 rounded-2xl overflow-hidden blur-xl opacity-0 group-hover:opacity-65 dark:group-hover:opacity-75 transition-opacity duration-300 pointer-events-none">
            <div className="rainbow-conic-glow" />
          </div>
          <div className="relative z-10 w-full h-full rounded-2xl overflow-hidden border-2 border-black dark:border-white/10 group-hover:border-transparent p-[1.5px] transition-colors duration-300 shadow-[0_16px_32px_-6px_rgba(0,0,0,0.28),0_8px_16px_-4px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.85),0_8px_16px_-4px_rgba(0,0,0,0.65)]">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none overflow-hidden">
              <div className="rainbow-conic-glow" />
            </div>
            <div className="relative z-10 w-full h-full bg-[var(--bg-card)] dark:bg-[#0B1015]/95 group-hover:bg-white/85 dark:group-hover:bg-[#0B1015]/75 backdrop-blur-xl rounded-[14.5px] p-4 sm:p-5 flex flex-col justify-between transition-colors duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  Active Pipeline
                </span>
                <div className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
              </div>

              <div className="my-2">
                <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-700 dark:text-emerald-400 tracking-tight">
                  {(summary.totalActive || summary.totalAssigned || 0).toLocaleString()}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-400 dark:border-white/15">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/20">
                  ↗ {summary.activePercentage != null ? summary.activePercentage : (summary.totalLeads > 0 ? ((summary.totalActive / summary.totalLeads) * 100).toFixed(2) : '0')}%
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] dark:text-slate-400 truncate">
                  in active process
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Free (Unassigned) */}
        <div className="relative rounded-2xl group cursor-pointer select-none active:scale-[0.98] active:translate-y-1 transition-all duration-300">
          <div className="absolute -inset-1 rounded-2xl overflow-hidden blur-xl opacity-0 group-hover:opacity-65 dark:group-hover:opacity-75 transition-opacity duration-300 pointer-events-none">
            <div className="rainbow-conic-glow" />
          </div>
          <div className="relative z-10 w-full h-full rounded-2xl overflow-hidden border-2 border-black dark:border-white/10 group-hover:border-transparent p-[1.5px] transition-colors duration-300 shadow-[0_16px_32px_-6px_rgba(0,0,0,0.28),0_8px_16px_-4px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.85),0_8px_16px_-4px_rgba(0,0,0,0.65)]">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none overflow-hidden">
              <div className="rainbow-conic-glow" />
            </div>
            <div className="relative z-10 w-full h-full bg-[var(--bg-card)] dark:bg-[#0B1015]/95 group-hover:bg-white/85 dark:group-hover:bg-[#0B1015]/75 backdrop-blur-xl rounded-[14.5px] p-4 sm:p-5 flex flex-col justify-between transition-colors duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-700 dark:text-yellow-400 uppercase tracking-wider">
                  Free (Unassigned)
                </span>
                <div className="w-2 h-2 rounded-full bg-amber-500 dark:bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]"></div>
              </div>

              <div className="my-2">
                <div className="text-2xl sm:text-3xl font-black font-mono text-amber-700 dark:text-yellow-400 tracking-tight">
                  {(summary.totalUnassigned || 0).toLocaleString()}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-400 dark:border-white/15">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-yellow-500/15 dark:text-yellow-300 dark:border-yellow-500/20">
                  ⚡ {summary.unassignedPercentage != null ? summary.unassignedPercentage : (summary.totalLeads > 0 ? ((summary.totalUnassigned / summary.totalLeads) * 100).toFixed(2) : '0')}%
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] dark:text-slate-400 truncate">
                  ready for allocation
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Inactive / Closed */}
        <div className="relative rounded-2xl group cursor-pointer select-none active:scale-[0.98] active:translate-y-1 transition-all duration-300">
          <div className="absolute -inset-1 rounded-2xl overflow-hidden blur-xl opacity-0 group-hover:opacity-65 dark:group-hover:opacity-75 transition-opacity duration-300 pointer-events-none">
            <div className="rainbow-conic-glow" />
          </div>
          <div className="relative z-10 w-full h-full rounded-2xl overflow-hidden border-2 border-black dark:border-white/10 group-hover:border-transparent p-[1.5px] transition-colors duration-300 shadow-[0_16px_32px_-6px_rgba(0,0,0,0.28),0_8px_16px_-4px_rgba(0,0,0,0.18)] dark:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.85),0_8px_16px_-4px_rgba(0,0,0,0.65)]">
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none overflow-hidden">
              <div className="rainbow-conic-glow" />
            </div>
            <div className="relative z-10 w-full h-full bg-[var(--bg-card)] dark:bg-[#0B1015]/95 group-hover:bg-white/85 dark:group-hover:bg-[#0B1015]/75 backdrop-blur-xl rounded-[14.5px] p-4 sm:p-5 flex flex-col justify-between transition-colors duration-300">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-rose-700 dark:text-red-400 uppercase tracking-wider">
                  Inactive / Closed
                </span>
                <div className="w-2 h-2 rounded-full bg-rose-500 dark:bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
              </div>

              <div className="my-2">
                <div className="text-2xl sm:text-3xl font-black font-mono text-rose-700 dark:text-red-400 tracking-tight">
                  {(summary.totalInactive || 0).toLocaleString()}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-400 dark:border-white/15">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-red-500/15 dark:text-red-300 dark:border-red-500/20">
                  ↘ {summary.inactivePercentage != null ? summary.inactivePercentage : (summary.totalLeads > 0 ? ((summary.totalInactive / summary.totalLeads) * 100).toFixed(2) : '0')}%
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] dark:text-slate-400 truncate">
                  not interested / disqualified
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>



      {/* 3. Main Workspace: Real 2D Interactive Map (8 Cols) + Hierarchy Tree Explorer (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: 2D Real Interactive Map Surface (Expanded / Fullscreen) */}
        <div
          className={`transition-all ${
            isFullscreenMap
              ? 'fixed inset-0 z-[9990] bg-[var(--bg-main)] dark:bg-[#0B1015] p-3 sm:p-4 flex flex-col h-[100dvh] w-full max-h-[100dvh] max-w-[100vw] overflow-hidden box-border'
              : 'lg:col-span-8 bg-[var(--bg-card)] dark:bg-[#0B1015]/95 border-2 border-black dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-[0_22px_48px_-10px_rgba(0,0,0,0.35),0_10px_20px_-6px_rgba(0,0,0,0.2),inset_0_1.5px_0_rgba(255,255,255,0.45),inset_0_-2px_4px_rgba(0,0,0,0.18)] dark:shadow-[0_28px_60px_-12px_rgba(0,0,0,0.9),0_14px_26px_-6px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.7)] flex flex-col min-h-[600px]'
          }`}
        >
          {/* Top Control Bar with City Quick Switcher & Zoom */}
          <div className={`flex flex-wrap items-center justify-between gap-2.5 border-b border-black/30 dark:border-white/10 shrink-0 ${
            isFullscreenMap ? 'pb-2.5 mb-2.5' : 'pb-3 mb-3'
          }`}>
            {/* City Selector Pills */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin">
              <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] dark:text-slate-400 shrink-0 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-teal-600 dark:text-cyan-400" /> City Hub:
              </span>
              {(data?.cities || []).slice(0, 8).map((ct) => {
                const isActive = selectedCity?.name.toLowerCase() === ct.name.toLowerCase();
                return (
                  <button
                    key={ct.name}
                    onClick={() => handleCitySelect(ct)}
                    className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all font-medium flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-black hover:bg-slate-800 text-white font-bold shadow-sm border border-black dark:border-white/40'
                        : 'bg-[var(--bg-main)] text-[var(--text-secondary)] border border-black hover:bg-slate-200/60 hover:text-[var(--text-primary)] dark:bg-black/50 dark:text-slate-300 dark:border-white/10 dark:hover:bg-white/10 dark:hover:text-white'
                    }`}
                  >
                    <span>{ct.name}</span>
                    <span className={`font-mono text-[10px] ${isActive ? 'text-white/80 font-bold' : 'text-[var(--text-muted)] dark:text-slate-400'}`}>
                      ({ct.total.toLocaleString()})
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Map Layer Mode Selector */}
              <div className="flex items-center bg-[var(--bg-main)] dark:bg-black/50 p-1 rounded-xl border border-black dark:border-white/10">
                <button
                  onClick={() => setMapStyle('satellite')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    mapStyle === 'satellite'
                      ? 'bg-[var(--bg-card)] dark:bg-white/15 text-[var(--text-primary)] dark:text-white font-semibold shadow-xs border border-black/40 dark:border-white/15'
                      : 'text-[var(--text-secondary)] dark:text-slate-400 hover:text-[var(--text-primary)] dark:hover:text-slate-200'
                  }`}
                  title="Google Maps Satellite Hybrid View"
                >
                  <Globe2 className={`w-3.5 h-3.5 ${mapStyle === 'satellite' ? 'text-teal-600 dark:text-cyan-400' : 'text-[var(--text-secondary)] dark:text-slate-400'}`} />
                  <span>Satellite</span>
                </button>
                <button
                  onClick={() => setMapStyle('street')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    mapStyle === 'street'
                      ? 'bg-[var(--bg-card)] dark:bg-white/15 text-[var(--text-primary)] dark:text-white font-semibold shadow-xs border border-black/40 dark:border-white/15'
                      : 'text-[var(--text-secondary)] dark:text-slate-400 hover:text-[var(--text-primary)] dark:hover:text-slate-200'
                  }`}
                  title="Google Maps Street View"
                >
                  <Layers className={`w-3.5 h-3.5 ${mapStyle === 'street' ? 'text-teal-600 dark:text-cyan-400' : 'text-[var(--text-secondary)] dark:text-slate-400'}`} />
                  <span>Google Street</span>
                </button>
              </div>

              {/* Map Zoom & Reset Controls */}
              <div className="flex items-center gap-1 bg-[var(--bg-main)] dark:bg-black/50 p-1 rounded-xl border border-black dark:border-white/10">
                <button
                  type="button"
                  onClick={zoomOut}
                  aria-label="Zoom out"
                  className="p-1 hover:bg-[var(--bg-card)] dark:hover:bg-white/10 text-[var(--text-secondary)] dark:text-slate-300 hover:text-[var(--text-primary)] dark:hover:text-white rounded-lg transition-all cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={zoomIn}
                  aria-label="Zoom in"
                  className="p-1 hover:bg-[var(--bg-card)] dark:hover:bg-white/10 text-[var(--text-secondary)] dark:text-slate-300 hover:text-[var(--text-primary)] dark:hover:text-white rounded-lg transition-all cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={resetView}
                  aria-label="Reset map view"
                  className="text-[10px] px-2 py-0.5 text-teal-600 dark:text-cyan-400 hover:text-teal-700 dark:hover:text-cyan-300 font-semibold cursor-pointer"
                  title="Reset View"
                >
                  Reset
                </button>
                <div className="w-px h-3 bg-[var(--border-color)] dark:bg-white/20 mx-0.5" />
                <button
                  type="button"
                  onClick={() => setIsFullscreenMap((prev) => !prev)}
                  aria-label={isFullscreenMap ? 'Exit Full Screen' : 'View Full Screen'}
                  className={`p-1 rounded-lg transition-all cursor-pointer ${
                    isFullscreenMap
                      ? 'bg-teal-500/15 text-teal-700 dark:bg-cyan-500/20 dark:text-cyan-300 hover:bg-teal-500/25 dark:hover:bg-cyan-500/30'
                      : 'hover:bg-[var(--bg-card)] dark:hover:bg-white/10 text-[var(--text-secondary)] dark:text-slate-300 hover:text-[var(--text-primary)] dark:hover:text-white'
                  }`}
                  title={isFullscreenMap ? 'Exit Full Screen (Esc)' : 'View Full Screen'}
                >
                  {isFullscreenMap ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Real Leaflet 2D Map Container */}
          <div className={`relative rounded-2xl border border-black dark:border-white/10 overflow-hidden shadow-md dark:shadow-2xl bg-slate-100 dark:bg-slate-950 ${
            isFullscreenMap ? 'flex-1 min-h-0 w-full' : 'flex-1 min-h-[460px] w-full'
          }`}>
            {/* Map Canvas */}
            <div ref={mapContainerRef} className="w-full h-full min-h-0 z-10 bg-slate-100 dark:bg-slate-950" />

            {/* Real GPS Info Overlay */}
            <div className="absolute top-3 left-3 z-20 pointer-events-none bg-white/95 dark:bg-black/80 border border-black dark:border-white/15 text-[var(--text-primary)] dark:text-white px-3 py-1.5 rounded-xl text-[11px] shadow-lg dark:shadow-2xl backdrop-blur-md flex items-center gap-2 font-mono">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 dark:bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.8)] dark:shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {mapStyle === 'satellite'
                  ? 'Google Satellite'
                  : 'Google Street'}
                : {selectedCity ? selectedCity.name : 'Varanasi'}
              </span>
            </div>

            {/* GPS Coordinates Go-To Search Bar & Inspector */}
            <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-1">
              <form
                onSubmit={handleGoToCoordinates}
                className="flex items-center bg-white/95 dark:bg-black/85 border border-black dark:border-white/15 rounded-xl p-1 shadow-lg dark:shadow-2xl backdrop-blur-md transition-all focus-within:border-teal-500 dark:focus-within:border-cyan-400/80 focus-within:ring-1 focus-within:ring-teal-500/30"
              >
                <div className="pl-2 pr-1.5 text-teal-600 dark:text-cyan-400 shrink-0">
                  <Crosshair className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  placeholder="Paste Lat, Lng (e.g. 25.3176, 82.9739)"
                  value={coordInput}
                  onChange={(e) => {
                    setCoordInput(e.target.value);
                    setCoordError(null);
                  }}
                  className="bg-transparent text-xs text-[var(--text-primary)] dark:text-white placeholder-slate-400 focus:outline-none w-44 sm:w-60 font-mono py-1 px-1"
                />
                {coordInput && (
                  <button
                    type="button"
                    onClick={handleClearTarget}
                    aria-label="Clear coordinate input"
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Clear"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  aria-label="Locate exact coordinates"
                  className="px-3 py-1 bg-gradient-to-r from-teal-600 to-cyan-600 hover:brightness-110 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1 cursor-pointer shrink-0 ml-1"
                  title="Locate Exact Coordinates"
                >
                  <span>Locate</span>
                </button>
              </form>
              {coordError && (
                <div className="bg-red-50 dark:bg-red-950/90 border border-red-200 dark:border-red-500/50 text-red-700 dark:text-red-300 text-[10px] px-2 py-0.5 rounded-lg shadow-md font-mono">
                  {coordError}
                </div>
              )}
            </div>

            {/* Active Inspected Target Floating Bottom Bar */}
            {inspectedCoord && (
              <div className="absolute bottom-3 left-3 z-20 bg-white/95 dark:bg-black/90 border border-teal-500/50 dark:border-cyan-400/50 text-[var(--text-primary)] dark:text-white px-3 py-1.5 rounded-xl text-xs shadow-lg dark:shadow-2xl backdrop-blur-md flex items-center gap-2.5 font-mono animate-in fade-in duration-150">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-500 dark:bg-cyan-400 animate-ping" />
                  <span className="text-teal-700 dark:text-cyan-300 font-bold">Target:</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {inspectedCoord.lat.toFixed(6)}, {inspectedCoord.lng.toFixed(6)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={copyCoordinates}
                    aria-label="Copy coordinates"
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-200 dark:hover:text-white rounded-lg border border-black dark:border-white/10 text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                    title="Copy Coordinates"
                  >
                    {copiedCoord ? (
                      <>
                        <Check className="w-3 h-3 text-teal-600 dark:text-cyan-400" />
                        <span className="text-teal-600 dark:text-cyan-400 font-semibold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <a
                    href={`https://www.google.com/maps?q=${inspectedCoord.lat},${inspectedCoord.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open coordinates in Google Maps"
                    className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-slate-300 dark:hover:text-white rounded-lg border border-black dark:border-white/10 text-[10px] transition-colors flex items-center gap-1"
                    title="Open in Google Maps"
                  >
                    <ExternalLink className="w-3 h-3 text-teal-600 dark:text-cyan-400" />
                  </a>
                  <button
                    onClick={handleClearTarget}
                    aria-label="Remove pin target"
                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Remove Pin"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Loading Overlay */}
            {loading && (
              <div className="absolute inset-0 z-30 bg-white/80 dark:bg-black/80 flex flex-col items-center justify-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                <Loader2 className="w-6 h-6 animate-spin text-teal-600 dark:text-cyan-400" />
                <span>Loading real satellite & street coordinates...</span>
              </div>
            )}
          </div>

          {/* Selected Locality Detail Panel & Unmapped Info */}
          {selectedCity && (
            <div className={`shrink-0 bg-[var(--bg-main)] dark:bg-black/50 border border-black dark:border-white/10 rounded-2xl p-3.5 space-y-2.5 backdrop-blur-md ${
              isFullscreenMap ? 'mt-2 p-2.5 space-y-2' : 'mt-4'
            }`}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] dark:text-white flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-cyan-400" />
                    <span>{selectedCity.name} Mapped Localities</span>
                    <span className="text-[11px] text-[var(--text-secondary)] dark:text-slate-400 font-normal">
                      • {selectedCity.divisions.filter((d: DivisionSummary) => getLocalityGPS(d.name) !== null).length} Discrete Pins
                    </span>
                  </h4>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="px-2.5 py-1 bg-[var(--bg-card)] dark:bg-black/70 text-teal-700 dark:text-cyan-300 border border-teal-500/30 dark:border-cyan-500/30 rounded-lg font-medium shadow-xs">
                    Geolocated: {cityMappedCount.toLocaleString()}
                  </span>
                  {cityUnmappedCount > 0 && (
                    <span className="px-2.5 py-1 bg-[var(--bg-card)] dark:bg-black/70 text-[var(--text-secondary)] dark:text-slate-400 border border-black dark:border-white/10 rounded-lg shadow-xs" title="General Address Leads without specific locality">
                      General Pool: {cityUnmappedCount.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Active Selected Locality Pill Card */}
              {selectedLocality && getLocalityGPS(selectedLocality.name) ? (
                <div
                  style={{ backgroundColor: '#97DDE9' }}
                  className={`border border-black rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-md text-black ${
                    isFullscreenMap ? 'p-2' : 'p-3'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-black/10 border border-black/15 rounded-lg text-black shrink-0">
                      <Crosshair className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-black flex items-center gap-2">
                        <span>{selectedLocality.name}</span>
                        {getLocalityGPS(selectedLocality.name)?.sector && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/10 text-black border border-black/15">
                            {getLocalityGPS(selectedLocality.name)?.sector}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-black/75 font-medium mt-0.5">
                        {selectedLocality.total.toLocaleString()} Total Leads on Street Map
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-mono text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-950 font-bold bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-300/60 shadow-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      <span>{selectedLocality.assigned.toLocaleString()} Assigned</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-amber-950 font-bold bg-white/80 px-2.5 py-1 rounded-lg border border-amber-300/60 shadow-xs">
                      <Zap className="w-3 h-3 text-amber-600" />
                      <span>{selectedLocality.unassigned.toLocaleString()} Free</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenPreviewModal('unassigned', [getLocKey(selectedCity.name, selectedLocality.name)], selectedCity.name)}
                      className="px-3.5 py-1.5 bg-black hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer font-sans shadow-sm"
                      title="Preview leads for this area"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview Leads</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Right: Collapsible Hierarchy Tree Explorer (4 Cols Shrunk) */}
        <div className="lg:col-span-4 bg-[var(--bg-card)] dark:bg-[#0B1015]/95 backdrop-blur-xl border-2 border-black dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-[0_22px_48px_-10px_rgba(0,0,0,0.35),0_10px_20px_-6px_rgba(0,0,0,0.2),inset_0_1.5px_0_rgba(255,255,255,0.45),inset_0_-2px_4px_rgba(0,0,0,0.18)] dark:shadow-[0_28px_60px_-12px_rgba(0,0,0,0.9),0_14px_26px_-6px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.7)] flex flex-col min-h-[600px]">
          <div className="space-y-3 border-b border-black/30 dark:border-white/10 pb-4 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600 dark:text-cyan-400" />
                <h3 className="text-sm font-bold text-[var(--text-primary)] dark:text-white tracking-wide">
                  Territory Hierarchy Tree
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[var(--text-secondary)] dark:text-slate-400">
                {summary.totalStates} {summary.totalStates === 1 ? 'State' : 'States'} • {summary.totalCities} {summary.totalCities === 1 ? 'City' : 'Cities'}
              </span>
            </div>

            {/* Search Input with thin outline border */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search state, city, micro-area..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-[var(--bg-main)] dark:bg-black/60 rounded-xl text-xs text-[var(--text-primary)] dark:text-white placeholder-[var(--text-secondary)] dark:placeholder-slate-400 border border-black dark:border-[#1DCED8] focus:outline-none focus:ring-1 focus:ring-black dark:focus:ring-[#1DCED8] transition-all"
              />
              <Search className="w-3.5 h-3.5 text-black dark:text-[#1DCED8] absolute left-3 top-2.5" />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tree Explorer Container */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[520px]">
            {filteredStates.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
                No territories match "{search}"
              </div>
            ) : (
              filteredStates.map((st) => {
                const isStateOpen = expandedStates[st.name] ?? false;

                return (
                  <div
                    key={st.name}
                    className="border border-black dark:border-white/10 rounded-xl overflow-hidden bg-[var(--bg-main)] dark:bg-black/40 transition-all shadow-xs"
                  >
                    {/* State Header Node */}
                    <div
                      onClick={() => toggleState(st.name)}
                      style={{ backgroundColor: '#1DCED8' }}
                      className="p-3 flex items-center justify-between cursor-pointer rounded-t-xl transition-colors"
                    >
                      <div className="flex items-center gap-2 text-xs font-bold text-black">
                        {isStateOpen ? (
                          <ChevronDown className="w-4 h-4 text-black shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-black/75 shrink-0" />
                        )}
                        <span className="text-black font-bold">{st.name}</span>
                        <span className="text-[10px] text-black/75 font-semibold">
                          ({st.cities.length} {st.cities.length === 1 ? 'city' : 'cities'})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-black bg-black/15 px-2 py-0.5 rounded-md">
                          {st.total.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Cities list under state */}
                    {isStateOpen && (
                      <div className="border-t border-black/30 dark:border-white/10 p-2 space-y-1.5 bg-slate-100/60 dark:bg-black/20">
                        {st.cities.map((ct) => {
                          const isCityOpen = expandedCities[ct.name] ?? false;
                          const isCurrentSelected =
                            selectedCity?.name.toLowerCase() === ct.name.toLowerCase();

                          return (
                            <div
                              key={ct.name}
                              className="rounded-xl transition-all overflow-hidden bg-[var(--bg-card)] dark:bg-black/30 border border-black dark:border-white/5"
                            >
                              {/* City Node */}
                              <div
                                onClick={() => {
                                  handleCitySelect(ct);
                                  toggleCity(ct.name);
                                }}
                                style={{ backgroundColor: '#1DCED8' }}
                                className="p-2.5 flex items-center justify-between cursor-pointer rounded-xl transition-colors"
                              >
                                <div className="flex items-center gap-2 text-xs font-bold text-black">
                                  {isCityOpen ? (
                                    <ChevronDown className="w-3.5 h-3.5 text-black shrink-0" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5 text-black/75 shrink-0" />
                                  )}
                                  <span className="text-black font-bold">
                                    {ct.name}
                                  </span>
                                  <span className="text-[10px] text-black/75 font-semibold">
                                    ({ct.divisions.length} discrete areas)
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                  <span className="text-black font-extrabold" title="Assigned">
                                    {ct.assigned.toLocaleString()}
                                  </span>
                                  <span className="text-black/50 font-bold">/</span>
                                  <span className="text-black font-extrabold" title="Unassigned (Free)">
                                    {ct.unassigned.toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              {/* Single Discrete Localities under City */}
                              {isCityOpen && ct.divisions.length > 0 && (
                                <div className="px-2 pb-2 pt-1 space-y-0.5 border-t border-black/20 dark:border-white/5">
                                  {ct.divisions.map((div) => {
                                    const isDivActive =
                                      isCurrentSelected && selectedLocality?.name === div.name;
                                    const isLocSelected = selectedLocalities.includes(getLocKey(ct.name, div.name));
                                    const isHighlighted = isDivActive || isLocSelected;
                                    const isGeolocated = getLocalityGPS(div.name) !== null;

                                    return (
                                      <div
                                        key={div.name}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCitySelect(ct);
                                          handleLocalitySelect(div);
                                        }}
                                        style={isHighlighted ? { backgroundColor: '#92EEFF', borderColor: '#92EEFF' } : undefined}
                                        className={`flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg cursor-pointer transition-all ${
                                          isHighlighted
                                            ? '!bg-[#92EEFF] !border-[#92EEFF] !text-black font-semibold shadow-xs'
                                            : 'border border-transparent hover:bg-[#92EEFF]/20 hover:border-[#92EEFF]/30 text-[var(--text-primary)] dark:text-slate-300'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 truncate pr-2">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleLocality(ct.name, div.name);
                                            }}
                                            aria-label={isLocSelected ? `Deselect ${div.name}` : `Select ${div.name}`}
                                            className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                                              isLocSelected
                                                ? 'bg-white border-2 border-black text-black shadow-xs'
                                                : isHighlighted
                                                ? 'border border-black/40 bg-white hover:border-black'
                                                : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-black'
                                            }`}
                                            title={isLocSelected ? 'Deselect locality' : 'Select locality for assignment'}
                                          >
                                            {isLocSelected && <Check className="w-2.5 h-2.5 stroke-[3] !text-black stroke-black" />}
                                          </button>
                                          {isGeolocated ? (
                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isHighlighted ? 'bg-emerald-700' : 'bg-emerald-600 dark:bg-emerald-500/80'}`} />
                                          ) : (
                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isHighlighted ? 'bg-black/40' : 'bg-slate-300 dark:bg-slate-500'}`} />
                                          )}
                                          <span className={`truncate ${isHighlighted ? '!text-black font-bold' : ''}`}>{div.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2 font-mono shrink-0 text-[10px]">
                                          <span className={isHighlighted ? '!text-black font-extrabold' : 'text-[var(--text-primary)] dark:text-white font-semibold'}>
                                            {div.total.toLocaleString()}
                                          </span>
                                          <span className={`inline-flex items-center gap-1 font-medium ${isHighlighted ? '!text-black font-bold' : 'text-emerald-700 dark:text-emerald-400'}`} title="Active in Pipeline">
                                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isHighlighted ? 'bg-emerald-700' : 'bg-emerald-500 dark:bg-emerald-400'}`} />
                                            {(div.active || div.assigned || 0).toLocaleString()}
                                          </span>
                                          <span className={`inline-flex items-center gap-1 font-medium ${isHighlighted ? '!text-black font-bold' : 'text-amber-700 dark:text-yellow-400'}`} title="Free / Unassigned">
                                            <Zap className={`w-2.5 h-2.5 shrink-0 ${isHighlighted ? 'text-amber-700' : 'text-amber-600 dark:text-yellow-400'}`} />
                                            {(div.unassigned || 0).toLocaleString()}
                                          </span>
                                          {(div.inactive || 0) > 0 && (
                                            <span className={`inline-flex items-center gap-1 font-medium ${isHighlighted ? '!text-black font-bold' : 'text-rose-700 dark:text-red-400 opacity-80'}`} title="Inactive / Closed">
                                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isHighlighted ? 'bg-rose-700' : 'bg-rose-500 dark:bg-red-400'}`} />
                                              {(div.inactive || 0).toLocaleString()}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Floating Smart Allocation Dock */}
      {selectedLocalities.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-emerald-500/50 border-t-emerald-300/60 border-b-black/80 rounded-2xl p-3 px-5 shadow-[0_25px_60px_-10px_rgba(0,0,0,0.85),0_12px_24px_-5px_rgba(0,0,0,0.6),inset_0_1.5px_0_rgba(255,255,255,0.3),inset_0_-2px_4px_rgba(0,0,0,0.6)] backdrop-blur-xl flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200 max-w-[95vw]">
          <div className="flex items-center gap-2 font-mono text-xs text-white-force" style={{ color: '#ffffff' }}>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-emerald-300">
              {selectedSummary.count} {selectedSummary.count === 1 ? 'Locality' : 'Localities'} Selected
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-300 font-semibold flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{selectedSummary.unassigned.toLocaleString()} Free Leads</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenPreviewModal('unassigned')}
              className="px-3.5 py-1.5 bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg hover:shadow-blue-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-blue-200" />
              <span>Preview Leads</span>
            </button>

            <button
              onClick={() => {
                setShowQuickAssignModal(true);
                setAssignErrorMsg(null);
                setAssignSuccessMsg(null);
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg hover:shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Quick Assign Now</span>
            </button>

            <button
              onClick={clearLocalitySelection}
              aria-label="Clear selected localities"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
              title="Clear Selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Direct Territory Allocation Modal (Method A - Full Screen Portal with Full Blur & Scroll Lock) */}
      {showQuickAssignModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[var(--bg-card)] border border-black dark:bg-slate-900 dark:border-slate-700/80 border-t-white/80 dark:border-t-white/30 border-b-black/40 dark:border-b-black/80 rounded-2xl w-full max-w-lg shadow-[0_35px_80px_-15px_rgba(0,0,0,0.6),0_18px_35px_-8px_rgba(0,0,0,0.35),inset_0_2px_0_rgba(255,255,255,0.6),inset_0_-3px_6px_rgba(0,0,0,0.2)] dark:shadow-[0_45px_100px_-15px_rgba(0,0,0,0.95),0_25px_45px_-10px_rgba(0,0,0,0.8),inset_0_1.5px_0_rgba(255,255,255,0.25),inset_0_-3px_6px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
              {/* Modal Header */}
              <div className="p-4 border-b border-black/30 dark:border-slate-800 flex items-center justify-between bg-[var(--bg-main)] dark:bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] dark:text-white">Direct Territory Lead Allocation</h3>
                    <p className="text-[11px] text-[var(--text-secondary)] dark:text-slate-400">
                      Assign territory leads to callers or field executives in 1 click
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowQuickAssignModal(false)}
                  aria-label="Close dialog"
                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleQuickAssignSubmit} className="p-5 space-y-4">
                {/* Selected Territories Summary */}
                <div className="p-3 bg-[var(--bg-main)] border border-black/40 dark:bg-slate-950 dark:border-slate-800 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)] dark:text-slate-400 font-medium">Selected Territories:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                      {selectedSummary.count} {selectedSummary.count === 1 ? 'Area' : 'Areas'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                    {selectedLocalities.map((locKey) => {
                      const displayName = locKey.includes('::') ? locKey.split('::')[1] : locKey;
                      return (
                        <span
                          key={locKey}
                          className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:border-emerald-500/30 dark:text-emerald-300 text-[10px] rounded-md font-mono capitalize"
                        >
                          {displayName}
                        </span>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-black/20 dark:border-slate-800/80 text-xs font-mono">
                    <span className="text-[var(--text-secondary)] dark:text-slate-400">Available Unassigned Leads:</span>
                    <span className="text-amber-700 dark:text-amber-300 font-bold">{selectedSummary.unassigned.toLocaleString()} Free</span>
                  </div>
                </div>

                {/* Employee Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-primary)] dark:text-slate-200 flex items-center justify-between">
                    <span>Assign To Employee / Caller:</span>
                    <span className="text-[10px] text-[var(--text-secondary)] dark:text-slate-400">({assignableTeamMembers.length} team members)</span>
                  </label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 bg-[var(--bg-main)] border border-black dark:bg-slate-950 dark:border-slate-800 rounded-xl text-xs text-[var(--text-primary)] dark:text-white focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                  >
                    <option value="">-- Choose Employee / Caller --</option>
                    {assignableTeamMembers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role.toUpperCase()}{u.designation?.name ? ` - ${u.designation.name}` : ''})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Number of Leads to Assign (Capped at Max 500) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-primary)] dark:text-slate-200 flex items-center justify-between">
                    <span>Number of Leads to Assign:</span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono font-semibold">Max limit: 500 leads per batch</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max={Math.min(500, selectedSummary.unassigned || 500)}
                      placeholder={`e.g. 50 (Max: ${Math.min(500, selectedSummary.unassigned || 500)})`}
                      value={assignCount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (Number(val) > 500) {
                          setAssignCount('500');
                        } else {
                          setAssignCount(val);
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-[var(--bg-main)] border border-black dark:bg-slate-950 dark:border-slate-800 rounded-xl text-xs text-[var(--text-primary)] dark:text-white placeholder-[var(--text-muted)] dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 font-mono"
                    />
                    <div className="flex items-center gap-1">
                      {['25', '50', '100', '250', '500'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAssignCount(preset)}
                          className={`px-2 py-1.5 text-[10px] font-mono font-semibold rounded-lg border cursor-pointer transition-colors ${
                            assignCount === preset
                              ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-black dark:border-emerald-500/50 font-bold shadow-xs'
                              : 'bg-[var(--bg-main)] hover:bg-slate-200/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-black dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:hover:text-white dark:border-slate-700'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Allocation Priority */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-primary)] dark:text-slate-200">
                    Lead Queue Priority:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAssignPriority('oldest')}
                      className={`p-2.5 rounded-xl border text-xs font-medium text-left flex items-center gap-2 transition-all cursor-pointer ${
                        assignPriority === 'oldest'
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 border-black dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-300 font-semibold'
                          : 'bg-[var(--bg-main)] border-black text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                        assignPriority === 'oldest' ? 'border-emerald-500 bg-emerald-500' : 'border-black dark:border-slate-600'
                      }`}>
                        {assignPriority === 'oldest' && <div className="w-1 h-1 rounded-full bg-white dark:bg-slate-950" />}
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--text-primary)] dark:text-white text-[11px]">Oldest First</div>
                        <div className="text-[10px] text-[var(--text-secondary)] dark:text-slate-500">Prioritize backlog leads</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAssignPriority('newest')}
                      className={`p-2.5 rounded-xl border text-xs font-medium text-left flex items-center gap-2 transition-all cursor-pointer ${
                        assignPriority === 'newest'
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 border-black dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-300 font-semibold'
                          : 'bg-[var(--bg-main)] border-black text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                        assignPriority === 'newest' ? 'border-emerald-500 bg-emerald-500' : 'border-black dark:border-slate-600'
                      }`}>
                        {assignPriority === 'newest' && <div className="w-1 h-1 rounded-full bg-white dark:bg-slate-950" />}
                      </div>
                      <div>
                        <div className="font-semibold text-[var(--text-primary)] dark:text-white text-[11px]">Newest First</div>
                        <div className="text-[10px] text-[var(--text-secondary)] dark:text-slate-500">Prioritize freshest leads</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Status & Error Messages */}
                {assignErrorMsg && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-500/40 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                    <span>{assignErrorMsg}</span>
                  </div>
                )}

                {assignSuccessMsg && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-500/40 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{assignSuccessMsg}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-black/30 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowQuickAssignModal(false)}
                    disabled={assignLoading}
                    className="px-4 py-2 bg-[var(--bg-main)] hover:bg-slate-200/60 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-black dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-transparent text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assignLoading || selectedSummary.unassigned === 0}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg hover:shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    {assignLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Assigning Leads...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        <span>Confirm & Assign Leads</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Area Leads Preview Modal (Portal with Full Blur & Safe Pagination) */}
      {showPreviewModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[var(--bg-card)] border border-black dark:bg-slate-900 dark:border-slate-700/80 border-t-white/80 dark:border-t-white/30 border-b-black/40 dark:border-b-black/80 rounded-2xl w-full max-w-5xl shadow-[0_35px_80px_-15px_rgba(0,0,0,0.6),0_18px_35px_-8px_rgba(0,0,0,0.35),inset_0_2px_0_rgba(255,255,255,0.6),inset_0_-3px_6px_rgba(0,0,0,0.2)] dark:shadow-[0_45px_100px_-15px_rgba(0,0,0,0.95),0_25px_45px_-10px_rgba(0,0,0,0.8),inset_0_1.5px_0_rgba(255,255,255,0.25),inset_0_-3px_6px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="p-4 border-b border-black/30 dark:border-slate-800 flex items-center justify-between bg-[var(--bg-main)] dark:bg-slate-950/80 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-[var(--text-primary)] dark:text-white">Area Leads Preview</h3>
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-mono font-semibold">
                        {previewLoading && previewCounts.total === 0
                          ? '0 Total Leads'
                          : `${(previewCounts.total > 0 ? previewCounts.total : previewPagination.total).toLocaleString()} Total Leads`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] dark:text-slate-400 mt-0.5">
                      <MapPin className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>{previewTargetCity} •</span>
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {previewTargetLocalities.map((k) => (
                          <span key={k} className="text-[var(--text-secondary)] dark:text-slate-300 font-mono text-[11px] bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.2 rounded border border-black/30 dark:border-transparent">
                            {k.includes('::') ? k.split('::')[1] : k}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowPreviewModal(false);
                    setPreviewPage(1);
                  }}
                  aria-label="Close leads preview modal"
                  className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filter Tabs Subheader */}
              <div className="p-3 bg-[var(--bg-main)]/50 dark:bg-slate-950/40 border-b border-black/30 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-1.5 bg-[var(--bg-card)] dark:bg-slate-950 p-1 rounded-xl border border-black dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewFilterType('unassigned');
                      setPreviewPage(1);
                      fetchPreviewLeads(1, 'unassigned');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      previewFilterType === 'unassigned'
                        ? 'bg-amber-500/20 text-amber-700 dark:text-yellow-300 border border-black dark:border-amber-500/40 shadow-sm'
                        : 'text-[var(--text-secondary)] dark:text-slate-400 hover:text-[var(--text-primary)] dark:hover:text-slate-200 border border-transparent hover:border-black/30'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-yellow-400 shrink-0" />
                    <span>Free Unassigned ({previewLoading && previewCounts.unassigned === 0 ? '0' : previewCounts.unassigned.toLocaleString()})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPreviewFilterType('active');
                      setPreviewPage(1);
                      fetchPreviewLeads(1, 'active');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      previewFilterType === 'active'
                        ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-black dark:border-emerald-500/40 shadow-sm'
                        : 'text-[var(--text-secondary)] dark:text-slate-400 hover:text-[var(--text-primary)] dark:hover:text-slate-200 border border-transparent hover:border-black/30'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Active ({previewLoading && previewCounts.active === 0 ? '0' : previewCounts.active.toLocaleString()})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPreviewFilterType('inactive');
                      setPreviewPage(1);
                      fetchPreviewLeads(1, 'inactive');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      previewFilterType === 'inactive'
                        ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-black dark:border-rose-500/40 shadow-sm'
                        : 'text-[var(--text-secondary)] dark:text-slate-400 hover:text-[var(--text-primary)] dark:hover:text-slate-200 border border-transparent hover:border-black/30'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>Inactive / Closed ({previewLoading && previewCounts.inactive === 0 ? '0' : previewCounts.inactive.toLocaleString()})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPreviewFilterType('all');
                      setPreviewPage(1);
                      fetchPreviewLeads(1, 'all');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      previewFilterType === 'all'
                        ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-black dark:border-blue-500/40 shadow-sm'
                        : 'text-[var(--text-secondary)] dark:text-slate-400 hover:text-[var(--text-primary)] dark:hover:text-slate-200 border border-transparent hover:border-black/30'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>All Leads ({previewLoading && previewCounts.total === 0 ? '0' : previewCounts.total.toLocaleString()})</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fetchPreviewLeads(previewPage, previewFilterType)}
                    className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-card)] hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg border border-black dark:border-slate-700 text-xs transition-colors flex items-center gap-1 cursor-pointer"
                    title="Refresh list"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${previewLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>

              {/* Modal Leads Table Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[300px]">
                {previewLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)] dark:text-slate-400 space-y-3">
                    <Loader2 className="w-7 h-7 animate-spin text-blue-600 dark:text-blue-400" />
                    <span className="text-xs">Fetching territory leads...</span>
                  </div>
                ) : previewLeads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-[var(--text-secondary)] dark:text-slate-400 space-y-2 text-center">
                    <Users className="w-10 h-10 text-slate-400 dark:text-slate-600 mb-1" />
                    <p className="text-sm font-semibold text-[var(--text-primary)] dark:text-slate-300">No leads found</p>
                    <p className="text-xs text-[var(--text-muted)] dark:text-slate-500 max-w-sm">
                      No leads matching the "{previewFilterType}" status filter were found in the selected territory.
                    </p>
                  </div>
                ) : (
                  <div className="border border-black dark:border-slate-800 rounded-xl overflow-hidden bg-[var(--bg-card)] dark:bg-slate-950/60 shadow-sm dark:shadow-inner">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-[var(--bg-main)] dark:bg-slate-950 border-b border-black/30 dark:border-slate-800 text-[11px] font-semibold text-[var(--text-secondary)] dark:text-slate-400 uppercase tracking-wider">
                            <th className="py-2.5 px-3 w-24">Lead Code</th>
                            <th className="py-2.5 px-3 w-44">Customer</th>
                            <th className="py-2.5 px-3">Full Address & Pincode</th>
                            <th className="py-2.5 px-3 w-28">Type & Load</th>
                            <th className="py-2.5 px-3 w-36">Status / Assigned</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/20 dark:divide-slate-800/60 text-[var(--text-primary)] dark:text-slate-200">
                          {previewLeads.map((lead: any) => {
                            const isLeadUnassigned = !lead.consultant && !lead.tl && !lead.manager;
                            return (
                              <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="py-2.5 px-3 font-mono font-bold text-[var(--text-primary)] dark:text-white whitespace-nowrap text-xs align-top">
                                  #{lead.leadCode}
                                </td>
                                <td className="py-2.5 px-3 align-top">
                                  <div className="font-semibold text-[var(--text-primary)] dark:text-slate-100 max-w-[150px] truncate" title={lead.customerName}>
                                    {lead.customerName}
                                  </div>
                                  <div className="text-[11px] text-[var(--text-secondary)] dark:text-slate-400 flex items-center gap-1 font-mono mt-0.5 whitespace-nowrap">
                                    <Phone className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                                    <span>{lead.mobile}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 align-top">
                                  <div className="text-[11px] text-[var(--text-primary)] dark:text-slate-200 leading-relaxed break-words">
                                    {lead.address || <span className="text-[var(--text-muted)] dark:text-slate-500 italic">No address provided</span>}
                                  </div>
                                  {lead.pinCode && (
                                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                      <span className="inline-flex items-center text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-emerald-800 border border-emerald-200 dark:bg-slate-800/90 dark:text-emerald-400 dark:border-slate-700/80">
                                        PIN: {lead.pinCode}
                                      </span>
                                      {lead.division && (
                                        <span className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-[var(--text-secondary)] border border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-800">
                                          {lead.division}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] align-top">
                                  <div className="capitalize text-[var(--text-primary)] dark:text-slate-300">{lead.connectionType || 'Residential'}</div>
                                  <div className="text-[var(--text-muted)] dark:text-slate-500">{lead.sanctionedLoadKw ? `${lead.sanctionedLoadKw} kW` : '-'}</div>
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap align-top">
                                  {lead.isActive === false ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400 font-semibold text-[11px]">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 dark:bg-rose-400 shrink-0" />
                                      <span>Inactive / Closed</span>
                                    </span>
                                  ) : isLeadUnassigned ? (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 dark:bg-yellow-500/10 dark:border-yellow-500/20 dark:text-yellow-400 font-semibold text-[11px]">
                                      <Zap className="w-3 h-3 text-amber-600 dark:text-yellow-400 shrink-0" />
                                      <span>Free Unassigned</span>
                                    </span>
                                  ) : (
                                    <div className="space-y-0.5">
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 font-semibold text-[11px]">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
                                        <span>Active</span>
                                      </span>
                                      <div className="text-[10px] text-[var(--text-secondary)] dark:text-slate-400 truncate max-w-[140px]">
                                        {lead.consultant?.name ? `Caller: ${lead.consultant.name}` : lead.manager?.name ? `Mgr: ${lead.manager.name}` : 'Assigned'}
                                      </div>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Pagination Footer */}
              <div className="p-3.5 bg-[var(--bg-main)] dark:bg-slate-950 border-t border-black/30 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="text-xs text-[var(--text-secondary)] dark:text-slate-400 font-mono">
                  Showing {previewLeads.length > 0 ? (previewPage - 1) * 25 + 1 : 0} -{' '}
                  {Math.min(previewPage * 25, previewPagination.total)} of {previewPagination.total} leads
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={previewPage <= 1 || previewLoading}
                    onClick={() => fetchPreviewLeads(previewPage - 1)}
                    className="px-2.5 py-1 text-xs bg-[var(--bg-card)] hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 text-[var(--text-primary)] dark:text-slate-200 rounded-lg border border-black dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>

                  <span className="text-xs font-mono text-[var(--text-primary)] dark:text-slate-300 px-2 font-semibold">
                    Page {previewPage} of {previewPagination.totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={previewPage >= previewPagination.totalPages || previewLoading}
                    onClick={() => fetchPreviewLeads(previewPage + 1)}
                    className="px-2.5 py-1 text-xs bg-[var(--bg-card)] hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 text-[var(--text-primary)] dark:text-slate-200 rounded-lg border border-black dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPreviewModal(false);
                      setPreviewPage(1);
                    }}
                    className="px-3.5 py-1.5 bg-[var(--bg-card)] hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-[var(--text-secondary)] dark:text-slate-300 text-xs font-semibold rounded-xl border border-black dark:border-transparent transition-colors cursor-pointer"
                  >
                    Close
                  </button>

                  {previewFilterType === 'unassigned' && previewCounts.unassigned > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowPreviewModal(false);
                        setShowQuickAssignModal(true);
                      }}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg hover:shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      <span>Assign These Leads</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
