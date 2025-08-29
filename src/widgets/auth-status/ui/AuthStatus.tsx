'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';

export function AuthStatus() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div className="w-24 h-10 bg-gray-200 rounded-lg animate-pulse"></div>;
  }

  if (session) {
    return (
      <div className="flex items-center gap-4">
        {session.user?.image && (
          <Image
            src={session.user.image}
            alt={session.user.name || 'User avatar'}
            width={40}
            height={40}
            className="rounded-full"
          />
        )}
        <span className="hidden sm:inline text-sm font-medium text-gray-700 dark:text-gray-200">{session.user?.name}</span>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <Link href="/login">
     <button
  className="px-4 py-2 text-sm font-semibold text-black bg-yellow-300 rounded-lg hover:bg-yellow-400"
>
  로그인
</button>


    </Link>
  );
}
