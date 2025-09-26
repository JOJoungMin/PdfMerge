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
      try {
        console.log('==> Session callback started. User from DB:', user);

        if (session?.user && user?.id) {
          session.user.id = user.id;

          // Defensively assign properties
          session.user.role = user.role ?? 'USER'; // Default to USER if undefined
          session.user.downloadCount = user.downloadCount ?? 0; // Default to 0
          session.user.lastDownloadDate = user.lastDownloadDate ?? new Date(); // Default to now

          console.log('==> Successfully composed session:', session);
        } else {
          console.log('==> Session or user object is missing.');
        }

        return session;
      } catch (error) {
        console.error('!!!!!!!!!! CRITICAL ERROR IN SESSION CALLBACK !!!!!!!!!!!', error);
        // Return the original session to prevent a total crash, but log the error.
        return session;
      }
    },
  },
}
