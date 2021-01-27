declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: 'dev' | 'test' | 'production';

            REDIS_URL: string;
            REDIS_HOST: string;
            REDIS_PORT: number;
            REDIS_PASSWORD: string;
        }
    }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {};
