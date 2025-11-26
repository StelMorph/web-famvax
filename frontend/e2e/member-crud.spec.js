import { test, expect } from '@playwright/test';
import { deleteProfile, createProfile, navigateToFamilyScreen } from './utils.js';

test.describe('Member (Profile) CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should allow creating a new profile', async ({ page }) => {
    const profileName = `Test Create ${Math.floor(Math.random() * 1000)}`;
    // createProfile now handles the waiting and validation internally
    const profileId = await createProfile(page, profileName);
    await expect(page.locator(`[data-testid="${profileId}"]`)).toBeVisible();
  });

  test('should allow reading a profile', async ({ page }) => {
    const profileName = `Test Read ${Math.floor(Math.random() * 1000)}`;
    const profileId = await createProfile(page, profileName);

    // Navigate safely before interacting
    await navigateToFamilyScreen(page);
    await page.locator(`[data-testid="${profileId}"]`).click();

    await expect(page.locator('h3:has-text("Vaccination Records")')).toBeVisible();
    await expect(page.locator(`h2:has-text("${profileName}")`)).toBeVisible();
  });

  test('should allow updating a profile', async ({ page }) => {
    const profileName = `Test Update ${Math.floor(Math.random() * 1000)}`;
    const updatedProfileName = `Updated Name ${Math.floor(Math.random() * 1000)}`;
    const profileId = await createProfile(page, profileName);

    await navigateToFamilyScreen(page);
    await page.locator(`[data-testid="${profileId}"]`).click();
    await page.locator('button.btn-icon:has(svg[data-icon="pencil"])').click();

    await page.fill('input[name="name"]', updatedProfileName);

    await Promise.all([
      // Wait for potential network call
      page.waitForResponse((resp) => resp.status() === 200).catch(() => {}),
      page.click('button[type="submit"].btn-primary'),
      page.locator('input[name="name"]').waitFor({ state: 'detached', timeout: 10000 }),
    ]);

    await expect(page.locator(`h2:has-text("${updatedProfileName}")`)).toBeVisible();

    await navigateToFamilyScreen(page);
    await expect(page.locator(`[data-testid="${profileId}"] h3.profile-name-new`)).toHaveText(
      updatedProfileName,
    );
  });

  test('should allow deleting a profile', async ({ page }) => {
    const profileName = `Test Delete ${Math.floor(Math.random() * 1000)}`;
    const profileId = await createProfile(page, profileName);

    // deleteProfile uses navigateToFamilyScreen internally
    await deleteProfile(page, profileId);
  });
});
