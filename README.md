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
index.html                 casca da aplicação: topo, menu, guia, linha do tempo, abertura
src/main.js                rotas (?parada=N), perfil, controles, modos trilha/lição
src/motor/palco.js         palco 3D em tela cheia: câmera isométrica, giro de 90°, pausa/velocidade, toque
src/motor/tween.js         animações (entrada com quique, guardar na mochila)
src/motor/etiquetas.js     etiquetas com linha presas aos objetos 3D
src/scenes/assets.js       manifesto de modelos: troca primitiva → GLB, um arquivo por objeto
src/scenes/cena1-*.js      mapa da trilha (terreno + 7 paradas)
src/scenes/cena3-kit.js    Kit 72h: lona, mochila e itens (blockout)
src/licoes/montagem.js     lição em etapas → subpassos animados + checklist "tenho em casa"
src/ui/                    guia (abas), linha do tempo, seletor de perfil
data/licoes.json           textos: lições, etapas, subpassos, variações por perfil
public/models/             GLBs otimizados + disponiveis.json (gerado pelo script)
scripts/                   otimização e checagem de tamanho dos GLBs
```

## Modelos do Tripo: um GLB por objeto

O motor anima cada objeto separadamente (entra voando, pousa, vai para a mochila).
Por isso, gere **um modelo por objeto**, não o diorama inteiro. Nomes esperados para o Kit 72h:

| Arquivo | Objeto |
|---|---|
| `kit-mochila.glb` | mochila laranja fechada |
| `kit-garrafa-agua.glb` | garrafa de água com tampa |
| `kit-lata.glb` | lata de alimento |
| `kit-barra-cereal.glb` | barra de cereal embalada |
| `kit-documentos-saco.glb` | documentos dentro de saco plástico com fecho |
| `kit-lanterna.glb` | lanterna |
| `kit-radio-pilha.glb` | rádio portátil a pilha com antena |
| `kit-carregador.glb` | carregador portátil (power bank) com cabo |
| `kit-remedios.glb` | caixa de medicamentos com cruz vermelha |
| `kit-apito.glb` | apito com cordão |

Use o prefixo de estilo do BRIEF §5.2. O modelo é ajustado automaticamente à largura e à base da primitiva.

## Trocar uma primitiva por um modelo do Tripo

1. Exporte o GLB no Tripo e salve em `public/models/_bruto/` com o nome da tabela
   (a lista completa está em `src/scenes/assets.js`). Essa pasta não vai para o git.
2. `npm run assets:otimizar`: aplica Draco, texturas WebP e limite de 1024 px, grava em `public/models/`
   e atualiza `public/models/disponiveis.json`.
3. `npm run assets:checar`: confere 1,5 MB por modelo e 12 MB no total.
4. Recarregue a página. Sem o arquivo, a cena continua com a primitiva.

## Conteúdo

Os textos de `data/licoes.json` são rascunho. Validar com material oficial da Defesa Civil SC
e da Defesa Civil Nacional antes de publicar.
