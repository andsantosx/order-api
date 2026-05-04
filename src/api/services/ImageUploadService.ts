import { env } from '../../config/env';
import { log } from '../../config/logger';
import { AppError } from '../middlewares/errorHandler';
import { HTTP_STATUS } from '../../constants';
import sharp from 'sharp';

const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';
const REMOVE_BG_URL = 'https://api.remove.bg/v1.0/removebg';

// Tipos de arquivo permitidos (MIME types)
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Limite de tamanho original: 12MB (limite do remove.bg)
const MAX_SIZE_BYTES = 12 * 1024 * 1024;

export interface ImgBBUploadResult {
  url: string;
  displayUrl: string;
  deleteUrl: string;
  size: number;
  width: number;
  height: number;
}

/**
 * Remove o fundo da imagem usando a API do remove.bg.
 */
async function removeBackground(buffer: Buffer): Promise<Buffer> {
  log.info('Iniciando remoção de fundo com remove.bg');

  const response = await fetch(REMOVE_BG_URL, {
    method: 'POST',
    headers: {
      'X-Api-Key': env.REMOVEBG_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_file_b64: buffer.toString('base64'),
      size: 'auto',
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Erro desconhecido');
    log.error('remove.bg retornou erro HTTP', { status: response.status, body: errorText });
    throw new AppError(
      'Falha ao remover o fundo da imagem. Tente novamente.',
      HTTP_STATUS.BAD_GATEWAY,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  log.info('Remoção de fundo concluída com sucesso');
  return Buffer.from(arrayBuffer);
}

async function processImageWithWhiteBackground(inputBuffer: Buffer): Promise<Buffer> {
  // Canvas gigante em 1200x1200 (HD) para ter muito mais pixels e qualidade visual
  const canvasSize = 1200;

  // Voltamos para a SUA proporção original: A blusa ocupa exatamente 71% do quadro (852px)
  // Isso garante que a quantidade de fundo branco seja MILIMETRICAMENTE igual ao resto da loja
  const targetSize = Math.round(canvasSize * 0.71);

  // 1. Remove as bordas transparentes extras que o remove.bg costuma deixar
  // Isso garante que o cálculo de escala seja baseado APENAS na peça de roupa,
  // resolvendo o problema de peças que pareciam menores que as outras.
  const { data: trimmedBuffer, info: trimmedInfo } = await sharp(inputBuffer)
    .trim()
    .toBuffer({ resolveWithObject: true });

  // Calcula a escala para a peça ocupar o targetSize (852px) em sua maior dimensão
  const scale = Math.min(targetSize / trimmedInfo.width, targetSize / trimmedInfo.height);

  const newWidth = Math.round(trimmedInfo.width * scale);
  const newHeight = Math.round(trimmedInfo.height * scale);

  // Redimensiona usando o algoritmo de altíssima qualidade
  const resized = await sharp(trimmedBuffer)
    .resize(newWidth, newHeight, {
      kernel: sharp.kernel.lanczos3,
    })
    .toBuffer();

  const finalImage = await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 3,
      background: '#ffffff',
    },
  })
    .composite([
      {
        input: resized,
        top: Math.round((canvasSize - newHeight) / 2),
        left: Math.round((canvasSize - newWidth) / 2),
      },
    ])
    .jpeg({ quality: 100 }) // Mantém a qualidade máxima absoluta
    .toBuffer();

  log.info('Processamento da imagem concluído com normalização de bordas');
  return finalImage;
}

/**
 * Fluxo completo de upload:
 * 1. Remove background (remove.bg)
 * 2. Processa com Sharp (800x800, fundo branco)
 * 3. Envia para ImgBB
 */
export async function uploadToImgBB(
  buffer: Buffer,
  mimetype: string,
  originalname: string,
): Promise<ImgBBUploadResult> {
  // Validação de tipo de arquivo
  if (!ALLOWED_MIME_TYPES.includes(mimetype)) {
    throw new AppError(
      `Tipo de arquivo não permitido: ${mimetype}. Use JPEG, PNG, WEBP ou GIF.`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  // Validação de tamanho (12MB limite do remove.bg)
  if (buffer.length > MAX_SIZE_BYTES) {
    throw new AppError(
      `Arquivo muito grande (${(buffer.length / 1024 / 1024).toFixed(1)}MB). Limite do remove.bg: 12MB.`,
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  // 1. Remove o fundo
  const noBgBuffer = await removeBackground(buffer);

  // 2. Padroniza a imagem (fundo branco, 800x800)
  const finalBuffer = await processImageWithWhiteBackground(noBgBuffer);

  // 3. Converte para base64 para envio ao ImgBB
  const base64Image = finalBuffer.toString('base64');

  const params = new URLSearchParams();
  params.append('key', env.IMGBB_API_KEY);
  params.append('image', base64Image);
  params.append('name', originalname.replace(/\.[^/.]+$/, '')); // Nome sem extensão

  log.info('Iniciando upload de imagem processada para ImgBB');

  const response = await fetch(IMGBB_UPLOAD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    signal: AbortSignal.timeout(30_000), // 30s timeout
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Erro desconhecido');
    log.error('ImgBB retornou erro HTTP', { status: response.status, body: errorText });
    throw new AppError(
      'Falha ao hospedar imagem processada. Tente novamente.',
      HTTP_STATUS.BAD_GATEWAY,
    );
  }

  const data = (await response.json()) as {
    success: boolean;
    error?: { message: string };
    data?: {
      url: string;
      display_url: string;
      delete_url: string;
      size: number;
      width: number;
      height: number;
    };
  };

  if (!data.success || !data.data) {
    log.error('ImgBB retornou sucesso=false', { error: data.error });
    throw new AppError(
      data.error?.message ?? 'Erro ao processar imagem no ImgBB.',
      HTTP_STATUS.BAD_GATEWAY,
    );
  }

  log.info('Upload de imagem concluído com sucesso', { url: data.data.url });

  return {
    url: data.data.url,
    displayUrl: data.data.display_url,
    deleteUrl: data.data.delete_url,
    size: data.data.size,
    width: data.data.width,
    height: data.data.height,
  };
}
