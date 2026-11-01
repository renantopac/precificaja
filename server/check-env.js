import { config, hasMercadoPago } from './config.js';

const checks = [
  {
    ok: hasMercadoPago(),
    label: 'MP_ACCESS_TOKEN (produção)',
    fix: 'Cole o Access Token de PRODUÇÃO do Mercado Pago em .env',
  },
  {
    ok: Boolean(config.publicUrl) && !config.publicUrl.includes('localhost'),
    label: 'PUBLIC_URL (domínio público)',
    fix: 'Defina PUBLIC_URL com a URL HTTPS do deploy (necessário para webhook/retorno)',
  },
  {
    ok: config.downloadSecret && !config.downloadSecret.includes('troque-por'),
    label: 'DOWNLOAD_SECRET',
    fix: 'Troque DOWNLOAD_SECRET por uma string longa aleatória',
  },
];

console.log('\nPrecificaJá — checklist de ambiente\n');
for (const c of checks) {
  console.log(`${c.ok ? '[OK]' : '[ ]'} ${c.label}`);
  if (!c.ok) console.log(`     → ${c.fix}`);
}
console.log(`\nPIX do dono (docs): ${config.ownerPixKey} (${config.ownerPixKeyType})`);
console.log(`Preço do kit: R$ ${config.product.priceBRL.toFixed(2).replace('.', ',')}`);
console.log(`Pronto para vender via MP: ${hasMercadoPago() ? 'PARCIAL — falta deploy + webhook' : 'NÃO — falta token MP'}\n`);
process.exit(checks.every((c) => c.ok) ? 0 : 1);
