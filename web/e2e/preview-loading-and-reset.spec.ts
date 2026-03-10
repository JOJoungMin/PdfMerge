import { test, expect } from '@playwright/test';
import path from 'path';

const SAMPLE_PDF = path.join(__dirname, 'fixtures', 'sample.pdf');

const PDF_PAGES: { path: string; menuName: string | RegExp; actionButtonName: string | RegExp; label: string }[] = [
  { path: '/editor', menuName: /PDF 분리/, actionButtonName: /PDF 생성하기/, label: '분리' },
  { path: '/compress', menuName: /PDF 압축/, actionButtonName: /압축하기/, label: '압축' },
  { path: '/rotate', menuName: /PDF 회전/, actionButtonName: /회전하기/, label: '회전' },
  { path: '/redact', menuName: /PDF 블라인드/, actionButtonName: /블라인드 적용/, label: '블라인드' },
  { path: '/page-number', menuName: /페이지 번호 넣기/, actionButtonName: /페이지 번호 추가/, label: '페이지 번호' },
];

test.describe('미리보기 로딩 및 페이지 이탈 시 상태 초기화', () => {
  test('분리: 파일 올리면 바로 기능 레이아웃(사이드바+메인) 표시 후 미리보기 그리드 노출', async ({ page }) => {
    await page.goto('/editor');
    await expect(page.getByRole('heading', { name: /PDF 분리/ }).first()).toBeVisible();
    await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);

    await expect(page.getByRole('button', { name: /PDF 생성하기/ })).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('button', { name: /파일 추가/ })).toBeVisible();

    await expect(page.getByRole('main').locator('img').first()).toBeVisible({ timeout: 15000 });
  });

  for (const { path: pagePath, menuName, actionButtonName, label } of PDF_PAGES) {
    test(`[${label}] 홈 갔다 오면 빈 업로드 화면`, async ({ page }) => {
      await page.goto(pagePath);
      await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);
      await expect(page.getByRole('button', { name: actionButtonName })).toBeVisible({ timeout: 5000 });

      await page.getByRole('link', { name: 'PDF-Utils' }).first().click();
      await expect(page).toHaveURL('/');

      await page.getByRole('link', { name: menuName }).first().click();
      await expect(page).toHaveURL(pagePath);
      await expect(page.getByText('파일 선택').or(page.getByText('드래그')).first()).toBeVisible();
      await expect(page.getByRole('button', { name: actionButtonName })).not.toBeVisible();
    });
  }

  for (const { path: pagePath, label } of PDF_PAGES) {
    test(`[${label}] 파일 올린 뒤 미리보기 이미지 노출`, async ({ page }) => {
      await page.goto(pagePath);
      await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);

      await expect(page.getByRole('main').locator('img').first()).toBeVisible({ timeout: 15000 });
    });
  }

  test('전달 사이드바: "더 살펴보기" 클릭 시 추가 버튼 노출 및 토글 버튼이 맨 아래에 있음', async ({ page }) => {
    await page.goto('/compress');
    await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);
    await page.getByRole('button', { name: /압축하기/ }).click();
    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();

    await page.getByRole('button', { name: '더 살펴보기' }).click();
    await expect(page.getByRole('button', { name: 'PDF 블라인드', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '접기' })).toBeVisible();
  });
});
