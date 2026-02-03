import winston from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * Custom log format for readability
 */
const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Add stack trace for errors
    if (stack) {
        msg += `\n${stack}`;
    }

    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
        msg += `\n${JSON.stringify(metadata, null, 2)}`;
    }

    return msg;
});

/**
 * Winston logger instance
 */
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(
        errors({ stack: true }), // Log error stack traces
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
    transports: [
        // Error logs - only errors
        new winston.transports.File({
            filename: path.join('logs', 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Combined logs - all levels
        new winston.transports.File({
            filename: path.join('logs', 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
    ],
});

/**
 * Add console transport in development
 */
if (process.env.NODE_ENV !== 'production') {
    logger.add(
        new winston.transports.Console({
            format: combine(
                colorize(),
                timestamp({ format: 'HH:mm:ss' }),
                logFormat
            ),
        })
    );
}

/**
 * Helper methods for common logging patterns
 */
export const log = {
    error: (message: string, meta?: any) => {
        logger.error(message, meta);
    },

    warn: (message: string, meta?: any) => {
        logger.warn(message, meta);
    },

    info: (message: string, meta?: any) => {
        logger.info(message, meta);
    },

    debug: (message: string, meta?: any) => {
        logger.debug(message, meta);
    },

    /**
     * Log authentication events
     */
    auth: (event: string, userId?: string, meta?: any) => {
        logger.info(`AUTH: ${event}`, { userId, ...meta });
    },

    /**
     * Log order events
     */
    order: (event: string, orderId: string, meta?: any) => {
        logger.info(`ORDER: ${event}`, { orderId, ...meta });
    },

    /**
     * Log payment events
     */
    payment: (event: string, paymentId?: string, meta?: any) => {
        logger.info(`PAYMENT: ${event}`, { paymentId, ...meta });
    },

    /**
     * Log HTTP requests (for middleware)
     */
    http: (method: string, url: string, statusCode: number, duration: number, meta?: any) => {
        logger.info(`HTTP ${method} ${url} ${statusCode} - ${duration}ms`, meta);
    },
};

export default logger;
