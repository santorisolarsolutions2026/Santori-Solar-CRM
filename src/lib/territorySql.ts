import { prisma } from '@/lib/db';

/**
 * Canonical SQL CTE expressions for geographic clustering across CRM.
 * Both Map View (geo-summary) and Preview / Assign (territory-preview, territory-assign)
 * MUST share this exact single source of truth.
 */
export const RAW_CITY_CASE_STR = `
  CASE 
    WHEN city ILIKE '%allahabad%' OR city ILIKE '%prayagraj%' THEN 'Prayagraj'
    WHEN city ILIKE '%varanasi%' OR city ILIKE '%banaras%' OR city ILIKE '%kashi%' THEN 'Varanasi'
    WHEN city ILIKE '%lucknow%' THEN 'Lucknow'
    WHEN city ILIKE '%kanpur%' THEN 'Kanpur'
    WHEN city ILIKE '%gorakhpur%' THEN 'Gorakhpur'
    WHEN city ILIKE '%mirzapur%' THEN 'Mirzapur'
    WHEN city ILIKE '%jaunpur%' THEN 'Jaunpur'
    WHEN city ILIKE '%chandauli%' THEN 'Chandauli'
    WHEN city ILIKE '%bhadohi%' THEN 'Bhadohi'
    ELSE COALESCE(NULLIF(TRIM(city), ''), 'Varanasi')
  END
`;

export const RAW_DIVISION_CASE_STR = `
  CASE
    -- Varanasi Discrete Localities & Pincode Analysis
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%kandwa%' OR address ILIKE '%kandawa%') THEN 'Kandwa'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%dafi%') THEN 'Dafi'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%akhari%') THEN 'Akhari'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%mirzamurad%') THEN 'Mirzamurad'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%kachhwa%' OR address ILIKE '%kachwa%') THEN 'Kachhwa Road'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%chitaipur%') THEN 'Chitaipur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%susuwahi%') THEN 'Susuwahi'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND ("pinCode" = '221403' OR address ILIKE '%sewapuri%' OR address ILIKE '%bharahua%') THEN 'Sewapuri'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%kapsethi%') THEN 'Kapsethi'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%seer%' OR address ILIKE '%seer goverdhan%') THEN 'Seer Goverdhanpur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%bhagwanpur%') THEN 'Bhagwanpur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%lohta%' OR address ILIKE '%lohata%') THEN 'Lohta'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%bazardiha%' OR address ILIKE '%bazardeeha%' OR address ILIKE '%bajardiha%' OR address ILIKE '%barjdiha%') THEN 'Bazardiha'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%sunderpur%' OR address ILIKE '%sundarpur%' OR address ILIKE '%kaushlesh nagar%' OR address ILIKE '%kaushleshnagar%' OR address ILIKE '%brij enclave%') THEN 'Sunderpur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%naria%' OR address ILIKE '%nariya%') THEN 'Naria'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%mohan sarai%' OR address ILIKE '%mohansarai%') THEN 'Mohan Sarai'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%nagwa%') THEN 'Nagwa'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%samne ghat%' OR address ILIKE '%samneghat%') THEN 'Samne Ghat'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%assi%' OR address ILIKE '%ravindrapuri%') THEN 'Assi'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%mahmoorganj%' OR address ILIKE '%rath yatra%' OR address ILIKE '%fatman%' OR address ILIKE '%gurubagh%') THEN 'Mahmoorganj'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%sonarpura%' OR address ILIKE '%khojwan%' OR address ILIKE '%khojwa%' OR address ILIKE '%khochawa%' OR address ILIKE '%chaukighat%' OR address ILIKE '%chauki ghat%') THEN 'Sonarpura'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%dlw%' OR address ILIKE '%blw%' OR address ILIKE '%kakarmatta%' OR address ILIKE '%banaras locomotive%') THEN 'DLW'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%manduadih%' OR address ILIKE '%maduadih%') THEN 'Manduadih'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%kakarmatta%') THEN 'Kakarmatta'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%dashashwamedh%' OR address ILIKE '%dasaswamedh%' OR address ILIKE '%godowlia%' OR address ILIKE '%luxa%' OR address ILIKE '%kodai chowki%' OR address ILIKE '%kodai chauki%' OR address ILIKE '%kodai ki chowki%' OR address ILIKE '%kadoi chowki%' OR address ILIKE '%kodaichowki%') THEN 'Dashashwamedh'

    -- Chaukhandi (West Varanasi / Hathibazar / Jansa Rail Corridor)
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (
      address ILIKE '%chaukhandi%' OR address ILIKE '%chowkhandi%' OR address ILIKE '%chaukhand%' OR address ILIKE '%chaukhani%' OR 
      address ILIKE '%chaukahandi%' OR address ILIKE '%chaukhanrdi%' OR address ILIKE '%chaukaha%' OR address ILIKE '%chaukadhi%' OR 
      address ILIKE '%chavkhndi%' OR address ILIKE '%chavkhadi%' OR address ILIKE '%chavkhade%' OR address ILIKE '%chaukandi%' OR 
      address ILIKE '%chaukhan di%' OR address ILIKE '%chaukhanfi%' OR address ILIKE '%chaukhade%' OR address ILIKE '%chaukhadi%' OR 
      address ILIKE '%chavkhnd%' OR address ILIKE '%chaukhnd%'
    ) THEN 'Chaukhandi'

    -- Ramnagar (Must match before Chowk to prevent "Chowk Ram Nagar" misclassification)
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (
      "pinCode" = '221008' OR address ILIKE '%ramnagar%' OR address ILIKE '%ram nagar%' OR address ILIKE '%tengra%' OR 
      address ILIKE '%parawo%' OR address ILIKE '%padav%' OR address ILIKE '%padao%' OR address ILIKE '%पड़ाव%' OR
      address ILIKE '%ram naga%' OR address ILIKE '%ranagar%'
    ) THEN 'Ramnagar'

    -- Chhittupur / Murari Chowk
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (
      address ILIKE '%chhittupur%' OR address ILIKE '%chittupur%' OR address ILIKE '%chhitoopur%' OR
      address ILIKE '%murari chowk%' OR address ILIKE '%murari chauk%'
    ) THEN 'Chhittupur'

    -- Paharia (Includes Gayatri Nagar)
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%paharia%' OR address ILIKE '%pahariya%' OR address ILIKE '%ashapur%' OR address ILIKE '%gayatri nagar%') THEN 'Paharia'

    -- Lanka (Includes Durgakund)
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND ("pinCode" = '221005' OR address ILIKE '%lanka%' OR address ILIKE '%bhu%' OR address ILIKE '%durgakund%') THEN 'Lanka'

    -- City Heritage Chowk (With explicit exclusions of out-of-boundary / police / sub-locality chowks)
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (
      address ILIKE '%chowk%' OR address ILIKE '%chauk%' OR address ILIKE '%maidagin%' OR address ILIKE '%thatheri%' OR 
      address ILIKE '%chaukhamba%' OR address ILIKE '%chahmama%' OR address ILIKE '%bansphatak%' OR address ILIKE '%gheehatta%' OR 
      address ILIKE '%kachauri gali%' OR address ILIKE '%raja darwaza%' OR address ILIKE '%govindpura%'
    )
    AND address NOT ILIKE '%chaukhandi%' AND address NOT ILIKE '%chowkhandi%' AND address NOT ILIKE '%chaukhani%'
    AND address NOT ILIKE '%chaukahandi%' AND address NOT ILIKE '%chaukhanrdi%' AND address NOT ILIKE '%chaukaha%' AND address NOT ILIKE '%chaukadhi%'
    AND address NOT ILIKE '%chavkhndi%' AND address NOT ILIKE '%chavkhadi%' AND address NOT ILIKE '%chavkhade%' AND address NOT ILIKE '%chaukandi%'
    AND address NOT ILIKE '%chaukhan di%' AND address NOT ILIKE '%chaukhanfi%' AND address NOT ILIKE '%chaukhade%' AND address NOT ILIKE '%chaukhadi%'
    AND address NOT ILIKE '%chavkhnd%' AND address NOT ILIKE '%chaukhnd%'
    AND address NOT ILIKE '%police%' AND address NOT ILIKE '%poolice%' AND address NOT ILIKE '%pulice%'
    AND address NOT ILIKE '%murari%' AND address NOT ILIKE '%kodai%' AND address NOT ILIKE '%kadoi%'
    AND address NOT ILIKE '%ramnagar%' AND address NOT ILIKE '%ram nagar%' AND address NOT ILIKE '%ram naga%' AND address NOT ILIKE '%ranagar%'
    AND address NOT ILIKE '%hathi%' AND address NOT ILIKE '%kotwa%' AND address NOT ILIKE '%kotava%'
    AND address NOT ILIKE '%ramna%' AND address NOT ILIKE '%ramana%'
    AND address NOT ILIKE '%koraut%' AND address NOT ILIKE '%coraut%'
    AND address NOT ILIKE '%sarnath%' AND address NOT ILIKE '%sewapuri%'
    AND address NOT ILIKE '%bazardiha%' AND address NOT ILIKE '%bajardiha%' AND address NOT ILIKE '%chitaipur%'
    AND address NOT ILIKE '%sonarpura%' AND address NOT ILIKE '%kandwa%'
    AND address NOT ILIKE '%amra%' AND address NOT ILIKE '%amara%' AND address NOT ILIKE '%bankat%'
    AND address NOT ILIKE '%khojawan%' AND address NOT ILIKE '%khojwan%' AND address NOT ILIKE '%khojwa%'
    AND address NOT ILIKE '%naria%' AND address NOT ILIKE '%nariya%' AND address NOT ILIKE '%kashipur%'
    AND address NOT ILIKE '%chaukighat%' AND address NOT ILIKE '%chauki ghat%'
    AND address NOT ILIKE '%shahanshahpur%' AND address NOT ILIKE '%milki%'
    THEN 'Chowk'

    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%rohania%' OR address ILIKE '%rohaniya%') THEN 'Rohania'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%harahua%' AND address NOT ILIKE '%bharahua%') THEN 'Harahua'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%shivpur%' OR address ILIKE '%orderly%' OR address ILIKE '%tarna%' OR address ILIKE '%gilat bazar%') THEN 'Shivpur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND ("pinCode" = '221007' OR address ILIKE '%sarnath%') THEN 'Sarnath'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%ashapur%') THEN 'Ashapur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%pandeypur%' OR address ILIKE '%akatha%' OR address ILIKE '%lalpur%' OR address ILIKE '%premchand nagar%') THEN 'Pandeypur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%nadesar%' OR address ILIKE '%chaukaghat%') THEN 'Nadesar'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%cantt%') THEN 'Cantt'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%chaubepur%' OR address ILIKE '%chaubeypur%' OR address ILIKE '%kadipur%' OR address ILIKE '%munari%') THEN 'Chaubepur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND ("pinCode" = '221101' OR address ILIKE '%cholapur%') THEN 'Cholapur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%badagaon%' OR address ILIKE '%baragaon%') THEN 'Badagaon'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%pindra%' OR address ILIKE '%phoolpur%') THEN 'Pindra'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%mughalsarai%' OR address ILIKE '%pt deen dayal%') THEN 'Mughalsarai'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%chandauli%' OR address ILIKE '%sakaldiha%' OR address ILIKE '%chakia%') THEN 'Chandauli'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%bhadohi%' OR address ILIKE '%aurai%' OR address ILIKE '%gyanpur%') THEN 'Bhadohi'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND ("pinCode" = '221302' OR address ILIKE '%gangapur%') THEN 'Gangapur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%koraut%' OR address ILIKE '%korauta%') THEN 'Koraut'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%jansa%' OR address ILIKE '%jansha%') THEN 'Jansa'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%bachchhaon%' OR address ILIKE '%bachhanw%' OR address ILIKE '%bachhawn%') THEN 'Bachchhaon'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND ("pinCode" = '221106' OR address ILIKE '%sindhora%') THEN 'Sindhora'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND ("pinCode" = '221105' OR address ILIKE '%jalhupur%') THEN 'Jalhupur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%birbhanpur%') THEN 'Birbhanpur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%jakhini%' OR address ILIKE '%jakkhini%') THEN 'Jakhini'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%kurahua%' OR address ILIKE '%kurahwa%') THEN 'Kurahua'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%harsos%') THEN 'Harsos'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%kashipur%') THEN 'Kashipur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%benipur%') THEN 'Benipur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%sajoi%') THEN 'Sajoi'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%amra%' OR address ILIKE '%khaira chak%') THEN 'Amra Khairachak'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%kotwa%') THEN 'Kotwa'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%chhitauni%') THEN 'Chhitauni'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%ganjari%') THEN 'Ganjari'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%jagatpur%') THEN 'Jagatpur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%jayapur%') THEN 'Jayapur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%kesharipur%') THEN 'Kesharipur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%mehdiganj%' OR address ILIKE '%mehandiganj%') THEN 'Mehdiganj'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%rakhauna%') THEN 'Rakhauna'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%ramana%' OR address ILIKE '%ramna%' OR address ILIKE '%malahiya ramna%') THEN 'Ramana'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%tikari%') THEN 'Tikari'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%kardhana%' OR address ILIKE '%karasana%') THEN 'Kardhana'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%mangalpur%') THEN 'Mangalpur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%hathi%' AND address NOT ILIKE '%chaukhandi%' AND address NOT ILIKE '%chowkhandi%' AND address NOT ILIKE '%chaukhani%') THEN 'Hathi'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%naipura%') THEN 'Naipura'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%khewali%') THEN 'Khewali'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%bankat%') THEN 'Bankat'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%thathara%' OR address ILIKE '%thathra%' OR address ILIKE '%thatara%') THEN 'Thathara'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%hariharpur%') THEN 'Hariharpur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%chakarpanpur%') THEN 'Chakarpanpur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%ghamhapur%') THEN 'Ghamhapur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%dayapur%') THEN 'Dayapur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%tendui%') THEN 'Tendui'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%bhatsar%') THEN 'Bhatsar'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%haribhanpur%') THEN 'Haribhanpur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%kalikabara%') THEN 'Kalikabara'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%guria%') THEN 'Guria'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%kerakatpur%') THEN 'Kerakatpur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%harpalpur%') THEN 'Harpalpur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%bhitari%') THEN 'Bhitari'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%deipur%') THEN 'Deipur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%dhannipur%') THEN 'Dhannipur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%gorai%') THEN 'Gorai'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%sakalpur%') THEN 'Sakalpur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%khajuri%') THEN 'Khajuri'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%chandapur%') THEN 'Chandapur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%mahangipur%' OR address ILIKE '%mahagipur%') THEN 'Mahangipur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%barki%' OR address ILIKE '%baraki%') THEN 'Barki'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%raghunathpur%') THEN 'Raghunathpur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%bhikhampur%') THEN 'Bhikhampur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%dindaspur%') THEN 'Dindaspur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%kaneri%') THEN 'Kaneri'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%sarauni%' OR address ILIKE '%saruni%' OR address ILIKE '%sihorawa%') THEN 'Sarauni'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND (address ILIKE '%maniyaripur%') THEN 'Maniyaripur'

    -- Varanasi Umbrella Localities
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND ("pinCode" = '221307' OR address ILIKE '%raja talab%' OR address ILIKE '%rajatalab%' OR address ILIKE '%shahanshahpur%') THEN 'Raja Talab'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND ("pinCode" = '221011' OR address ILIKE '%babatpur%') THEN 'Babatpur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND ("pinCode" IN ('221010', '221002') OR address ILIKE '%sigra%' OR address ILIKE '%sidgiri%') THEN 'Sigra'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND ("pinCode" = '221001' OR address ILIKE '%bhelupur%' OR address ILIKE '%shivala%' OR address ILIKE '%kamachha%') THEN 'Bhelupur'
    WHEN (city ILIKE '%varanasi%' OR city ILIKE '%banaras%') AND ("pinCode" = '221005' OR address ILIKE '%lanka%' OR address ILIKE '%bhu%' OR address ILIKE '%durgakund%') THEN 'Lanka'

    -- Prayagraj Discrete Localities & Pincode Analysis
    -- 1. Specific Villages & Towns First
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND ("pinCode" IN ('212107', '212108') OR address ILIKE '%shankargarh%' OR address ILIKE '%shankergarh%' OR address ILIKE '%shanker garh%' OR address ILIKE '%shankar garh%' OR address ILIKE '%sankargarh%' OR address ILIKE '%jasra%') THEN 'Shankargarh'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%jasra%') THEN 'Jasra'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%bharatganj%') THEN 'Bharatganj'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%naribari%') THEN 'Naribari'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND ("pinCode" = '212301' OR address ILIKE '%karchana%' OR address ILIKE '%karchhana%' OR address ILIKE '%karchhanaalld%') THEN 'Karchana'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND ("pinCode" = '212302' OR address ILIKE '%meja%' OR address ILIKE '%urwa%' OR address ILIKE '%sirsa%') THEN 'Meja'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND ("pinCode" = '212306' OR address ILIKE '%koraon%' OR address ILIKE '%pasna%' OR address ILIKE '%kohdar%') THEN 'Koraon'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND ("pinCode" = '221503' OR address ILIKE '%handia%' OR address ILIKE '%dhanupur%') THEN 'Handia'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%saidabad%') THEN 'Saidabad'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND ("pinCode" = '212502' OR address ILIKE '%soraon%' OR address ILIKE '%holagarh%') THEN 'Soraon'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%mauaima%') THEN 'Mauaima'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%nawabganj%' OR address ILIKE '%kaurihar%' OR address ILIKE '%kaudihar%') THEN 'Nawabganj'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%ghoorpur%' OR address ILIKE '%iradatganj%') THEN 'Ghoorpur'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%sahson%' OR address ILIKE '%hanumanganj%') THEN 'Sahson'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%phulpur%' OR address ILIKE '%phoolpur%') THEN 'Phulpur'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%jari%') THEN 'Jari'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%panasa%') THEN 'Panasa'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%madauka%' OR address ILIKE '%madouka%') THEN 'Madauka'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%pipraon%' OR address ILIKE '%pipraw%') THEN 'Pipraon'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%majhiar%') THEN 'Majhiar'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%karma%') THEN 'Karma'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%bheerpur%') THEN 'Bheerpur'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%balapur%') THEN 'Balapur'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%bhagwatpur%' OR address ILIKE '%bhagawatpur%') THEN 'Bhagwatpur'

    -- 2. Trans-Yamuna / Naini Cluster Sub-villages
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%arail%') THEN 'Arail'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%chaka%' OR address ILIKE '%fci road%') THEN 'Chaka'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%dhanuha%') THEN 'Dhanuha'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%kharkauni%') THEN 'Kharkauni'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%babura%') THEN 'Babura'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%dandupur%' OR address ILIKE '%palpur%') THEN 'Dandupur'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%mungari%' OR address ILIKE '%mungary%') THEN 'Mungari'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%mohabbatganj%') THEN 'Mohabbatganj'

    -- 3. City Proper Distinct Localities
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND ("pinCode" = '211013' OR address ILIKE '%phaphamau%') THEN 'Phaphamau'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%shantipuram%') THEN 'Shantipuram'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND ("pinCode" = '211002' OR address ILIKE '%katra%' OR address ILIKE '%university%') THEN 'Katra'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%mumfordganj%') THEN 'Mumfordganj'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND ("pinCode" = '211011' OR address ILIKE '%dhoomanganj%' OR address ILIKE '%subedarganj%') THEN 'Dhoomanganj'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%mundera%') THEN 'Mundera'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%bamrauli%') THEN 'Bamrauli'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%manauri%') THEN 'Manauri'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND ("pinCode" = '211016' OR address ILIKE '%kareli%' OR address ILIKE '%gaughat%') THEN 'Kareli'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%gtb nagar%') THEN 'GTB Nagar'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%attarsuiya%' OR address ILIKE '%meerapur%' OR address ILIKE '%rani mandi%' OR address ILIKE '%muthiganj%' OR address ILIKE '%zero road%') THEN 'Attarsuiya'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%kydganj%') THEN 'Kydganj'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%bhawapur%') THEN 'Bhawapur'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%colonelganj%') THEN 'Colonelganj'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%beli gaon%' OR address ILIKE '%beligaon%') THEN 'Beligaon'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND ("pinCode" = '211004' OR address ILIKE '%teliyarganj%' OR address ILIKE '%mnnit%') THEN 'Teliyarganj'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%govindpuram%' OR (address ILIKE '%govindpur%' AND (address ILIKE '%naini%' OR "pinCode" = '211008'))) THEN 'Govindpuram'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%govindpur%' AND address NOT ILIKE '%govindpuram%' AND address NOT ILIKE '%naini%') THEN 'Govindpur'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%daraganj%' OR address ILIKE '%dara ganj%') THEN 'Daraganj'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%tagore town%') THEN 'Tagore Town'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%george town%') THEN 'George Town'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND ("pinCode" = '211006' OR address ILIKE '%allahpur%' OR address ILIKE '%alopi%') THEN 'Allahpur'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%rajrooppur%') THEN 'Rajrooppur'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%preetam nagar%') THEN 'Preetam Nagar'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%kalindipuram%') THEN 'Kalindipuram'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%pipalgaon%') THEN 'Pipalgaon'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%jhalwa%' OR address ILIKE '%iiit%') THEN 'Jhalwa'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%salori%') THEN 'Salori'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%allenganj%') THEN 'Allenganj'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%chaukatha%' OR address ILIKE '%chaukhata%' OR address ILIKE '%chauka tha%') THEN 'Chaukatha'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%khuldabad%') THEN 'Khuldabad'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%stanley road%') THEN 'Stanley Road'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%chatham lines%') THEN 'Chatham Lines'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%shivkuti%') THEN 'Shivkuti'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%mehdauri%') THEN 'Mehdauri'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%ashok nagar%') THEN 'Ashok Nagar'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%sohbatiya bagh%' OR address ILIKE '%sohbatiabagh%') THEN 'Sohbatiyabagh'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (address ILIKE '%rasoolabad%' OR address ILIKE '%rasulabad%') THEN 'Rasoolabad'

    -- 4. Umbrella Areas
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND (("pinCode" = '211019' AND address NOT ILIKE '%naini%') OR address ILIKE '%jhunsi%' OR address ILIKE '%jhusi%' OR (address ILIKE '%andawa%' AND address NOT ILIKE '%sandawa%' AND address NOT ILIKE '%mandawa%')) THEN 'Jhunsi'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND ((address ILIKE '%bara%' OR address ILIKE '%baraalld%') AND address NOT ILIKE '%bharatganj%' AND address NOT ILIKE '%baraut%' AND address NOT ILIKE '%baragaon%' AND address NOT ILIKE '%baramadpur%' AND address NOT ILIKE '%jasra%' AND address NOT ILIKE '%karchana%' AND address NOT ILIKE '%karchhana%') THEN 'Bara'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND ("pinCode" = '211008' OR address ILIKE '%naini%' OR address ILIKE '%chheoki%' OR address ILIKE '%sandawa%' OR address ILIKE '%ada colony%' OR address ILIKE '%a.d.a%') THEN 'Naini'
    WHEN (city ILIKE '%prayagraj%' OR city ILIKE '%allahabad%') AND ("pinCode" = '211001' OR address ILIKE '%civil lines%' OR address ILIKE '%high court%' OR address ILIKE '%mg marg%') THEN 'Civil Lines'

    -- Lucknow Locality & Pincode Analysis
    WHEN city ILIKE '%lucknow%' AND (address ILIKE '%gomti nagar%' OR address ILIKE '%gomtinagar%' OR "pinCode" = '226010') THEN 'Gomti Nagar'
    WHEN city ILIKE '%lucknow%' AND (address ILIKE '%alambagh%' OR "pinCode" = '226005') THEN 'Alambagh'
    WHEN city ILIKE '%lucknow%' AND (address ILIKE '%hazratganj%' OR "pinCode" = '226001') THEN 'Hazratganj'
    WHEN city ILIKE '%lucknow%' AND (address ILIKE '%indira nagar%' OR address ILIKE '%indiranagar%' OR "pinCode" = '226016') THEN 'Indira Nagar'
    WHEN city ILIKE '%lucknow%' AND (address ILIKE '%aliganj%' OR "pinCode" = '226024') THEN 'Aliganj'

    -- Kanpur Locality & Pincode Analysis
    WHEN city ILIKE '%kanpur%' AND (address ILIKE '%kalyanpur%' OR "pinCode" = '208017') THEN 'Kalyanpur'
    WHEN city ILIKE '%kanpur%' AND (address ILIKE '%civil lines%' OR "pinCode" = '208001') THEN 'Civil Lines'
    WHEN city ILIKE '%kanpur%' AND (address ILIKE '%kidwai nagar%' OR "pinCode" = '208011') THEN 'Kidwai Nagar'

    -- Fallback on manually entered division if set
    WHEN division IS NOT NULL AND TRIM(division) != '' AND TRIM(division) != 'Other / General Area' THEN TRIM(division)
    ELSE 'General City Wards'
  END
`;

export function normalizeCityName(city: string | null | undefined): string {
  if (!city || typeof city !== 'string') return 'Varanasi';
  const c = city.trim().toLowerCase();
  if (c.includes('allahabad') || c.includes('prayagraj')) return 'Prayagraj';
  if (c.includes('varanasi') || c.includes('banaras') || c.includes('kashi')) return 'Varanasi';
  if (c.includes('lucknow')) return 'Lucknow';
  if (c.includes('kanpur')) return 'Kanpur';
  if (c.includes('gorakhpur')) return 'Gorakhpur';
  if (c.includes('mirzapur')) return 'Mirzapur';
  if (c.includes('jaunpur')) return 'Jaunpur';
  if (c.includes('chandauli')) return 'Chandauli';
  if (c.includes('bhadohi')) return 'Bhadohi';
  return city.trim();
}

export interface TerritoryLeadRow {
  id: number;
  leadCode: string;
  customerName: string;
  mobile: string;
  mobileAlt: string | null;
  address: string | null;
  pinCode: string | null;
  city: string | null;
  division: string | null;
  connectionType: string | null;
  sanctionedLoadKw: number | null;
  leadSource: string | null;
  status: string | null;
  isActive: boolean;
  createdAt: Date | string;
  consultant_id: number | null;
  consultant_name: string | null;
  tl_id: number | null;
  tl_name: string | null;
  manager_id: number | null;
  manager_name: string | null;
}

export interface TerritoryCountSummary {
  total: number;
  unassigned: number;
  active: number;
  inactive: number;
}

/**
 * Fetch unified territory preview leads matching the exact Map View SQL partition.
 */
export async function getTerritoryPreviewData({
  city,
  localities,
  filterType = 'unassigned',
  page = 1,
  limit = 25,
  allowedUserIds,
}: {
  city?: string;
  localities: string[];
  filterType?: 'all' | 'unassigned' | 'active' | 'inactive';
  page?: number;
  limit?: number;
  allowedUserIds?: number[];
}): Promise<{
  leads: any[];
  counts: TerritoryCountSummary;
  totalFiltered: number;
}> {
  const normCity = normalizeCityName(city);
  const lowerLocs = localities.map((l) => l.trim().toLowerCase()).filter(Boolean);
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 25));
  const skip = (pageNum - 1) * limitNum;
  const hasUserScope = Array.isArray(allowedUserIds) && allowedUserIds.length > 0;

  // Build filter condition
  let filterSql = `1=1`;
  if (filterType === 'unassigned') {
    if (hasUserScope) {
      filterSql = `(l."isActive" = true OR l."isActive" IS NULL) AND l."assignedManagerId" = ANY($5::int[]) AND l."assignedConsultantId" IS NULL AND l."assignedTlId" IS NULL`;
    } else {
      filterSql = `(l."isActive" = true OR l."isActive" IS NULL) AND l."assignedConsultantId" IS NULL AND l."assignedTlId" IS NULL AND l."assignedManagerId" IS NULL`;
    }
  } else if (filterType === 'active') {
    filterSql = `(l."isActive" = true OR l."isActive" IS NULL) AND (l."assignedConsultantId" IS NOT NULL OR l."assignedTlId" IS NOT NULL)`;
  } else if (filterType === 'inactive') {
    filterSql = `l."isActive" = false`;
  }

  // 1. Get counts (total, unassigned, active, inactive) in a single fast query
  const countSql = hasUserScope
    ? `
      WITH analyzed_leads AS (
        SELECT 
          id,
          "isActive",
          "assignedConsultantId",
          "assignedTlId",
          "assignedManagerId",
          ${RAW_CITY_CASE_STR} as normalized_city,
          ${RAW_DIVISION_CASE_STR} as calculated_division
        FROM "Lead"
        WHERE ("assignedManagerId" = ANY($3::int[]) OR "assignedTlId" = ANY($3::int[]) OR "assignedConsultantId" = ANY($3::int[]))
      )
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN (l."isActive" = true OR l."isActive" IS NULL) AND l."assignedManagerId" = ANY($3::int[]) AND l."assignedConsultantId" IS NULL AND l."assignedTlId" IS NULL THEN 1 END)::int as unassigned,
        COUNT(CASE WHEN (l."isActive" = true OR l."isActive" IS NULL) AND (l."assignedConsultantId" IS NOT NULL OR l."assignedTlId" IS NOT NULL) THEN 1 END)::int as active,
        COUNT(CASE WHEN l."isActive" = false THEN 1 END)::int as inactive
      FROM analyzed_leads l
      WHERE LOWER(l.normalized_city) = LOWER($1)
        AND LOWER(l.calculated_division) = ANY($2::text[]);
    `
    : `
      WITH analyzed_leads AS (
        SELECT 
          id,
          "isActive",
          "assignedConsultantId",
          "assignedTlId",
          "assignedManagerId",
          ${RAW_CITY_CASE_STR} as normalized_city,
          ${RAW_DIVISION_CASE_STR} as calculated_division
        FROM "Lead"
      )
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN (l."isActive" = true OR l."isActive" IS NULL) AND l."assignedConsultantId" IS NULL AND l."assignedTlId" IS NULL AND l."assignedManagerId" IS NULL THEN 1 END)::int as unassigned,
        COUNT(CASE WHEN (l."isActive" = true OR l."isActive" IS NULL) AND (l."assignedConsultantId" IS NOT NULL OR l."assignedTlId" IS NOT NULL OR l."assignedManagerId" IS NOT NULL) THEN 1 END)::int as active,
        COUNT(CASE WHEN l."isActive" = false THEN 1 END)::int as inactive
      FROM analyzed_leads l
      WHERE LOWER(l.normalized_city) = LOWER($1)
        AND LOWER(l.calculated_division) = ANY($2::text[]);
    `;

  const countRows = hasUserScope
    ? await prisma.$queryRawUnsafe<TerritoryCountSummary[]>(countSql, normCity, lowerLocs, allowedUserIds)
    : await prisma.$queryRawUnsafe<TerritoryCountSummary[]>(countSql, normCity, lowerLocs);
  const countSummary = countRows[0] || { total: 0, unassigned: 0, active: 0, inactive: 0 };

  // Calculate filtered total based on filterType
  let totalFiltered = countSummary.total;
  if (filterType === 'unassigned') totalFiltered = countSummary.unassigned;
  else if (filterType === 'active') totalFiltered = countSummary.active;
  else if (filterType === 'inactive') totalFiltered = countSummary.inactive;

  // 2. Fetch paginated rows
  const leadsSql = hasUserScope
    ? `
      WITH analyzed_leads AS (
        SELECT 
          id,
          "leadCode",
          "customerName",
          "mobile",
          "mobileAlt",
          "address",
          "pinCode",
          "city",
          "division",
          "connectionType",
          "sanctionedLoadKw",
          "leadSource",
          "status",
          "isActive",
          "assignedConsultantId",
          "assignedTlId",
          "assignedManagerId",
          "createdAt",
          ${RAW_CITY_CASE_STR} as normalized_city,
          ${RAW_DIVISION_CASE_STR} as calculated_division
        FROM "Lead"
        WHERE ("assignedManagerId" = ANY($5::int[]) OR "assignedTlId" = ANY($5::int[]) OR "assignedConsultantId" = ANY($5::int[]))
      )
      SELECT 
        l.id,
        l."leadCode",
        l."customerName",
        l."mobile",
        l."mobileAlt",
        l."address",
        l."pinCode",
        l."city",
        l."division",
        l."connectionType",
        l."sanctionedLoadKw",
        l."leadSource",
        l."status",
        l."isActive",
        l."createdAt",
        u_c.id as consultant_id,
        u_c.name as consultant_name,
        u_t.id as tl_id,
        u_t.name as tl_name,
        u_m.id as manager_id,
        u_m.name as manager_name
      FROM analyzed_leads l
      LEFT JOIN "User" u_c ON l."assignedConsultantId" = u_c.id
      LEFT JOIN "User" u_t ON l."assignedTlId" = u_t.id
      LEFT JOIN "User" u_m ON l."assignedManagerId" = u_m.id
      WHERE LOWER(l.normalized_city) = LOWER($1)
        AND LOWER(l.calculated_division) = ANY($2::text[])
        AND ${filterSql}
      ORDER BY l."createdAt" ASC
      LIMIT $3 OFFSET $4;
    `
    : `
      WITH analyzed_leads AS (
        SELECT 
          id,
          "leadCode",
          "customerName",
          "mobile",
          "mobileAlt",
          "address",
          "pinCode",
          "city",
          "division",
          "connectionType",
          "sanctionedLoadKw",
          "leadSource",
          "status",
          "isActive",
          "assignedConsultantId",
          "assignedTlId",
          "assignedManagerId",
          "createdAt",
          ${RAW_CITY_CASE_STR} as normalized_city,
          ${RAW_DIVISION_CASE_STR} as calculated_division
        FROM "Lead"
      )
      SELECT 
        l.id,
        l."leadCode",
        l."customerName",
        l."mobile",
        l."mobileAlt",
        l."address",
        l."pinCode",
        l."city",
        l."division",
        l."connectionType",
        l."sanctionedLoadKw",
        l."leadSource",
        l."status",
        l."isActive",
        l."createdAt",
        u_c.id as consultant_id,
        u_c.name as consultant_name,
        u_t.id as tl_id,
        u_t.name as tl_name,
        u_m.id as manager_id,
        u_m.name as manager_name
      FROM analyzed_leads l
      LEFT JOIN "User" u_c ON l."assignedConsultantId" = u_c.id
      LEFT JOIN "User" u_t ON l."assignedTlId" = u_t.id
      LEFT JOIN "User" u_m ON l."assignedManagerId" = u_m.id
      WHERE LOWER(l.normalized_city) = LOWER($1)
        AND LOWER(l.calculated_division) = ANY($2::text[])
        AND ${filterSql}
      ORDER BY l."createdAt" ASC
      LIMIT $3 OFFSET $4;
    `;

  const rawLeads = hasUserScope
    ? await prisma.$queryRawUnsafe<TerritoryLeadRow[]>(leadsSql, normCity, lowerLocs, limitNum, skip, allowedUserIds)
    : await prisma.$queryRawUnsafe<TerritoryLeadRow[]>(leadsSql, normCity, lowerLocs, limitNum, skip);

  const formattedLeads = rawLeads.map((r) => ({
    id: r.id,
    leadCode: r.leadCode,
    customerName: r.customerName,
    mobile: r.mobile,
    mobileAlt: r.mobileAlt,
    address: r.address,
    pinCode: r.pinCode,
    city: r.city,
    division: r.division,
    connectionType: r.connectionType,
    sanctionedLoadKw: r.sanctionedLoadKw,
    leadSource: r.leadSource,
    status: r.status,
    isActive: r.isActive,
    createdAt: r.createdAt,
    consultant: r.consultant_id ? { id: r.consultant_id, name: r.consultant_name } : null,
    tl: r.tl_id ? { id: r.tl_id, name: r.tl_name } : null,
    manager: r.manager_id ? { id: r.manager_id, name: r.manager_name } : null,
  }));

  return {
    leads: formattedLeads,
    counts: {
      total: countSummary.total,
      unassigned: countSummary.unassigned,
      active: countSummary.active,
      inactive: countSummary.inactive,
    },
    totalFiltered,
  };
}

/**
 * Fetch unassigned lead IDs matching the exact Map View SQL partition for Territory Assign.
 */
export async function getTerritoryUnassignedLeadIds({
  city,
  localities,
  count,
  priority = 'oldest',
  allowedUserIds,
}: {
  city?: string;
  localities: string[];
  count?: number;
  priority?: 'oldest' | 'newest';
  allowedUserIds?: number[];
}): Promise<number[]> {
  const normCity = normalizeCityName(city);
  const lowerLocs = localities.map((l) => l.trim().toLowerCase()).filter(Boolean);
  const countLimit = count && Number(count) > 0 ? Number(count) : null;
  const isDesc = priority === 'newest';
  const hasUserScope = Array.isArray(allowedUserIds) && allowedUserIds.length > 0;

  const assignSql = hasUserScope
    ? `
      WITH analyzed_leads AS (
        SELECT 
          id,
          "isActive",
          "assignedConsultantId",
          "assignedTlId",
          "assignedManagerId",
          "createdAt",
          ${RAW_CITY_CASE_STR} as normalized_city,
          ${RAW_DIVISION_CASE_STR} as calculated_division
        FROM "Lead"
        WHERE ("assignedManagerId" = ANY($3::int[]) OR "assignedTlId" = ANY($3::int[]) OR "assignedConsultantId" = ANY($3::int[]))
      )
      SELECT l.id
      FROM analyzed_leads l
      WHERE LOWER(l.normalized_city) = LOWER($1)
        AND LOWER(l.calculated_division) = ANY($2::text[])
        AND (l."isActive" = true OR l."isActive" IS NULL)
        AND l."assignedManagerId" = ANY($3::int[])
        AND l."assignedConsultantId" IS NULL
        AND l."assignedTlId" IS NULL
      ORDER BY l."createdAt" ${isDesc ? 'DESC' : 'ASC'}
      ${countLimit ? `LIMIT ${countLimit}` : ''};
    `
    : `
      WITH analyzed_leads AS (
        SELECT 
          id,
          "isActive",
          "assignedConsultantId",
          "assignedTlId",
          "assignedManagerId",
          "createdAt",
          ${RAW_CITY_CASE_STR} as normalized_city,
          ${RAW_DIVISION_CASE_STR} as calculated_division
        FROM "Lead"
      )
      SELECT l.id
      FROM analyzed_leads l
      WHERE LOWER(l.normalized_city) = LOWER($1)
        AND LOWER(l.calculated_division) = ANY($2::text[])
        AND (l."isActive" = true OR l."isActive" IS NULL)
        AND l."assignedConsultantId" IS NULL
        AND l."assignedTlId" IS NULL
        AND l."assignedManagerId" IS NULL
      ORDER BY l."createdAt" ${isDesc ? 'DESC' : 'ASC'}
      ${countLimit ? `LIMIT ${countLimit}` : ''};
    `;

  const rows = hasUserScope
    ? await prisma.$queryRawUnsafe<{ id: number }[]>(assignSql, normCity, lowerLocs, allowedUserIds)
    : await prisma.$queryRawUnsafe<{ id: number }[]>(assignSql, normCity, lowerLocs);
  return rows.map((r) => r.id);
}

