/**
 * Valida o algoritmo de dígitos verificadores do CPF
 * @param cpf String contendo o CPF (com ou sem formatação)
 * @returns boolean
 */
export const isValidCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/\D/g, '');

  if (cleanCPF.length !== 11) return false;

  // Rejeita CPFs conhecidamente inválidos (todos os dígitos iguais)
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;

  let sum = 0;
  let remainder;

  // Validação do primeiro dígito
  for (let i = 1; i <= 9; i++) {
    sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;

  // Validação do segundo dígito
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;

  return true;
};

/**
 * Remove caracteres especiais do telefone, mantendo apenas dígitos
 * @param phone Telefone original
 * @returns String contendo apenas dígitos
 */
export const normalizePhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};
