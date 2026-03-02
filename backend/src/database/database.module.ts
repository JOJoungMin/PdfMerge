import { Module, Global } from '@nestjs/common';
import * as mysql from 'mysql2/promise';

export const DB_POOL = 'DB_POOL';

@Global()
@Module({
  providers: [
    {
      provide: DB_POOL,
      useFactory: () => {
        const host = (process.env.DB_HOST || 'localhost').trim();
        const isRds = host.includes('rds.amazonaws.com');
        return mysql.createPool({
          host,
          port: parseInt((process.env.DB_PORT || '3306').trim(), 10),
          user: (process.env.DB_USERNAME || 'root').trim(),
          password: (process.env.DB_PASSWORD || '').trim(),
          database: (process.env.DB_DATABASE || 'mergepdf').trim(),
          waitForConnections: true,
          connectionLimit: 10,
          ...(isRds && { ssl: { rejectUnauthorized: false } }),
        });
      },
    },
  ],
  exports: [DB_POOL],
})
export class DatabaseModule {}