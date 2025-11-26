import { expect } from '@playwright/test';
import { userEmail, userPassword } from './config.js';

/**
 * SAFELY navigates to the family screen and waits for data to load.
 * Use this instead of page.goto() in your tests.
 */
export async function navigateToFamilyScreen(page) {
  // Only goto if we aren't already there
  if (!page.url().includes('#my-family-screen')) {
    await page.goto('http://localhost:5173/#my-family-screen');
  }

  await expect(page.locator('h1:has-text("My Family"), h2:has-text("My Family")')).toBeVisible({
    timeout: 20000,
  });

  await expect(
    page.locator('button.btn-primary:is(:text("Add Member"), :text("Add First Profile"))'),
  ).toBeVisible();

  await expect(page.locator('.loading-spinner, .spinner')).not.toBeVisible();
}

export async function createProfile(page, name) {
  await navigateToFamilyScreen(page);

  await page
    .locator('button.btn-primary:is(:text("Add Member"), :text("Add First Profile"))')
    .click();

  const manualBtn = page.locator('button:has-text("Manual Entry")');
  await expect(manualBtn).toBeVisible();
  await manualBtn.click();

  await page.fill('input[name="name"]', name);
  await fillDatePicker(page, '2000', '0', '1');
  await page.selectOption('select[name="relationship"]', 'Other');

  const submitBtn = page.locator('button[type="submit"].btn-primary');
  await expect(submitBtn).toBeEnabled();

  await Promise.all([
    page.locator('input[name="name"]').waitFor({ state: 'detached', timeout: 10000 }),
    submitBtn.click(),
  ]);

  const cardSelector = `[data-testid]:has(h3:has-text("${name}"))`;

  try {
    await expect(page.locator(cardSelector).first()).toBeVisible({ timeout: 10000 });
  } catch (e) {
    console.log('Card did not appear immediately. Reloading to fetch fresh data...');
    await page.reload();
    await navigateToFamilyScreen(page);
    await expect(page.locator(cardSelector).first()).toBeVisible({ timeout: 30000 });
  }

  return await page.locator(cardSelector).first().getAttribute('data-testid');
}

export async function deleteProfile(page, profileId) {
  await navigateToFamilyScreen(page);

  const card = page.locator(`[data-testid="${profileId}"]`);

  if ((await card.count()) === 0) {
    console.log('Profile already deleted, skipping...');
    return;
  }

  await card.scrollIntoViewIfNeeded();
  await card.click();

  const trashIcon = page.locator('button.btn-icon.btn-danger-icon:has(svg[data-icon="trash-can"])');
  await expect(trashIcon).toBeVisible();
  await trashIcon.click();

  const modal = page.locator('.notification-modal.modern.error');
  await expect(modal).toBeVisible();

  const profileName = await modal.locator('.modal-message strong').textContent();
  await page.fill(`input[placeholder="${profileName}"]`, profileName);

  await Promise.all([
    modal.waitFor({ state: 'detached', timeout: 30000 }),
    page.click('button:has-text("Delete")'),
  ]);

  try {
    console.log(`Waiting for profile ${profileId} to be deleted...`);
    await page.waitForURL(/#my-family-screen/, { timeout: 30000 });
    await expect(page.locator(`[data-testid="${profileId}"]`)).not.toBeVisible({ timeout: 30000 });
  } catch (e) {
    console.log('Profile did not disappear as expected. Reloading to verify deletion...');
    await page.reload();
    await navigateToFamilyScreen(page);
    await expect(page.locator(`[data-testid="${profileId}"]`)).not.toBeVisible({
      timeout: 30000,
    });
  }
}

export async function fillDatePicker(page, year, monthIndex, day) {
  await page.click('.date-picker-input');
  const dropdown = page.locator('.date-picker-dropdown');
  await expect(dropdown).toBeVisible();
  await dropdown.locator('select:nth-child(1)').selectOption(String(monthIndex));
  await dropdown.locator('select:nth-child(2)').selectOption(String(day));
  await dropdown.locator('select:nth-child(3)').selectOption(String(year));
}
