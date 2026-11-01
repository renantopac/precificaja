/**
 * Gera um pedido "pago" localmente e imprime a URL de download.
 * Só para testar a entrega do kit SEM Mercado Pago.
 * NÃO use em produção pública.
 */
import { createId } from '../server/id.js';
import { upsertOrder, signDownloadToken } from '../server/orders.js';
import { config } from '../server/config.js';

const orderId = createId(12);
upsertOrder({
  id: orderId,
  email: 'demo@precificaja.local',
  status: 'paid',
  paidAt: new Date().toISOString(),
  amount: config.product.priceBRL,
  productId: config.product.id,
  note: 'demo-unlock',
});

const token = signDownloadToken(orderId, Date.now() + 1000 * 60 * 60);
const url = `${config.publicUrl}/api/download?token=${encodeURIComponent(token)}`;
console.log('Pedido demo:', orderId);
console.log('Download:', url);
