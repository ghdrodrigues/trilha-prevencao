// Checa o orçamento de tamanho (BRIEF §5.4):
// - cada GLB em public/models/ abaixo de 1,5 MB;
// - página inteira (dist/ após `npm run build`, ou public/ se não houver build) abaixo de 12 MB.
// Sai com código 1 se algum limite estourar.

import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const LIMITE_MODELO = 1.5 * 1024 * 1024;
const LIMITE_PAGINA = 12 * 1024 * 1024;
const mb = (b) => (b / 1024 / 1024).toFixed(2);

function arquivos(dir, ignorar = []) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (ignorar.includes(e.name)) return [];
    return e.isDirectory() ? arquivos(p, ignorar) : [p];
  });
}

let ok = true;
const modelos = readdirSync('public/models').filter((f) => f.endsWith('.glb'));
console.log(modelos.length ? 'Modelos:' : 'Nenhum GLB em public/models/ ainda (cenas usam primitivas).');
for (const f of modelos) {
  const t = statSync(join('public/models', f)).size;
  const passou = t <= LIMITE_MODELO;
  ok &&= passou;
  console.log(`  ${passou ? 'ok   ' : 'ACIMA'} ${f}  ${mb(t)} MB`);
}

const raiz = existsSync('dist') ? 'dist' : 'public';
const total = arquivos(raiz, ['_bruto']).reduce((s, p) => s + statSync(p).size, 0);
const passouTotal = total <= LIMITE_PAGINA;
ok &&= passouTotal;
console.log(`\nTotal (${raiz}/): ${mb(total)} MB de 12 MB ${passouTotal ? 'ok' : 'ACIMA DO LIMITE'}`);
process.exit(ok ? 0 : 1);
