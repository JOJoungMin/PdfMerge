'use client';

import { useState, useEffect } from 'react';

interface PerformanceLog {
  id: string;
  operationType: 'MERGE' | 'COMPRESS' | 'CONVERT_TO_IMAGE' | 'EDIT';
  fileCount: number;
  totalInputSizeInBytes: string; // BigInt from Prisma comes as string
  outputSizeInBytes: string | null; // BigInt from Prisma comes as string
  processingTimeInMs: number;
  createdAt: string; // Date from Prisma comes as string
  githubVersion?: string | null; // Add this line
}

export default function AdminPage() {
  const [logs, setLogs] = useState<PerformanceLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGithubVersion, setSelectedGithubVersion] = useState<string>('all'); // New state for filter
  const [githubVersions, setGithubVersions] = useState<string[]>([]); // New state for unique versions

  const handleRunPerformanceTest = async () => {
    try {
      // Optionally, you can show a loading state here
      const response = await fetch('/api/performance-test', {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      alert(`Performance test initiated: ${result.message}`);
      // Optionally, re-fetch logs after test initiation
      // fetchLogs();
    } catch (e: any) {
      alert(`Error initiating performance test: ${e.message}`);
    }
  };

  useEffect(() => {
    async function fetchLogs() {
      try {
        const response = await fetch('/api/admin/performance-logs');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: PerformanceLog[] = await response.json();
        setLogs(data);

        // Extract unique github versions
        const uniqueVersions = Array.from(new Set(data.map(log => log.githubVersion).filter(Boolean))) as string[];
        setGithubVersions(['all', ...uniqueVersions]); // Add 'all' option
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, []);

  // Filtered logs based on selectedGithubVersion
  const filteredLogs = selectedGithubVersion === 'all'
    ? logs
    : logs.filter(log => log.githubVersion === selectedGithubVersion);

  const formatBytes = (bytes: string | null) => {
    if (bytes === null) return 'N/A';
    const numBytes = BigInt(bytes);
    if (numBytes === BigInt(0)) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(Number(numBytes)) / Math.log(k));
    return parseFloat((Number(numBytes) / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">성능 대시보드</h1>

      <button
        onClick={handleRunPerformanceTest}
        className="mb-6 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors duration-200"
      >
        성능 테스트 실행
      </button>

      {/* New filter dropdown */}
      <div className="mb-4">
        <label htmlFor="githubVersionFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          GitHub 버전 필터:
        </label>
        <select
          id="githubVersionFilter"
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          value={selectedGithubVersion}
          onChange={(e) => setSelectedGithubVersion(e.target.value)}
        >
          {githubVersions.map(version => (
            <option key={version} value={version}>
              {version === 'all' ? '모든 버전' : version}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-center">로그를 불러오는 중...</p>}
      {error && <p className="text-center text-red-500">오류: {error}</p>}

      {!loading && !error && filteredLogs.length === 0 && (
        <p className="text-center">표시할 성능 로그가 없습니다.</p>
      )}

      {!loading && !error && filteredLogs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
            <thead className="bg-gray-200 dark:bg-gray-700">
              <tr>
                <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">ID</th>
                <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">작업 유형</th>
                <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">파일 개수</th>
                <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">입력 크기</th>
                <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">출력 크기</th>
                <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">처리 시간</th>
                <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">기록 시간</th>
                <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">GitHub 버전</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                  <td className="py-2 px-4 text-sm text-gray-800 dark:text-gray-200 truncate max-w-xs">{log.id}</td>
                  <td className="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{log.operationType}</td>
                  <td className="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{log.fileCount}</td>
                  <td className="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{formatBytes(log.totalInputSizeInBytes)}</td>
                  <td className="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{formatBytes(log.outputSizeInBytes)}</td>
                  <td className="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{formatTime(log.processingTimeInMs)}</td>
                  <td className="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{log.githubVersion || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}