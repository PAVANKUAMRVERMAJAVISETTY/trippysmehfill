import { Order } from '../types';

/** Escapes text before it is interpolated into an HTML string. */
const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Quotes a CSV field, doubling embedded quotes and prefixing anything a
 * spreadsheet would evaluate as a formula.
 */
const csvCell = (value: unknown): string => {
  const raw = String(value ?? '');
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
};

export function exportOrdersToExcel(orders: Order[], filename = 'Order_History.csv') {
  if (!orders || orders.length === 0) {
    alert('No orders available to export.');
    return;
  }

  const headers = ['Order #', 'Date', 'Customer Name', 'Phone', 'Campus/Address', 'Items', 'Total Amount', 'Payment Method', 'Status', 'Driver', 'Rating'];
  
  const rows = orders.map(o => [
    csvCell(o.order_number),
    csvCell(o.created_at),
    csvCell(o.customer_name),
    csvCell(o.customer_phone),
    csvCell(o.delivery_address),
    csvCell(o.items.map(i => `${i.dish_name} x${i.quantity}`).join(', ')),
    o.total_amount,
    csvCell(o.payment_method),
    csvCell(o.status),
    csvCell(o.driver_name || 'N/A'),
    o.rating ? o.rating.toFixed(1) : 'N/A'
  ]);

  const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportOrdersToPDF(orders: Order[]) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export PDF.');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Trippy's Mehfill - Order History</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #333; }
          h1 { color: #e65100; margin-bottom: 5px; }
          .subtitle { font-size: 14px; color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #fff3e0; color: #e65100; font-weight: bold; }
          tr:nth-child(even) { background-color: #fcfcfc; }
          .badge { font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 10px; text-transform: uppercase; }
          .delivered { background: #e8f5e9; color: #2e7d32; }
          .cancelled { background: #ffebee; color: #c62828; }
          .pending { background: #fff8e1; color: #f57f17; }
        </style>
      </head>
      <body>
        <h1>Trippy's Mehfill — Order History Report</h1>
        <div class="subtitle">${orders.length} orders listed • Generated on ${new Date().toLocaleString()}</div>
        <table>
          <thead>
            <tr>
              <th>Order #</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Driver</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                <td><b>${escapeHtml(o.order_number)}</b></td>
                <td>${escapeHtml(o.created_at)}</td>
                <td>${escapeHtml(o.customer_name)}</td>
                <td>${escapeHtml(o.customer_phone)}</td>
                <td>${escapeHtml(o.delivery_address)}</td>
                <td>${o.items.map(i => escapeHtml(`${i.dish_name} (x${i.quantity})`)).join('<br/>')}</td>
                <td>₹${escapeHtml(o.total_amount)}</td>
                <td><span class="badge ${escapeHtml(o.status)}">${escapeHtml(o.status)}</span></td>
                <td>${escapeHtml(o.driver_name || '-')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
