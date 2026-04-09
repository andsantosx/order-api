import Mailjet from 'node-mailjet';
import { env } from '../../config/env';
import winston from 'winston';

/**
 * Serviço responsável pelo envio de e-mails transacionais utilizando Mailjet.
 */
export class EmailService {
  private mailjet: Mailjet;

  constructor() {
    this.mailjet = new Mailjet({
      apiKey: env.MAILJET_API_KEY,
      apiSecret: env.MAILJET_API_SECRET,
    });
  }

  /**
   * Envia um e-mail de boas-vindas para um novo usuário.
   * 
   * @param to - E-mail do destinatário
   * @param name - Nome do destinatário
   */
  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    try {
      const result = await this.mailjet.post('send', { version: 'v3.1' }).request({
        Messages: [
          {
            From: {
              Email: env.MAILJET_SENDER_EMAIL,
              Name: env.MAILJET_SENDER_NAME,
            },
            To: [
              {
                Email: to,
                Name: name,
              },
            ],
            Subject: `Bem-vindo(a), ${name}!`,
            TextPart: `Olá ${name}, seja muito bem-vindo à nossa plataforma! Estamos felizes em ter você conosco.`,
            HTMLPart: `
              <!DOCTYPE html>
              <html>
                <head>
                  <style>
                    .container {
                      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                      color: #2D3748;
                      max-width: 600px;
                      margin: 0 auto;
                      padding: 0;
                      border: 1px solid #E2E8F0;
                      border-radius: 8px;
                      overflow: hidden;
                    }
                    .header-image {
                      width: 100%;
                      aspect-ratio: 16/9;
                      display: block;
                      object-fit: cover;
                    }
                    .content {
                      padding: 40px;
                      background-color: #ffffff;
                    }
                    h1 {
                      color: #1A202C;
                      font-size: 24px;
                      font-weight: 700;
                      margin-bottom: 24px;
                      text-align: center;
                    }
                    p {
                      font-size: 16px;
                      line-height: 1.6;
                      margin-bottom: 20px;
                    }
                    .button-container {
                      text-align: center;
                      margin: 40px 0;
                    }
                    .button {
                      background-color: #4C51BF;
                      color: #ffffff !important;
                      padding: 16px 32px;
                      text-decoration: none;
                      border-radius: 6px;
                      font-weight: 600;
                      display: inline-block;
                      transition: background-color 0.2s;
                    }
                    .footer {
                      background-color: #F7FAFC;
                      padding: 24px;
                      text-align: center;
                      font-size: 12px;
                      color: #718096;
                    }
                    .footer p {
                      margin-bottom: 8px;
                      font-size: 12px;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <!-- Note: A imagem deve estar hospedada em um local público -->
                    <img src="${env.FRONTEND_URL}/order.png" alt="Order Company" class="header-image">
                    
                    <div class="content">
                      <h1>Seja bem-vindo à Order, ${name}!</h1>
                      <p>Olá <strong>${name}</strong>,</p>
                      <p>É um prazer ter você conosco. Sua conta foi criada com sucesso e agora você faz parte da nossa comunidade.</p>
                      <p>Na Order, estamos comprometidos em oferecer a melhor experiência de gestão de pedidos, com tecnologia de ponta e um design pensado para facilitar o seu dia a dia.</p>
                      
                      <div class="button-container">
                        <a href="${env.FRONTEND_URL}/login" class="button">Começar Agora</a>
                      </div>
                      
                      <p>Se tiver qualquer dúvida, basta responder a este e-mail. Nossa equipe de suporte está pronta para te ajudar.</p>
                    </div>
                    
                    <div class="footer">
                      <p>© ${new Date().getFullYear()} Order - Todos os direitos reservados.</p>
                      <p>Esta é uma mensagem automática, por favor não responda.</p>
                      <p><a href="${env.FRONTEND_URL}" style="color: #718096; text-decoration: underline;">Visite nosso site</a></p>
                    </div>
                  </div>
                </body>
              </html>
            `,
          },
        ],
      });

      winston.info(`E-mail de boas-vindas enviado para ${to}. ID: ${result.response.status}`);
    } catch (error: any) {
      winston.error(`Erro ao enviar e-mail para ${to}: ${error.message}`);
      // Não lançamos o erro para não quebrar o fluxo principal de registro
    }
  }
}
