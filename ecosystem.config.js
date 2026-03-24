module.exports = {
    apps: [
        {
            name: 'eoffice-api',
            cwd: './apps/api',
            script: 'dist/src/main.js',
            instances: 2,               // Avoid PostgreSQL Too Many Clients error
            exec_mode: 'cluster',
            autorestart: true,
            watch: false,
            max_memory_restart: '512M',
            env: {
                NODE_ENV: 'production',
                PORT: 3001,
            },
            env_development: {
                NODE_ENV: 'development',
                PORT: 3001,
            },
            // Logging
            error_file: './logs/api-error.log',
            out_file: './logs/api-out.log',
            merge_logs: true,
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            // Graceful shutdown
            kill_timeout: 5000,
            listen_timeout: 10000,
            // Health check
            min_uptime: '10s',
            max_restarts: 10,
        },
        {
            name: 'eoffice-web',
            cwd: './apps/web',
            script: 'node_modules/.bin/next',
            args: 'start -p 3000',
            instances: 1,               // Next.js handles its own clustering
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 3000,
            },
            // Logging
            error_file: './logs/web-error.log',
            out_file: './logs/web-out.log',
            merge_logs: true,
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            // Graceful shutdown
            kill_timeout: 5000,
        },
    ],
};
