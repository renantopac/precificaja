import { config } from './config.js';

const MP_API = 'https://api.mercadopago.com';

async function mpFetch(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${MP_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.mpAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || res.statusText;
    const err = new Error(`Mercado Pago ${res.status}: ${msg}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function createPreference(body) {
  return mpFetch('/checkout/preferences', { method: 'POST', body });
}

export function getPayment(paymentId) {
  return mpFetch(`/v1/payments/${paymentId}`);
}
