const cfg = window.PRECIFICAJA || {
  priceLabel: 'R$ 29,90',
  pixKey: '11986637470',
  pixKeyDisplay: '1198663-7470',
  whatsapp: '5511986637470',
  mercadoPagoCheckoutUrl: '',
};

const money = (n) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function recalc() {
  const custos = Number(document.getElementById('custos')?.value || 0);
  const horas = Math.max(1, Number(document.getElementById('horas')?.value || 1));
  const margem = Math.max(1, Number(document.getElementById('margem')?.value || 1));
  const piso = custos / horas;
  const rec = piso * margem;

  const outPiso = document.getElementById('outPiso');
  const outRec = document.getElementById('outRec');
  if (outPiso) outPiso.textContent = money(piso);
  if (outRec) outRec.textContent = money(rec);

  const vizPiso = document.getElementById('vizPiso');
  const vizRec = document.getElementById('vizRec');
  const vizCustos = document.getElementById('vizCustos');
  const vizProj = document.getElementById('vizProj');
  if (vizPiso) vizPiso.textContent = money(piso);
  if (vizRec) vizRec.textContent = `${money(rec)}/h`;
  if (vizCustos) vizCustos.textContent = money(custos);
  if (vizProj) vizProj.textContent = money(rec * 20 * 1.32);
}

['custos', 'horas', 'margem'].forEach((id) => {
  document.getElementById(id)?.addEventListener('input', recalc);
});
recalc();

const pixKeyEl = document.getElementById('pixKey');
const footPix = document.getElementById('footPix');
const statusEl = document.getElementById('formStatus');
const copyPixBtn = document.getElementById('copyPixBtn');
const paidBtn = document.getElementById('paidBtn');
const waLink = document.getElementById('waLink');
const mpWrap = document.getElementById('mpLinkWrap');
const mpLink = document.getElementById('mpLink');
const autoCheckout = document.getElementById('autoCheckout');
const autoForm = document.getElementById('autoCheckoutForm');
const autoStatus = document.getElementById('autoStatus');
const autoBtn = document.getElementById('autoBuyBtn');

if (pixKeyEl) pixKeyEl.textContent = cfg.pixKeyDisplay || cfg.pixKey;
if (footPix) footPix.textContent = cfg.pixKeyDisplay || cfg.pixKey;

const waText = encodeURIComponent(
  `Olá! Acabei de pagar ${cfg.priceLabel || 'R$ 29,90'} no PIX ${cfg.pixKeyDisplay || cfg.pixKey} pelo kit PrecificaJá. Segue o comprovante.`
);
if (waLink) {
  waLink.href = `https://wa.me/${cfg.whatsapp}?text=${waText}`;
}

if (cfg.mercadoPagoCheckoutUrl && mpWrap && mpLink) {
  mpLink.href = cfg.mercadoPagoCheckoutUrl;
  mpWrap.hidden = false;
}

async function copyPix() {
  const key = cfg.pixKey || '11986637470';
  try {
    await navigator.clipboard.writeText(key);
    if (statusEl) {
      statusEl.classList.remove('error');
      statusEl.textContent = 'Chave PIX copiada. Pague exatamente R$ 29,90 e clique em “Já paguei — baixar kit”.';
    }
  } catch {
    if (statusEl) {
      statusEl.classList.add('error');
      statusEl.textContent = `Copie manualmente: ${key}`;
    }
  }
}

copyPixBtn?.addEventListener('click', copyPix);

paidBtn?.addEventListener('click', () => {
  sessionStorage.setItem('precificaja_paid', '1');
  window.location.href = 'baixar.html';
});

// Caminho automático: se o servidor tiver MP_ACCESS_TOKEN, mostra checkout API
async function probeAutoCheckout() {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return;
    const data = await res.json();
    if (data.mercadoPagoReady && autoCheckout) {
      autoCheckout.hidden = false;
    }
  } catch {
    // estático puro — ok
  }
}

autoForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!autoStatus || !autoBtn) return;
  autoStatus.classList.remove('error');
  autoStatus.textContent = 'Criando checkout…';
  autoBtn.disabled = true;
  const email = new FormData(autoForm).get('email');
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Falha no checkout');
    autoStatus.textContent = 'Redirecionando para o Mercado Pago…';
    window.location.href = data.checkoutUrl;
  } catch (err) {
    autoStatus.classList.add('error');
    autoStatus.textContent = err.message || 'Não foi possível iniciar o pagamento automático.';
    autoBtn.disabled = false;
  }
});

probeAutoCheckout();

const params = new URLSearchParams(window.location.search);
if (params.get('pago') === 'falhou' && statusEl) {
  statusEl.classList.add('error');
  statusEl.textContent = 'Pagamento não concluído. Tente o PIX manual ou de novo no Mercado Pago.';
  document.getElementById('checkout')?.scrollIntoView({ behavior: 'smooth' });
}
