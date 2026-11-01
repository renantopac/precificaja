import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createHmac, timingSafeEqual } from 'crypto';
import { config } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
const ordersPath = join(dataDir, 'orders.json');

function ensureStore() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(ordersPath)) writeFileSync(ordersPath, '[]', 'utf8');
}

function readOrders() {
  ensureStore();
  try {
    return JSON.parse(readFileSync(ordersPath, 'utf8'));
  } catch {
    return [];
  }
}

function writeOrders(orders) {
  ensureStore();
  writeFileSync(ordersPath, JSON.stringify(orders, null, 2), 'utf8');
}

export function upsertOrder(order) {
  const orders = readOrders();
  const idx = orders.findIndex((o) => o.id === order.id);
  if (idx >= 0) orders[idx] = { ...orders[idx], ...order };
  else orders.push(order);
  writeOrders(orders);
  return order;
}

export function findOrder(id) {
  return readOrders().find((o) => o.id === id) || null;
}

export function findByPreferenceId(preferenceId) {
  return readOrders().find((o) => o.preferenceId === preferenceId) || null;
}

export function findByPaymentId(paymentId) {
  return readOrders().find((o) => String(o.paymentId) === String(paymentId)) || null;
}

export function markPaid(orderId, paymentMeta = {}) {
  const order = findOrder(orderId);
  if (!order) return null;
  return upsertOrder({
    ...order,
    status: 'paid',
    paidAt: new Date().toISOString(),
    ...paymentMeta,
  });
}

export function signDownloadToken(orderId, expiresAt) {
  const payload = `${orderId}.${expiresAt}`;
  const sig = createHmac('sha256', config.downloadSecret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyDownloadToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return { ok: false, reason: 'token_invalido' };
  const [orderId, expiresAt, sig] = parts;
  const expected = createHmac('sha256', config.downloadSecret)
    .update(`${orderId}.${expiresAt}`)
    .digest('hex');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, reason: 'assinatura_invalida' };
    }
  } catch {
    return { ok: false, reason: 'assinatura_invalida' };
  }
  if (Date.now() > Number(expiresAt)) {
    return { ok: false, reason: 'expirado' };
  }
  const order = findOrder(orderId);
  if (!order || order.status !== 'paid') {
    return { ok: false, reason: 'pedido_nao_pago' };
  }
  return { ok: true, order };
}
