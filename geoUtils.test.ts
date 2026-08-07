import assert from 'node:assert/strict';
import { test, afterEach } from 'node:test';
import {
  KITCHEN_LAT,
  KITCHEN_LNG,
  calculateDistanceKm,
  formatDistanceText,
  getRouteDirectionsUrl,
  fetchPublicIP,
  detectDeviceAndOS,
  captureLiveLocation
} from './src/lib/geoUtils';

const FALLBACK_IP = '103.211.14.82';

const globals = globalThis as unknown as {
  fetch: typeof fetch;
  navigator?: unknown;
};

const originalFetch = globals.fetch;
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

function setNavigator(value: unknown) {
  Object.defineProperty(globalThis, 'navigator', {
    value,
    configurable: true,
    writable: true
  });
}

afterEach(() => {
  globals.fetch = originalFetch;
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
  else delete globals.navigator;
});

// --- calculateDistanceKm ----------------------------------------------------

test('distance from the kitchen to itself is zero', () => {
  assert.equal(calculateDistanceKm(KITCHEN_LAT, KITCHEN_LNG), 0);
});

test('distance is rounded to two decimals', () => {
  const distance = calculateDistanceKm(28.2568, 77.0628);
  assert.equal(distance, Number(distance.toFixed(2)));
  assert.ok(distance > 1.0 && distance < 1.2, `unexpected distance ${distance}`);
});

test('distance is symmetric between two points', () => {
  const forward = calculateDistanceKm(28.4595, 77.0266, 28.2468, 77.0628);
  const backward = calculateDistanceKm(28.2468, 77.0628, 28.4595, 77.0266);
  assert.ok(Math.abs(forward - backward) < 0.01);
});

test('distance grows with separation', () => {
  const near = calculateDistanceKm(28.25, 77.07);
  const far = calculateDistanceKm(19.076, 72.8777);
  assert.ok(far > near);
});

test('missing or zero coordinates yield zero instead of a bogus distance', () => {
  assert.equal(calculateDistanceKm(0, 77.0628), 0);
  assert.equal(calculateDistanceKm(28.2468, 0), 0);
  assert.equal(calculateDistanceKm(NaN as unknown as number, 77.0628), 0);
});

test('explicit destination overrides the kitchen default', () => {
  assert.equal(calculateDistanceKm(28.2468, 77.0628, 28.2468, 77.0628), 0);
  assert.ok(calculateDistanceKm(28.2468, 77.0628, 28.6139, 77.209) > 40);
});

// --- formatDistanceText -----------------------------------------------------

test('sub-kilometre distances are reported in metres', () => {
  assert.equal(formatDistanceText(0.45), '450 meters from GLS Kitchen');
});

test('distances of a kilometre or more are reported in kilometres', () => {
  assert.equal(formatDistanceText(1), '1 km from GLS Kitchen');
  assert.equal(formatDistanceText(12.34), '12.34 km from GLS Kitchen');
});

test('zero or negative distances fall back to the local label', () => {
  assert.equal(formatDistanceText(0), '0.1 km (Local)');
  assert.equal(formatDistanceText(-5), '0.1 km (Local)');
});

test('metre rounding is applied', () => {
  assert.equal(formatDistanceText(0.4567), '457 meters from GLS Kitchen');
});

// --- getRouteDirectionsUrl --------------------------------------------------

test('route url goes from the kitchen to the customer', () => {
  assert.equal(
    getRouteDirectionsUrl(28.3, 77.1),
    `https://www.google.com/maps/dir/${KITCHEN_LAT},${KITCHEN_LNG}/28.3,77.1`
  );
});

test('route url falls back to the kitchen pin without customer coordinates', () => {
  const fallback = `https://www.google.com/maps?q=${KITCHEN_LAT},${KITCHEN_LNG}`;
  assert.equal(getRouteDirectionsUrl(0, 77.1), fallback);
  assert.equal(getRouteDirectionsUrl(28.3, 0), fallback);
});

// --- fetchPublicIP ----------------------------------------------------------

test('returns the ip reported by the lookup service', async () => {
  globals.fetch = (async () => ({ ok: true, json: async () => ({ ip: '1.2.3.4' }) })) as unknown as typeof fetch;
  assert.equal(await fetchPublicIP(), '1.2.3.4');
});

test('falls back when the lookup service errors, fails or omits the ip', async () => {
  globals.fetch = (async () => {
    throw new Error('network down');
  }) as unknown as typeof fetch;
  assert.equal(await fetchPublicIP(), FALLBACK_IP);

  globals.fetch = (async () => ({ ok: false, json: async () => ({ ip: '1.2.3.4' }) })) as unknown as typeof fetch;
  assert.equal(await fetchPublicIP(), FALLBACK_IP);

  globals.fetch = (async () => ({ ok: true, json: async () => ({}) })) as unknown as typeof fetch;
  assert.equal(await fetchPublicIP(), FALLBACK_IP);
});

// --- detectDeviceAndOS ------------------------------------------------------

const ANDROID_PHONE =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36';
const IPAD =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const WINDOWS_EDGE =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 Edg/120.0';

test('classifies an android phone', () => {
  setNavigator({ userAgent: ANDROID_PHONE });
  const info = detectDeviceAndOS();
  assert.equal(info.deviceType, 'Mobile');
  assert.equal(info.osName, 'Android');
  assert.equal(info.browserName, 'Chrome');
});

test('classifies a tablet', () => {
  setNavigator({ userAgent: IPAD });
  const info = detectDeviceAndOS();
  assert.equal(info.deviceType, 'Tablet');
  assert.equal(info.osName, 'iOS');
  assert.equal(info.browserName, 'Safari');
});

test('classifies a windows desktop running edge', () => {
  setNavigator({ userAgent: WINDOWS_EDGE });
  const info = detectDeviceAndOS();
  assert.equal(info.deviceType, 'Desktop');
  assert.equal(info.osName, 'Windows 11/10');
  assert.equal(info.browserName, 'Edge');
});

test('always resolves a timezone', () => {
  setNavigator({ userAgent: WINDOWS_EDGE });
  assert.ok(detectDeviceAndOS().timezone.length > 0);
});

// --- captureLiveLocation ----------------------------------------------------

test('reports coordinates on a successful fix', () => {
  setNavigator({
    geolocation: {
      getCurrentPosition: (onSuccess: (p: unknown) => void) =>
        onSuccess({ coords: { latitude: 28.1, longitude: 77.2 } })
    }
  });

  let received: [number, number] | null = null;
  captureLiveLocation((lat, lng) => {
    received = [lat, lng];
  });
  assert.deepEqual(received, [28.1, 77.2]);
});

test('reports a permission error through the error callback', () => {
  setNavigator({
    geolocation: {
      getCurrentPosition: (_onSuccess: unknown, onError: (e: unknown) => void) =>
        onError({ code: 1, message: 'denied' })
    }
  });

  const messages: string[] = [];
  captureLiveLocation(
    () => assert.fail('success callback should not run'),
    (message) => messages.push(message)
  );
  assert.equal(messages.length, 1);
  assert.match(messages[0], /location permissions/i);
});

test('reports unsupported geolocation through the error callback', () => {
  setNavigator({});
  const messages: string[] = [];
  captureLiveLocation(
    () => assert.fail('success callback should not run'),
    (message) => messages.push(message)
  );
  assert.deepEqual(messages, ['Geolocation is not supported by your browser']);
});
