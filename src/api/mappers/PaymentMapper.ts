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
    // Utilizamos os dados do usuário ou do endereço de entrega caso seja convidado
    const payerName = order.user?.name || order.guestEmail || 'Cliente Final';
    const payer = (data.payer || {
      email: order.user?.email || order.guestEmail || 'convidado@checkout.com',
      firstName: payerName.split(' ')[0],
      lastName: payerName.split(' ').slice(1).join(' ') || 'Final',
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
        address: payer.address
          ? {
              zip_code: payer.address.zipCode || shipping?.zipCode || '',
              street_name: payer.address.streetName || shipping?.street || '',
              street_number: payer.address.streetNumber || 'SN',
            }
          : undefined,
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
          address: payer.address
            ? {
                zip_code: payer.address.zipCode || shipping?.zipCode || '',
                street_name: payer.address.streetName || shipping?.street || '',
                street_number: payer.address.streetNumber || 'SN',
              }
            : undefined,
        },
      },

      metadata: {
        order_id: order.id.toString(),
        device_id: data.deviceId || data.formData?.device_id || '',
      },

      installments: data.installments || 1,
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
    return {
      id: result.id,
      status: result.status,
      statusDetail: result.status_detail,
      dateOfExpiration: result.date_of_expiration,
      pointOfInteraction: result.point_of_interaction
        ? {
            transaction_data: result.point_of_interaction.transaction_data,
          }
        : undefined,
      externalReference: result.external_reference,
      transactionAmount: result.transaction_amount,
      paymentMethodId: result.payment_method_id,
      installments: result.installments,
      raw: result,
    };
  }
}
