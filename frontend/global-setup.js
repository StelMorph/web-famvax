const { chromium } = require('@playwright/test');
const { userEmail, userPassword } = require('./e2e/config.js');

module.exports = async (config) => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    await page.goto('http://localhost:5173');
    await page.fill('input[type="email"]', userEmail);
    await page.fill('input[type="password"]', userPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/#my-family-screen/);

    await page.context().storageState({ path: 'storageState.json' });
  } catch (error) {
    console.error('Global setup failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
};
