export class Payment {
  constructor(_client: unknown) {}

  async create({
    body,
  }: {
    body: {
      description?: string;
      payer?: unknown;
      payment_method_id?: string;
      transaction_amount?: number;
      installments?: number;
      metadata?: unknown;
    };
  }) {
    const status = body.description?.includes('FAIL')
      ? 'rejected'
      : body.description?.includes('PENDING')
        ? 'in_process'
        : 'approved';

    return {
      id: Math.floor(Math.random() * 1000000000),
      status,
      status_detail: status === 'approved' ? 'accredited' : 'cc_rejected_other_reason',
      date_approved: status === 'approved' ? new Date().toISOString() : null,
      payer: body.payer,
      payment_method_id: body.payment_method_id,
      transaction_amount: body.transaction_amount,
      installments: body.installments,
      start_date: new Date().toISOString(),
      metadata: body.metadata,
    };
  }

  async get({ id }: { id: number }) {
    return {
      id,
      status: 'approved',
      status_detail: 'accredited',
      collection_id: id,
      collection_status: 'approved',
      payment_type_id: 'credit_card',
      merchant_order_id: '123456',
      preference_id: 'pref_123',
      site_id: 'MLB',
      processing_mode: 'aggregator',
      merchant_account_id: 'null',
      metadata: {
        order_id: '00000000-0000-0000-0000-000000000000',
      },
    };
  }

  async cancel({ id }: { id: number }) {
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
      id: Math.floor(Math.random() * 1000000000),
      payment_id,
      status: 'approved',
      date_created: new Date().toISOString(),
    };
  }
}

export const MercadoPagoConfig = jest.fn();
