import assert from 'node:assert/strict';
import { test, afterEach } from 'node:test';
import { exportOrdersToExcel, exportOrdersToPDF } from './src/lib/exportUtils';
import { Order } from './src/types';

const ORDER: Order = {
  id: 'o1',
  order_number: 'TM-1001',
  customer_id: 'c1',
  customer_name: 'Baji Yadav',
  customer_phone: '9876543210',
  delivery_address: 'GLS Homes, Sohna',
  items: [
    { dish_id: 'm1', dish_name: 'Chicken Dum Biryani', quantity: 2, price: 180 },
    { dish_id: 'm2', dish_name: 'Chicken 65 Biryani', quantity: 1, price: 190 }
  ],
  subtotal: 550,
  tax_amount: 0,
  delivery_fee: 30,
  total_amount: 580,
  payment_method: 'UPI',
  payment_status: 'completed',
  status: 'delivered',
  driver_name: 'Ravi',
  rating: 4.5,
  created_at: '2026-01-02 10:00'
};

interface Harness {
  alerts: string[];
  downloads: { href: string; download: string }[];
  csv: string | null;
  appended: number;
  removed: number;
  restore: () => void;
}

function installDomHarness(): Harness {
  const target = globalThis as unknown as Record<string, unknown>;
  const saved = new Map<string, PropertyDescriptor | undefined>();
  const define = (key: string, value: unknown) => {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  };

  const harness: Harness = {
    alerts: [],
    downloads: [],
    csv: null,
    appended: 0,
    removed: 0,
    restore: () => {
      for (const [key, descriptor] of saved) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete target[key];
      }
    }
  };

  define('alert', (message: string) => harness.alerts.push(message));

  define('Blob', class FakeBlob {
    constructor(public parts: string[], public options: { type: string }) {
      harness.csv = parts.join('');
    }
  });

  define('URL', {
    createObjectURL: () => 'blob:fake-url'
  });

  define('document', {
    createElement: () => {
      const attrs: Record<string, string> = {};
      return {
        setAttribute: (key: string, value: string) => {
          attrs[key] = value;
        },
        click: () => harness.downloads.push({ href: attrs.href, download: attrs.download })
      };
    },
    body: {
      appendChild: () => {
        harness.appended += 1;
      },
      removeChild: () => {
        harness.removed += 1;
      }
    }
  });

  return harness;
}

let harness: Harness | null = null;

afterEach(() => {
  harness?.restore();
  harness = null;
});

// --- exportOrdersToExcel ----------------------------------------------------

test('CSV export writes a header row and one row per order', () => {
  harness = installDomHarness();
  exportOrdersToExcel([ORDER, { ...ORDER, order_number: 'TM-1002' }]);

  const lines = (harness.csv ?? '').split('\n');
  assert.equal(lines.length, 3);
  assert.match(lines[0], /^Order #,Date,Customer Name/);
  assert.match(lines[1], /"TM-1001"/);
  assert.match(lines[2], /"TM-1002"/);
});

test('CSV row flattens items and formats optional driver and rating', () => {
  harness = installDomHarness();
  exportOrdersToExcel([ORDER]);

  const row = (harness.csv ?? '').split('\n')[1];
  assert.match(row, /"Chicken Dum Biryani x2, Chicken 65 Biryani x1"/);
  assert.match(row, /"Ravi"/);
  assert.ok(row.endsWith('4.5'));
});

test('CSV row substitutes N/A for a missing driver and rating', () => {
  harness = installDomHarness();
  exportOrdersToExcel([{ ...ORDER, driver_name: undefined, rating: undefined }]);

  const row = (harness.csv ?? '').split('\n')[1];
  assert.match(row, /"N\/A",N\/A$/);
});

test('CSV export triggers a download with the given filename and cleans up', () => {
  harness = installDomHarness();
  exportOrdersToExcel([ORDER], 'Custom.csv');

  assert.deepEqual(harness.downloads, [{ href: 'blob:fake-url', download: 'Custom.csv' }]);
  assert.equal(harness.appended, 1);
  assert.equal(harness.removed, 1);
});

test('CSV export defaults the filename', () => {
  harness = installDomHarness();
  exportOrdersToExcel([ORDER]);
  assert.equal(harness.downloads[0].download, 'Order_History.csv');
});

test('CSV export alerts and downloads nothing when there are no orders', () => {
  harness = installDomHarness();
  exportOrdersToExcel([]);
  exportOrdersToExcel(undefined as unknown as Order[]);

  assert.deepEqual(harness.alerts, ['No orders available to export.', 'No orders available to export.']);
  assert.equal(harness.downloads.length, 0);
});

// --- exportOrdersToPDF ------------------------------------------------------

function installPrintWindow(printWindow: unknown) {
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    value: { open: () => printWindow },
    configurable: true,
    writable: true
  });
  return () => {
    if (saved) Object.defineProperty(globalThis, 'window', saved);
    else delete (globalThis as unknown as Record<string, unknown>).window;
  };
}

test('PDF export writes a printable document containing every order', () => {
  harness = installDomHarness();
  let written = '';
  let closed = false;
  const restoreWindow = installPrintWindow({
    document: {
      write: (html: string) => {
        written = html;
      },
      close: () => {
        closed = true;
      }
    }
  });

  try {
    exportOrdersToPDF([ORDER]);
  } finally {
    restoreWindow();
  }

  assert.ok(closed);
  assert.match(written, /Order History Report/);
  assert.match(written, /TM-1001/);
  assert.match(written, /Chicken Dum Biryani \(x2\)/);
  assert.match(written, /1 orders listed/);
  assert.match(written, /<span class="badge delivered">delivered<\/span>/);
});

test('PDF export shows a dash for an unassigned driver', () => {
  harness = installDomHarness();
  let written = '';
  const restoreWindow = installPrintWindow({
    document: { write: (html: string) => { written = html; }, close: () => {} }
  });

  try {
    exportOrdersToPDF([{ ...ORDER, driver_name: undefined }]);
  } finally {
    restoreWindow();
  }

  assert.match(written, /<td>-<\/td>/);
});

test('PDF export alerts when the popup is blocked', () => {
  harness = installDomHarness();
  const restoreWindow = installPrintWindow(null);

  try {
    exportOrdersToPDF([ORDER]);
  } finally {
    restoreWindow();
  }

  assert.deepEqual(harness.alerts, ['Please allow popups to export PDF.']);
});
