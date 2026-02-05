/**
 * Tipos concretos para o sistema
 */

/**
 * Períodos válidos para estatísticas
 */
export type StatsPeriod = '7days' | '30days' | '90days' | 'year';

/**
 * Ambientes de execução válidos
 */
export type NodeEnvironment = 'development' | 'production' | 'test';

/**
 * Estrutura de erro do TypeORM para PostgreSQL
 */
export interface PostgresQueryError {
    code: string;
    detail?: string;
    message: string;
    table?: string;
    constraint?: string;
}
