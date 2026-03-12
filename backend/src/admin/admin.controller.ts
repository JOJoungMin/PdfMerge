import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Inject,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { DB_POOL } from '../database/database.module';
import type { Pool } from 'mysql2/promise';

export interface LoadTestResultRow {
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

export interface CreateLoadTestResultDto {
  run_name: string;
  target_url: string;
  users: number;
  rps_or_duration?: string;
  total_requests: number;
  failure_count: number;
  avg_latency_ms?: number;
  p95_latency_ms?: number;
  p99_latency_ms?: number;
  notes?: string;
  file_size_bytes?: number;
}

@Controller('admin')
export class AdminController {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  @Get('load-test-results')
  async getLoadTestResults(
    @Query('limit') limit = '50',
    @Query('offset') offset = '0',
    @Query('sortBy') sortBy = 'created_at',
    @Query('sortOrder') sortOrder = 'desc',
    @Query('hours') hours?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const offsetNum = Math.max(parseInt(offset, 10) || 0, 0);
    const validSortBy = ['created_at', 'avg_latency_ms', 'total_requests', 'failure_count'].includes(sortBy)
      ? sortBy
      : 'created_at';
    const validOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    const hoursNum = parseInt(hours ?? '', 10);
    if (hoursNum > 0 && hoursNum <= 720) {
      conditions.push('created_at >= NOW() - INTERVAL ? HOUR');
      params.push(hoursNum);
    } else {
      if (dateFrom) {
        conditions.push('created_at >= ?');
        params.push(`${dateFrom} 00:00:00`);
      }
      if (dateTo) {
        conditions.push('created_at <= ?');
        params.push(`${dateTo} 23:59:59`);
      }
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    try {
      const [rows] = await this.pool.query(
        `SELECT id, run_name, target_url, users, rps_or_duration, total_requests, failure_count,
                avg_latency_ms, p95_latency_ms, p99_latency_ms, notes, file_size_bytes, created_at
         FROM load_test_results
         ${whereClause}
         ORDER BY ${validSortBy} ${validOrder}
         LIMIT ? OFFSET ?`,
        [...params, limitNum, offsetNum],
      );
      const [countRows] = await this.pool.query(
        `SELECT COUNT(*) as total FROM load_test_results ${whereClause}`,
        params,
      );
      const total = (countRows as { total: number }[])[0]?.total ?? 0;
      return { data: rows as LoadTestResultRow[], total: Number(total), limit: limitNum, offset: offsetNum };
    } catch (e) {
      const err = e as Error & { code?: string; sqlMessage?: string };
      const msg = [err.sqlMessage, err.message, err.code].filter(Boolean).join(' | ') || String(e);
      throw new InternalServerErrorException(msg);
    }
  }

  @Post('load-test-results')
  async createLoadTestResult(@Body() dto: CreateLoadTestResultDto) {
    if (!dto.run_name?.trim() || !dto.target_url?.trim()) {
      throw new BadRequestException('run_name, target_url 필수');
    }
    const total = Number(dto.total_requests) || 0;
    const failure = Number(dto.failure_count) ?? 0;
    const users = Number(dto.users) ?? 0;
    try {
      const [result] = await this.pool.query(
        `INSERT INTO load_test_results
         (run_name, target_url, users, rps_or_duration, total_requests, failure_count, avg_latency_ms, p95_latency_ms, p99_latency_ms, notes, file_size_bytes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dto.run_name.trim(),
          dto.target_url.trim(),
          users,
          dto.rps_or_duration?.trim() || null,
          total,
          failure,
          dto.avg_latency_ms ?? null,
          dto.p95_latency_ms ?? null,
          dto.p99_latency_ms ?? null,
          dto.notes?.trim() || null,
          dto.file_size_bytes ?? null,
        ],
      );
      const insertResult = result as { insertId: number };
      return { id: insertResult.insertId, message: '저장됨' };
    } catch (e) {
      const err = e as Error & { code?: string; sqlMessage?: string };
      const msg = [err.sqlMessage, err.message, err.code].filter(Boolean).join(' | ') || String(e);
      throw new InternalServerErrorException(msg);
    }
  }

  @Get('logs')
  async getLogs(
    @Query('limit') limit = '50',
    @Query('offset') offset = '0',
    @Query('level') level?: string,
    @Query('statusGroup') statusGroup?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('hours') hours?: string,
    @Query('url') urlSearch?: string,
    @Query('sortBy') sortBy = 'created_at',
    @Query('sortOrder') sortOrder = 'desc',
  ) {
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const offsetNum = Math.max(parseInt(offset, 10) || 0, 0);

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (level && (level === 'error' || level === 'success')) {
      conditions.push('level = ?');
      params.push(level);
    }
    if (statusGroup === '2xx') {
      conditions.push('status_code >= 200 AND status_code < 300');
    } else if (statusGroup === '4xx') {
      conditions.push('status_code >= 400 AND status_code < 500');
    } else if (statusGroup === '5xx') {
      conditions.push('status_code >= 500');
    }
    const hoursNum = parseInt(hours ?? '', 10);
    if (hoursNum > 0 && hoursNum <= 720) {
      conditions.push('created_at >= NOW() - INTERVAL ? HOUR');
      params.push(hoursNum);
    } else {
      if (dateFrom) {
        conditions.push('created_at >= ?');
        params.push(`${dateFrom} 00:00:00`);
      }
      if (dateTo) {
        conditions.push('created_at <= ?');
        params.push(`${dateTo} 23:59:59`);
      }
    }
    if (urlSearch && urlSearch.trim()) {
      conditions.push('url LIKE ?');
      params.push(`%${urlSearch.trim()}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const validSortBy = ['created_at', 'elapsed_ms', 'status_code', 'level'].includes(sortBy) ? sortBy : 'created_at';
    const validOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

    try {
      const [rows] = await this.pool.query(
        `SELECT id, trace_id, method, url, status_code, elapsed_ms, level, error_message, created_at
         FROM request_logs
         ${whereClause}
         ORDER BY ${validSortBy} ${validOrder}
         LIMIT ? OFFSET ?`,
        [...params, limitNum, offsetNum],
      );

      const [countRows] = await this.pool.query(
        `SELECT COUNT(*) as total FROM request_logs ${whereClause}`,
        params,
      );
      const total = (countRows as { total: number }[])[0]?.total ?? 0;

      return {
        data: rows,
        total: Number(total),
        limit: limitNum,
        offset: offsetNum,
      };
    } catch (e) {
      const err = e as Error & { code?: string; sqlMessage?: string; errno?: number };
      const msg = [err.sqlMessage, err.message, err.code, err.errno]
        .filter(Boolean)
        .join(' | ') || JSON.stringify(err);
      throw new InternalServerErrorException(msg);
    }
  }
}
