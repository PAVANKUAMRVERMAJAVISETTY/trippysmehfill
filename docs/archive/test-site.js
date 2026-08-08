const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const logs = {
    timestamp: new Date().toISOString(),
    consoleErrors: [],
    failedNetworkRequests: []
  };

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    permissions: ['geolocation'],
    geolocation: { latitude: 28.2468, longitude: 77.0628 }, // Sohna / Gurgaon coordinates
    viewport: { width: 1280, height: 720 }
  });

  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      logs.consoleErrors.push({ text: msg.text(), location: msg.location() });
    }
  });

  page.on('requestfailed', request => {
    logs.failedNetworkRequests.push({
      url: request.url(),
      errorText: request.failure()?.errorText || 'Unknown error',
      method: request.method()
    });
  });

  try {
    console.log("🚀 Starting Automation Test...");
    await page.goto('https://trippysmehfill.vercel.app', { waitUntil: 'networkidle' });

    console.log("🔑 Testing login flow...");
    // Update selectors to match your app's UI elements
    await page.getByPlaceholder(/username|email|mobile/i).first().fill('nagapavankumarjavisetty@gmail.com');
    await page.getByPlaceholder(/password/i).first().fill('your_test_password');
    await page.getByRole('button', { name: /login|sign in/i }).first().click();

    await page.waitForTimeout(3000);
    console.log("✅ Test script executed successfully.");

  } catch (error) {
    console.error("❌ Test Script Failed:", error.message);
    logs.scriptExecutionError = error.message;
  } finally {
    fs.writeFileSync('error_log.json', JSON.stringify(logs, null, 2));
    console.log("💾 Logs saved to error_log.json");
    await browser.close();
  }
})();
