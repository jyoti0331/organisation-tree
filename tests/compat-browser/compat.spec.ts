import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
const results = JSON.parse(readFileSync('docs/compatibility.json', 'utf8'));
const outcomes: Record<number, Record<string, string>> = {};
for (const major of [15, 16, 17, 18, 19, 20, 21, 22])
  for (const mode of ['standalone', 'module', ...(major >= 18 ? ['zoneless'] : [])]) {
    test(`Angular ${major} ${mode}`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(
        `/angular-${major}/index.html?${mode === 'zoneless' ? 'zoneless=1' : `mode=${mode}`}`,
      );
      await expect(page.locator('body')).not.toHaveAttribute('data-error');
      await expect(page.getByRole('treeitem')).toHaveCount(3);
      await page.getByRole('treeitem').first().focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('treeitem')).toHaveCount(7);
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('treeitem')).toHaveCount(11);
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      const checkbox = page.getByRole('checkbox', {
        name: 'Project membership for Jamie Andersen 2',
      });
      await expect(checkbox).not.toBeChecked();
      await page.keyboard.press('Space');
      await expect(checkbox).toBeChecked();
      await expect(checkbox).toBeEnabled();
      await page.getByRole('searchbox').fill('Jamie');
      await expect(page.getByRole('checkbox')).toHaveCount(12);
      await expect(page.getByRole('checkbox').first()).toBeChecked();
      await page.getByRole('checkbox').first().click();
      await expect(page.getByRole('checkbox').first()).not.toBeChecked();
      await page.getByRole('searchbox').fill('');
      await expect(page.getByRole('treeitem')).toHaveCount(11);
      await expect(checkbox).not.toBeChecked();
      expect(errors).toEqual([]);
    });
  }
test.afterEach(async ({}, info) => {
  const match = info.title.match(/Angular (\d+) (\w+)/)!;
  (outcomes[+match[1]] ??= {})[match[2]] = info.status ?? 'unknown';
});
test.afterAll(() => {
  for (const result of results) {
    const modes = outcomes[result.major];
    if (modes) {
      result.browserModes = { ...result.browserModes, ...modes };
      result.browser =
        Object.keys(result.browserModes).length === (result.major >= 18 ? 3 : 2) &&
        Object.values(result.browserModes).every((status) => status === 'passed')
          ? 'passed'
          : 'failed';
    }
  }
  writeFileSync('docs/compatibility.json', JSON.stringify(results, null, 2) + '\n');
});
