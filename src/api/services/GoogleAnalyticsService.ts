import { injectable } from 'tsyringe';
import crypto from 'crypto';
import { env } from '../../config/env';
import { log } from '../../config/logger';
import { Order } from '../entities/Order';

interface GAUserData {
  sha256_email_address?: string;
  sha256_phone_number?: string;
  address?: {
    sha256_first_name?: string;
    sha256_last_name?: string;
    city?: string;
    region?: string;
    postal_code?: string;
    country?: string;
  };
}

@injectable()
export class GoogleAnalyticsService {
  private readonly measurementId = env.GA_MEASUREMENT_ID;
  private readonly apiSecret = env.GA_API_SECRET;

  /**
   * Envia um evento de compra (purchase) para o Google Analytics 4 via Measurement Protocol.
   * Usado para garantir que conversões off-line ou confirmadas via webhook sejam registradas.
   */
  async trackPurchase(order: Order) {
    if (!this.apiSecret) {
      log.warn('[GA4] Ignorando envio de evento: GA_API_SECRET não configurado.');
      return;
    }

    try {
      const userData = await this.prepareUserData(order);

      const payload = {
        client_id: order.gaClientId || order.user?.id || order.id,
        user_id: order.user?.id,
        events: [
          {
            name: 'purchase',
            params: {
              transaction_id: order.id,
              value: Number(order.totalAmount) / 100, // Converte centavos para reais
              currency: order.currency || 'BRL',
              items: order.items.map((item) => ({
                item_id: item.product?.id,
                item_name: item.product?.name || 'Produto',
                quantity: item.quantity,
                price: Number(item.unitPrice) / 100,
              })),
            },
          },
        ],
        user_data: userData,
      };

      const url = `https://www.google-analytics.com/mp/collect?measurement_id=${this.measurementId}&api_secret=${this.apiSecret}`;

      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.error('[GA4] Erro ao enviar evento de compra', {
          status: response.status,
          error: errorText,
          orderId: order.id,
        });
      } else {
        log.info('[GA4] Evento de compra enviado com sucesso', { orderId: order.id });
      }
    } catch (error) {
      log.error('[GA4] Falha crítica ao enviar evento', { error, orderId: order.id });
    }
  }

  /**
   * Prepara os dados do usuário para o Measurement Protocol (Hasheados)
   */
  private async prepareUserData(order: Order): Promise<GAUserData> {
    const email = order.guestEmail || order.user?.email;
    const phone = order.phone;
    const name = order.user?.name;

    const userData: GAUserData = {};

    if (email) {
      userData.sha256_email_address = this.hashEmail(email);
    }

    if (phone) {
      userData.sha256_phone_number = this.hashPhone(phone);
    }

    if (name) {
      const nameParts = name.trim().split(/\s+/);
      userData.address = {
        sha256_first_name: this.hashName(nameParts[0]),
        sha256_last_name:
          nameParts.length > 1 ? this.hashName(nameParts[nameParts.length - 1]) : undefined,
      };
    }

    // Adiciona dados de endereço se disponíveis
    if (order.shippingAddress && order.shippingAddress.length > 0) {
      const addr = order.shippingAddress[0];
      if (!userData.address) {
        userData.address = {};
      }

      userData.address.city = this.normalizeText(addr.city);
      userData.address.region = this.normalizeText(addr.state);
      userData.address.postal_code = addr.zipCode.replace(/\D/g, '');
      userData.address.country = 'BR'; // Padrão ISO 3166-1 alpha-2
    }

    return userData;
  }

  private hashEmail(email: string): string {
    let normalized = email.trim().toLowerCase();

    // Normalização específica para Gmail (remover pontos antes do @)
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

    // Deve começar com +
    if (!normalized.startsWith('+')) {
      // Se tiver 11 dígitos e não começar com +, assume Brasil (+55)
      if (normalized.length === 11 || normalized.length === 10) {
        normalized = `+55${normalized}`;
      } else {
        normalized = `+${normalized}`;
      }
    }

    return this.sha256(normalized);
  }

  private hashName(name: string): string {
    // Remover dígitos e símbolos, minúsculo, sem espaços extras
    const normalized = name
      .toLowerCase()
      .replace(/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/g, '')
      .trim();

    return this.sha256(normalized);
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/g, '')
      .trim();
  }

  private sha256(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}
