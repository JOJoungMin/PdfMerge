'use client';

import { signIn } from 'next-auth/react';
import { FcGoogle } from 'react-icons/fc';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md dark:bg-gray-800">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">로그인</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            소셜 계정으로 간편하게 로그인하세요.
          </p>
        </div>
        <button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="w-full inline-flex justify-center items-center px-6 py-3 border border-gray-300 dark:border-gray-600 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white dark:bg-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <FcGoogle className="mr-3 h-6 w-6" />
          Google 계정으로 로그인
        </button>
      </div>
    </div>
  );
}
