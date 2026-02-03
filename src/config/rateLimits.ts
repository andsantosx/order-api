import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authentication endpoints (login, register)
 * Prevents brute force attacks
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per windowMs
    message: {
        error: 'Muitas tentativas de login. Tente novamente em 15 minutos.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Skip successful requests (optional - only count failed attempts)
    skipSuccessfulRequests: false,
});

/**
 * Rate limiter for order creation
 * Prevents order spam
 */
export const orderLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 orders per hour
    message: {
        error: 'Limite de pedidos atingido. Tente novamente em 1 hora.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter for payment processing
 * Prevents payment spam/abuse
 */
export const paymentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 payment attempts per 15 minutes
    message: {
        error: 'Muitas tentativas de pagamento. Tente novamente em 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * General API rate limiter
 * Applies to all routes as a baseline protection
 */
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes
    message: {
        error: 'Muitas requisições. Tente novamente em alguns minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for admin users (optional)
        return req.user?.isAdmin === true;
    }
});
