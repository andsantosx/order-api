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
    error: (message: string, meta?: Record<string, unknown>) => {
        logger.error(message, meta);
    },

    warn: (message: string, meta?: Record<string, unknown>) => {
        logger.warn(message, meta);
    },

    info: (message: string, meta?: Record<string, unknown>) => {
        logger.info(message, meta);
    },

    debug: (message: string, meta?: Record<string, unknown>) => {
        logger.debug(message, meta);
    },

    // Domain-specific logging helpers
    // These provide a consistent way to log common events

    auth: (event: string, userId?: string, meta?: Record<string, unknown>) => {
        logger.info(event, {
            userId,
            category: 'auth',
            ...meta
        });
    },

    order: (event: string, orderId: string, meta?: Record<string, unknown>) => {
        logger.info(event, {
            orderId,
            category: 'order',
            ...meta
        });
    },

    payment: (event: string, paymentId?: string, meta?: Record<string, unknown>) => {
        logger.info(event, {
            paymentId,
            category: 'payment',
            ...meta
        });
    },

    http: (method: string, url: string, statusCode: number, duration: number, meta?: Record<string, unknown>) => {
        logger.info('HTTP Request', {
            method,
            url,
            statusCode,
            duration,
            category: 'http',
            ...meta
        });
    }
};

export default logger;
