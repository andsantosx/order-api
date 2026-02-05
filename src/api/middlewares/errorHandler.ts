import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { QueryFailedError } from 'typeorm';
import { log } from '../../config/logger';
import { PostgresQueryError } from '../../types/system';
import { isProduction } from '../../config/env';

/**
 * Classe customizada para erros da aplicação
 * Permite definir status code e mensagem de erro específicos
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode = 400, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        // Mantém o stack trace correto
        Object.setPrototypeOf(this, AppError.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Middleware global de tratamento de erros
 * Captura todos os erros lançados na aplicação e retorna respostas adequadas
 * 
 * Características:
 * - Trata AppError com status code específico
 * - Trata erros de validação do Zod
 * - Trata erros de banco de dados (TypeORM)
 * - Oculta stack traces em produção
 * - Loga todos os erros com contexto estruturado
 */
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // 1. AppError - Erros operacionais esperados
    if (err instanceof AppError) {
        log.warn('Erro operacional', {
            message: err.message,
            statusCode: err.statusCode,
            path: req.path,
            method: req.method,
            userId: req.user?.userId
        });

        return res.status(err.statusCode).json({
            status: 'error',
            message: err.message,
        });
    }

    // 2. Zod Validation Errors
    if (err instanceof ZodError) {
        log.warn('Erro de validação Zod', {
            errors: err.issues,
            path: req.path,
            method: req.method
        });

        return res.status(400).json({
            status: 'error',
            message: 'Erro de validação',
            errors: err.issues.map((e) => ({
                field: e.path.join('.'),
                message: e.message
            }))
        });
    }

    // 3. TypeORM/Database Errors
    if (err instanceof QueryFailedError) {
        const dbError = err.driverError as PostgresQueryError;

        // Duplicate key violation (PostgreSQL)
        if (dbError.code === '23505') {
            log.warn('Violação de chave única no banco de dados', {
                detail: dbError.detail,
                path: req.path
            });

            return res.status(409).json({
                status: 'error',
                message: 'Este registro já existe no sistema'
            });
        }

        // Foreign key violation
        if (dbError.code === '23503') {
            log.warn('Violação de chave estrangeira no banco de dados', {
                detail: dbError.detail,
                path: req.path
            });

            return res.status(400).json({
                status: 'error',
                message: 'Referência a registro inexistente'
            });
        }

        // Log erro genérico de banco
        log.error('Erro de banco de dados', {
            code: dbError.code,
            message: dbError.message,
            path: req.path
        });
    }

    // 4. Erros não esperados - possivelmente bugs
    log.error('Erro não tratado', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        userId: req.user?.userId,
        body: req.body
    });

    // Em produção, não expor detalhes do erro
    return res.status(500).json({
        status: 'error',
        message: isProduction()
            ? 'Erro interno do servidor'
            : `Erro interno: ${err.message}`,
        ...(isProduction() ? {} : { stack: err.stack })
    });
};
