'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Interfaces
interface PerformanceLog {
  id: string;
  operationType: 'MERGE' | 'COMPRESS' | 'CONVERT_TO_IMAGE' | 'EDIT';
  fileCount: number;
  totalInputSizeInBytes: string;
  outputSizeInBytes: string | null;
  processingTimeInMs: number;
  createdAt: string;
  githubVersion?: string | null;
  path?: string | null;
}

interface FrontendVital {
  id: string;
  name: string;
  value: number;
  path: string;
  createdAt: string;
  githubVersion?: string | null;
}

interface UserExperienceLog {
  id: string;
  metricName: string;
  durationInMs: number;
  path: string;
  fileCount: number | null;
  totalFileSizeInBytes: string | null;
  createdAt: string;
  githubVersion?: string | null;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // States
  const [serverLogs, setServerLogs] = useState<PerformanceLog[]>([]);
  const [frontendVitals, setFrontendVitals] = useState<FrontendVital[]>([]);
  const [uxLogs, setUxLogs] = useState<UserExperienceLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGithubVersion, setSelectedGithubVersion] = useState<string>('all');
  const [githubVersions, setGithubVersions] = useState<string[]>([]);

  // Authorization Effect
  useEffect(() => {
    if (status === 'loading') return; // 세션 로딩 중에는 대기
    if (status === 'unauthenticated' || session?.user?.role !== 'ADMIN') {
      router.push('/'); // 인증되지 않았거나 ADMIN이 아니면 메인 페이지로 리디렉션
    }
  }, [session, status, router]);

  // Fetching logic
  useEffect(() => {
    // ADMIN만 데이터를 fetch 하도록 보장
    if (status === 'authenticated' && session?.user?.role === 'ADMIN') {
      async function fetchAllData() {
        setLoading(true);
        try {
          const [serverRes, frontendRes, uxRes] = await Promise.all([
            fetch('/api/admin/performance-logs'),
            fetch('/api/frontend-vitals'),
            fetch('/api/admin/user-experience-logs'),
          ]);

          if (!serverRes.ok || !frontendRes.ok || !uxRes.ok) {
            throw new Error(`HTTP error! Server: ${serverRes.status}, Frontend: ${frontendRes.status}, UX: ${uxRes.status}`);
          }

          const serverData: PerformanceLog[] = await serverRes.json();
          const frontendData: FrontendVital[] = await frontendRes.json();
          const uxData: UserExperienceLog[] = await uxRes.json();

          setServerLogs(serverData);
          setFrontendVitals(frontendData);
          setUxLogs(uxData);

          const serverVersions = serverData.map(log => log.githubVersion).filter(Boolean) as string[];
          const frontendVersions = frontendData.map(vital => vital.githubVersion).filter(Boolean) as string[];
          const uxVersions = uxData.map(log => log.githubVersion).filter(Boolean) as string[];
          const uniqueVersions = Array.from(new Set([...serverVersions, ...frontendVersions, ...uxVersions]));
          setGithubVersions(['all', ...uniqueVersions]);

        } catch (e: any) {
          setError(e.message);
        } finally {
          setLoading(false);
        }
      }

      fetchAllData();
    }
  }, [session, status]); // session과 status에 의존

  // Filtering
  const filteredServerLogs = selectedGithubVersion === 'all'
    ? serverLogs
    : serverLogs.filter(log => log.githubVersion === selectedGithubVersion);

  const filteredFrontendVitals = selectedGithubVersion === 'all'
    ? frontendVitals
    : frontendVitals.filter(vital => vital.githubVersion === selectedGithubVersion);

  const filteredUxLogs = selectedGithubVersion === 'all'
    ? uxLogs
    : uxLogs.filter(log => log.githubVersion === selectedGithubVersion);


  // Formatters
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

  const formatVitalValue = (name: string, value: number) => {
    if (['LCP', 'INP'].includes(name)) {
      return `${(value / 1000).toFixed(2)} s`;
    }
    if (name === 'CLS') {
      return value.toFixed(4);
    }
    return `${value.toFixed(2)} ms`;
  };

  // Render
  // 접근 권한이 없거나 로딩 중일 때 보여줄 화면
  if (status === 'loading' || status === 'unauthenticated' || session?.user?.role !== 'ADMIN') {
    return (
      <div className="container mx-auto p-4 text-center">
        <p>접근 권한을 확인 중이거나, 권한이 없습니다...</p>
      </div>
    );
  }

  // 관리자에게만 보여줄 실제 페이지 내용
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">종합 성능 대시보드</h1>

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

      {loading && <p className="text-center">데이터를 불러오는 중...</p>}
      {error && <p className="text-center text-red-500">오류: {error}</p>}

      {/* User Experience Logs */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">사용자 경험(UX) 성능 로그</h2>
        {!loading && !error && filteredUxLogs.length === 0 ? (
          <p className="text-center">표시할 UX 로그가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
              <thead className="bg-gray-200 dark:bg-gray-700">
                <tr>
                  <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">측정 항목</th>
                  <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">소요 시간</th>
                  <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">경로</th>
                  <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">파일 개수</th>
                  <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">총 파일 크기</th>
                  <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">기록 시간</th>
                  <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">GitHub 버전</th>
                </tr>
              </thead>
              <tbody>
                {filteredUxLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <td className="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{log.metricName}</td>
                    <td className="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{formatTime(log.durationInMs)}</td>
                    <td className="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{log.path}</td>
                    <td className="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{log.fileCount ?? 'N/A'}</td>
                    <td className="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{formatBytes(log.totalFileSizeInBytes)}</td>
                    <td className="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="py-2 px-4 text-sm">
                      {log.githubVersion && log.githubVersion !== 'local' ? (
                        <a href={`https://github.com/JOJoungMin/PdfMerge/commit/${log.githubVersion}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          {log.githubVersion.substring(0, 7)}
                        </a>
                      ) : (
                        <span className="text-gray-800 dark:text-gray-200">{log.githubVersion || 'N/A'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Server Performance Logs */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">서버 성능 로그</h2>
        {!loading && !error && filteredServerLogs.length === 0 ? (
          <p className="text-center">표시할 서버 로그가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
              <thead className="bg-gray-200 dark:bg-gray-700">
                <tr>
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
                {filteredServerLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <td className="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{log.operationType}</td>
                    <td className="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{log.fileCount}</td>
                    <td className="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{formatBytes(log.totalInputSizeInBytes)}</td>
                    <td className="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{formatBytes(log.outputSizeInBytes)}</td>
                    <td className="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{formatTime(log.processingTimeInMs)}</td>
                    <td className="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="py-2 px-4 text-sm">
                      {log.githubVersion && log.githubVersion !== 'local' ? (
                        <a href={`https://github.com/JOJoungMin/PdfMerge/commit/${log.githubVersion}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          {log.githubVersion.substring(0, 7)}
                        </a>
                      ) : (
                        <span className="text-gray-800 dark:text-gray-200">{log.githubVersion || 'N/A'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Frontend Web Vitals */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">프론트엔드 성능 지표 (Core Web Vitals)</h2>
        {!loading && !error && filteredFrontendVitals.length === 0 ? (
          <p className="text-center">표시할 프론트엔드 지표가 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
              <thead className="bg-gray-200 dark:bg-gray-700">
                <tr>
                  <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">경로</th>
                  <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">지표 이름</th>
                  <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">값</th>
                  <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">기록 시간</th>
                  <th className="py-2 px-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-200">GitHub 버전</th>
                </tr>
              </thead>
              <tbody>
                {filteredFrontendVitals.map((vital) => (
                  <tr key={vital.id} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <td className="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{vital.path}</td>
                    <td className="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{vital.name}</td>
                    <td className="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{formatVitalValue(vital.name, vital.value)}</td>
                    <td className="py-2 px-4 text-sm text-gray-800 dark:text-gray-200">{new Date(vital.createdAt).toLocaleString()}</td>
                    <td className="py-2 px-4 text-sm">
                      {vital.githubVersion && vital.githubVersion !== 'local' ? (
                        <a href={`https://github.com/JOJoungMin/PdfMerge/commit/${vital.githubVersion}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          {vital.githubVersion.substring(0, 7)}
                        </a>
                      ) : (
                        <span className="text-gray-800 dark:text-gray-200">{vital.githubVersion || 'N/A'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
