import { test, expect } from '@playwright/test';
import path from 'path';

const SAMPLE_PDF = path.join(__dirname, 'fixtures', 'sample.pdf');

test.describe('다운로드 파일 유지 확인 (사이드바 전달)', () => {
  test('병합 → 사이드바로 압축 이동 → 전달된 파일 확인', async ({ page }) => {
    await page.goto('/merge');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([SAMPLE_PDF, SAMPLE_PDF]);
    await page.getByRole('button', { name: /병합하기/ }).click();

    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();
    await page.getByRole('button', { name: 'PDF 압축' }).click();

    await expect(page).toHaveURL('/compress');
    await expect(page.getByText(/merged/)).toBeVisible({ timeout: 5000 });
  });

  test('압축 → 사이드바로 병합 이동 → 전달된 파일 확인', async ({ page }) => {
    await page.goto('/compress');
    await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);
    await page.getByRole('button', { name: /압축하기/ }).click();

    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();
    await page.getByRole('button', { name: 'PDF 병합' }).click();

    await expect(page).toHaveURL('/merge');
    await expect(page.getByText(/compressed/)).toBeVisible({ timeout: 5000 });
  });

  test('병합 → 압축 → 변환 순서로 전달하며 파일 유지 확인', async ({ page }) => {
    await page.goto('/merge');
    await page.locator('input[type="file"]').setInputFiles([SAMPLE_PDF, SAMPLE_PDF]);
    await page.getByRole('button', { name: /병합하기/ }).click();

    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();
    await page.getByRole('button', { name: 'PDF 압축' }).click();
    await expect(page).toHaveURL('/compress');
    await expect(page.getByText(/merged/)).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: /압축하기/ }).click();
    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();
    await page.getByRole('button', { name: 'PDF 변환' }).click();
    await expect(page).toHaveURL('/convert');
    await expect(page.getByText(/compressed/)).toBeVisible({ timeout: 5000 });
  });

  test('압축 → 사이드바로 변환 이동 → 전달된 파일 확인', async ({ page }) => {
    await page.goto('/compress');
    await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);
    await page.getByRole('button', { name: /압축하기/ }).click();

    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();
    await page.getByRole('button', { name: 'PDF 변환' }).click();

    await expect(page).toHaveURL('/convert');
    await expect(page.getByText(/compressed/)).toBeVisible({ timeout: 5000 });
  });

  test('회전 → 사이드바로 편집 이동 → 전달된 파일 확인', async ({ page }) => {
    await page.goto('/rotate');
    await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);
    await page.getByRole('button', { name: /회전하기/ }).click();

    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();
    await page.getByRole('button', { name: 'PDF 편집' }).click();

    await expect(page).toHaveURL('/editor');
    await expect(page.getByText(/rotated/)).toBeVisible({ timeout: 5000 });
  });

  test('편집 → 사이드바로 회전 이동 → 전달된 파일 확인', async ({ page }) => {
    await page.goto('/editor');
    await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /PDF 생성하기/ }).click();

    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();
    await page.getByRole('button', { name: 'PDF 회전' }).click();

    await expect(page).toHaveURL('/rotate');
    await expect(page.getByText(/edited-document/)).toBeVisible({ timeout: 5000 });
  });

  test('회전 → 사이드바로 변환 이동 → 전달된 파일 확인', async ({ page }) => {
    await page.goto('/rotate');
    await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);
    await page.getByRole('button', { name: /회전하기/ }).click();

    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();
    await page.getByRole('button', { name: 'PDF 변환' }).click();

    await expect(page).toHaveURL('/convert');
    await expect(page.getByText(/rotated/)).toBeVisible({ timeout: 5000 });
  });
});
