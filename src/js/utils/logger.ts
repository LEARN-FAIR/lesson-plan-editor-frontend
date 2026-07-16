/**
 * Custom logger utility that only logs in development mode
 * Use this instead of console.log throughout the application
 */

const isDevelopment = import.meta.env.MODE === 'development';

export const logger = {
    /**
     * Log general information (only in development)
     */
    log: (...args: any[]) => {
        if (isDevelopment) {
            console.log(...args);
        }
    },

    /**
     * Log informational messages (only in development)
     */
    info: (...args: any[]) => {
        if (isDevelopment) {
            console.info(...args);
        }
    },

    /**
     * Log warnings (only in development)
     */
    warn: (...args: any[]) => {
        if (isDevelopment) {
            console.warn(...args);
        }
    },

    /**
     * Log errors (always logged, even in production)
     */
    error: (...args: any[]) => {
        console.error(...args);
    },

    /**
     * Log debug information (only in development)
     */
    debug: (...args: any[]) => {
        if (isDevelopment) {
            console.debug(...args);
        }
    },

    /**
     * Group logs together (only in development)
     */
    group: (label: string) => {
        if (isDevelopment) {
            console.group(label);
        }
    },

    /**
     * End a log group (only in development)
     */
    groupEnd: () => {
        if (isDevelopment) {
            console.groupEnd();
        }
    },

    /**
     * Log a table (only in development)
     */
    table: (data: any) => {
        if (isDevelopment) {
            console.table(data);
        }
    }
};

export default logger;
