import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  Inject,
  HttpException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { DB_POOL } from '../../database/database.module';
import type { Pool } from 'mysql2/promise';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<Request>();
    const { method, url } = req;
    const traceId = (req as any).traceId ?? 'no-trace-id';
    const startTime = Date.now();

    this.logger.log(`[${traceId}] ${method} ${url} 요청 시작`);

    return next.handle().pipe(
      tap({
        next: () => {
          const elapsed = Date.now() - startTime;
          const res = httpContext.getResponse();
          const statusCode = res.statusCode;
          this.logger.log(`[${traceId}] ${method} ${url} ${statusCode} 완료 (${elapsed}ms)`);
          this.insertLog(traceId, method, url, statusCode, elapsed, 'success', null);
        },
        error: (err: unknown) => {
          const elapsed = Date.now() - startTime;
          const statusCode = err instanceof HttpException ? err.getStatus() : 500;
          const errorMessage = err instanceof Error ? err.message : String(err);
          this.logger.warn(`[${traceId}] ${method} ${url} 에러 (${elapsed}ms)`);
          this.insertLog(traceId, method, url, statusCode, elapsed, 'error', errorMessage);
        },
      }),
    );
  }

  private insertLog(
    traceId: string,
    method: string,
    url: string,
    statusCode: number,
    elapsedMs: number,
    level: string,
    errorMessage: string | null,
  ): void {
    this.pool
      .query(
        `INSERT INTO request_logs (trace_id, method, url, status_code, elapsed_ms, level, error_message)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [traceId, method, url, statusCode, elapsedMs, level, errorMessage],
      )
      .catch((e) => this.logger.error('request_logs INSERT 실패', e));
  }
}