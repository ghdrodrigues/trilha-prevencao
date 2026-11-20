// Otimiza os GLBs exportados do Tripo (BRIEF §5.4).
// Uso: salve os arquivos brutos em public/models/_bruto/ com o nome final
// (ver src/scenes/assets.js) e rode `npm run assets:otimizar`.
// Saída: public/models/<nome>.glb, com Draco, texturas WebP e no máximo 1024 px.

import { execFileSync } from 'node:child_process';
import { readdirSync, statSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BRUTO = 'public/models/_bruto';
const SAIDA = 'public/models';
mkdirSync(BRUTO, { recursive: true });

const arquivos = readdirSync(BRUTO).filter((f) => f.toLowerCase().endsWith('.glb'));
if (!arquivos.length) {
  console.log(`Nenhum .glb em ${BRUTO}/. Coloque lá os arquivos exportados do Tripo.`);
  process.exit(0);
}

const mb = (b) => (b / 1024 / 1024).toFixed(2);
for (const f of arquivos) {
  const entrada = join(BRUTO, f);
  const saida = join(SAIDA, f);
  execFileSync(
    'npx',
    ['gltf-transform', 'optimize', entrada, saida, '--compress', 'draco', '--texture-compress', 'webp', '--texture-size', '1024'],
    { stdio: 'inherit' },
  );
  console.log(`${f}: ${mb(statSync(entrada).size)} MB → ${mb(statSync(saida).size)} MB`);
}
console.log('\nAgora rode `npm run assets:checar`.');
