import { PaymentRequestBody, PayerData, MercadoPagoPaymentResponse } from '../../types/payment';

export class Payment {
  private static lastCreatedPayment: unknown = null;

  constructor(_client: unknown) {}

  static getLastCreatedPayment() {
    return this.lastCreatedPayment;
  }

  async create({
    body,
  }: {
    body: PaymentRequestBody;
  }): Promise<MercadoPagoPaymentResponse> {
    const isPix = body.payment_method_id === 'pix';
    const isError = body.description?.includes('FAIL') || body.payment_method_id === 'rejected';
    const isPending = body.description?.includes('PENDING') || isPix;

    const status = isError ? 'rejected' : isPending ? 'pending' : 'approved';
    const statusDetail = isError ? 'cc_rejected_high_risk' : isPending ? (isPix ? 'pending_waiting_transfer' : 'in_process') : 'accredited';

    const result: MercadoPagoPaymentResponse = {
      id: 123456789,
      status,
      status_detail: statusDetail,
      date_approved: status === 'approved' ? new Date().toISOString() : null,
      payer: {
        email: body.payer.email,
        firstName: body.payer.first_name,
        lastName: body.payer.last_name,
        identification: body.payer.identification,
        phone: body.payer.phone ? {
          areaCode: body.payer.phone.area_code,
          number: body.payer.phone.number,
        } : undefined,
        address: body.payer.address ? {
          zipCode: body.payer.address.zip_code,
          streetName: body.payer.address.street_name,
          streetNumber: body.payer.address.street_number,
        } : undefined,
      },
      payment_method_id: body.payment_method_id,
      transaction_amount: body.transaction_amount,
      installments: body.installments,
      metadata: body.metadata as Record<string, unknown>,
      external_reference: body.external_reference,
      ...(isPix && {
        point_of_interaction: {
          transaction_data: {
            qr_code: '00020126330014BR.GOV.BCB.PIX0111testpixcode',
            qr_code_base64: 'iVBORw0KGgoAAAANSUhEUgAA...',
            ticket_url: 'https://www.mercadopago.com.br/payments/123456789/ticket',
          },
        },
        date_of_expiration: new Date(Date.now() + 86400000).toISOString(),
      }),
    };

    Payment.lastCreatedPayment = result;
    return result;
  }

  async get({ id }: { id: number }): Promise<MercadoPagoPaymentResponse> {
    // Retorna o último pagamento ou um padrão
    const base = (Payment.lastCreatedPayment as MercadoPagoPaymentResponse) || {
      id,
      status: 'approved',
      status_detail: 'accredited',
      metadata: { order_id: '00000000-0000-0000-0000-000000000000' },
    };
    return { ...base, id } as MercadoPagoPaymentResponse;
  }

  async cancel({ id }: { id: number }): Promise<Partial<MercadoPagoPaymentResponse>> {
    return {
      id,
      status: 'cancelled',
      status_detail: 'by_merchant',
    };
  }
}

export class PaymentRefund {
  constructor(_client: unknown) {}

  async create({ payment_id }: { payment_id: number }) {
    return {
      id: 987654321,
      payment_id,
      status: 'approved',
      date_created: new Date().toISOString(),
    };
  }
}

export const MercadoPagoConfig = jest.fn().mockImplementation(() => ({
  options: { accessToken: 'test-token' }
}));
