'use client';

import { useEffect, useState, useCallback } from 'react';
import { API_BASE_URL } from '@/shared/api/config';
import { FileJson, RefreshCw, Filter, Activity } from 'lucide-react';

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

interface LoadTestResult {
  id: number;
  run_name: string;
  target_url: string;
  users: number;
  rps_or_duration: string | null;
  total_requests: number;
  failure_count: number;
  avg_latency_ms: number | null;
  p95_latency_ms: number | null;
  p99_latency_ms: number | null;
  notes: string | null;
  file_size_bytes: number | null;
  created_at: string;
}

interface LoadTestResponse {
  data: LoadTestResult[];
  total: number;
  limit: number;
  offset: number;
}

type LevelFilter = 'all' | 'error' | 'success';
type StatusFilter = 'all' | '2xx' | '4xx' | '5xx';
type TimePreset = 'all' | '1h' | '24h' | '7d' | 'today';
type AdminTab = 'logs' | 'loadtest';
type LoadTestEnvFilter = 'all' | 'local' | 'deployed';
type LoadTestSortBy = 'created_at' | 'avg_latency_ms' | 'total_requests' | 'failure_count';
type LatencyUnit = 'ms' | 's';

function getQueryParams(preset: TimePreset): Record<string, string> {
  if (preset === 'all') return {};
  if (preset === '1h') return { hours: '1' };
  if (preset === '24h') return { hours: '24' };
  if (preset === '7d') return { hours: '168' };
  if (preset === 'today') {
    const to = new Date().toISOString().slice(0, 10);
    return { dateFrom: to, dateTo: to };
  }
  return {};
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('logs');
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

  const [loadTestResults, setLoadTestResults] = useState<LoadTestResult[]>([]);
  const [loadTestTotal, setLoadTestTotal] = useState(0);
  const [loadTestLoading, setLoadTestLoading] = useState(false);
  const [loadTestError, setLoadTestError] = useState<string | null>(null);
  const [loadTestEnvFilter, setLoadTestEnvFilter] = useState<LoadTestEnvFilter>('all');
  const [loadTestTimePreset, setLoadTestTimePreset] = useState<TimePreset>('all');
  const [loadTestSortBy, setLoadTestSortBy] = useState<LoadTestSortBy>('created_at');
  const [loadTestSortOrder, setLoadTestSortOrder] = useState<'desc' | 'asc'>('desc');
  const [latencyUnit, setLatencyUnit] = useState<LatencyUnit>('ms');

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

  const fetchLoadTestResults = useCallback(async () => {
    setLoadTestLoading(true);
    setLoadTestError(null);
    const timeParams = getQueryParams(loadTestTimePreset);
    const params = new URLSearchParams();
    params.set('limit', '100');
    params.set('sortBy', loadTestSortBy);
    params.set('sortOrder', loadTestSortOrder);
    Object.entries(timeParams).forEach(([k, v]) => params.set(k, v));
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/load-test-results?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: LoadTestResponse = await res.json();
      setLoadTestResults(json.data);
      setLoadTestTotal(json.total);
    } catch (e) {
      setLoadTestError(e instanceof Error ? e.message : '부하테스트 결과 조회 실패');
    } finally {
      setLoadTestLoading(false);
    }
  }, [loadTestTimePreset, loadTestSortBy, loadTestSortOrder]);

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab, fetchLogs]);

  useEffect(() => {
    if (activeTab === 'loadtest') fetchLoadTestResults();
  }, [activeTab, fetchLoadTestResults]);

  const formatDate = (s: string) => {
    try {
      const d = new Date(s);
      return d.toLocaleString('ko-KR');
    } catch {
      return s;
    }
  };

  const formatLatency = (ms: number | null): string => {
    if (ms == null) return '-';
    if (latencyUnit === 's') return `${(ms / 1000).toFixed(2)}초`;
    return Number(ms).toFixed(2);
  };

  const formatFileSize = (bytes: number | null): string => {
    if (bytes == null) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isLocalTarget = (row: LoadTestResult) => {
    const u = (row.target_url || '').toLowerCase();
    return u.includes('localhost') || u.includes('127.0.0.1');
  };
  const filteredLoadTestResults = loadTestResults.filter((row) => {
    if (loadTestEnvFilter === 'local') return isLocalTarget(row);
    if (loadTestEnvFilter === 'deployed') return !isLocalTarget(row);
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FileJson className="h-7 w-7 text-blue-600" />
            관리자
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'logs'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              요청 로그
            </button>
            <button
              onClick={() => setActiveTab('loadtest')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'loadtest'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
              }`}
            >
              <Activity className="h-4 w-4" />
              부하테스트 결과
            </button>
            {activeTab === 'logs' && (
              <button
                onClick={fetchLogs}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                새로고침
              </button>
            )}
            {activeTab === 'loadtest' && (
              <button
                onClick={fetchLoadTestResults}
                disabled={loadTestLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loadTestLoading ? 'animate-spin' : ''}`} />
                새로고침
              </button>
            )}
          </div>
        </div>

        {activeTab === 'logs' && (
          <>
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
                <div className="p-12 text-center text-gray-500">로그가 없습니다.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">시간</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">trace_id</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">method</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">url</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">status</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">elapsed(ms)</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">level</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr key={log.id} className="border-b border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(log.created_at)}</td>
                          <td className="px-4 py-2 font-mono text-xs text-gray-500 dark:text-gray-400 truncate max-w-[140px]">{log.trace_id}</td>
                          <td className="px-4 py-2">
                            <span className={log.method === 'POST' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}>{log.method}</span>
                          </td>
                          <td className="px-4 py-2 text-gray-700 dark:text-gray-300 truncate max-w-[200px]">{log.url}</td>
                          <td className="px-4 py-2">
                            <span className={(log.status_code ?? 0) >= 400 ? 'text-red-600 dark:text-red-400 font-medium' : 'text-green-600 dark:text-green-400'}>
                              {log.status_code ?? '-'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{log.elapsed_ms ?? '-'}</td>
                          <td className="px-4 py-2">
                            <span className={log.level === 'error' ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-600 dark:text-gray-400'}>{log.level}</span>
                          </td>
                          <td className="px-4 py-2 text-red-600 dark:text-red-400 text-xs truncate max-w-[180px]">{log.error_message ?? '-'}</td>
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
          </>
        )}

        {activeTab === 'loadtest' && (
          <>
            {loadTestError && (
              <div className="mb-4 p-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                {loadTestError}
              </div>
            )}
            <div className="mb-6 rounded-xl bg-white dark:bg-gray-800 shadow-md p-4">
              <div className="flex items-center gap-2 mb-3 text-gray-700 dark:text-gray-300 font-medium">
                <Filter className="h-4 w-4" />
                필터 & 정렬
              </div>
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">대상 환경</label>
                  <div className="flex gap-1">
                    {(['all', 'local', 'deployed'] as const).map((env) => (
                      <button
                        key={env}
                        type="button"
                        onClick={() => setLoadTestEnvFilter(env)}
                        className={`px-3 py-2 rounded-lg text-sm ${
                          loadTestEnvFilter === env
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                        }`}
                      >
                        {env === 'all' ? '전체' : env === 'local' ? '로컬' : '배포'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">기간</label>
                  <select
                    value={loadTestTimePreset}
                    onChange={(e) => setLoadTestTimePreset(e.target.value as TimePreset)}
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
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">정렬</label>
                  <div className="flex gap-1">
                    <select
                      value={loadTestSortBy}
                      onChange={(e) => setLoadTestSortBy(e.target.value as LoadTestSortBy)}
                      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm"
                    >
                      <option value="created_at">실행 시각</option>
                      <option value="avg_latency_ms">평균 지연</option>
                      <option value="total_requests">총 요청</option>
                      <option value="failure_count">실패 수</option>
                    </select>
                    <select
                      value={loadTestSortOrder}
                      onChange={(e) => setLoadTestSortOrder(e.target.value as 'desc' | 'asc')}
                      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm"
                    >
                      <option value="desc">내림차순</option>
                      <option value="asc">오름차순</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">지연 단위</label>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setLatencyUnit('ms')}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        latencyUnit === 'ms' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      ms
                    </button>
                    <button
                      type="button"
                      onClick={() => setLatencyUnit('s')}
                      className={`px-3 py-2 rounded-lg text-sm ${
                        latencyUnit === 's' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      초
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-xl bg-white dark:bg-gray-800 shadow-md overflow-hidden">
              {loadTestLoading ? (
                <div className="p-12 text-center text-gray-500">로딩 중...</div>
              ) : filteredLoadTestResults.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  부하테스트 결과가 없습니다.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">실행 시각</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">실행명</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">대상 URL</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">유저</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">총 요청</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">실패</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">파일 크기</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">평균({latencyUnit === 's' ? '초' : 'ms'})</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">P95({latencyUnit === 's' ? '초' : 'ms'})</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">P99({latencyUnit === 's' ? '초' : 'ms'})</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">메모</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLoadTestResults.map((row) => (
                        <tr key={row.id} className="border-b border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(row.created_at)}</td>
                          <td className="px-4 py-2 text-gray-800 dark:text-gray-200">{row.run_name}</td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400 truncate max-w-[180px]">{row.target_url}</td>
                          <td className="px-4 py-2">{row.users}</td>
                          <td className="px-4 py-2">{row.total_requests}</td>
                          <td className="px-4 py-2">{row.failure_count}</td>
                          <td className="px-4 py-2 text-gray-600 dark:text-gray-400">{formatFileSize(row.file_size_bytes != null ? Number(row.file_size_bytes) : null)}</td>
                          <td className="px-4 py-2">{formatLatency(row.avg_latency_ms != null ? Number(row.avg_latency_ms) : null)}</td>
                          <td className="px-4 py-2">{formatLatency(row.p95_latency_ms != null ? Number(row.p95_latency_ms) : null)}</td>
                          <td className="px-4 py-2">{formatLatency(row.p99_latency_ms != null ? Number(row.p99_latency_ms) : null)}</td>
                          <td className="px-4 py-2 text-gray-500 dark:text-gray-400 text-xs truncate max-w-[120px]">{row.notes ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {(loadTestTotal > 0 || filteredLoadTestResults.length !== loadTestResults.length) && (
                <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400">
                  {loadTestEnvFilter === 'all' ? `총 ${loadTestTotal}건` : `표시 ${filteredLoadTestResults.length}건 / 전체 ${loadTestTotal}건`}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
