# PrecificaJá — MVP estático vendável

Kit digital de precificação para freelancers/MEIs no Brasil (**R$ 29,90**), com landing, simulador e pagamento **PIX** na chave `1198663-7470`.

## Como abrir agora (sem npm)

**Opção 1 — arquivo local**  
Duplo clique em `public/index.html`.

**Opção 2 — servidor local (Python, sem Node)**

```powershell
cd F:\Projetos\MakeMoney\public
python -m http.server 8080
```

Abra http://127.0.0.1:8080

**Opção 3 — URL pública**  
GitHub Pages: `https://renantopac.github.io/precificaja/` (após deploy)  
Ou arraste `public/` em https://app.netlify.com/drop

Não precisa de `npm install`, Node nem build para vender.

## Fluxo de venda (MVP atual)

1. Cliente vê a oferta e simula o piso.
2. Copia a chave PIX `11986637470` (telefone) e paga **R$ 29,90**.
3. Clica em **Já paguei — baixar kit** → `baixar.html` com os 4 arquivos.
4. Opcional: avisa no WhatsApp com comprovante.

## Configuração rápida do dono

Edite só `public/config.js`:

- `pixKey` / `pixKeyDisplay` / `whatsapp`
- `mercadoPagoCheckoutUrl` — cole um link MP quando tiver (opcional)
- `priceBRL` / `priceLabel` (atualize também o HTML do preço)

## Pastas

| Caminho | Uso |
|---------|-----|
| `public/` | Site pronto para publicar |
| `public/kit/` | Arquivos entregues ao comprador |
| `docs/AQUISICAO.md` | Posts/WhatsApp/roteiro prontos |
| `docs/BLOCKERS-DONO.md` | O que falta pro 1º PIX |
| `docs/GO-LIVE.md` | Checklist publish + local |
| `server/` | Futuro (MP automático) — **não necessário** hoje |

## Status

- **Vender via PIX manual:** sim.
- **Checkout MP automático:** opcional / depois.
