import { AppError } from '../middlewares/errorHandler';
import { HTTP_STATUS } from '../../constants';
import { log } from '../../config/logger';
import { injectable } from 'tsyringe';

interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  gia: string;
  ddd: string;
  siafi: string;
  erro?: boolean;
}

/**
 * Service para operações de logística e frete
 */
@injectable()
export class ShippingService {
  /**
   * Busca endereço por CEP utilizando a API oficial ViaCEP
   *
   * @param cep - CEP formatado ou apenas números (8 dígitos)
   * @returns Dados do endereço formatados
   */
  async lookupAddress(cep: string) {
    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length !== 8) {
      throw new AppError('CEP inválido. Deve conter 8 dígitos.', HTTP_STATUS.BAD_REQUEST);
    }

    try {
      log.info('Buscando CEP na API ViaCEP', { cep: cleanCep });

      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);

      if (!response.ok) {
        throw new Error(`ViaCEP returned status ${response.status}`);
      }

      const data = (await response.json()) as ViaCEPResponse;

      if (data.erro) {
        throw new AppError('CEP não encontrado.', HTTP_STATUS.NOT_FOUND);
      }

      return {
        zip_code: data.cep,
        street: data.logradouro,
        neighborhood: data.bairro,
        city: data.localidade,
        state: data.uf,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;

      log.error('Erro ao consultar ViaCEP', {
        cep: cleanCep,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new AppError(
        'Erro ao consultar serviço de CEP. Tente novamente mais tarde.',
        HTTP_STATUS.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
