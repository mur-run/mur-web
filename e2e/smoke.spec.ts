import { test, expect } from '@playwright/test';

test.describe('MUR Dashboard Smoke Tests', () => {
  test('loads dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Total Patterns')).toBeVisible();
  });

  test('navigates to patterns', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="#/patterns"]');
    await expect(page.locator('h1:has-text("Patterns")')).toBeVisible();
  });

  test('navigates to workflows', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="#/workflows"]');
    await expect(page.locator('h1:has-text("Workflows")')).toBeVisible();
  });

  test('navigates to graph', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="#/graph"]');
    await expect(page.locator('h1:has-text("Pattern Graph")')).toBeVisible();
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('navigates to settings', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="#/settings"]');
    await expect(page.locator('h1:has-text("Settings")')).toBeVisible();
    await expect(page.locator('text=Data Source')).toBeVisible();
  });

  test('Cmd+K opens command palette', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Meta+k');
    await expect(page.locator('input[placeholder*="Search patterns"]')).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('search bar works', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('header input[type="text"]');
    await searchInput.fill('typescript');
    await searchInput.press('Enter');
    await expect(page.locator('text=Search Results')).toBeVisible();
  });

  test('demo mode shows mock data', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Demo')).toBeVisible();
    await page.click('a[href="#/patterns"]');
    // Should have mock patterns
    await expect(page.locator('text=error-handling-typescript')).toBeVisible();
  });

  test('pattern detail page loads', async ({ page }) => {
    await page.goto('/#/patterns/error-handling-typescript');
    await expect(page.locator('text=error-handling-typescript')).toBeVisible();
  });
});
