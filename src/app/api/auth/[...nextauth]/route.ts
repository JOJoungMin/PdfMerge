import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@/generated/prisma"

const prisma = new PrismaClient()

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
    // 추가적으로 다른 소셜 로그인(네이버, 카카오 등)을 여기에 추가할 수 있습니다.
  ],
  // 여기에 세션 전략, 콜백 등 추가적인 옵션을 설정할 수 있습니다.
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
