import Mailjet from 'node-mailjet';
import { env } from '../../config/env';
import winston from 'winston';
import fs from 'fs';
import path from 'path';

/**
 * Serviço responsável pelo envio de e-mails transacionais utilizando Mailjet.
 * Utiliza um design premium, minimalista e profissional.
 */
export class EmailService {
  private mailjet: Mailjet;
  private logoBase64: string = '';

  constructor() {
    this.mailjet = new Mailjet({
      apiKey: env.MAILJET_API_KEY,
      apiSecret: env.MAILJET_API_SECRET,
    });

    // Carregar a imagem da empresa para anexar via CID
    try {
      const logoPath = path.join(process.cwd(), 'order.png');
      if (fs.existsSync(logoPath)) {
        this.logoBase64 = fs.readFileSync(logoPath).toString('base64');
        winston.info('🎨 EmailService: Imagem order.png carregada com sucesso para os e-mails.');
      } else {
        winston.warn('⚠️ EmailService: Imagem order.png NÃO encontrada no diretório raiz.');
      }
    } catch (error: any) {
      winston.error(`❌ EmailService: Erro crítico ao carregar order.png: ${error.message}`);
    }
  }

  /**
   * Layout Premium Base
   */
  private getHtmlTemplate(title: string, content: string, ctaText?: string, ctaUrl?: string, notes?: string, items?: any[]): string {
    const year = new Date().getFullYear();

    // Botão de Call to Action
    const ctaHtml = ctaText && ctaUrl
      ? `<div style="margin-top: 40px; text-align: left;">
          <a href="${ctaUrl}" style="background-color: #1A1A1A; color: #ffffff !important; padding: 18px 36px; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 500; display: inline-block; letter-spacing: 0.1em; text-transform: uppercase;">
            ${ctaText}
          </a>
        </div>`
      : '';

    // Seção de Observações (Notas)
    const notesHtml = notes
      ? `<div style="margin-top: 35px; padding: 25px; background-color: #FAFAFA; border-left: 2px solid #1A1A1A; font-size: 14px; color: #555555; line-height: 1.6;">
          <strong style="color: #1A1A1A; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; display: block; margin-bottom: 8px;">Mensagem do Sistema / Notas:</strong>
          ${notes}
        </div>`
      : '';

    // Tabela de Itens (Opcional)
    let itemsHtml = '';
    if (items && items.length > 0) {
      itemsHtml = `
        <div style="margin-top: 45px; border-top: 1px solid #EEEEEE; padding-top: 30px;">
          <strong style="font-size: 11px; color: #A0A0A0; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 20px;">Resumo do Pedido</strong>
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px; color: #4A4A4A;">
            ${items.map(item => `
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #F9F9F9;">
                  <span style="color: #1A1A1A; font-weight: 500;">${item.product?.name || 'Produto'}</span><br>
                  <span style="font-size: 12px; color: #A0A0A0;">Qtd: ${item.quantity}</span>
                </td>
                <td align="right" style="padding: 12px 0; border-bottom: 1px solid #F9F9F9; color: #1A1A1A;">
                  ${((item.unitPrice || 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
              </tr>
            `).join('')}
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
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap');
          </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: #F9F9F9; font-family: 'Outfit', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1A1A1A; -webkit-font-smoothing: antialiased;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F9F9F9; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 0; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.03);">
                  <!-- Header Image -->
                  <tr>
                    <td>
                      <img src="cid:company-logo" alt="Order" width="600" style="width: 100%; height: auto; display: block; object-fit: cover;">
                    </td>
                  </tr>
                  <!-- Content Body -->
                  <tr>
                    <td style="padding: 60px 50px;">
                      <h1 style="font-size: 32px; font-weight: 600; line-height: 1.2; margin: 0 0 30px 0; letter-spacing: -0.03em; color: #1A1A1A;">
                        ${title}
                      </h1>
                      <div style="font-size: 17px; line-height: 1.8; color: #4A4A4A; font-weight: 300;">
                        ${content}
                      </div>
                      ${notesHtml}
                      ${itemsHtml}
                      ${ctaHtml}
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 0 50px 60px 50px; border-top: 1px solid #F0F0F0;">
                      <div style="padding-top: 40px; font-size: 11px; color: #A0A0A0; letter-spacing: 0.05em; line-height: 1.8;">
                        © ${year} ORDER. ESTE É UM E-MAIL TRANSACIONAL AUTOMÁTICO.<br>
                        A SIMPLICIDADE É O AUGE DA SOFISTICAÇÃO.<br><br>
                        <a href="${env.FRONTEND_URL}" style="color: #A0A0A0; text-decoration: underline;">VISITE NOSSO MANIFESTO</a>
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

  private async send(to: string, name: string, subject: string, html: string, text?: string): Promise<void> {
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
            InlinedAttachments: this.logoBase64 ? [
              {
                ContentType: 'image/png',
                Filename: 'order.png',
                Base64Content: this.logoBase64,
                ContentID: 'company-logo',
              }
            ] : [],
          },
        ],
      });
      const body = result.body as any;
      const messageId = body.Messages[0].To[0].MessageID;
      winston.info(`E-mail enviado para ${to}. Status: ${result.response.status}. MessageID: ${messageId}`);
    } catch (error: any) {
      winston.error(`Erro ao enviar e-mail para ${to}: ${error.message}`);
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
    await this.send(to, name, `Bem-vindo(a), ${name}!`, this.getHtmlTemplate(title, content, 'Explorar Plataforma', `${env.FRONTEND_URL}/login`), text);
  }

  async sendOrderConfirmation(to: string, name: string, orderId: string, totalAmount: number, notes?: string, items?: any[], isAccountLinked: boolean = false): Promise<void> {
    const formattedTotal = (totalAmount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const title = `Pedido Recebido. <span style="color: #4A3B63;">#${orderId.slice(0, 8)}</span>`;

    let linkNotice = '';
    if (isAccountLinked) {
      linkNotice = `<br><br><div style="padding: 15px; background-color: #F0F7FF; border-left: 3px solid #007BFF; color: #0056B3; font-size: 14px;">
        <strong>Sincronização Automática:</strong> Identificamos que você já possui uma conta conosco. Este pedido foi vinculado ao seu histórico para sua conveniência.
      </div>`;
    }

    const content = `
      Olá, ${name}.<br><br>
      Seu pedido foi registrado em nosso sistema e está aguardando a confirmação do pagamento.<br><br>
      <strong>Valor Total: ${formattedTotal}</strong>
      ${linkNotice}
    `;
    const text = `Pedido #${orderId.slice(0, 8)} recebido. Total: ${formattedTotal}.`;
    await this.send(to, name, `Pedido Confirmado #${orderId.slice(0, 8)}`, this.getHtmlTemplate(title, content, 'Acompanhar Pedido', `${env.FRONTEND_URL}`), text);
  }

  /**
   * Envia notificação interna para a administração avisando sobre um novo pedido pago.
   * Destinatário: orderstoreco@gmail.com
   */
  async sendInternalOrderNotification(order: any): Promise<void> {
    const formattedTotal = (order.totalAmount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const title = `🚨 <span style="color: #4A3B63;">NOVO PEDIDO PAGO</span>`;

    const customerName = order.user?.name || 'Cliente';
    const customerEmail = order.guestEmail || order.user?.email || 'N/A';
    const customerDoc = order.user?.document || 'N/A';

    const addr = order.shippingAddress && order.shippingAddress.length > 0 
      ? order.shippingAddress[0] 
      : null;

    const addressStr = addr
      ? `${addr.street}, ${addr.city} - ${addr.state}. CEP: ${addr.zipCode}`
      : 'Não informado';

    const content = `
      <strong>Um novo pagamento foi confirmado!</strong><br><br>
      <div style="background-color: #FAFAFA; padding: 20px; border-radius: 4px; border: 1px solid #EEE;">
        <strong>ID do Pedido:</strong> #${order.id}<br>
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
      this.getHtmlTemplate(title, content, 'Ver no Painel Admin', `${env.FRONTEND_URL}`, 'Pedido pronto para processamento', order.items),
      `Novo pedido pago: #${order.id} de ${customerName}. Valor: ${formattedTotal}`
    );
  }

  async sendPaymentPending(to: string, name: string, orderId: string, notes?: string, items?: any[]): Promise<void> {
    const title = `Pagamento em <span style="color: #4A3B63;">Processamento</span>.`;
    const content = `
      Olá, ${name}.<br><br>
      O pagamento do seu pedido <strong>#${orderId.slice(0, 8)}</strong> foi recebido e está em análise pelo nosso sistema de segurança.<br><br>
      Assim que a transação for autorizada, você receberá uma nova confirmação por aqui.
    `;
    const text = `Pagamento do pedido #${orderId.slice(0, 8)} em processamento.`;
    await this.send(to, name, `Pagamento em Análise - #${orderId.slice(0, 8)}`, this.getHtmlTemplate(title, content, 'Ver Detalhes', `${env.FRONTEND_URL}`), text);
  }

  async sendPaymentApproved(to: string, name: string, orderId: string, notes?: string, items?: any[]): Promise<void> {
    const title = `Pagamento <span style="color: #4A3B63;">Confirmado</span>.`;
    const content = `
      Olá, ${name}.<br><br>
      Ótimas notícias. O pagamento do seu pedido <strong>#${orderId.slice(0, 8)}</strong> foi aprovado com sucesso.<br><br>
      Nossa equipe já está providenciando a separação e o envio dos seus produtos.
    `;
    const text = `Pagamento aprovado para o pedido #${orderId.slice(0, 8)}.`;
    await this.send(to, name, `Pagamento Aprovado - #${orderId.slice(0, 8)}`, this.getHtmlTemplate(title, content, 'Acompanhar Pedido', `${env.FRONTEND_URL}`), text);
  }

  async sendPaymentRejected(to: string, name: string, orderId: string, reason?: string, notes?: string, items?: any[]): Promise<void> {
    const title = `Houve um problema com seu <span style="color: #4A3B63;">Pagamento</span>.`;
    const content = `
      Olá, ${name}.<br><br>
      Infelizmente, nosso processador de pagamentos não pôde autorizar a transação para o seu pedido <strong>#${orderId.slice(0, 8)}</strong>.<br><br>
      <strong>Motivo:</strong> ${reason || 'Não foi possível processar o cartão informado.'}<br><br>
      Você pode tentar realizar o pagamento novamente utilizando um novo método ou entrar em contato com seu banco.
    `;
    const text = `Pagamento recusado para o pedido #${orderId.slice(0, 8)}.`;
    await this.send(to, name, `Problema no Pagamento - #${orderId.slice(0, 8)}`, this.getHtmlTemplate(title, content, 'Tentar Novamente', `${env.FRONTEND_URL}`), text);
  }

  async sendOrderShipped(to: string, name: string, orderId: string, trackingCode: string, trackingUrl?: string, notes?: string, items?: any[]): Promise<void> {
    const title = `Seu pedido está a <span style="color: #4A3B63;">caminho</span>.`;
    const content = `
      Olá, ${name}.<br><br>
      Seu pedido <strong>#${orderId.slice(0, 8)}</strong> foi entregue à transportadora e já está em trânsito.<br><br>
      <strong>Código de Rastreio:</strong> ${trackingCode}
    `;
    const text = `Pedido #${orderId.slice(0, 8)} enviado. Rastreio: ${trackingCode}.`;
    await this.send(to, name, `Pedido em Trânsito #${orderId.slice(0, 8)}`, this.getHtmlTemplate(title, content, 'Rastrear Entrega', trackingUrl || `${env.FRONTEND_URL}`, notes, items), text);
  }

  async sendOrderDelivered(to: string, name: string, orderId: string, notes?: string, items?: any[]): Promise<void> {
    const title = `Pedido <span style="color: #4A3B63;">Entregue</span>.`;
    const content = `
      Olá, ${name}.<br><br>
      Seu pedido <strong>#${orderId.slice(0, 8)}</strong> foi entregue com sucesso.<br><br>
      Esperamos que você aproveite sua experiência com a <strong>Order</strong>.
    `;
    const text = `Pedido #${orderId.slice(0, 8)} entregue.`;
    await this.send(to, name, `Pedido Entregue - #${orderId.slice(0, 8)}`, this.getHtmlTemplate(title, content, 'Avaliar Pedido', `${env.FRONTEND_URL}`), text);
  }

  async sendOrderCancelled(to: string, name: string, orderId: string, notes?: string, items?: any[]): Promise<void> {
    const title = `Pedido <span style="color: #4A3B63;">Cancelado</span>.`;
    const content = `
      Olá, ${name}.<br><br>
      Informamos que o seu pedido <strong>#${orderId.slice(0, 8)}</strong> foi cancelado.<br><br>
      Se você não solicitou este cancelamento ou acredita que houve um erro, entre em contato com nosso suporte.
    `;
    const text = `Pedido #${orderId.slice(0, 8)} cancelado.`;
    await this.send(to, name, `Pedido Cancelado - #${orderId.slice(0, 8)}`, this.getHtmlTemplate(title, content, 'Ver Detalhes', `${env.FRONTEND_URL}`), text);
  }

  async sendOrderRefunded(to: string, name: string, orderId: string, notes?: string, items?: any[]): Promise<void> {
    const title = `O seu reembolso foi <span style="color: #4A3B63;">processado</span>.`;
    const content = `
      Olá, ${name}.<br><br>
      Conforme solicitado, o estorno do pagamento referente ao pedido <strong>#${orderId.slice(0, 8)}</strong> foi concluído.<br><br>
      O valor deverá aparecer em sua fatura ou conta conforme os prazos da sua operadora financeira.
    `;
    const text = `Reembolso processado para o pedido #${orderId.slice(0, 8)}.`;
    await this.send(to, name, `Reembolso Concluído - #${orderId.slice(0, 8)}`, this.getHtmlTemplate(title, content, 'Ver Detalhes do Pedido', `${env.FRONTEND_URL}`), text);
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
      text
    );
  }

  /**
   * Envia uma resposta direta a uma mensagem de contato recebida pelo site.
   */
  async sendContactResponseEmail(to: string, name: string, subject: string, originalMessage: string, responseText: string): Promise<void> {
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
      this.getHtmlTemplate(title, content, 'Visitar nosso site', `${env.FRONTEND_URL}`),
      text
    );
  }
}
