import { EntityManager } from 'typeorm';
import { AppDataSource } from '../data-source';
import { log } from '../config/logger';

/**
 * Executa uma operação dentro de uma transação do banco de dados
 *
 * Garante que todas as operações sejam executadas atomicamente:
 * - Se todas tiverem sucesso, a transação é confirmada (commit)
 * - Se qualquer operação falhar, todas as mudanças são revertidas (rollback)
 *
 * @param operation - Função que recebe um EntityManager e executa as operações desejadas
 * @returns O resultado da operação
 * @throws Propaga qualquer erro que ocorra durante a transação
 *
 * @example
 * // Criar pedido com múltiplas entidades
 * const order = await executeInTransaction(async (manager) => {
 *     const order = manager.create(Order, orderData);
 *     await manager.save(order);
 *
 *     const items = orderItems.map(item => manager.create(OrderItem, item));
 *     await manager.save(items);
 *
 *     return order;
 * });
 */
export async function executeInTransaction<T>(
  operation: (manager: EntityManager) => Promise<T>,
): Promise<T> {
  const queryRunner = AppDataSource.createQueryRunner();

  // Conecta o query runner ao banco de dados
  await queryRunner.connect();

  // Inicia a transação
  await queryRunner.startTransaction();

  try {
    // Executa a operação passando o manager transacional
    const result = await operation(queryRunner.manager);

    // Se tudo correu bem, confirma a transação
    await queryRunner.commitTransaction();

    log.info('Transação executada com sucesso');
    return result;
  } catch (error) {
    // Se houve erro, reverte todas as mudanças
    await queryRunner.rollbackTransaction();

    log.error('Erro na transação - rollback executado', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Propaga o erro para ser tratado pelo caller
    throw error;
  } finally {
    // Sempre libera o query runner
    await queryRunner.release();
  }
}

/**
 * Helper para executar múltiplas operações de banco de forma transacional
 * Similar ao executeInTransaction, mas otimizado para batch operations
 *
 * @param operations - Array de funções a serem executadas
 * @returns Array com os resultados de cada operação
 *
 * @example
 * const [order, items, address] = await executeBatchInTransaction([
 *     (manager) => manager.save(Order, orderData),
 *     (manager) => manager.save(OrderItem, itemsData),
 *     (manager) => manager.save(ShippingAddress, addressData),
 * ]);
 */
export async function executeBatchInTransaction<T extends unknown[]>(
  operations: ((manager: EntityManager) => Promise<unknown>)[],
): Promise<T> {
  return executeInTransaction(async (manager) => {
    const results = await Promise.all(operations.map((op) => op(manager)));
    return results as T;
  });
}
