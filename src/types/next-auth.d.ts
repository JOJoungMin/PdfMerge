import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * `session` 콜백의 결과로 반환되는 타입입니다.
   * 우리는 여기에 `id`, `downloadCount`, `lastDownloadDate`를 추가합니다.
   */
  interface Session {
    user: {
      id: string;
      downloadCount: number;
      lastDownloadDate: Date | null;
    } & DefaultSession["user"]; // name, email, image 등 기본 속성 포함
  }

  /**
   * 데이터베이스의 User 모델과 동기화되는 타입입니다.
   */
  interface User extends DefaultUser {
    downloadCount: number;
    lastDownloadDate: Date | null;
  }
}

declare module "next-auth/jwt" {
  /**
   * JWT 콜백의 `token` 파라미터에 대한 타입입니다.
   */
  interface JWT {
    id: string;
    downloadCount: number;
    lastDownloadDate: Date | null;
  }
}
