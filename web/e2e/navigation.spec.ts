import { test, expect } from '@playwright/test';

test.describe('페이지 이동', () => {
  test('메인 → 병합 → 압축 → 변환 → 편집 → 메인 순서로 이동', async ({ page }) => {
    await page.goto('/');

    // 메인 페이지
    await expect(page.getByRole('heading', { name: 'PDF 유틸리티' })).toBeVisible();
    await expect(page.getByRole('link', { name: /PDF 병합/ })).toBeVisible();

    // 병합 페이지로
    await page.getByRole('link', { name: /PDF 병합/ }).first().click();
    await expect(page).toHaveURL('/merge');
    await expect(page.locator('h1')).toContainText('병합');

    // 압축 페이지로 (헤더 홈 로고 → 메인 → 압축)
    await page.getByRole('link', { name: 'PDF-Utils' }).first().click();
    await expect(page).toHaveURL('/');
    await page.getByRole('link', { name: /PDF 압축/ }).first().click();
    await expect(page).toHaveURL('/compress');
    await expect(page.locator('h1')).toContainText('PDF 압축');

    // 변환 페이지로
    await page.getByRole('link', { name: 'PDF-Utils' }).first().click();
    await expect(page).toHaveURL('/');
    await page.getByRole('link', { name: /PDF 변환/ }).first().click();
    await expect(page).toHaveURL('/convert');
    await expect(page.locator('h1')).toContainText('PDF 변환');

    // 편집 페이지로
    await page.getByRole('link', { name: 'PDF-Utils' }).first().click();
    await expect(page).toHaveURL('/');
    await page.getByRole('link', { name: /PDF 분리/ }).first().click();
    await expect(page).toHaveURL('/editor');
    await expect(page.locator('h1')).toContainText('PDF 편집기');

    // 메인으로 복귀
    await page.getByRole('link', { name: 'PDF-Utils' }).first().click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'PDF 유틸리티' })).toBeVisible();
  });
});
