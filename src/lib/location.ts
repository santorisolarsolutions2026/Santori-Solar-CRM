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
  const normalizedCity = city ? city.trim() : '';
  const normalizedState = state ? state.trim() : '';
  const normalizedPin = pinCode ? String(pinCode).trim() : '';

  return {
    city: normalizedCity,
    state: normalizedState,
    pinCode: normalizedPin,
  };
}

export function resolveServerLocation(req: Request, clientLocation?: string | null): string {
  // 1. If valid GPS / reverse-geocoded location provided from client
  if (
    clientLocation &&
    typeof clientLocation === 'string' &&
    clientLocation.trim() !== '' &&
    !clientLocation.toLowerCase().includes('web browser login') &&
    !clientLocation.toLowerCase().includes('web portal') &&
    !clientLocation.toLowerCase().includes('error_') &&
    !clientLocation.toLowerCase().includes('html5 geolocation not supported') &&
    !clientLocation.toLowerCase().includes('unknown')
  ) {
    return clientLocation.trim();
  }

  // 2. Cloudflare Edge Geolocation Headers (0ms latency, automatic from edge proxy)
  const cfCity = req.headers.get('cf-ipcity');
  const cfRegion = req.headers.get('cf-region');
  const cfCountry = req.headers.get('cf-ipcountry');
  if (cfCity) {
    let decodedCity = cfCity;
    let decodedRegion = cfRegion || '';
    try {
      decodedCity = decodeURIComponent(cfCity);
      if (cfRegion) decodedRegion = decodeURIComponent(cfRegion);
    } catch {}
    const parts = [decodedCity, decodedRegion, cfCountry || 'India'].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(', ');
    }
  }

  // 3. Fallback default for Localhost / Development environments
  return 'Varanasi, Uttar Pradesh, India';
}
