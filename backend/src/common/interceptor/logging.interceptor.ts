import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
  } from '@nestjs/common';
  import { Observable } from 'rxjs';
  import { tap } from 'rxjs/operators';
  import { Request } from 'express';

  @Injectable()
  export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(LoggingInterceptor.name);

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
                },
                error: () => {
                    const elapsed = Date.now() - startTime;
                    this.logger.warn(`[${traceId}] ${method} ${url} 에러 (${elapsed}ms)`);
                }
            })
        );
    }
}