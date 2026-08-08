// ====================================================================
// GEOLOCATION & ANTI-FRAUD UTILITIES
// Cloud Kitchen Coordinates: Sohna GLS Homes near GDGU, Haryana
// ====================================================================

export const KITCHEN_LAT = 28.2468;
export const KITCHEN_LNG = 77.0628;
export const MAX_SERVICE_RADIUS_KM = 99999; // Radius restriction disabled

/**
 * Calculates straight-line distance in kilometers between two GPS coordinates
 * using the Haversine formula.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number = KITCHEN_LAT,
  lon2: number = KITCHEN_LNG
): number {
  if (!lat1 || !lon1) return 0;
  const R = 6371; // Earth radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return parseFloat(distance.toFixed(2));
}

/**
 * Formats distance in meters if less than 1 km, or kilometers if 1 km or more.
 */
export function formatDistanceText(distanceKm: number): string {
  if (!distanceKm || distanceKm <= 0) return '0.1 km (Local)';
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} meters from GLS Kitchen`;
  }
  return `${distanceKm} km from GLS Kitchen`;
}

/**
 * Generates Google Maps delivery navigation route URL from GLS Homes Kitchen to customer location.
 */
export function getRouteDirectionsUrl(customerLat: number, customerLng: number): string {
  if (!customerLat || !customerLng) return `https://www.google.com/maps?q=${KITCHEN_LAT},${KITCHEN_LNG}`;
  return `https://www.google.com/maps/dir/${KITCHEN_LAT},${KITCHEN_LNG}/${customerLat},${customerLng}`;
}

/**
 * Fetches user's public IP address from client
 */
export async function fetchPublicIP(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      if (data?.ip) return data.ip;
    }
  } catch {
    // Lookup failed -- fall through.
  }
  // Empty rather than a hardcoded address: stamping a fixed IP on every profile
  // whose lookup failed records something that was never true of that customer.
  return '';
}

export interface GeoLocationResult {
  latitude: number;
  longitude: number;
  distanceKm: number;
  isWithinZone: boolean;
  ipAddress: string;
  errorType?: 'DENIED' | 'OUT_OF_ZONE' | 'UNAVAILABLE';
  errorMessage?: string;
}

export function captureLiveLocation(
  onSuccess: (lat: number, lng: number) => void,
  onError?: (errMessage: string) => void
): void {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    const msg = 'Geolocation is not supported by your browser';
    if (onError) onError(msg);
    else alert(msg);
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      onSuccess(position.coords.latitude, position.coords.longitude);
    },
    (error) => {
      console.error('Geolocation error:', error);
      const msg = 'Please enable location permissions to proceed with accurate delivery location.';
      if (onError) onError(msg);
      else alert(msg);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

export interface FullSecurityContext {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  gpsAllowed: boolean;
  distanceKm: number;
  ipAddress: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
  deviceType: 'Mobile' | 'Tablet' | 'Desktop';
  osName: string;
  browserName: string;
  timezone: string;
  googleMapsUrl: string;
  fraudRiskLevel: 'low' | 'medium' | 'high';
  fraudRiskReasons: string[];
}

export function detectDeviceAndOS(): {
  deviceType: 'Mobile' | 'Tablet' | 'Desktop';
  osName: string;
  browserName: string;
  timezone: string;
} {
  const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '').toLowerCase();

  let deviceType: 'Mobile' | 'Tablet' | 'Desktop' = 'Desktop';
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    deviceType = 'Tablet';
  } else if (/mobile|iphone|ipod|android/i.test(ua)) {
    deviceType = 'Mobile';
  }

  let osName = 'Windows';
  if (ua.includes('windows nt 10.0')) osName = 'Windows 11/10';
  else if (ua.includes('android')) osName = 'Android';
  else if (/iphone|ipad|ipod/.test(ua)) osName = 'iOS';
  else if (ua.includes('macintosh') || ua.includes('mac os')) osName = 'macOS';
  else if (ua.includes('linux')) osName = 'Linux';

  let browserName = 'Chrome';
  if (ua.includes('edg')) browserName = 'Edge';
  else if (ua.includes('chrome')) browserName = 'Chrome';
  else if (ua.includes('safari')) browserName = 'Safari';
  else if (ua.includes('firefox')) browserName = 'Firefox';
  else if (ua.includes('opera') || ua.includes('opr')) browserName = 'Opera';

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

  return { deviceType, osName, browserName, timezone };
}

export async function captureFullSecurityContext(): Promise<FullSecurityContext> {
  const ipAddress = await fetchPublicIP();
  const systemInfo = detectDeviceAndOS();

  let latitude = KITCHEN_LAT;
  let longitude = KITCHEN_LNG;
  let accuracyMeters = 15;
  let gpsAllowed = false;

  if ('geolocation' in navigator) {
    try {
      const position: GeolocationPosition = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 4000,
          maximumAge: 0
        });
      });

      latitude = position.coords.latitude;
      longitude = position.coords.longitude;
      accuracyMeters = Math.round(position.coords.accuracy || 10);
      gpsAllowed = true;
    } catch {
      gpsAllowed = false;
    }
  }

  const distanceKm = calculateDistanceKm(latitude, longitude, KITCHEN_LAT, KITCHEN_LNG);
  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

  const fraudRiskReasons: string[] = [];
  let fraudRiskLevel: 'low' | 'medium' | 'high' = 'low';

  if (!gpsAllowed) {
    fraudRiskReasons.push('⚠️ GPS permission disabled / denied by user');
    fraudRiskLevel = 'medium';
  }

  if (distanceKm > 15) {
    fraudRiskReasons.push(`🚨 GPS location is ${distanceKm} km away from Sohna Kitchen`);
    fraudRiskLevel = 'high';
  } else if (distanceKm > 5) {
    fraudRiskReasons.push(`⚠️ Location is ${distanceKm} km away (outside GDGU campus / Sohna core zone)`);
    if (fraudRiskLevel === 'low') fraudRiskLevel = 'medium';
  }

  return {
    latitude: parseFloat(latitude.toFixed(6)),
    longitude: parseFloat(longitude.toFixed(6)),
    accuracyMeters,
    gpsAllowed,
    distanceKm,
    ipAddress,
    city: 'Sohna / Gurgaon',
    state: 'Haryana',
    country: 'India',
    pinCode: '122103',
    deviceType: systemInfo.deviceType,
    osName: systemInfo.osName,
    browserName: systemInfo.browserName,
    timezone: systemInfo.timezone,
    googleMapsUrl,
    fraudRiskLevel,
    fraudRiskReasons
  };
}

/**
 * Requests browser HTML5 Geolocation API.
 * Radius restriction is disabled - all locations are accepted smoothly.
 */
export async function requestValidatedLocation(): Promise<GeoLocationResult> {
  const security = await captureFullSecurityContext();
  return {
    latitude: security.latitude,
    longitude: security.longitude,
    distanceKm: security.distanceKm,
    isWithinZone: true,
    ipAddress: security.ipAddress
  };
}
