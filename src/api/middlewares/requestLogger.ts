import { Request, Response, NextFunction } from 'express';
import { log } from '../../config/logger';

/**
 * Middleware to log all incoming HTTP requests
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Log after response is sent
    res.on('finish', () => {
        const duration = Date.now() - start;
        const { method, originalUrl, ip } = req;
        const { statusCode } = res;

        log.http(method, originalUrl, statusCode, duration, {
            ip,
            userAgent: req.get('user-agent'),
            userId: req.user?.userId,
        });
    });

    next();
};
