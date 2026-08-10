import { UserProfile } from '../types';

/**
 * Detect client device specs from userAgent string.
 */
function parseClientSpecs() {
  const ua = navigator.userAgent || '';
  let device_type = 'Desktop';
  if (/mobile/i.test(ua)) device_type = 'Mobile';
  else if (/ipad|tablet/i.test(ua)) device_type = 'Tablet';

  let os_name = 'Unknown OS';
  if (/windows/i.test(ua)) os_name = 'Windows';
  else if (/macintosh|mac os/i.test(ua)) os_name = 'macOS';
  else if (/android/i.test(ua)) os_name = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os_name = 'iOS';
  else if (/linux/i.test(ua)) os_name = 'Linux';

  let browser_name = 'Chrome';
  if (/edg/i.test(ua)) browser_name = 'Edge';
  else if (/chrome|crios/i.test(ua) && !/opr|opera|edg/i.test(ua)) browser_name = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser_name = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) browser_name = 'Safari';
  else if (/opr|opera/i.test(ua)) browser_name = 'Opera';

  let timezone = 'Asia/Kolkata';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch (e) {
    // fallback
  }

  return { device_type, os_name, browser_name, timezone };
}

/**
 * Record customer activity telemetry on login or active app session.
 * Throttled to prevent DB spam.
 */
export async function recordCustomerActivity(
  user: UserProfile | null,
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
): Promise<void> {
  if (!user || user.role !== 'customer') return;

  // Check rate-limit (at most once every 3 minutes per session)
  const lastRun = sessionStorage.getItem('trippys_last_telemetry_ts');
  const nowTs = Date.now();
  if (lastRun && nowTs - parseInt(lastRun, 10) < 3 * 60 * 1000) {
    return;
  }
  sessionStorage.setItem('trippys_last_telemetry_ts', nowTs.toString());

  const specs = parseClientSpecs();
  const nowIso = new Date().toISOString();

  const updates: Partial<UserProfile> = {
    ...specs,
    last_seen_at: nowIso,
  };

  // 1. Optional Public IP fetch (with strict timeout)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const ipRes = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
    clearTimeout(timer);
    if (ipRes.ok) {
      const ipData = await ipRes.json();
      if (ipData?.ip) {
        updates.ip_address = ipData.ip;
      }
    }
  } catch (e) {
    // Silently fallback, do not block app
  }

  // 2. Location update if browser permission is already granted or available
  if ('geolocation' in navigator) {
    try {
      // Use Permissions API if supported to check state first
      if (navigator.permissions && navigator.permissions.query) {
        const perm = await navigator.permissions.query({ name: 'geolocation' });
        if (perm.state === 'denied') {
          updates.gps_allowed = false;
          await updateProfile(updates);
          return;
        }
      }

      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          updates.latitude = pos.coords.latitude;
          updates.longitude = pos.coords.longitude;
          updates.gps_accuracy = Math.round(pos.coords.accuracy || 15);
          updates.gps_allowed = true;
          updates.last_location_update_at = new Date().toISOString();
          await updateProfile(updates);
        },
        async () => {
          updates.gps_allowed = false;
          await updateProfile(updates);
        },
        { timeout: 4000, maximumAge: 60000 }
      );
      return;
    } catch (e) {
      updates.gps_allowed = false;
    }
  }

  await updateProfile(updates);
}
