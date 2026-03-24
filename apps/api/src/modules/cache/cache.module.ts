import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        if (process.env.REDIS_URL) {
          try {
            const store = await redisStore({
              url: process.env.REDIS_URL,
              ttl: 60 * 1000,
              // Add a ping check or connection timeout if supported by the store utility
            });
            return { store };
          } catch (error) {
            console.error('Redis Connection Error:', error.message);
            console.warn('Falling back to memory cache for development.');
          }
        }

        // Memory cache for development or when Redis is down
        return {
          ttl: 60 * 1000,
          max: 100,
        };
      },
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}
