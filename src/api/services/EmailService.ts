import Mailjet from 'node-mailjet';
import { env } from '../../config/env';
import winston from 'winston';
import { injectable } from 'tsyringe';

/**
 * Interfaces para tipos internos do EmailService
 */
interface IEmailItem {
  product?: {
    name: string;
  };
  quantity: number;
  unitPrice: number;
}

interface IEmailAddress {
  street: string;
  number: string;
  reference?: string;
  city: string;
  state: string;
  zipCode: string;
}

interface IEmailOrder {
  id: string;
  totalAmount: number;
  user?: {
    name?: string;
    email?: string;
    document?: string;
  };
  guestEmail?: string;
  shippingAddress?: IEmailAddress[];
  items?: IEmailItem[];
}

/**
 * Serviço responsável pelo envio de e-mails transacionais utilizando Mailjet.
 * Utiliza um design premium, minimalista e profissional.
 */
@injectable()
export class EmailService {
  private mailjet: Mailjet;
  constructor() {
    this.mailjet = new Mailjet({
      apiKey: env.MAILJET_API_KEY,
      apiSecret: env.MAILJET_API_SECRET,
    });
  }

  /**
   * Layout Premium Base
   */
  private getHtmlTemplate(
    title: string,
    content: string,
    ctaText?: string,
    ctaUrl?: string,
    notes?: string,
    items?: IEmailItem[],
  ): string {
    const year = new Date().getFullYear();

    // Botão de Call to Action
    const ctaHtml =
      ctaText && ctaUrl
        ? `<div style="margin-top: 48px; text-align: left;">
          <a href="${ctaUrl}" style="background-color: #5A4373; color: #ffffff !important; padding: 18px 35px; text-decoration: none; border-radius: 12px; font-size: 15px; font-weight: 600; display: inline-block; transition: background-color 0.2s; box-shadow: 0 4px 12px rgba(90, 67, 115, 0.2);">
            ${ctaText}
          </a>
        </div>`
        : '';

    // Seção de Observações (Notas)
    const notesHtml = notes
      ? `<div style="margin-top: 40px; padding: 24px; background-color: #F3E9FF; border-left: 4px solid #5A4373; border-radius: 16px; font-size: 14px; color: #444444; line-height: 1.6;">
          <strong style="color: #5A4373; text-transform: uppercase; font-size: 11px; letter-spacing: 0.1em; display: block; margin-bottom: 8px;">Destaque</strong>
          ${notes}
        </div>`
      : '';

    // Tabela de Itens (Opcional)
    let itemsHtml = '';
    if (items && items.length > 0) {
      itemsHtml = `
        <div style="margin-top: 50px; border-top: 1px solid #EEEEEE; padding-top: 30px;">
          <strong style="font-size: 11px; color: #999999; text-transform: uppercase; letter-spacing: 0.15em; display: block; margin-bottom: 24px;">Resumo do Pedido</strong>
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 15px; color: #111111;">
            ${items
              .map(
                (item) => `
              <tr>
                <td style="padding: 16px 0; border-bottom: 1px solid #F0F0F0;">
                  <span style="color: #111111; font-weight: 600;">${item.product?.name || 'Produto'}</span><br>
                  <span style="font-size: 13px; color: #666666;">Qtd: ${item.quantity}</span>
                </td>
                <td align="right" style="padding: 16px 0; border-bottom: 1px solid #F0F0F0; color: #111111; font-weight: 700;">
                  ${((item.unitPrice || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
              </tr>
            `,
              )
              .join('')}
          </table>
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=Playfair+Display:ital,wght@1,700&display=swap');
            
            @media only screen and (max-width: 600px) {
              .outer-td { padding: 0 !important; }
              .main-card {
                padding: 50px 30px !important;
                border-radius: 0 !important;
              }
              .header-td { padding: 30px 30px 10px 30px !important; }
              .footer-td { padding: 40px 30px 60px 30px !important; }
              .title-h1 { font-size: 28px !important; }
            }
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #F5F5F7; font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F5F5F7;">
            <tr>
              <td align="center" class="outer-td" style="padding: 50px 0;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #F5F5F7;">
                  <!-- Header Logo Area (White) -->
                  <tr>
                    <td align="left" class="header-td" style="padding: 0 0 30px 0;">
                      <a href="${env.FRONTEND_URL}" style="text-decoration: none;">
                        <span style="font-family: 'Playfair Display', serif; font-size: 30px; font-weight: 700; font-style: italic; color: #5A4373; letter-spacing: -0.03em;">order</span>
                      </a>
                    </td>
                  </tr>
                  
                  <!-- Main Content Card (Light) -->
                  <tr>
                    <td align="center" style="padding: 0;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" class="main-card" style="background-color: #FFFFFF; border-radius: 40px; box-shadow: 0 20px 40px rgba(0,0,0,0.03);">
                        <tr>
                          <td style="padding: 60px 50px;">
                            <!-- Heading -->
                            <h1 class="title-h1" style="font-size: 34px; font-weight: 600; line-height: 1.25; margin: 0 0 30px 0; letter-spacing: -0.04em; color: #111111;">
                              ${title}
                            </h1>
                            
                            <!-- Body Text -->
                            <div style="font-size: 17px; line-height: 1.6; color: #444444; font-weight: 400; letter-spacing: -0.01em;">
                              ${content}
                            </div>

                            ${notesHtml}
                            ${itemsHtml}
                            ${ctaHtml}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer Area (Light Minimal) -->
                  <tr>
                    <td class="footer-td" style="padding: 50px 50px 80px 50px;">
                      <div style="font-size: 13px; color: #999999; line-height: 1.8; margin-bottom: 40px; font-weight: 400;">
                        Este é um e-mail automático da Order para sua segurança. <strong>Não responda esta mensagem.</strong>
                      </div>

                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding-bottom: 30px;">
                            <p style="margin: 0 0 12px 0; font-size: 11px; font-weight: 700; color: #111111; text-transform: uppercase; letter-spacing: 0.1em;">Suporte</p>
                            <div style="font-size: 14px; color: #666666; line-height: 1.8;">
                              <a href="mailto:orderstoreco@gmail.com" style="color: #5A4373; text-decoration: none; font-weight: 600;">orderstoreco@gmail.com</a><br>
                              <a href="https://wa.me/554898192343" style="color: #5A4373; text-decoration: none; font-weight: 600;">WhatsApp +55 48 9819-2343</a>
                            </div>
                          </td>
                        </tr>
                      </table>

                      <div style="margin-top: 15px;">
                        <div style="margin-bottom: 25px;">
                          <a href="https://www.instagram.com/order.sc" target="_blank" style="text-decoration: none; margin-right: 15px;">
                            <img src="https://cdn-icons-png.flaticon.com/512/1384/1384063.png" alt="IG" width="20" style="filter: grayscale(100%); opacity: 0.3;">
                          </a>
                          <a href="${env.FRONTEND_URL}" target="_blank" style="text-decoration: none;">
                            <img src="https://cdn-icons-png.flaticon.com/512/711/711100.png" alt="WEB" width="20" style="filter: grayscale(100%); opacity: 0.3;">
                          </a>
                        </div>
                        <div style="font-size: 11px; color: #BBBBBB; letter-spacing: 0.05em; line-height: 2;">
                          © ${year} ORDER. CO — CRICIÚMA, SANTA CATARINA.<br>
                          <a href="${env.FRONTEND_URL}/privacidade" style="color: #999999; text-decoration: none;">Privacidade</a> &bull; <a href="${env.FRONTEND_URL}/termos" style="color: #999999; text-decoration: none;">Termos</a>
                        </div>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  private async send(
    to: string,
    name: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<void> {
    try {
      const result = await this.mailjet.post('send', { version: 'v3.1' }).request({
        Messages: [
          {
            From: { Email: env.MAILJET_SENDER_EMAIL, Name: env.MAILJET_SENDER_NAME },
            To: [{ Email: to, Name: name }],
            Subject: subject,
            TextPart: text || subject,
            HTMLPart: html,
            CustomID: `order-api-${Date.now()}`,
          },
        ],
      });
      const body = result.body as {
        Messages: Array<{ To: Array<{ MessageID: string }> }>;
      };
      const messageId = body.Messages[0].To[0].MessageID;
      winston.info(
        `E-mail enviado para ${to}. Status: ${result.response.status}. MessageID: ${messageId}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      winston.error(`Erro ao enviar e-mail para ${to}: ${message}`);
    }
  }

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const title = `Sua jornada com a <span style="color: #4A3B63;">Order</span> começa agora.`;
    const content = `
      Olá, ${name}.<br><br>
      É um prazer receber você. Na <strong>Order</strong>, acreditamos que a simplicidade é o auge da sofisticação.<br><br>
      Sua conta foi criada com sucesso. Estamos prontos para elevar o seu padrão de operação daqui em diante.
    `;
    const text = `Boas-vindas à Order, ${name}!`;
    await this.send(
      to,
      name,
      `Bem-vindo(a), ${name}!`,
      this.getHtmlTemplate(title, content, 'Explorar Plataforma', `${env.FRONTEND_URL}/login`),
      text,
    );
  }

  async sendOrderConfirmation(
    to: string,
    name: string,
    orderId: string,
    totalAmount: number,
    notes?: string,
    items?: IEmailItem[],
    isAccountLinked: boolean = false,
    generatedPassword?: string,
  ): Promise<void> {
    const formattedTotal = (totalAmount / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const title = `Pedido Recebido. <span style="color: #4A3B63;">#${orderId.slice(0, 8)}</span>`;

    let linkNotice = '';
    if (isAccountLinked) {
      linkNotice = `<br><br><div style="padding: 15px; background-color: #F0F7FF; border-left: 3px solid #007BFF; color: #0056B3; font-size: 14px;">
        <strong>Sincronização Automática:</strong> Identificamos que você já possui uma conta conosco. Este pedido foi vinculado ao seu histórico para sua conveniência.
      </div>`;
    }

    let passwordNotice = '';
    if (generatedPassword) {
      passwordNotice = `
      <div style="margin-top: 30px; padding: 25px; background-color: #FAFAFA; border: 1px dashed #5A4373; border-radius: 16px;">
        <strong style="color: #5A4373; text-transform: uppercase; font-size: 11px; letter-spacing: 0.1em; display: block; margin-bottom: 12px;">Sua Nova Conta</strong>
        <p style="margin: 0; font-size: 15px; color: #444;">Para acompanhar seu pedido, criamos uma conta automática para você:</p>
        <div style="margin-top: 15px; font-size: 14px; color: #111;">
          <strong>E-mail: ${to}</strong><br>
          <strong>Senha: <span style="font-family: monospace; font-size: 16px;">${generatedPassword}</span></strong>
        </div>
        <p style="margin-top: 15px; margin-bottom: 0; font-size: 13px; color: #666;">Recomendamos alterar a senha no seu primeiro acesso.</p>
      </div>`;
    }

    const content = `
      Olá, ${name}.<br><br>
      Seu pedido foi registrado em nosso sistema e está aguardando a confirmação do pagamento.<br><br>
      <strong>Valor Total: ${formattedTotal}</strong>
      ${linkNotice}
      ${passwordNotice}
    `;
    const text = `Pedido #${orderId.slice(0, 8)} recebido. Total: ${formattedTotal}.`;
    await this.send(
      to,
      name,
      `Pedido Confirmado #${orderId.slice(0, 8)}`,
      this.getHtmlTemplate(title, content),
      text,
    );
  }

  /**
   * Envia notificação interna para a administração avisando sobre um novo pedido pago.
   * Destinatário: orderstoreco@gmail.com
   */
  async sendInternalOrderNotification(order: IEmailOrder): Promise<void> {
    const formattedTotal = (order.totalAmount / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
    const title = `🚨 <span style="color: #4A3B63;">NOVO PEDIDO PAGO</span>`;

    const customerName = order.user?.name || 'Cliente';
    const customerEmail = order.guestEmail || order.user?.email || 'N/A';
    const customerDoc = order.user?.document || 'N/A';

    const addr =
      order.shippingAddress && order.shippingAddress.length > 0 ? order.shippingAddress[0] : null;

    const addressStr = addr
      ? `${addr.street}, ${addr.number}${addr.reference ? ` (${addr.reference})` : ''}, ${addr.city} - ${addr.state}. CEP: ${addr.zipCode}`
      : 'Não informado';

    const content = `
      <strong>Um novo pagamento foi confirmado!</strong><br><br>
      <div style="background-color: #FAFAFA; padding: 20px; border-radius: 4px; border: 1px solid #EEE;">
        <strong>ID do Pedido:</strong> #${order.id.slice(0, 8)}<br>
        <strong>Valor Total:</strong> ${formattedTotal}<br><br>
        <strong>CLIENTE:</strong><br>
        Nome: ${customerName}<br>
        E-mail: ${customerEmail}<br>
        Documento: ${customerDoc}<br><br>
        <strong>ENTREGA:</strong><br>
        ${addressStr}
      </div>
      <br>Os detalhes dos itens estão listados abaixo para separação.
    `;

    const subject = `[NOVO PEDIDO PAGO] ${customerName} - ${formattedTotal}`;
    await this.send(
      'orderstoreco@gmail.com',
      'Admin Order Store',
      subject,
      this.getHtmlTemplate(
        title,
        content,
        undefined,
        undefined,
        'Pedido pronto para processamento',
        order.items,
      ),
      `Novo pedido pago: #${order.id} de ${customerName}. Valor: ${formattedTotal}`,
    );
  }

  async sendPaymentPending(
    to: string,
    name: string,
    orderId: string,
    _notes?: string,
    _items?: IEmailItem[],
  ): Promise<void> {
    const title = `Pagamento em <span style="color: #4A3B63;">Processamento</span>.`;
    const content = `
      Olá, ${name}.<br><br>
      O pagamento do seu pedido <strong>#${orderId.slice(0, 8)}</strong> foi recebido e está em análise pelo nosso sistema de segurança.<br><br>
      Assim que a transação for autorizada, você receberá uma nova confirmação por aqui.
    `;
    const text = `Pagamento do pedido #${orderId.slice(0, 8)} em processamento.`;
    await this.send(
      to,
      name,
      `Pagamento em Análise - #${orderId.slice(0, 8)}`,
      this.getHtmlTemplate(title, content),
      text,
    );
  }

  async sendPaymentApproved(
    to: string,
    name: string,
    orderId: string,
    _notes?: string,
    _items?: IEmailItem[],
  ): Promise<void> {
    const title = `Pagamento <span style="color: #4A3B63;">Confirmado</span>.`;
    const content = `
      Olá, ${name}.<br><br>
      Ótimas notícias. O pagamento do seu pedido <strong>#${orderId.slice(0, 8)}</strong> foi aprovado com sucesso.<br><br>
      Nossa equipe já está providenciando a separação e o envio dos seus produtos.
    `;
    const text = `Pagamento aprovado para o pedido #${orderId.slice(0, 8)}.`;
    await this.send(
      to,
      name,
      `Pagamento Aprovado - #${orderId.slice(0, 8)}`,
      this.getHtmlTemplate(title, content),
      text,
    );
  }

  async sendPaymentRejected(
    to: string,
    name: string,
    orderId: string,
    reason?: string,
    _notes?: string,
    _items?: IEmailItem[],
  ): Promise<void> {
    const title = `Houve um problema com seu <span style="color: #4A3B63;">Pagamento</span>.`;
    const content = `
      Olá, ${name}.<br><br>
      Infelizmente, nosso processador de pagamentos não pôde autorizar a transação para o seu pedido <strong>#${orderId.slice(0, 8)}</strong>.<br><br>
      <strong>Motivo:</strong> ${reason || 'Não foi possível processar o cartão informado.'}<br><br>
      Você pode tentar realizar o pagamento novamente utilizando um novo método ou entrar em contato com seu banco.
    `;
    const text = `Pagamento recusado para o pedido #${orderId.slice(0, 8)}.`;
    const subject = `Problema no Pagamento - #${orderId.slice(0, 8)}`;
    const checkoutUrl = `${env.FRONTEND_URL}/checkout?orderId=${orderId}`;

    await this.send(
      to,
      name,
      subject,
      this.getHtmlTemplate(title, content, 'Tentar Novamente', checkoutUrl),
      text,
    );
  }

  async sendOrderShipped(
    to: string,
    name: string,
    orderId: string,
    trackingCode: string,
    trackingUrl?: string,
    notes?: string,
    items?: IEmailItem[],
  ): Promise<void> {
    const title = `Seu pedido está a <span style="color: #4A3B63;">caminho</span>.`;
    const content = `
      Olá, ${name}.<br><br>
      Seu pedido <strong>#${orderId.slice(0, 8)}</strong> foi entregue à transportadora e já está em trânsito.<br><br>
      <strong>Código de Rastreio:</strong> ${trackingCode}
    `;
    const text = `Pedido #${orderId.slice(0, 8)} enviado. Rastreio: ${trackingCode}.`;

    // Se houver URL de rastreio, adicionamos como Botão (CTA)
    const ctaText = trackingUrl ? 'Acompanhar Entrega' : undefined;
    const ctaUrl = trackingUrl || undefined;

    await this.send(
      to,
      name,
      `Pedido em Trânsito #${orderId.slice(0, 8)}`,
      this.getHtmlTemplate(title, content, ctaText, ctaUrl, notes, items),
      text,
    );
  }

  async sendOrderDelivered(
    to: string,
    name: string,
    orderId: string,
    _notes?: string,
    _items?: IEmailItem[],
  ): Promise<void> {
    const title = `Pedido <span style="color: #4A3B63;">Entregue</span>.`;
    const content = `
      Olá, ${name}.<br><br>
      Seu pedido <strong>#${orderId.slice(0, 8)}</strong> foi entregue com sucesso.<br><br>
      Esperamos que você aproveite sua experiência com a <strong>Order</strong>.
    `;
    const text = `Pedido #${orderId.slice(0, 8)} entregue.`;
    await this.send(
      to,
      name,
      `Pedido Entregue - #${orderId.slice(0, 8)}`,
      this.getHtmlTemplate(title, content),
      text,
    );
  }

  async sendOrderCancelled(
    to: string,
    name: string,
    orderId: string,
    _notes?: string,
    _items?: IEmailItem[],
  ): Promise<void> {
    const title = `Pedido <span style="color: #4A3B63;">Cancelado</span>.`;
    const content = `
      Olá, ${name}.<br><br>
      Informamos que o seu pedido <strong>#${orderId.slice(0, 8)}</strong> foi cancelado.<br><br>
      Se você não solicitou este cancelamento ou acredita que houve um erro, entre em contato com nosso suporte.
    `;
    const text = `Pedido #${orderId.slice(0, 8)} cancelado.`;
    await this.send(
      to,
      name,
      `Pedido Cancelado - #${orderId.slice(0, 8)}`,
      this.getHtmlTemplate(title, content),
      text,
    );
  }

  async sendOrderRefunded(
    to: string,
    name: string,
    orderId: string,
    _notes?: string,
    _items?: IEmailItem[],
  ): Promise<void> {
    const title = `O seu reembolso foi <span style="color: #4A3B63;">processado</span>.`;
    const content = `
      Olá, ${name}.<br><br>
      Conforme solicitado, o estorno do pagamento referente ao pedido <strong>#${orderId.slice(0, 8)}</strong> foi concluído.<br><br>
      O valor deverá aparecer em sua fatura ou conta conforme os prazos da sua operadora financeira.
    `;
    const text = `Reembolso processado para o pedido #${orderId.slice(0, 8)}.`;
    await this.send(
      to,
      name,
      `Reembolso Concluído - #${orderId.slice(0, 8)}`,
      this.getHtmlTemplate(title, content),
      text,
    );
  }

  /**
   * Envia e-mail de boas-vindas para clientes que compraram como convidado (Guest Checkout)
   * Inclui a senha gerada automaticamente para acesso futuro.
   */
  async sendGuestWelcomeEmail(to: string, name: string, password: string): Promise<void> {
    const title = `Uma nova experiência começa agora.`;
    const content = `
      Olá, ${name}.<br><br>
      Para facilitar o acompanhamento do seu pedido e futuras compras, criamos uma conta automática para você.<br><br>
      <strong>Acesse sua conta com os dados abaixo:</strong><br>
      <div style="margin: 20px 0; padding: 20px; background-color: #FAFAFA; border-radius: 4px; border: 1px dashed #DDD;">
        E-mail: ${to}<br>
        Senha Temporária: <strong style="color: #1A1A1A; font-family: monospace; font-size: 18px;">${password}</strong>
      </div>
      Recomendamos que você altere sua senha no primeiro acesso para total segurança.
    `;
    const text = `Sua conta na Order foi criada! Senha temporária: ${password}`;
    await this.send(
      to,
      name,
      `Sua conta foi criada! - Bem-vindo(a) à Order`,
      this.getHtmlTemplate(title, content, 'Fazer Primeiro Acesso', `${env.FRONTEND_URL}/login`),
      text,
    );
  }

  /**
   * Envia uma resposta direta a uma mensagem de contato recebida pelo site.
   */
  async sendContactResponseEmail(
    to: string,
    name: string,
    subject: string,
    originalMessage: string,
    responseText: string,
  ): Promise<void> {
    const title = `Recebemos sua mensagem. <span style="color: #4A3B63;">Esta é nossa resposta.</span>`;

    const content = `
      Olá, ${name}.<br><br>
      Agradecemos seu contato sobre o assunto: <strong>"${subject}"</strong>.<br><br>
      
      <div style="margin: 20px 0; padding: 25px; background-color: #FAFAFA; border-left: 3px solid #1A1A1A; border-radius: 4px;">
        <strong style="color: #1A1A1A; display: block; margin-bottom: 10px; font-size: 13px; text-transform: uppercase;">Nossa Resposta:</strong>
        <div style="color: #1A1A1A; font-size: 16px; line-height: 1.6;">
          "${responseText}"
        </div>
      </div>

      <div style="margin-top: 30px; font-size: 14px; color: #777;">
        <strong style="text-transform: uppercase; font-size: 11px;">Sua mensagem original:</strong><br>
        <em>"${originalMessage}"</em>
      </div>
    `;

    const text = `Recebemos sua mensagem. Nossa resposta: ${responseText}`;
    await this.send(
      to,
      name,
      `Re: ${subject} - Suporte Order`,
      this.getHtmlTemplate(title, content),
      text,
    );
  }

  /**
   * Envia e-mail de recuperação de senha com código de verificação.
   */
  async sendPasswordResetEmail(to: string, name: string, code: string): Promise<void> {
    const deepLink = `${env.FRONTEND_URL}/forgot-password?email=${encodeURIComponent(to)}&code=${code}`;
    const title = `Recuperação de <span style="color: #4A3B63;">Acesso</span>.`;
    const content = `
      Olá, ${name}.<br><br>
      Recebemos uma solicitação para redefinir a senha da sua conta na <strong>Order</strong>.<br><br>
      Utilize o botão abaixo para confirmar automaticamente ou insira o código manualmente se preferir:<br>
      <div style="margin: 35px 0; padding: 40px; background-color: #F8F9FA; border-radius: 8px; border: 1px solid #E9ECEF; text-align: center;">
        <div style="font-family: 'Courier New', Courier, monospace; font-size: 48px; font-weight: 700; letter-spacing: 0.25em; color: #1A1A1A; margin-bottom: 10px;">
          ${code}
        </div>
        <div style="font-size: 11px; color: #A0A0A0; text-transform: uppercase; letter-spacing: 0.1em;">
          Código de Verificação Temporário
        </div>
      </div>
      Este código expira em <strong>15 minutos</strong> por motivos de segurança.<br><br>
      Se você não solicitou esta alteração, nenhuma ação é necessária.
    `;
    const text = `Seu código de recuperação de senha da Order é: ${code}. Link: ${deepLink}`;

    await this.send(
      to,
      name,
      `Código de Recuperação: ${code} - Order`,
      this.getHtmlTemplate(title, content, 'Confirmar e Redefinir', deepLink),
      text,
    );
  }

  /**
   * Envia um código de verificação de e-mail (Checkout ou Cadastro)
   */
  async sendEmailVerificationEmail(email: string, code: string): Promise<void> {
    const title = `Verifique seu <span style="color: #4A3B63;">E-mail</span> para Prosseguir.`;
    const content = `
      Olá.<br><br>
      Para garantir a segurança dos seus dados e que você receba todas as atualizações do seu pedido, precisamos confirmar seu e-mail.<br><br>
      Insira o código abaixo no checkout para finalizar sua compra:<br>
      <div style="margin: 35px 0; padding: 40px; background-color: #F8F9FA; border-radius: 8px; border: 1px solid #E9ECEF; text-align: center;">
        <div style="font-family: 'Courier New', Courier, monospace; font-size: 48px; font-weight: 700; letter-spacing: 0.25em; color: #1A1A1A; margin-bottom: 10px;">
          ${code}
        </div>
        <div style="font-size: 11px; color: #A0A0A0; text-transform: uppercase; letter-spacing: 0.1em;">
          Código de Verificação de Checkout
        </div>
      </div>
      Este código é válido por <strong>15 minutos</strong>.<br><br>
      Se você não está realizando uma compra em nossa loja, por favor ignore este e-mail.
    `;
    const text = `Seu código de verificação para o checkout na Order é: ${code}. Válido por 15 minutos.`;

    await this.send(
      email,
      'Cliente',
      `Código de Confirmação: ${code}`,
      this.getHtmlTemplate(title, content),
      text,
    );
  }

  /**
   * Envia notificação interna para a administração avisando sobre uma nova mensagem de contato.
   * Destinatário: orderstoreco@gmail.com
   */
  async sendInternalContactNotification(data: {
    name: string;
    email: string;
    phone?: string;
    subject: string;
    message: string;
  }): Promise<void> {
    const title = `📩 <span style="color: #4A3B63;">NOVA MENSAGEM DE CONTATO</span>`;

    const content = `
      <strong>Você recebeu uma nova mensagem através do site!</strong><br><br>
      <div style="background-color: #FAFAFA; padding: 25px; border-radius: 12px; border: 1px solid #EEEEEE;">
        <strong style="color: #5A4373; text-transform: uppercase; font-size: 11px; letter-spacing: 0.1em; display: block; margin-bottom: 12px;">Dados do Remetente</strong>
        <p style="margin: 0 0 8px 0; font-size: 15px; color: #111;"><strong>Nome:</strong> ${data.name}</p>
        <p style="margin: 0 0 8px 0; font-size: 15px; color: #111;"><strong>E-mail:</strong> ${data.email}</p>
        <p style="margin: 0 0 16px 0; font-size: 15px; color: #111;"><strong>Telefone:</strong> ${data.phone || 'Não informado'}</p>
        
        <strong style="color: #5A4373; text-transform: uppercase; font-size: 11px; letter-spacing: 0.1em; display: block; margin-bottom: 12px; border-top: 1px solid #EEEEEE; pt-16 mt-16">Conteúdo da Mensagem</strong>
        <p style="margin: 0 0 8px 0; font-size: 15px; color: #111;"><strong>Assunto:</strong> ${data.subject}</p>
        <div style="margin-top: 12px; padding: 15px; background-color: #FFFFFF; border: 1px solid #EEEEEE; border-radius: 8px; color: #444; font-size: 15px; line-height: 1.6;">
          "${data.message}"
        </div>
      </div>
    `;

    const subject = `[CONTATO SITE] ${data.subject} - ${data.name}`;
    await this.send(
      'orderstoreco@gmail.com',
      'Admin Order Store',
      subject,
      this.getHtmlTemplate(
        title,
        content,
        'Ver no Painel Admin',
        `${env.FRONTEND_URL}/admin/contacts`,
        'Resposta imediata sugerida',
      ),
      `Nova mensagem de ${data.name}: ${data.subject}`,
    );
  }
}
