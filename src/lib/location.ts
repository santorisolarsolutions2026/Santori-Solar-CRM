export async function getCurrentLocationString(): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      resolve('Office / Web Portal');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            {
              headers: {
                'User-Agent': 'SolarCRM/1.0 (contact@santorisolar.com)',
                'Accept-Language': 'en',
              },
            }
          );
          const contentType = res.headers.get('content-type');
          if (res.ok && contentType && contentType.includes('application/json')) {
            const data = await res.json();
            if (data && data.display_name) {
              const parts = data.display_name.split(',');
              const shortAddress = parts.slice(0, 3).join(',').trim();
              resolve(shortAddress);
              return;
            }
          }
        } catch (e) {
          // Fallback to coordinates
        }
        resolve(`GPS (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
      },
      (error) => {
        console.warn('Geolocation capture note:', error.message);
        resolve('Office / Web Portal');
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
    );
  });
}

export function normalizeLocation(
  city?: string | null,
  state?: string | null,
  address?: string | null,
  pinCode?: string | null
) {
  let normalizedCity = city ? city.trim() : '';
  let normalizedState = state ? state.trim() : '';
  let normalizedPin = pinCode ? String(pinCode).trim() : '';

  // 1. If city is empty or not provided, try to extract from address text
  if (!normalizedCity && address) {
    const addrUpper = address.toUpperCase();

    // Check for major cities / districts in address text dynamically
    const CITY_PATTERNS: { name: string; state: string; regex: RegExp }[] = [
      { name: 'Varanasi', state: 'Uttar Pradesh', regex: /\b(VARANASI|BENARES|BANARAS|KASHI)\b/ },
      { name: 'Prayagraj', state: 'Uttar Pradesh', regex: /\b(PRAYAGRAJ|ALLAHABAD)\b/ },
      { name: 'Lucknow', state: 'Uttar Pradesh', regex: /\b(LUCKNOW)\b/ },
      { name: 'Chandauli', state: 'Uttar Pradesh', regex: /\b(CHANDAULI|MUGHALSARAI|MUGHAL SARAI|PT DEEN DAYAL)\b/ },
      { name: 'Mirzapur', state: 'Uttar Pradesh', regex: /\b(MIRZAPUR|VINDHYACHAL)\b/ },
      { name: 'Jaunpur', state: 'Uttar Pradesh', regex: /\b(JAUNPUR)\b/ },
      { name: 'Ghazipur', state: 'Uttar Pradesh', regex: /\b(GHAZIPUR)\b/ },
      { name: 'Gorakhpur', state: 'Uttar Pradesh', regex: /\b(GORAKHPUR)\b/ },
      { name: 'Kanpur', state: 'Uttar Pradesh', regex: /\b(KANPUR)\b/ },
      { name: 'Agra', state: 'Uttar Pradesh', regex: /\b(AGRA)\b/ },
      { name: 'Ayodhya', state: 'Uttar Pradesh', regex: /\b(AYODHYA|FAIZABAD)\b/ },
      { name: 'Noida', state: 'Uttar Pradesh', regex: /\b(NOIDA|GREATER NOIDA)\b/ },
      { name: 'Ghaziabad', state: 'Uttar Pradesh', regex: /\b(GHAZIABAD)\b/ },
      { name: 'Bhadohi', state: 'Uttar Pradesh', regex: /\b(BHADOHI|GYANPUR)\b/ },
      { name: 'Sonbhadra', state: 'Uttar Pradesh', regex: /\b(SONBHADRA|ROBERTSGANJ)\b/ },
      { name: 'Ballia', state: 'Uttar Pradesh', regex: /\b(BALLIA)\b/ },
      { name: 'Mau', state: 'Uttar Pradesh', regex: /\b(MAUNATH BHANJAN|MAU)\b/ },
      { name: 'Azamgarh', state: 'Uttar Pradesh', regex: /\b(AZAMGARH)\b/ },
      { name: 'Bareilly', state: 'Uttar Pradesh', regex: /\b(BAREILLY)\b/ },
      { name: 'Meerut', state: 'Uttar Pradesh', regex: /\b(MEERUT)\b/ },
      { name: 'Aligarh', state: 'Uttar Pradesh', regex: /\b(ALIGARH)\b/ },
      { name: 'Jhansi', state: 'Uttar Pradesh', regex: /\b(JHANSI)\b/ },
      { name: 'Mathura', state: 'Uttar Pradesh', regex: /\b(MATHURA)\b/ },
      { name: 'Moradabad', state: 'Uttar Pradesh', regex: /\b(MORADABAD)\b/ },
      { name: 'Saharanpur', state: 'Uttar Pradesh', regex: /\b(SAHARANPUR)\b/ },
      { name: 'Patna', state: 'Bihar', regex: /\b(PATNA)\b/ },
      { name: 'Delhi', state: 'Delhi', regex: /\b(DELHI|NEW DELHI)\b/ },
    ];

    for (const cp of CITY_PATTERNS) {
      if (cp.regex.test(addrUpper)) {
        normalizedCity = cp.name;
        if (!normalizedState) normalizedState = cp.state;
        break;
      }
    }
  }

  // 2. Extract 6-digit Pincode from Address if pinCode is empty
  if (!normalizedPin && address) {
    const pinMatch = address.match(/\b(1[1-9]\d{4}|2\d{5}|3\d{5}|4\d{5}|5\d{5}|6\d{5}|7\d{5}|8\d{5})\b/);
    if (pinMatch) {
      normalizedPin = pinMatch[1];
      // If city is still blank, deduce from known PIN prefixes
      if (!normalizedCity) {
        if (normalizedPin.startsWith('221')) {
          normalizedCity = 'Varanasi';
          if (!normalizedState) normalizedState = 'Uttar Pradesh';
        } else if (normalizedPin.startsWith('211')) {
          normalizedCity = 'Prayagraj';
          if (!normalizedState) normalizedState = 'Uttar Pradesh';
        } else if (normalizedPin.startsWith('226')) {
          normalizedCity = 'Lucknow';
          if (!normalizedState) normalizedState = 'Uttar Pradesh';
        } else if (normalizedPin.startsWith('222')) {
          normalizedCity = 'Jaunpur';
          if (!normalizedState) normalizedState = 'Uttar Pradesh';
        } else if (normalizedPin.startsWith('231')) {
          normalizedCity = 'Mirzapur';
          if (!normalizedState) normalizedState = 'Uttar Pradesh';
        } else if (normalizedPin.startsWith('232')) {
          normalizedCity = 'Chandauli';
          if (!normalizedState) normalizedState = 'Uttar Pradesh';
        }
      }
    }
  }

  // 3. Normalize state aliases
  const lowerState = normalizedState.toLowerCase();
  if (lowerState === 'up' || lowerState === 'u.p.' || lowerState === 'u p' || (!normalizedState && normalizedCity)) {
    normalizedState = 'Uttar Pradesh';
  } else if (lowerState === 'delhi' || lowerState === 'dl' || lowerState === 'ncr') {
    normalizedState = 'Delhi';
  } else if (lowerState === 'bihar' || lowerState === 'br') {
    normalizedState = 'Bihar';
  } else if (lowerState === 'rajasthan' || lowerState === 'rj') {
    normalizedState = 'Rajasthan';
  }

  // 4. Normalize city aliases
  const lowerCity = normalizedCity.toLowerCase();
  if (lowerCity === 'allahabad') {
    normalizedCity = 'Prayagraj';
    if (!normalizedState) normalizedState = 'Uttar Pradesh';
  } else if (lowerCity === 'banaras' || lowerCity === 'benares' || lowerCity === 'kashi') {
    normalizedCity = 'Varanasi';
    if (!normalizedState) normalizedState = 'Uttar Pradesh';
  } else if (lowerCity === 'faizabad') {
    normalizedCity = 'Ayodhya';
    if (!normalizedState) normalizedState = 'Uttar Pradesh';
  }

  return {
    city: normalizedCity,
    state: normalizedState,
    pinCode: normalizedPin,
  };
}
