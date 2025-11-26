// frontend/e2e/cleanup.spec.js
const { test, expect } = require('@playwright/test');
const { navigateToFamilyScreen } = require('./utils.js');

test('cleanup: delete all profiles', async ({ page }) => {
  await page.goto('/');
  await navigateToFamilyScreen(page);
  console.log('Navigated to family screen.');

  while (true) {
    const profileLocator = page.locator('[data-testid*="-"] h3.profile-name-new');
    const count = await profileLocator.count();

    console.log(`Found ${count} profiles to delete.`);
    if (count === 0) {
      break;
    }

    const firstProfile = profileLocator.first();
    const profileNameElement = await firstProfile.textContent();

    console.log(`Deleting profile ${profileNameElement}...`);

    await firstProfile.click();

    const trashIcon = page.locator(
      'button.btn-icon.btn-danger-icon:has(svg[data-icon="trash-can"])',
    );
    await trashIcon.click();

    const modal = page.locator('.notification-modal.modern.error');
    const profileName = await modal.locator('.modal-message strong').textContent();
    await page.fill(`input[placeholder="${profileName}"]`, profileName);

    await Promise.all([
      modal.waitFor({ state: 'detached', timeout: 15000 }),
      page.click('button:has-text("Delete")'),
    ]);

    console.log(`Profile ${profileNameElement} deleted.`);
    await navigateToFamilyScreen(page); // Go back to the list
  }

  console.log('All profiles have been deleted.');

  // Final check
  await navigateToFamilyScreen(page);
  const finalCount = await page.locator('[data-testid*="-"] h3.profile-name-new').count();
  expect(finalCount).toBe(0);
});
