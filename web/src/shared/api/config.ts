/**
 * API 기본 URL
 * - 설정 없이 로컬 개발(npm run dev) 시: http://localhost:3001 사용
 * - 배포 시: Vercel 등에서 NEXT_PUBLIC_API_URL 설정
 */
const explicit = process.env.NEXT_PUBLIC_API_URL;
export const API_BASE_URL =
  explicit !== undefined && explicit !== ''
    ? explicit
    : process.env.NODE_ENV === 'development'
      ? 'http://localhost:3001'
      : '';
