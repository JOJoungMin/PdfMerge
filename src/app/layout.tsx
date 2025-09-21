import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AuthStatus } from "@/widgets/auth-status/ui/AuthStatus";
import Link from "next/link";
import { FileJson } from "lucide-react";
import TransferSidebar from "@/widgets/transfer-sidebar/ui/TransferSidebar"; // Import TransferSidebar

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PDF 유틸리티",
  description: "PDF 병합, 분리, 압축, 변환을 위한 올인원 툴",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.className} bg-gray-100 dark:bg-gray-900`}>
        <Providers>
          <div className="flex flex-col min-h-screen">
            <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
              <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                  <div className="flex-shrink-0">
                    <Link href="/" className="flex items-center gap-2 text-xl font-bold text-gray-800 dark:text-white">
                      <FileJson className="h-7 w-7 text-blue-600" />
                      <span>PDF-Utils</span>
                    </Link>
                  </div>
                  <div className="flex items-center gap-4">
                    <Link href="/admin" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200">
                      Admin
                    </Link>
                    <AuthStatus />
                  </div>
                </div>
              </nav>
            </header>
            <main className="flex-grow">
              {children}
            </main>
          </div>
          <TransferSidebar /> {/* Render TransferSidebar here */}
        </Providers>
      </body>
    </html>
  );
}
