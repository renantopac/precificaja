# Checklist go-live — PrecificaJá (estático primeiro)

## Caminho A — Vender agora (sem Node / sem npm)

- [x] Landing + kit em `public/`
- [x] Copy/CTA/FAQ revisados (PIX em 2 cliques)
- [x] Kit de aquisição em `docs/AQUISICAO.md`
- [ ] Confirmar PIX `1198663-7470` recebe
- [x] URL pública: https://renantopac.github.io/precificaja/
- [ ] 1 post/mensagem com link + UTM
- [ ] WhatsApp do PIX monitorado
- [ ] (Recomendado) compra teste R$ 29,90 → “Já paguei” → 4 arquivos

### Publicar em 1 passo (sem login de CLI extra)

1. Abra https://app.netlify.com/drop  
2. Arraste a pasta `F:\Projetos\MakeMoney\public`  
3. Copie a URL gerada → use em `docs/AQUISICAO.md`

### GitHub Pages (já no ar)

Repo: https://github.com/renantopac/precificaja  
URL pública: **https://renantopac.github.io/precificaja/**  
Fonte: branch `gh-pages` (conteúdo da pasta `public/` na raiz).

Para republicar após editar `public/`:

```powershell
$tmp = Join-Path $env:TEMP "precificaja-pages"
Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $tmp | Out-Null
Copy-Item -Path "F:\Projetos\MakeMoney\public\*" -Destination $tmp -Recurse -Force
Set-Location $tmp
git init -b gh-pages
git add .
git commit -m "Update site"
git remote add origin https://github.com/renantopac/precificaja.git
git push -u origin gh-pages --force
Set-Location F:\Projetos\MakeMoney
```

### Servir local sem npm

```powershell
cd F:\Projetos\MakeMoney\public
python -m http.server 8080
```

Abra http://127.0.0.1:8080  

Ou: duplo clique em `public\index.html` (alguns recursos de clipboard podem falhar em `file://`).

## Caminho B — Automação Mercado Pago (depois)

- [ ] Conta MP + link de pagamento → `public/config.js` → `mercadoPagoCheckoutUrl`
- [ ] Ambiente `npm` saudável (hoje: exit `4294967295` / SSL)
- [ ] Deploy do `server/` + webhook (opcional)

## Pós go-live

- [ ] Rodar o roteiro de 5 posts em `docs/AQUISICAO.md`
- [ ] Anotar UTMs e PIX recebidos
