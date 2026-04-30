# ⚠️ IMPORTANTE: Configure estas variáveis no Railway Dashboard
# Railway → Seu Projeto → Variables

# ====================
# 🌐 FRONTEND & CORS
# ====================
NODE_ENV=production
FRONTEND_URL=https://ordersc.com.br

# ====================
# 🗄️ DATABASE
# ====================
# Railway fornece automaticamente DATABASE_URL, mas você pode usar estas também:
DB_HOST=<railway-postgres-host>
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<railway-generated-password>
DB_NAME=railway

# ====================
# 🔐 SECURITY
# ====================
JWT_SECRET=<gerar-com-crypto-randomBytes-64>
# Gerar: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# ====================
# 💳 MERCADO PAGO
# ====================
MERCADOPAGO_ACCESS_TOKEN=<seu-access-token-de-producao>
MERCADOPAGO_WEBHOOK_SECRET=<seu-webhook-secret>

# ====================
# 📧 MAILJET
# ====================
MAILJET_API_KEY=<sua-api-key>
MAILJET_API_SECRET=<seu-api-secret>
MAILJET_SENDER_EMAIL=orderstoreco@gmail.com
MAILJET_SENDER_NAME=ORDER

# ====================
# 🔍 GOOGLE RECAPTCHA
# ====================
RECAPTCHA_SECRET_KEY=<sua-secret-key>

# ====================
# 🚀 SERVER
# ====================
PORT=3000
