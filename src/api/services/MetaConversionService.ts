import { injectable } from 'tsyringe';
import crypto from 'crypto';
import { env } from '../../config/env';
import { log } from '../../config/logger';
import { Order } from '../entities/Order';

interface MetaUserData {
  em?: string[];
  ph?: string[];
  fn?: string[];
  ln?: string[];
  ct?: string[];
  st?: string[];
  zp?: string[];
  country?: string[];
  fbp?: string;
  fbc?: string;
  client_ip_address?: string;
  client_user_agent?: string;
}

@injectable()
export class MetaConversionService {
  private readonly pixelId = env.META_PIXEL_ID;
  private readonly accessToken = env.META_ACCESS_TOKEN;

  /**
   * Envia um evento de compra (Purchase) para a API de Conversões do Meta.
   * Isso garante a medição de conversões off-line ou confirmadas via webhook.
   */
  async trackPurchase(order: Order) {
    if (!this.accessToken) {
      log.warn('[CAPI] Ignorando envio de evento: META_ACCESS_TOKEN não configurado.');
      return;
    }

    if (!this.pixelId) {
      log.warn('[CAPI] Ignorando envio de evento: META_PIXEL_ID não configurado.');
      return;
    }

    try {
      const userData = await this.prepareUserData(order);

      const payload = {
        data: [
          {
            event_name: 'Purchase',
            event_time: Math.floor(Date.now() / 1000),
            event_id: order.id, // ID crucial para deduplicação com o pixel do navegador
            event_source: 'web',
            action_source: 'website',
            user_data: userData,
            custom_data: {
              value: Number(order.totalAmount) / 100, // Converte centavos para reais
              currency: order.currency || 'BRL',
              content_type: 'product',
              contents: order.items.map((item) => ({
                id: item.product?.id,
                quantity: item.quantity,
                item_price: Number(item.unitPrice) / 100,
              })),
            },
          },
        ],
        ...(env.META_TEST_EVENT_CODE ? { test_event_code: env.META_TEST_EVENT_CODE } : {}),
      };

      const url = `https://graph.facebook.com/v19.0/${this.pixelId}/events?access_token=${this.accessToken}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        log.error('[CAPI] Erro ao enviar evento de compra para o Meta', {
          status: response.status,
          error: errorData,
          orderId: order.id,
        });
      } else {
        const result = (await response.json()) as { fb_trace_id?: string };
        log.info('[CAPI] Evento de compra enviado com sucesso para o Meta', {
          orderId: order.id,
          fbTraceId: result.fb_trace_id,
        });
      }
    } catch (error) {
      log.error('[CAPI] Falha crítica ao enviar evento para o Meta', { error, orderId: order.id });
    }
  }

  /**
   * Prepara os dados do usuário com a devida hash SHA-256 e normalização recomendada pelo Meta
   */
  private async prepareUserData(order: Order): Promise<MetaUserData> {
    const email = order.guestEmail || order.user?.email;
    const phone = order.phone;
    const name = order.user?.name;

    const userData: MetaUserData = {};

    if (email) {
      userData.em = [this.hashEmail(email)];
    }

    if (phone) {
      userData.ph = [this.hashPhone(phone)];
    }

    if (name) {
      const nameParts = name.trim().split(/\s+/);
      userData.fn = [this.hashName(nameParts[0])];
      if (nameParts.length > 1) {
        userData.ln = [this.hashName(nameParts[nameParts.length - 1])];
      }
    }

    // Adiciona dados de endereço se disponíveis
    if (order.shippingAddress && order.shippingAddress.length > 0) {
      const addr = order.shippingAddress[0];
      userData.ct = [this.hashText(addr.city)];
      userData.st = [this.hashText(addr.state)];
      userData.zp = [this.hashText(addr.zipCode.replace(/\D/g, ''))];
      userData.country = [this.sha256('br')]; // Sempre minúsculo e ISO 2-letter
    }

    // Cookies do Facebook e metadados do cliente para correspondência otimizada
    if (order.fbp) {
      userData.fbp = order.fbp;
    }
    if (order.fbc) {
      userData.fbc = order.fbc;
    }
    if (order.ipAddress) {
      userData.client_ip_address = order.ipAddress;
    }
    if (order.userAgent) {
      userData.client_user_agent = order.userAgent;
    }

    return userData;
  }

  private hashEmail(email: string): string {
    let normalized = email.trim().toLowerCase();

    // Normalização para Gmail (remover pontos antes do @)
    if (normalized.endsWith('@gmail.com') || normalized.endsWith('@googlemail.com')) {
      const [local, domain] = normalized.split('@');
      const cleanLocal = local.replace(/\./g, '');
      normalized = `${cleanLocal}@${domain}`;
    }

    return this.sha256(normalized);
  }

  private hashPhone(phone: string): string {
    // Apenas dígitos
    let normalized = phone.replace(/\D/g, '');

    // CAPI exige código do país (DDI). Se não começar com +, assume Brasil (55)
    if (!phone.startsWith('+') && !normalized.startsWith('55')) {
      normalized = `55${normalized}`;
    }

    return this.sha256(normalized);
  }

  private hashName(name: string): string {
    // Remover dígitos e símbolos, minúsculo, sem acentos, sem espaços extras
    const normalized = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentuações
      .replace(/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/g, '')
      .trim();

    return this.sha256(normalized);
  }

  private hashText(text: string): string {
    const normalized = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/g, '')
      .trim();

    return this.sha256(normalized);
  }

  private sha256(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}
