import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { deflateRawSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const productDir = join(__dirname, '..', 'product');
const zipPath = join(productDir, 'PrecificaJa-Kit.zip');

const files = [
  'LEIA-ME.txt',
  'planilha-precificacao.csv',
  'guia-precificacao.md',
  'templates-proposta.md',
];

/** ZIP mínimo (stored/deflate) sem dependências externas */
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function u16(n) {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n, 0);
  return b;
}
function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n, 0);
  return b;
}

function buildZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const data = entry.data;
    const compressed = deflateRawSync(data);
    const useDeflate = compressed.length < data.length;
    const payload = useDeflate ? compressed : data;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(data);

    const localHeader = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(method),
      u16(0),
      u16(0),
      u32(crc),
      u32(payload.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
    ]);

    const local = Buffer.concat([localHeader, payload]);
    localParts.push(local);

    const central = Buffer.concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(method),
      u16(0),
      u16(0),
      u32(crc),
      u32(payload.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    ]);
    centralParts.push(central);
    offset += local.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralDir.length),
    u32(offset),
    u16(0),
  ]);

  return Buffer.concat([...localParts, centralDir, end]);
}

const entries = [];
for (const f of files) {
  const p = join(productDir, f);
  if (!existsSync(p)) {
    console.error(`Arquivo ausente: ${f}`);
    process.exit(1);
  }
  entries.push({ name: f, data: readFileSync(p) });
}

if (!existsSync(productDir)) mkdirSync(productDir, { recursive: true });
if (existsSync(zipPath)) unlinkSync(zipPath);
writeFileSync(zipPath, buildZip(entries));

// Espelha arquivos para download estático (fluxo PIX manual)
const publicKit = join(__dirname, '..', 'public', 'kit');
if (!existsSync(publicKit)) mkdirSync(publicKit, { recursive: true });
for (const f of files) {
  writeFileSync(join(publicKit, f), readFileSync(join(productDir, f)));
}

console.log(`Kit gerado: ${zipPath} (${entries.length} arquivos)`);
console.log(`Espelho estático: ${publicKit}`);
