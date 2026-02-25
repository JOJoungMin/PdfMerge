import { test, expect } from '@playwright/test';
import path from 'path';

const SAMPLE_PDF = path.join(__dirname, 'fixtures', 'sample.pdf');

test.describe('각 페이지 다운로드 및 기능 확인', () => {
  test('병합: 파일 2개 업로드 → 병합 → 다운로드 후 사이드바 표시', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');

    await page.goto('/merge');
    await expect(page.locator('h1')).toContainText('병합');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([SAMPLE_PDF, SAMPLE_PDF]);

    await expect(page.getByRole('button', { name: /병합하기/ })).toBeEnabled();
    await page.getByRole('button', { name: /병합하기/ }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/merged.*\.pdf/);

    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();
  });

  test('압축: 파일 업로드 → 압축 → 다운로드 후 사이드바 표시', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');

    await page.goto('/compress');
    await expect(page.locator('h1')).toContainText('PDF 압축');

    await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);
    await page.getByRole('button', { name: /압축 및 다운로드/ }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/compressed.*\.pdf/);

    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();
  });

  test('변환: 파일 업로드 → PNG 변환 → 다운로드 후 사이드바 표시', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');

    await page.goto('/convert');
    await expect(page.locator('h1')).toContainText('PDF 변환');

    await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);
    await page.getByRole('button', { name: /변환 및 다운로드/ }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/converted.*\.zip/);

    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();
  });

  test('편집: 파일 업로드 → PDF 생성 → 다운로드 후 사이드바 표시', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');

    await page.goto('/editor');
    await expect(page.locator('h1')).toContainText('PDF 편집기');

    await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: /PDF 생성 및 다운로드/ }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/edited-document\.pdf/);

    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();
  });
});
