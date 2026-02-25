import { test, expect } from '@playwright/test';
import path from 'path';

const SAMPLE_PDF = path.join(__dirname, 'fixtures', 'sample.pdf');

test.describe('다운로드 파일 유지 확인 (사이드바 전달)', () => {
  test('병합 다운로드 → 사이드바로 압축 이동 → 전달된 파일 확인', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');

    await page.goto('/merge');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([SAMPLE_PDF, SAMPLE_PDF]);
    await page.getByRole('button', { name: /병합하기/ }).click();
    await downloadPromise;

    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();
    await page.getByRole('button', { name: 'PDF 압축' }).click();

    await expect(page).toHaveURL('/compress');
    await expect(page.getByText(/merged/)).toBeVisible({ timeout: 5000 });
  });

  test('압축 다운로드 → 사이드바로 병합 이동 → 전달된 파일 확인', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');

    await page.goto('/compress');
    await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);
    await page.getByRole('button', { name: /압축 및 다운로드/ }).click();
    await downloadPromise;

    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();
    await page.getByRole('button', { name: 'PDF 병합' }).click();

    await expect(page).toHaveURL('/merge');
    await expect(page.getByText(/compressed/)).toBeVisible({ timeout: 5000 });
  });

  test('병합 → 압축 → 변환 순서로 전달하며 파일 유지 확인', async ({ page }) => {
    const d1 = page.waitForEvent('download');
    await page.goto('/merge');
    await page.locator('input[type="file"]').setInputFiles([SAMPLE_PDF, SAMPLE_PDF]);
    await page.getByRole('button', { name: /병합하기/ }).click();
    await d1;

    await page.getByRole('button', { name: 'PDF 압축' }).click();
    await expect(page).toHaveURL('/compress');
    await expect(page.getByText(/merged/)).toBeVisible({ timeout: 5000 });

    const d2 = page.waitForEvent('download');
    await page.getByRole('button', { name: /압축 및 다운로드/ }).click();
    await d2;

    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();
    await page.getByRole('button', { name: 'PDF 변환' }).click();
    await expect(page).toHaveURL('/convert');
    await expect(page.getByText(/compressed/)).toBeVisible({ timeout: 5000 });
  });
});
