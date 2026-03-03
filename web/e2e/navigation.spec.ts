import { test, expect } from '@playwright/test';

const MAIN_CARDS: { label: string; name: string | RegExp; path: string; h1Text: string | RegExp }[] = [
  { label: 'PDF 병합', name: /PDF 병합/, path: '/merge', h1Text: /병합/ },
  { label: 'PDF 분리', name: /PDF 분리/, path: '/editor', h1Text: /PDF 분리/ },
  { label: 'PDF 압축', name: /PDF 압축/, path: '/compress', h1Text: /PDF 압축/ },
  { label: 'PDF 변환', name: /PDF 변환/, path: '/convert', h1Text: /PDF 변환/ },
  { label: 'PDF 회전', name: /PDF 회전/, path: '/rotate', h1Text: /PDF 회전/ },
  { label: '이미지 PDF 변환', name: /이미지 PDF 변환/, path: '/image-to-pdf', h1Text: /이미지 PDF 변환/ },
  { label: '페이지 번호 넣기', name: /페이지 번호 넣기/, path: '/page-number', h1Text: /페이지 번호 넣기/ },
];

test.describe('페이지 이동', () => {
  for (const { label, name, path, h1Text } of MAIN_CARDS) {
    test(`메인에서 "${label}" 카드 클릭 시 ${path}로 이동`, async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'PDF 유틸리티' })).toBeVisible();
      await page.getByRole('link', { name }).first().click();
      await expect(page).toHaveURL(path);
      await expect(page.locator('h1')).toContainText(h1Text);
    });
  }

  test('메인 → 병합 → 압축 → 변환 → 편집 → 회전 → 메인 순서로 이동', async ({ page }) => {
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
    await expect(page.locator('h1')).toContainText('PDF 분리');

    // 회전 페이지로
    await page.getByRole('link', { name: 'PDF-Utils' }).first().click();
    await expect(page).toHaveURL('/');
    await page.getByRole('link', { name: /PDF 회전/ }).first().click();
    await expect(page).toHaveURL('/rotate');
    await expect(page.locator('h1')).toContainText('PDF 회전');

    // 이미지 PDF 변환 페이지로
    await page.getByRole('link', { name: 'PDF-Utils' }).first().click();
    await expect(page).toHaveURL('/');
    await page.getByRole('link', { name: /이미지 PDF 변환/ }).first().click();
    await expect(page).toHaveURL('/image-to-pdf');
    await expect(page.locator('h1')).toContainText('이미지 PDF 변환');

    // 페이지 번호 넣기 페이지로
    await page.getByRole('link', { name: 'PDF-Utils' }).first().click();
    await expect(page).toHaveURL('/');
    await page.getByRole('link', { name: /페이지 번호 넣기/ }).first().click();
    await expect(page).toHaveURL('/page-number');
    await expect(page.locator('h1')).toContainText('페이지 번호 넣기');

    // 메인으로 복귀
    await page.getByRole('link', { name: 'PDF-Utils' }).first().click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'PDF 유틸리티' })).toBeVisible();
  });
});
