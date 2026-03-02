'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '@/shared/api/config';
import { FileJson, RefreshCw, ArrowLeft, Filter } from 'lucide-react';

interface RequestLog {
  id: number;
  trace_id: string;
  method: string;
  url: string;
  status_code: number | null;
  elapsed_ms: number | null;
  level: string;
  error_message: string | null;
  created_at: string;
}

interface LogsResponse {
  data: RequestLog[];
  total: number;
  limit: number;
  offset: number;
}

type LevelFilter = 'all' | 'error' | 'success';
type StatusFilter = 'all' | '2xx' | '4xx' | '5xx';
type TimePreset = 'all' | '1h' | '24h' | '7d' | 'today';

function getQueryParams(preset: TimePreset): Record<string, string> {
  if (preset === 'all') return {};
  if (preset === '1h') return { hours: '1' };
  if (preset === '24h') return { hours: '24' };
  if (preset === '7d') return { hours: '168' }; // 7 * 24
  if (preset === 'today') {
    const to = new Date().toISOString().slice(0, 10);
    return { dateFrom: to, dateTo: to };
  }
  return {};
}

export default function AdminPage() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [level, setLevel] = useState<LevelFilter>('all');
  const [statusGroup, setStatusGroup] = useState<StatusFilter>('all');
  const [timePreset, setTimePreset] = useState<TimePreset>('all');
  const [urlSearch, setUrlSearch] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'elapsed_ms' | 'status_code'>('created_at');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    const timeParams = getQueryParams(timePreset);
    const params = new URLSearchParams();
    params.set('limit', '100');
    if (level !== 'all') params.set('level', level);
    if (statusGroup !== 'all') params.set('statusGroup', statusGroup);
    Object.entries(timeParams).forEach(([k, v]) => params.set(k, v));
    if (urlSearch.trim()) params.set('url', urlSearch.trim());
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/logs?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: LogsResponse = await res.json();
      setLogs(json.data);
      setTotal(json.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : '조회 실패');
    } finally {
      setLoading(false);
    }
  }, [level, statusGroup, timePreset, urlSearch, sortBy, sortOrder]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const formatDate = (s: string) => {
    try {
      const d = new Date(s);
      return d.toLocaleString('ko-KR');
    } catch {
      return s;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>돌아가기</span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FileJson className="h-7 w-7 text-blue-600" />
              관리자 - 요청 로그
            </h1>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="mb-6 rounded-xl bg-white dark:bg-gray-800 shadow-md p-4">
          <div className="flex items-center gap-2 mb-3 text-gray-700 dark:text-gray-300 font-medium">
            <Filter className="h-4 w-4" />
            필터 & 정렬
          </div>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">기간</label>
              <select
                value={timePreset}
                onChange={(e) => setTimePreset(e.target.value as TimePreset)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm"
              >
                <option value="all">전체</option>
                <option value="1h">최근 1시간</option>
                <option value="24h">최근 24시간</option>
                <option value="7d">최근 7일</option>
                <option value="today">오늘</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">레벨</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as LevelFilter)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm"
              >
                <option value="all">전체</option>
                <option value="error">에러만</option>
                <option value="success">성공만</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">상태코드</label>
              <select
                value={statusGroup}
                onChange={(e) => setStatusGroup(e.target.value as StatusFilter)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm"
              >
                <option value="all">전체</option>
                <option value="2xx">2xx</option>
                <option value="4xx">4xx</option>
                <option value="5xx">5xx</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">URL 검색</label>
              <input
                type="text"
                value={urlSearch}
                onChange={(e) => setUrlSearch(e.target.value)}
                placeholder="경로 포함 검색"
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm w-40"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">정렬</label>
              <div className="flex gap-1">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm"
                >
                  <option value="created_at">시간</option>
                  <option value="elapsed_ms">응답시간</option>
                  <option value="status_code">상태코드</option>
                </select>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
                  className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm"
                >
                  <option value="desc">내림차순</option>
                  <option value="asc">오름차순</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-gray-800 shadow-md overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">로딩 중...</div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              로그가 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      시간
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      trace_id
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      method
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      url
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      status
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      elapsed(ms)
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      level
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">
                      error
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-500 dark:text-gray-400 truncate max-w-[140px]">
                        {log.trace_id}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            log.method === 'POST'
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-gray-600 dark:text-gray-400'
                          }
                        >
                          {log.method}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                        {log.url}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            (log.status_code ?? 0) >= 400
                              ? 'text-red-600 dark:text-red-400 font-medium'
                              : 'text-green-600 dark:text-green-400'
                          }
                        >
                          {log.status_code ?? '-'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                        {log.elapsed_ms ?? '-'}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={
                            log.level === 'error'
                              ? 'text-red-600 dark:text-red-400 font-medium'
                              : 'text-gray-600 dark:text-gray-400'
                          }
                        >
                          {log.level}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-red-600 dark:text-red-400 text-xs truncate max-w-[180px]">
                        {log.error_message ?? '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {total > 0 && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400">
              총 {total}건
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
