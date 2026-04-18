import { Order } from '../entities/Order';
import {
  PaymentRequestBody,
  PaymentRequestData,
  MercadoPagoItem,
  MercadoPagoPaymentResponse,
  PayerData,
} from '../../types/payment';
import { MONEY } from '../../constants';

export class PaymentMapper {
  /**
   * Converte um Pedido e dados do Pagamento para o corpo da requisição do Mercado Pago
   * Foca em enviar o máximo de detalhes possível para atingir score de segurança 100/100
   */
  public static toMercadoPago(order: Order, data: PaymentRequestData): PaymentRequestBody {
    const amount = Number(order.totalAmount) / MONEY.CENTS_PER_REAL;

    // Mapeamento detalhado do Payer (Anti-fraude 100/100)
    const payerName = order.user?.name || order.guestEmail || 'Cliente Final';
    const payer = (data.payer || {
      email: order.user?.email || order.guestEmail || 'convidado@checkout.com',
      firstName: (payerName.split(' ')[0] || 'Cliente').trim(),
      lastName: (payerName.split(' ').slice(1).join(' ') || 'Final').trim(),
    }) as PayerData;

    const shipping = order.shippingAddress?.[0];

    const mpBody: PaymentRequestBody = {
      transaction_amount: amount,
      description: `Pedido #${order.id.toString().slice(-6)} - Ordersc`,
      payment_method_id: data.paymentMethodId || data.formData?.payment_method_id || 'pix',
      external_reference: order.id.toString(),
      notification_url: data.notificationUrl || process.env.MERCADOPAGO_WEBHOOK_URL,
      statement_descriptor: 'ORDERSC PAY',

      payer: {
        email: payer.email,
        first_name: payer.firstName,
        last_name: payer.lastName,
        identification: {
          type: payer.identification?.type || 'CPF',
          number: payer.identification?.number?.replace(/\D/g, '') || '',
        },
        address: {
          zip_code:
            payer.address?.zipCode?.replace(/\D/g, '') ||
            shipping?.zipCode?.replace(/\D/g, '') ||
            '00000000',
          street_name: payer.address?.streetName || shipping?.street || 'Rua não informada',
          street_number: (payer.address?.streetNumber || shipping?.number || '0').toString(),
          neighborhood: payer.address?.neighborhood || shipping?.neighborhood || 'Centro',
          city: payer.address?.cityName || shipping?.city || 'Cidade não informada',
          federal_unit: (
            payer.address?.federalUnit ||
            payer.address?.stateId ||
            shipping?.state ||
            'SP'
          )
            .toString()
            .substring(0, 2)
            .toUpperCase(),
        },
      },

      additional_info: {
        items: this.mapItems(order),
        payer: {
          first_name: payer.firstName,
          last_name: payer.lastName,
          registration_date: order.user?.createdAt?.toISOString() || new Date().toISOString(),
          phone: payer.phone
            ? {
                area_code: payer.phone.areaCode || '11',
                number: payer.phone.number || '',
              }
            : undefined,
          address: {
            zip_code:
              payer.address?.zipCode?.replace(/\D/g, '') ||
              shipping?.zipCode?.replace(/\D/g, '') ||
              '00000000',
            street_name: payer.address?.streetName || shipping?.street || 'Rua não informada',
            street_number: (payer.address?.streetNumber || shipping?.number || '0').toString(),
          },
        },
      },

      metadata: {
        order_id: order.id.toString(),
        device_id: data.deviceId || data.formData?.device_id || '',
      },

      installments:
        data.paymentMethodId === 'pix' || data.paymentMethodId?.includes('ticket')
          ? 1
          : data.installments || 1,
      token: data.token || data.formData?.token,
      issuer_id: Number(data.issuerId || data.formData?.issuer_id) || undefined,
    };

    return mpBody;
  }

  /**
   * Mapeia os itens do pedido para o formato detalhado do Mercado Pago
   */
  private static mapItems(order: Order): MercadoPagoItem[] {
    return (order.items || []).map((item) => ({
      id: item.product?.id || 'unknown',
      title: item.product?.name || 'Produto',
      description: item.product?.name || 'Item do pedido',
      category_id: 'others',
      quantity: item.quantity,
      unit_price: Number(item.unitPrice) / MONEY.CENTS_PER_REAL,
    }));
  }

  /**
   * Normaliza a resposta para o frontend (CamelCase)
   */
  public static toFrontendResponse(result: MercadoPagoPaymentResponse) {
    // Force conversion to a plain object because the SDK might return a class instance
    // that doesn't serialize properly over the wire.
    const rawData = JSON.parse(JSON.stringify(result));

    // Robustly find point_of_interaction
    const pi = rawData.point_of_interaction || rawData.pointOfInteraction || {};
    const td_base = pi.transaction_data || pi.transactionData || {};
    const details = rawData.transaction_details || rawData.transactionDetails || {};

    // Universal mapping: merge specific transaction data with details and barcode
    const td = {
      ...details,
      ...td_base,
      barcode_content:
        rawData.barcode?.content || details.barcode?.content || td_base.bar_code || td_base.barcode,
    };

    return {
      id: rawData.id,
      status: rawData.status,
      statusDetail: rawData.status_detail || rawData.statusDetail,
      dateOfExpiration: rawData.date_of_expiration || rawData.dateOfExpiration,
      pointOfInteraction: {
        transaction_data: td,
      },
      externalReference: rawData.external_reference || rawData.externalReference,
      transactionAmount: rawData.transaction_amount || rawData.transactionAmount,
      paymentMethodId: rawData.payment_method_id || rawData.paymentMethodId,
      installments: rawData.installments,
      raw: rawData,
    };
  }
}
