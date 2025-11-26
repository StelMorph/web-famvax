// frontend/e2e/cleanup.spec.js
const { test, expect } = require('@playwright/test');
const { navigateToFamilyScreen, deleteProfile, createProfile } = require('./utils.js');

test('cleanup: delete all profiles', async ({ page }) => {
  test.setTimeout(600000); // 10 minutes timeout for this heavy test
  await page.goto('/');
  await navigateToFamilyScreen(page);

  // Create a couple of profiles to ensure they exist before cleanup
  await createProfile(page, 'Delete Me 1');
  await createProfile(page, 'Delete Me 2');
  console.log('Created profiles for deletion.');

  await navigateToFamilyScreen(page);
  console.log('Navigated to family screen for cleanup.');

  while (true) {
    // Explicitly wait for a profile card to be visible before proceeding.
    // This is the most robust way to ensure the list has loaded.
    try {
      await page
        .locator('[data-testid*="-"]')
        .first()
        .waitFor({ state: 'visible', timeout: 15000 });
      console.log('A profile card is visible. Proceeding with count and deletion.');
    } catch (e) {
      // If no card appears after 15s, we can be confident the cleanup is done.
      console.log('No profiles found after 15s wait. Exiting cleanup loop.');
      break;
    }

    const profileCards = page.locator('[data-testid*="-"]');
    const count = await profileCards.count();

    console.log(`Found ${count} profiles to delete.`);
    // This check is now slightly redundant due to the try/catch, but it's a safe fallback.
    if (count === 0) {
      break;
    }

    const firstProfile = profileCards.first();
    const profileId = await firstProfile.getAttribute('data-testid');

    console.log(`Deleting profile ${profileId}...`);
    await deleteProfile(page, profileId);
    console.log(`Profile ${profileId} deleted.`);
  }

  console.log('All profiles have been deleted.');

  // Final check
  await navigateToFamilyScreen(page);
  const finalCount = await page.locator('[data-testid*="-"]').count();
  expect(finalCount).toBe(0);
});
