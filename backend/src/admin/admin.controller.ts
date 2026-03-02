import { Controller, Get, Query, Inject, InternalServerErrorException } from '@nestjs/common';
import { DB_POOL } from '../database/database.module';
import type { Pool } from 'mysql2/promise';

@Controller('admin')
export class AdminController {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

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
