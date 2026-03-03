import { test, expect } from '@playwright/test';
import path from 'path';

const SAMPLE_PDF = path.join(__dirname, 'fixtures', 'sample.pdf');
const SAMPLE_PNG = path.join(__dirname, 'fixtures', 'sample.png');

test.describe('각 페이지 다운로드 및 기능 확인', () => {
  test('병합: 파일 2개 업로드 → 병합 → 사이드바 → 다운로드 버튼 클릭', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');

    await page.goto('/merge');
    await expect(page.locator('h1')).toContainText('병합');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([SAMPLE_PDF, SAMPLE_PDF]);

    await expect(page.getByRole('button', { name: /병합하기/ })).toBeEnabled();
    await page.getByRole('button', { name: /병합하기/ }).click();

    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();
    await page.getByRole('button', { name: /다운로드/ }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/merged.*\.pdf/);
  });

  test('압축: 파일 업로드 → 압축 → 사이드바 → 다운로드 버튼 클릭', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');

    await page.goto('/compress');
    await expect(page.locator('h1')).toContainText('PDF 압축');

    await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);
    await page.getByRole('button', { name: /압축하기/ }).click();

    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();
    await page.getByRole('button', { name: /다운로드/ }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/compressed.*\.pdf/);
  });

  test('변환: 파일 업로드 → PNG 변환 → 사이드바 → 다운로드 버튼 클릭', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');

    await page.goto('/convert');
    await expect(page.locator('h1')).toContainText('PDF 변환');

    await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);
    await page.getByRole('button', { name: /변환하기/ }).click();

    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();
    await page.getByRole('button', { name: /다운로드/ }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/converted.*\.zip/);
  });

  test('회전: 파일 업로드 → 회전 → 사이드바 → 다운로드 버튼 클릭', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');

    await page.goto('/rotate');
    await expect(page.locator('h1')).toContainText('PDF 회전');

    await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);
    await page.getByRole('button', { name: /회전하기/ }).click();

    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();
    await page.getByRole('button', { name: /다운로드/ }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/rotated.*\.pdf/);
  });

  test('편집: 파일 업로드 → PDF 생성 → 사이드바 → 다운로드 버튼 클릭', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');

    await page.goto('/editor');
    await expect(page.locator('h1')).toContainText('PDF 분리');

    await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);
    await page.waitForTimeout(1500);

    await page.getByRole('button', { name: /PDF 생성하기/ }).click();

    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();
    await page.getByRole('button', { name: /다운로드/ }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/edited-document\.pdf/);
  });

  test('이미지 PDF 변환: 이미지 1장 업로드 → PDF로 만들기 → 사이드바 → 다운로드 버튼 클릭', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');

    await page.goto('/image-to-pdf');
    await expect(page.locator('h1')).toContainText('이미지 PDF 변환');

    await page.locator('input#file-upload').setInputFiles(SAMPLE_PNG);
    await page.getByRole('button', { name: /PDF로 만들기/ }).click();

    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();
    await page.getByRole('button', { name: /다운로드/ }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });
});
