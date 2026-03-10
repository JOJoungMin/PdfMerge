import { test, expect } from '@playwright/test';
import path from 'path';

const SAMPLE_PDF = path.join(__dirname, 'fixtures', 'sample.pdf');

test.describe('버튼 및 UI 동작', () => {
  test('압축: 파일 업로드 후 좌측 상단 호버 시 "파일 교체하기" 팝오버 표시', async ({ page }) => {
    await page.goto('/compress');
    await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);
    await expect(page.locator('h1')).toContainText('PDF 압축');
    await expect(page.getByRole('main').locator('img').first()).toBeVisible({ timeout: 15000 });

    await page.getByRole('main').locator('div.absolute.top-4.left-4').hover();
    await expect(page.getByRole('button', { name: '파일 교체하기' })).toBeVisible();
  });

  test('압축: 파일 교체하기 클릭 시 파일 선택 후 같은 페이지 유지', async ({ page }) => {
    await page.goto('/compress');
    await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);
    await expect(page).toHaveURL('/compress');
    await expect(page.getByRole('main').locator('img').first()).toBeVisible({ timeout: 15000 });

    await page.getByRole('main').locator('div.absolute.top-4.left-4').hover();
    await page.getByRole('button', { name: '파일 교체하기' }).click();
    await page.locator('input[type="file"]').setInputFiles(SAMPLE_PDF);
    await expect(page).toHaveURL('/compress');
    await expect(page.locator('h1')).toContainText('PDF 압축');
  });

  test('회전: 파일 업로드 후 각도 버튼(90°, 180°, 270°, 360°) 표시', async ({ page }) => {
    await page.goto('/rotate');
    await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);
    await page.waitForTimeout(500);

    await expect(page.getByRole('button', { name: '90°' })).toBeVisible();
    await expect(page.getByRole('button', { name: '180°' })).toBeVisible();
    await expect(page.getByRole('button', { name: '270°' })).toBeVisible();
    await expect(page.getByRole('button', { name: '360°' })).toBeVisible();
  });

  test('회전: 파일 업로드 후 "파일 변경" 버튼 표시', async ({ page }) => {
    await page.goto('/rotate');
    await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);
    await expect(page.getByRole('button', { name: '파일 변경' })).toBeVisible();
  });

  test('페이지 번호: 파일 업로드 후 위치·여백 옵션 버튼 표시', async ({ page }) => {
    await page.goto('/page-number');
    await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);
    await page.waitForTimeout(500);

    await expect(page.getByRole('button', { name: '상단 좌측' })).toBeVisible();
    await expect(page.getByRole('button', { name: '하단 중앙' })).toBeVisible();
    await expect(page.getByRole('button', { name: '좁게' })).toBeVisible();
    await expect(page.getByRole('button', { name: '보통' })).toBeVisible();
  });

  test('전달 사이드바: 결과 후 X 버튼으로 닫기', async ({ page }) => {
    await page.goto('/compress');
    await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);
    await page.getByRole('button', { name: /압축하기/ }).click();
    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();

    // 헤더 행(제목 + X 버튼만 있는 div)에서 닫기 버튼만 클릭
    const headerRow = page.getByRole('heading', { name: '다른 기능 사용하기' }).locator('..');
    await headerRow.getByRole('button').click();

    // 사이드바 루트가 pointer-events: none 으로 비활성화되었는지 확인
    const panel = page
      .locator('div')
      .filter({ has: page.getByRole('heading', { name: '다른 기능 사용하기' }) })
      .first();
    await expect(panel).toHaveAttribute('style', /pointer-events:\s*none/);
  });

  test('전달 사이드바: 결과 후 다운로드 버튼 표시', async ({ page }) => {
    await page.goto('/compress');
    await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);
    await page.getByRole('button', { name: /압축하기/ }).click();
    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();
    await expect(page.getByRole('button', { name: /다운로드/ })).toBeVisible();
  });

  test('전달 사이드바: 완료 카드에 "완료" 문구 및 다운로드 버튼 표시', async ({ page }) => {
    await page.goto('/compress');
    await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);
    await page.getByRole('button', { name: /압축하기/ }).click();
    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();
    await expect(page.getByText('완료', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /다운로드/ })).toBeVisible();
  });

  test('전달 사이드바: "더 살펴보기" 클릭 시 PDF 편집 등 추가 버튼 표시', async ({ page }) => {
    await page.goto('/compress');
    await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);
    await page.getByRole('button', { name: /압축하기/ }).click();
    await expect(page.getByRole('heading', { name: '다른 기능 사용하기' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'PDF 편집' })).not.toBeVisible();
    await page.getByRole('button', { name: '더 살펴보기' }).click();
    await expect(page.getByRole('button', { name: 'PDF 편집' })).toBeVisible();
  });

  const TRANSFER_BUTTONS: { name: string; path: string; inMoreMenu: boolean }[] = [
    { name: 'PDF 병합', path: '/merge', inMoreMenu: false },
    // 현재 페이지(/compress)와 동일하여 사이드바 상단에는 노출되지 않으므로 E2E 대상에서 제외
    // { name: 'PDF 압축', path: '/compress', inMoreMenu: false },
    { name: 'PDF 변환', path: '/convert', inMoreMenu: false },
    { name: 'PDF 편집', path: '/editor', inMoreMenu: true },
    { name: 'PDF 회전', path: '/rotate', inMoreMenu: true },
    { name: '이미지 PDF 변환', path: '/image-to-pdf', inMoreMenu: true },
    { name: '페이지 번호 넣기', path: '/page-number', inMoreMenu: true },
    { name: 'PDF 블라인드', path: '/redact', inMoreMenu: true },
  ];

  for (const { name, path: targetPath, inMoreMenu } of TRANSFER_BUTTONS) {
    test(`전달 사이드바: "${name}" 버튼 클릭 시 ${targetPath}로 이동`, async ({ page }) => {
      await page.goto('/compress');
      await page.locator('input#file-upload').setInputFiles(SAMPLE_PDF);
      await page.getByRole('button', { name: /압축하기/ }).click();
      const panel = page
        .locator('div')
        .filter({ has: page.getByRole('heading', { name: '다른 기능 사용하기' }) })
        .first();
      await expect(panel).toBeVisible();

      if (inMoreMenu) {
        await panel.getByRole('button', { name: '더 살펴보기' }).click();
        // 더 살펴보기 펼침 후 맨 아래 버튼(예: PDF 블라인드)이 뷰포트 밖에 있을 수 있으므로 스크롤 후 클릭
        const btn = panel.getByRole('button', { name, exact: true });
        await btn.scrollIntoViewIfNeeded();
        await btn.click();
      } else {
        await panel.getByRole('button', { name, exact: true }).click();
      }
      await expect(page).toHaveURL(targetPath);
    });
  }
});
