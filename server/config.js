import './load-env.js';

export const config = {
  port: Number(process.env.PORT || 3000),
  publicUrl: (process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/$/, ''),
  mpAccessToken: process.env.MP_ACCESS_TOKEN || '',
  downloadSecret: process.env.DOWNLOAD_SECRET || 'dev-only-change-me',
  ownerPixKey: process.env.OWNER_PIX_KEY || '11986637470',
  ownerPixKeyType: process.env.OWNER_PIX_KEY_TYPE || 'telefone',
  product: {
    id: 'kit-precificaja-v1',
    title: 'PrecificaJá — Kit Completo de Precificação',
    description:
      'Planilha de precificação + guia prático + 3 templates de proposta comercial para freelancers e MEIs no Brasil.',
    priceBRL: 29.9,
    currency: 'BRL',
  },
};

export function hasMercadoPago() {
  return Boolean(
    config.mpAccessToken &&
      !config.mpAccessToken.includes('cole-seu-token') &&
      config.mpAccessToken.startsWith('APP_USR-')
  );
}
