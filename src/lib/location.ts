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
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data && data.display_name) {
            const parts = data.display_name.split(',');
            const shortAddress = parts.slice(0, 3).join(',').trim();
            resolve(shortAddress);
            return;
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
