import { test, expect } from '@playwright/test';
import { deleteProfile, createProfile, fillDatePicker, navigateToFamilyScreen } from './utils.js';

test.describe('Record CRUD', () => {
  let profileId;

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    const name = `RecTest ${Math.floor(Math.random() * 10000)}`;
    profileId = await createProfile(page, name);
    console.log(`Test Profile Created: ${profileId}`);
  });

  test.afterEach(async ({ page }) => {
    if (profileId) {
      try {
        await deleteProfile(page, profileId);
      } catch (e) {
        console.log('Teardown cleanup failed (profile might be gone)');
      }
    }
  });

  test('should allow creating a new record', async ({ page }) => {
    await navigateToFamilyScreen(page);

    const profileCard = page.locator(`[data-testid="${profileId}"]`);
    await expect(profileCard).toBeVisible({ timeout: 30000 });
    await profileCard.click();

    await page.locator('button.btn-primary:has-text("Add Record")').click();
    await page.click('button:has-text("Manual Entry")');

    const vaccineName = `Vax ${Math.floor(Math.random() * 1000)}`;
    await page.fill('input[name="vaccineName"]', vaccineName);

    const today = new Date();
    await fillDatePicker(page, today.getFullYear(), today.getMonth(), today.getDate());

    await Promise.all([
      page.locator('button:has-text("Manual Entry")').waitFor({ state: 'detached' }),
      page.click('button[type="submit"].btn-primary'),
    ]);

    await expect(page.locator(`span.vaccine-name:has-text("${vaccineName}")`)).toBeVisible();
  });

  test('should allow updating a record', async ({ page }) => {
    await navigateToFamilyScreen(page);
    await page.locator(`[data-testid="${profileId}"]`).click();

    await page.locator('button.btn-primary:has-text("Add Record")').click();
    await page.click('button:has-text("Manual Entry")');
    const vaccineName = `UpdateVax ${Math.floor(Math.random() * 1000)}`;
    await page.fill('input[name="vaccineName"]', vaccineName);
    await fillDatePicker(page, '2022', '0', '1');
    await page.click('button[type="submit"].btn-primary');

    await expect(page.locator('.toast-notification')).not.toBeVisible();

    await page.locator(`span.vaccine-name:has-text("${vaccineName}")`).click();
    await page.locator('button.btn-primary:has-text("Edit")').click();

    const updatedName = `UpdatedVax ${Math.floor(Math.random() * 1000)}`;
    await page.fill('input[name="vaccineName"]', updatedName);

    await Promise.all([
      page.locator('button.btn-primary:has-text("Edit")').waitFor({ state: 'detached' }),
      page.click('button[type="submit"].btn-primary'),
    ]);

    await expect(page.locator(`span.vaccine-name:has-text("${updatedName}")`)).toBeVisible();
  });

  test('should allow deleting a record', async ({ page }) => {
    await navigateToFamilyScreen(page);
    await page.locator(`[data-testid="${profileId}"]`).click();

    await page.locator('button.btn-primary:has-text("Add Record")').click();
    await page.click('button:has-text("Manual Entry")');
    const vaccineName = `DelVax ${Math.floor(Math.random() * 1000)}`;
    await page.fill('input[name="vaccineName"]', vaccineName);
    await fillDatePicker(page, '2022', '0', '1');
    await page.click('button[type="submit"].btn-primary');

    await expect(page.locator('.toast-notification')).not.toBeVisible();

    await page.locator(`span.vaccine-name:has-text("${vaccineName}")`).click();
    await page.locator('button.btn-primary:has-text("Edit")').click();
    await page.locator('button.btn-danger:has-text("Delete Record")').click();

    await Promise.all([
      page.locator('button.btn-destructive:has-text("OK")').waitFor({ state: 'detached' }),
      page.click('button.btn-destructive:has-text("OK")'),
    ]);

    await expect(page.locator(`span.vaccine-name:has-text("${vaccineName}")`)).not.toBeVisible();
  });
});
