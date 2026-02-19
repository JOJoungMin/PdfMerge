/**
 * API 기본 URL
 * - 빈 문자열: 동일 오리진 (Next.js API 또는 프록시)
 * - NestJS 백엔드: http://localhost:3001
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
