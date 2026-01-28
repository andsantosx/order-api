import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

interface JwtPayload {
    userId: string;
    email: string;
    isAdmin: boolean;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export const authMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        throw new AppError('No token provided', 401);
    }

    const [, token] = authHeader.split(' ');

    if (!token) {
        throw new AppError('Malformed token', 401);
    }

    try {
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET || 'default_secret'
        ) as JwtPayload;

        req.user = decoded;
        next();
    } catch (error) {
        throw new AppError('Invalid token', 401);
    }
};
