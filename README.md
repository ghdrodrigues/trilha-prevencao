# Trilha da Prevenção

Experiência web 3D de cultura de redução de riscos para a Defesa Civil de Santa Catarina.
O [BRIEF.md](BRIEF.md) é a fonte de verdade do projeto.

## Rodar

```bash
npm install
npm run dev       # http://localhost:5173 (também acessível pelo celular na mesma rede)
npm run build     # gera dist/ para a Vercel
```

## Estrutura

```
index.html              hero, seletor de perfil, trilha, CTA 40199/199/193
src/main.js             setup Three.js, câmera isométrica, toque nos marcadores
src/scenes/assets.js    manifesto de modelos: troca primitiva → GLB
src/scenes/cena1-*.js   cena 1 em blockout (terreno + trilha + 7 paradas)
src/ui/painel.js        painel da lição com 3 abas (bottom-sheet no celular)
src/ui/perfil.js        seletor "Onde você mora?"
data/licoes.json        textos das lições e variações por perfil (editável sem tocar no código)
public/models/          GLBs otimizados
scripts/                otimização e checagem de tamanho dos GLBs
```

## Trocar uma primitiva por um modelo do Tripo

1. Exporte o GLB no Tripo e salve em `public/models/_bruto/` com o nome listado em
   `src/scenes/assets.js` (ex.: `terreno-base.glb`). Essa pasta não vai para o git.
2. `npm run assets:otimizar`: aplica Draco, texturas WebP e limite de 1024 px, e grava em `public/models/`.
3. `npm run assets:checar`: confere 1,5 MB por modelo e 12 MB no total.
4. Recarregue a página. O modelo substitui a primitiva, com a mesma largura e apoiado na mesma base.
   Sem o arquivo, a cena continua com a primitiva.

## Conteúdo

Os textos de `data/licoes.json` são rascunho. Validar com material oficial da Defesa Civil SC
e da Defesa Civil Nacional antes de publicar.
