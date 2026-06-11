'use client';

import React, { useEffect, useState } from 'react';

interface MeetingLocationDisplayProps {
  latitude: number | null;
  longitude: number | null;
  dbLocality: string | null;
  dbCity: string | null;
  dbPinCode: string | null;
}

export function MeetingLocationDisplay({
  latitude,
  longitude,
  dbLocality,
  dbCity,
  dbPinCode,
}: MeetingLocationDisplayProps) {
  const [addressText, setAddressText] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!latitude || !longitude) return;

    // Use database values if available
    if (dbLocality || dbCity) {
      const parts = [];
      if (dbLocality) parts.push(dbLocality);
      if (dbCity) parts.push(dbCity);
      const suffix = dbPinCode ? ` - ${dbPinCode}` : '';
      setAddressText(parts.join(', ') + suffix);
      return;
    }

    // Dynamic reverse geocoding for older/fallback entries
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'SolarCRM/1.0 (contact@santorisolar.com)',
          'Accept-Language': 'en',
        },
      }
    )
      .then((res) => res.json())
      .then((data) => {
        if (data && data.address) {
          const addr = data.address;
          const city =
            addr.city ||
            addr.town ||
            addr.village ||
            addr.municipality ||
            addr.city_district ||
            addr.county ||
            '';

          const localityParts = [];
          if (addr.suburb) localityParts.push(addr.suburb);
          else if (addr.neighbourhood) localityParts.push(addr.neighbourhood);
          else if (addr.quarter) localityParts.push(addr.quarter);

          if (addr.road) localityParts.push(addr.road);
          const locality =
            localityParts.length > 0 ? localityParts.join(', ') : addr.state_district || '';

          const pin = addr.postcode || '';

          const parts = [];
          if (locality) parts.push(locality);
          if (city) parts.push(city);
          const suffix = pin ? ` - ${pin}` : '';

          if (parts.length > 0) {
            setAddressText(parts.join(', ') + suffix);
          } else {
            setAddressText(`Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`);
          }
        } else {
          setAddressText(`Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`);
        }
      })
      .catch(() => {
        setAddressText(`Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });
  }, [latitude, longitude, dbLocality, dbCity, dbPinCode]);

  if (!latitude || !longitude) {
    return <span className="text-slate-500 italic">Location permission was denied.</span>;
  }

  if (loading) {
    return (
      <span className="text-slate-400 italic flex items-center gap-1.5 animate-pulse">
        Resolving locality name, pincode & city...
      </span>
    );
  }

  return <span>{addressText || `Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`}</span>;
}
