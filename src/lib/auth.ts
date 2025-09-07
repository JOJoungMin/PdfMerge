import { Adapter } from "next-auth/adapters";
import NextAuth, { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    // 추가적으로 다른 소셜 로그인(네이버, 카카오 등)을 여기에 추가할 수 있습니다.
  ],
  // 여기에 세션 전략, 콜백 등 추가적인 옵션을 설정할 수 있습니다.
  callbacks: {
    async session({ session, user }) {
      // session.user에 user.id와 다운로드 관련 정보를 추가합니다.
      if (session.user) {
        session.user.id = user.id;
        session.user.downloadCount = user.downloadCount;
        session.user.lastDownloadDate = user.lastDownloadDate;
      }
      return session;
    },
  },
}
