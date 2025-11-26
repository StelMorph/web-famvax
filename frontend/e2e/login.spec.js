import { test, expect } from '@playwright/test';
import { navigateToFamilyScreen } from './utils.js';

test('should be logged in', async ({ page }) => {
  await page.goto('/');
  await page.reload();
  await navigateToFamilyScreen(page);
  await expect(page.locator('h1:has-text("My Family"), h2:has-text("My Family")')).toBeVisible();
});
