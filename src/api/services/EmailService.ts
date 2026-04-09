import Mailjet from 'node-mailjet';
import { env } from '../../config/env';
import winston from 'winston';
import fs from 'fs';
import path from 'path';

/**
 * Serviço responsável pelo envio de e-mails transacionais utilizando Mailjet.
 */
export class EmailService {
  private mailjet: Mailjet;
  private logoBase64: string = '';

  constructor() {
    this.mailjet = new Mailjet({
      apiKey: env.MAILJET_API_KEY,
      apiSecret: env.MAILJET_API_SECRET,
    });

    // Carregar a imagem da empresa para anexar via CID (mais profissional e confiável)
    try {
      const logoPath = path.join(process.cwd(), 'order.png');
      if (fs.existsSync(logoPath)) {
        this.logoBase64 = fs.readFileSync(logoPath).toString('base64');
      }
    } catch (error: any) {
      winston.error(`Erro ao carregar order.png: ${error.message}`);
    }
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
              <html lang="pt-BR">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <style>
                    /* Importando fonte premium se o cliente suportar */
                    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&display=swap');

                    body {
                      margin: 0;
                      padding: 0;
                      background-color: #F8F7F2; /* Tom creme suave e sofisticado */
                      -webkit-font-smoothing: antialiased;
                    }

                    .wrapper {
                      width: 100%;
                      table-layout: fixed;
                      background-color: #F8F7F2;
                      padding-bottom: 60px;
                      padding-top: 40px;
                    }

                    .container {
                      max-width: 600px;
                      margin: 0 auto;
                      background-color: #ffffff;
                      border-radius: 16px;
                      overflow: hidden;
                      box-shadow: 0 10px 30px rgba(0,0,0,0.03);
                    }

                    .header-image {
                      width: 100%;
                      aspect-ratio: 16/9;
                      display: block;
                      object-fit: cover;
                    }

                    .content {
                      padding: 48px 40px;
                      font-family: 'Outfit', 'Helvetica Neue', Helvetica, Arial, sans-serif;
                      color: #2D2D2D;
                    }

                    h1 {
                      font-size: 28px;
                      font-weight: 600;
                      letter-spacing: -0.02em;
                      margin: 0 0 24px 0;
                      color: #1A1A1A;
                      text-align: left;
                    }

                    .welcome-text {
                      font-size: 17px;
                      line-height: 1.7;
                      color: #4A4A4A;
                      margin-bottom: 32px;
                      font-weight: 300;
                    }

                    .highlight {
                      color: #4A3B63; /* Cor do logotipo Ordem */
                      font-weight: 600;
                    }

                    .cta-container {
                      margin: 40px 0;
                      text-align: left;
                    }

                    .cta-button {
                      background-color: #1A1A1A; /* Preto minimalista */
                      color: #ffffff !important;
                      padding: 18px 36px;
                      text-decoration: none;
                      border-radius: 8px;
                      font-size: 15px;
                      font-weight: 500;
                      display: inline-block;
                      letter-spacing: 0.05em;
                      text-transform: uppercase;
                      transition: opacity 0.2s;
                    }

                    .divider {
                      height: 1px;
                      background-color: #F0F0F0;
                      margin: 40px 0;
                    }

                    .footer {
                      font-family: 'Outfit', sans-serif;
                      padding: 0 40px 48px 40px;
                      font-size: 12px;
                      color: #A0A0A0;
                      text-align: left;
                      line-height: 1.6;
                    }

                    .brand-story {
                      font-style: italic;
                      color: #808080;
                      margin-bottom: 24px;
                      display: block;
                    }

                    .unsub {
                      color: #A0A0A0;
                      text-decoration: underline;
                    }

                    /* Responsividade */
                    @media screen and (max-width: 600px) {
                      .content {
                        padding: 32px 24px;
                      }
                      h1 {
                        font-size: 24px;
                      }
                    }
                  </style>
                </head>
                <body>
                  <div class="wrapper">
                    <div class="container">
                      <img src="cid:company-logo" alt="Order" class="header-image">
                      
                      <div class="content">
                        <h1>Sua jornada com a <span class="highlight">Order</span> começa agora.</h1>
                        
                        <div class="welcome-text">
                          Olá, ${name}.<br><br>
                          É um prazer receber você. Na <strong>Order</strong>, acreditamos que a simplicidade é o auge da sofisticação. Nossa missão é transformar a complexidade da gestão em uma experiência fluida, autêntica e, acima de tudo, humana.<br><br>
                          Sua conta foi criada com sucesso. Estamos prontos para elevar o seu padrão de operação daqui em diante.
                        </div>
                        
                        <div class="cta-container">
                          <a href="${env.FRONTEND_URL}/login" class="cta-button">Explorar Plataforma</a>
                        </div>
                      </div>

                      <div class="footer">
                        © ${new Date().getFullYear()} Order - Inteligência em Gestão de Pedidos.<br>
                        Este é um e-mail transacional enviado para confirmar seu cadastro.<br>
                        <a href="${env.FRONTEND_URL}" class="unsub">Visite nosso manifesto</a>
                      </div>
                    </div>
                  </div>
                </body>
              </html>
            `,
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

      winston.info(`E-mail de boas-vindas enviado para ${to}. ID: ${result.response.status}`);
    } catch (error: any) {
      winston.error(`Erro ao enviar e-mail para ${to}: ${error.message}`);
    }
  }
}
