import express from 'express';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { config, hasMercadoPago } from './config.js';
import { createId } from './id.js';
import { createPreference, getPayment } from './mp.js';
import {
  upsertOrder,
  findOrder,
  findByPreferenceId,
  markPaid,
  signDownloadToken,
  verifyDownloadToken,
} from './orders.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public');
const productDir = join(root, 'product');
const zipPath = join(productDir, 'PrecificaJa-Kit.zip');

function ensureKitZip() {
  if (existsSync(zipPath)) return true;
  try {
    execSync('node scripts/build-kit.js', { cwd: root, stdio: 'inherit' });
    return existsSync(zipPath);
  } catch {
    return false;
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDir));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    product: config.product.title,
    priceBRL: config.product.priceBRL,
    mercadoPagoReady: hasMercadoPago(),
    publicUrl: config.publicUrl,
    kitReady: existsSync(zipPath),
  });
});

app.get('/api/offer', (_req, res) => {
  res.json({
    id: config.product.id,
    title: config.product.title,
    description: config.product.description,
    priceBRL: config.product.priceBRL,
    currency: config.product.currency,
    paymentReady: hasMercadoPago(),
    includes: [
      'Planilha de precificação (CSV + instruções Google Sheets/Excel)',
      'Guia prático: como precificar serviços no Brasil',
      '3 templates de proposta comercial prontos para copiar',
      'Checklist de uso no LEIA-ME do kit',
    ],
  });
});

app.post('/api/checkout', async (req, res) => {
  try {
    if (!hasMercadoPago()) {
      return res.status(503).json({
        error: 'checkout_indisponivel',
        message:
          'Mercado Pago ainda não configurado. O dono precisa colar MP_ACCESS_TOKEN no .env e reiniciar.',
        blockers: [
          'Criar conta vendedor no Mercado Pago',
          'Criar app em developers.mercadopago.com.br',
          'Colar Access Token de PRODUÇÃO no .env',
          'Fazer deploy com PUBLIC_URL HTTPS',
        ],
        manualPix: {
          key: config.ownerPixKey,
          type: config.ownerPixKeyType,
          note: 'Fallback manual: só use se o dono confirmar pagamentos à mão. Preferir Checkout MP.',
        },
      });
    }

    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'email_obrigatorio' });
    }

    const orderId = createId(12);

    const preferenceBody = {
      items: [
        {
          id: config.product.id,
          title: config.product.title,
          description: config.product.description,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: config.product.priceBRL,
        },
      ],
      payer: { email },
      external_reference: orderId,
      statement_descriptor: 'PRECIFICJA',
      payment_methods: {
        installments: 1,
      },
      back_urls: {
        success: `${config.publicUrl}/sucesso.html?order=${orderId}`,
        failure: `${config.publicUrl}/?pago=falhou`,
        pending: `${config.publicUrl}/sucesso.html?order=${orderId}&pending=1`,
      },
      metadata: { orderId, productId: config.product.id },
    };

    if (!config.publicUrl.includes('localhost')) {
      preferenceBody.auto_return = 'approved';
      preferenceBody.notification_url = `${config.publicUrl}/api/webhooks/mercadopago`;
    }

    const result = await createPreference(preferenceBody);

    upsertOrder({
      id: orderId,
      email,
      status: 'pending',
      preferenceId: result.id,
      initPoint: result.init_point,
      sandboxInitPoint: result.sandbox_init_point,
      createdAt: new Date().toISOString(),
      amount: config.product.priceBRL,
      productId: config.product.id,
    });

    res.json({
      orderId,
      checkoutUrl: result.init_point,
      preferenceId: result.id,
    });
  } catch (err) {
    console.error('checkout_error', err);
    res.status(500).json({
      error: 'checkout_falhou',
      message: err?.message || 'Falha ao criar preferência no Mercado Pago',
    });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  const order = findOrder(req.params.id);
  if (!order) return res.status(404).json({ error: 'pedido_nao_encontrado' });

  const paymentId = req.query.payment_id || req.query.collection_id;
  if (paymentId && order.status !== 'paid' && hasMercadoPago()) {
    try {
      const payment = await getPayment(paymentId);
      if (payment?.status === 'approved') {
        markPaid(order.id, {
          paymentId: payment.id,
          paymentStatus: payment.status,
          paymentMethod: payment.payment_method_id,
        });
      }
    } catch (err) {
      console.error('sync_payment_error', err?.message);
    }
  }

  const fresh = findOrder(req.params.id);
  let downloadUrl = null;
  if (fresh.status === 'paid') {
    const expiresAt = Date.now() + 1000 * 60 * 60 * 72;
    const token = signDownloadToken(fresh.id, expiresAt);
    downloadUrl = `/api/download?token=${encodeURIComponent(token)}`;
  }

  res.json({
    id: fresh.id,
    status: fresh.status,
    email: fresh.email,
    amount: fresh.amount,
    paidAt: fresh.paidAt || null,
    downloadUrl,
  });
});

app.post('/api/webhooks/mercadopago', async (req, res) => {
  res.sendStatus(200);

  try {
    const topic = req.query.type || req.query.topic || req.body?.type;
    const dataId = req.query['data.id'] || req.body?.data?.id || req.query.id;

    if ((topic === 'payment' || topic === 'payment.created' || topic === 'payment.updated') && dataId) {
      const payment = await getPayment(dataId);
      if (!payment) return;

      const orderId =
        payment.external_reference ||
        payment.metadata?.orderId ||
        findByPreferenceId(payment.order?.id || payment.preference_id)?.id;

      if (orderId && payment.status === 'approved') {
        markPaid(orderId, {
          paymentId: payment.id,
          paymentStatus: payment.status,
          paymentMethod: payment.payment_method_id,
        });
        console.log(`[pago] order=${orderId} payment=${payment.id} method=${payment.payment_method_id}`);
      }
    }
  } catch (err) {
    console.error('webhook_error', err?.message || err);
  }
});

app.get('/api/download', (req, res) => {
  const verified = verifyDownloadToken(req.query.token);
  if (!verified.ok) {
    return res
      .status(403)
      .send(
        `Download indisponível (${verified.reason}). Se você pagou, abra o link da página de sucesso novamente.`
      );
  }

  if (!ensureKitZip()) {
    return res.status(500).send('Kit ainda não gerado no servidor. Rode npm run build:kit.');
  }

  res.download(zipPath, 'PrecificaJa-Kit.zip');
});

app.listen(config.port, () => {
  ensureKitZip();
  console.log(`\nPrecificaJá rodando em http://localhost:${config.port}`);
  console.log(`Mercado Pago: ${hasMercadoPago() ? 'CONFIGURADO' : 'AUSENTE (configure .env)'}`);
  console.log(`PUBLIC_URL: ${config.publicUrl}\n`);
});
