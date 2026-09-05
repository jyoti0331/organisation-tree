import { test, expect } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('treeitem')).toHaveCount(3);
});
async function expand(page: any) {
  const first = page.getByRole('treeitem').first();
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('treeitem')).toHaveCount(7);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('treeitem')).toHaveCount(37);
}
test('one tree tab stop, keyboard navigation and confirmed membership', async ({ page }) => {
  await expect(page.locator('[role=treeitem][tabindex="0"]')).toHaveCount(1);
  await expand(page);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  const checkbox = page.getByRole('checkbox', { name: 'Project membership for Jamie Andersen 2' });
  await expect(checkbox).not.toBeChecked();
  await page.keyboard.press('Space');
  await expect(checkbox).toBeDisabled();
  await expect(checkbox).not.toBeChecked();
  await expect(checkbox).toBeChecked();
  await expect(checkbox).toBeEnabled();
  await page.keyboard.press('End');
  await expect(page.getByRole('treeitem').last()).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.getByRole('treeitem').first()).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('treeitem')).toHaveCount(3);
  await expect(page.getByRole('treeitem').first()).toBeFocused();
});
test('chain is informational and branch adds remaining then removes', async ({ page }) => {
  await expect(page.locator('ot-organisation-picker').getByRole('checkbox').first()).toBeDisabled();
  await page.getByRole('treeitem').first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('treeitem')).toHaveCount(7);
  const branch = page.getByRole('checkbox', {
    name: 'Project membership for 1030 IT',
    exact: true,
  });
  await expect(branch).toHaveJSProperty('indeterminate', true);
  await branch.click();
  await expect(branch).toBeChecked();
  await expect(branch).toBeEnabled();
  await branch.click();
  await expect(branch).not.toBeChecked();
});
test('search hides ancestor checkboxes and preserves expanded browsing rows', async ({ page }) => {
  await expand(page);
  const ids = await page
    .getByRole('treeitem')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-node-id')));
  await page.getByRole('searchbox').fill('Jamie');
  await expect(page.locator('ot-organisation-picker').getByRole('checkbox')).toHaveCount(60);
  await expect(page.locator('ot-organisation-picker .count')).toHaveCount(0);
  await page.getByRole('searchbox').fill('');
  await expect(page.getByRole('treeitem')).toHaveCount(37);
  expect(
    await page
      .getByRole('treeitem')
      .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-node-id'))),
  ).toEqual(ids);
});
test('failure and timeout release controls and show recovery', async ({ page }) => {
  await expand(page);
  const checkbox = page.getByRole('checkbox', { name: 'Project membership for Jamie Andersen 2' });
  await page.getByRole('button', { name: 'Fail next request' }).click();
  await checkbox.click();
  await expect(page.getByText('Simulated backend failure.', { exact: false })).toBeVisible();
  await expect(checkbox).not.toBeChecked();
  await expect(checkbox).toBeEnabled();
  await expect(page.getByText('Refreshing membership…')).not.toBeVisible();
  await page.getByRole('button', { name: 'Timeout next request' }).click();
  await checkbox.click();
  await expect(page.getByText('Request timed out.', { exact: false })).toBeVisible();
  await expect(checkbox).toBeEnabled();
  await expect(checkbox).toBeChecked();
});
test('500 search results retain DOM identity during membership changes', async ({ page }) => {
  await page.getByRole('button', { name: 'Load 600 people' }).click();
  await expect(page.getByRole('treeitem')).toHaveCount(3);
  await page.getByRole('searchbox').fill('a');
  await expect(page.locator('ot-organisation-picker').getByRole('checkbox')).toHaveCount(500);
  await expect(page.getByText('Result limit reached; refine your search.')).toBeVisible();
  const ids = await page
    .getByRole('treeitem')
    .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-node-id')));
  await page.locator('ot-organisation-picker').getByRole('checkbox').nth(1).click();
  await expect(page.locator('ot-organisation-picker').getByRole('checkbox').nth(1)).toBeChecked();
  await expect(page.getByText('Refreshing membership…')).not.toBeVisible();
  expect(
    await page
      .getByRole('treeitem')
      .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-node-id'))),
  ).toEqual(ids);
  await page.screenshot({ path: 'dist/demo-desktop.png', fullPage: false });
});
test('mouse selection retains row focus and narrow layouts fit the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expand(page);
  const checkbox = page.getByRole('checkbox', { name: 'Project membership for Jamie Andersen 2' });
  await checkbox.click();
  await expect(checkbox.locator('xpath=ancestor::*[@role="treeitem"]')).toBeFocused();
  await expect(checkbox).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'dist/demo-mobile.png', fullPage: true });
});
