import { test, expect } from '@playwright/test';

test.describe('MUR Dashboard Smoke Tests', () => {
  test('loads dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.getByText('Total Patterns')).toBeVisible();
  });

  test('navigates to patterns', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="#/patterns"]');
    await expect(page.locator('h1')).toContainText('Patterns');
  });

  test('navigates to workflows', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="#/workflows"]');
    await expect(page.locator('h1')).toContainText('Workflows');
  });

  test('navigates to graph', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="#/graph"]');
    await expect(page.locator('h1')).toContainText('Pattern Graph');
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('navigates to settings', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="#/settings"]');
    await expect(page.locator('h1')).toContainText('Settings');
  });

  test('Cmd+K opens command palette', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+k');
    // Command palette has a distinct placeholder
    await expect(page.getByPlaceholder('Search patterns, workflows, pages')).toBeVisible({ timeout: 2000 });
    await page.keyboard.press('Escape');
    await expect(page.getByPlaceholder('Search patterns, workflows, pages')).not.toBeVisible();
  });

  test('search bar works', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('header input[type="text"]');
    await searchInput.fill('typescript');
    await searchInput.press('Enter');
    await expect(page.locator('h1')).toContainText('Search Results');
  });

  test('demo mode shows mock patterns', async ({ page }) => {
    await page.goto('/#/patterns');
    // Wait for dataStore to load and render
    await expect(page.locator('h1')).toContainText('Patterns');
    // Check that at least one pattern card renders (description text from mock data)
    await expect(page.getByText('discriminated unions').first()).toBeVisible({ timeout: 5000 });
  });

  test('pattern detail page loads', async ({ page }) => {
    await page.goto('/#/patterns/error-handling-typescript');
    await expect(page.getByText('error-handling-typescript').first()).toBeVisible();
  });
});
