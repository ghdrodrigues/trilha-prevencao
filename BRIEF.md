# BRIEF DE HANDOFF — TRILHA DA PREVENÇÃO (Defesa Civil SC)

> Documento de contexto para desenvolvimento no Claude Code.
> Origem: conversa de concepção em 20/11/2026 (claude.ai).
> Autor: George Rodrigues.

---

## 1. O QUE É

Experiência web one-page de educação da população de Santa Catarina para desastres naturais, no formato do **Backcountry 101** (https://backcountry-101.vercel.app/): lições procedimentais curtas, cena 3D interativa como protagonista, painel de texto com abas como apoio.

**Cliente-alvo:** Defesa Civil de Santa Catarina (possível vitrine via CEPED/UFSC).
**Objetivo:** difundir cultura de redução de riscos. A página não é um "curso": é uma ferramenta que gera ação (plano familiar pronto, cadastro no alerta por SMS).
**Público:** população geral de SC, mobile-first, acesso via WhatsApp.

## 2. POR QUE ESTE TEMA (dados da pesquisa)

- SC é o estado mais exposto a desastres extremos do país: 41% de todos os alertas emitidos pela Defesa Civil nacional (Gazeta do Povo).
- Chuva intensa responde por cerca de 90% dos óbitos em eventos climáticos em SC (Plano Estadual de Proteção e Defesa Civil/SC, citado em artigo da Revista do Departamento de Geografia/USP, 2024).
- 207 dos 295 municípios de SC (70,1%) estão entre os mais suscetíveis a deslizamentos, enxurradas e inundações (MPSC/GT GEDClima).
- SC lidera adesão ao alerta por SMS: 10,51% da população cadastrada, mais que o dobro da média nacional (Tribuna PR). O público aceita se engajar.
- O gargalo apontado pela literatura não é monitoramento, é cultura e percepção de risco na população.

**Tema central:** sobreviver a chuva forte (enchente + deslizamento). Vendaval/granizo entram como variação por perfil. Estiagem fica fora (não é procedimental para o cidadão).

## 3. ESTRUTURA DA EXPERIÊNCIA

### 3.1. Fluxo

1. **Hero:** título + "Aprenda · Prepare · Proteja". Cena 3D de abertura (diorama de SC estilizado).
2. **Perfil de risco (personalização):** "Onde você mora?" → 3 cartões:
   - **A. Encosta/morro** → ênfase em deslizamento
   - **B. Beira de rio/baixada** → ênfase em enchente
   - **C. Área aberta/interior** → ênfase em vendaval e granizo
   O perfil adapta o conteúdo das lições 1, 4 e 6 e os destaques da trilha.
3. **Trilha com 7 paradas** (mapa/menu): cada parada abre a lição.
4. **Plano Familiar de Emergência:** formulário curto → gera card visual com rota, ponto de encontro, contatos e lista do kit. Saída por botão Copiar e link de compartilhamento no WhatsApp (downloads diretos são bloqueados em artefato; em deploy próprio na Vercel pode gerar imagem/PDF).
5. **CTA permanente:** cadastro no alerta SMS (enviar o CEP para o número 40199) e telefones 199 (Defesa Civil) e 193 (Bombeiros).

### 3.2. As 7 lições (paradas)

Cada lição tem: cena 3D própria + painel com 3 abas:
**Passo a passo** (procedimento) / **Por que importa** (dado ou mecanismo) / **Dica do agente** (voz humana, tom de conversa).

| # | Lição | Cena 3D | Conteúdo-chave |
|---|---|---|---|
| 1 | Conheça seu risco | Terreno com morro, casas na encosta e na baixada, rio | Identificar o tipo de terreno onde mora; histórico do bairro; mapa de risco municipal |
| 2 | Cadastre o alerta | Celular com balão de SMS | Enviar CEP para 40199; significado de cada tipo de aviso; seguir canais oficiais |
| 3 | Monte o kit de emergência | Mochila aberta com itens flutuando | Itens do Plano Emergencial Familiar da Defesa Civil SC: água, chocolate e barra de cereais, documentos em saco plástico, lanterna e pilhas, rádio, remédios, apito, carregador portátil, entre outros. Checklist interativo (estilo "Pack a survival kit") |
| 4 | Leia os sinais de perigo | Casa com trinca + árvore inclinada no morro | Trincas em paredes e no chão, portas/janelas emperrando, água barrenta minando do morro, árvores e postes inclinados, estalos. Mini-jogo "perigoso ou normal?" (estilo "Edible or poisonous") |
| 5 | Plano de fuga da família | Mini bairro com rota pontilhada e ponto de encontro | Rota de saída, ponto de encontro, quem busca quem (crianças, idosos, pets), combinados sem celular |
| 6 | Durante a emergência | Rua alagada (água em shader animado) | Não atravessar ruas alagadas nem pontes submersas; desligar energia, gás e água; ir para local seguro; abandonar o carro se a água puder levá-lo; deslizamento: sair na hora e avisar vizinhos; ligar 199 ou 193 |
| 7 | Depois da água baixar | Casa com marca de lama + sol | Só voltar quando as autoridades liberarem; cuidado com água e alimentos contaminados e animais peçonhentos; avaliar danos e informar as autoridades |

> **Validação (20/11/2026):** os textos de `data/licoes.json` foram reescritos com base em fontes oficiais (lista em `_fontes`), citadas no rodapé do guia. Falta a revisão da Defesa Civil SC.
>
> **IMPORTANTE:** os procedimentos acima são rascunho de concepção. Antes de publicar, validar o conteúdo com material oficial da Defesa Civil SC (defesacivil.sc.gov.br) e da Defesa Civil Nacional. Não inventar protocolo.

### 3.3. Narrativa/tom

- Elenco fictício aprovado em 20/11/2026 (substitui a regra anterior "sem personagem fictícia"): ver §3.4. A Duda continua fora, porque pertence ao projeto IBAMA, outro cliente.
- Voz da aba "Dica do agente": a Agente (§3.4), experiente, direta, acolhedora, sem jargão.
- Mote de abertura possível: "Em SC, não existe risco zero. Existe família preparada."

### 3.4. Elenco (direção B: agente + 3 vizinhos)

Lógica: a Agente guia e explica; o morador do perfil escolhido age. Quem escolhe "Encosta" vê o morador da encosta executar os passos nas 7 lições, e assim por diante.

| Personagem | Visual | Perfil | Papel | Clipes de animação |
|---|---|---|---|---|
| **Agente** | Mulher, ~40 anos, pele parda, cabelo curto cacheado; colete laranja #F77F00 com faixas refletivas e **sem brasão**, camisa e calça azul-escuro, bota preta, rádio no colete | Todos | Aparece em todas as lições; é o rosto da aba "Dica do agente"; aponta perigos e chama a atenção para cada subpasso | parado, acenar, apontar, andar, falar no rádio |
| **Morador da encosta** | Homem negro, ~30 anos, barba curta, camiseta verde, jeans, botina | A. Encosta/morro | Lições 1, 4 e 6: identifica trincas e árvores inclinadas, sai na hora e avisa os vizinhos | parado, andar, correr, examinar (agachar), acenar |
| **Moradora da baixada** | Mulher, ~28 anos, pele clara, rabo de cavalo, capa de chuva amarela, galocha verde | B. Beira de rio/baixada | Lições 1, 6 e 7: desliga a energia, vai para um local seguro (clipe "andar"; o texto oficial diz "local seguro", então o clipe "subir" fica fora de uso), volta só com liberação | parado, andar, subir, desligar chave, acenar |
| **Morador do interior** | Agricultor, ~65 anos, descendência teuto-italiana, bigode branco, chapéu de palha, camisa xadrez vermelha, suspensório | C. Área aberta/interior | Lições 1 e 6: abriga-se durante vendaval e granizo, longe de árvores e da rede elétrica | parado, andar, abrigar-se (proteger a cabeça), acenar |

Nas lições 2, 3 e 5, quem age é o morador do perfil escolhido: ele cadastra o alerta, monta o kit e segue a rota de fuga.

**Pendências:** os personagens ainda não têm nome na interface. Arte-conceito v1 aprovada por George em 20/11/2026 (gerada no Higgsfield; o arquivo fica com George).

## 4. IDENTIDADE VISUAL

- **Laranja** como cor principal (cor oficial das ações de Proteção e Defesa Civil no Brasil): sugestão #F77F00 ou próximo do usado pela Defesa Civil SC.
- Apoio: azul-escuro (#1D3557 ou similar), branco, cinza-claro. Alertas em amarelo/vermelho semânticos.
- NÃO reproduzir o brasão/logo oficial sem autorização; usar tratamento tipográfico "Defesa Civil · Santa Catarina" como placeholder.
- Tipografia: sans (ex.: Inter ou Open Sans) via Google Fonts.
- Estética de fundo: mapa topográfico estilizado (linhas de contorno), ecoando a referência.

## 5. DIREÇÃO DE ARTE 3D + PIPELINE TRIPO

### 5.1. Processo (mesmo dos jogos anteriores)

1. Blockout da cena em primitivas Three.js (validar enquadramento e interação).
2. Gerar modelos no **Tripo3D** (https://studio.tripo3d.ai/) — texto → 3D ou imagem → 3D usando arte-conceito como referência.
3. Exportar GLB, otimizar, substituir placeholders.

### 5.2. Estilo unificado (prefixo para todos os prompts do Tripo)

```
low-poly isometric diorama, stylized game asset, flat colors with soft
gradients, clean silhouette, no text, single object on neutral base,
southern Brazil small town aesthetic
```

### 5.3. Prompts por asset

1. **Terreno-base:** "small diorama of a Brazilian hillside town: green hill with simple houses on the slope, a river at the bottom with houses near the bank, winding dirt trail, low-poly"
2. **Celular:** "simple smartphone standing upright, bright screen, low-poly, oversized rounded speech bubble floating above it"
3. **Kit 72h:** "open orange backpack with survival items around it: water bottle, flashlight, small radio, canned food, first aid box, whistle, documents in plastic bag, low-poly"
4. **Casa com sinais:** "small single-story house with a visible crack in the wall, slightly tilted wooden utility pole and leaning tree beside it, low-poly"
5. **Bairro com rota:** "tiny neighborhood block diorama: six simple houses, one small plaza with a flag marker, dotted escape path, low-poly"
6. **Rua alagada:** "street diorama with two houses, water level covering the road up to door height, one car partially submerged, low-poly" (água final em shader no Three.js, o modelo serve de base)
7. **Pós-enchente:** "house diorama with mud stain line on the walls, cleaning bucket and broom at the door, small sun over it, low-poly"

### 5.3.1. Prompts dos personagens

**Método preferido:** imagem → 3D no Tripo, usando o recorte de cada personagem da arte-conceito v1 aprovada (mantém a consistência entre os quatro). O texto abaixo serve de complemento ou de alternativa.

Prefixo de personagem (usar no lugar de "single object on neutral base" do §5.2):

```
low-poly stylized game character, chibi proportions about 2.5 heads tall,
flat colors with soft gradients, clean silhouette, full body, front view,
neutral A-pose with arms slightly away from body, no text, no logos,
no emblems, southern Brazil small town aesthetic
```

8. **Agente:** "Brazilian civil defense field agent, woman in her 40s, brown skin, short curly black hair, warm confident smile, bright orange safety vest with white reflective stripes and no insignia, dark navy long-sleeve shirt, navy cargo pants, black boots, handheld radio clipped to vest"
9. **Morador da encosta:** "Afro-Brazilian man in his 30s, short hair, light beard, plain green t-shirt, jeans, brown work boots, friendly expression"
10. **Moradora da baixada:** "young southern Brazilian woman in her late 20s, light skin, brown hair in a ponytail, yellow rain jacket, dark leggings, tall green rubber boots"
11. **Morador do interior:** "elderly farmer in his 60s of German-Italian descent, fair sunburned skin, white mustache, straw hat, red plaid shirt, suspenders, gray trousers"

**Rig e animação:**
- Rig automático humanoide do Tripo, com os clipes da tabela do §3.4 embutidos no GLB. O código toca cada clipe por subpasso com `AnimationMixer`.
- Validar primeiro com a Agente: tamanho do GLB, deformação do colete e do rosto. Se o rig falhar, usar um GLB por pose como alternativa.
- Orçamento: 4 personagens × até 1,5 MB = 6 MB, metade dos ~12 MB da página. Alvo por personagem: ≤ 1 MB (cerca de 8 mil triângulos, textura 1024 px). A página carrega só a Agente e o morador do perfil escolhido, então o custo real fica em torno de 2 MB.

### 5.4. Limites técnicos dos GLBs

- Alvo: **< 1,5 MB por modelo** após otimização; textura máx. 1024 px.
- Otimizar com `gltf-transform optimize in.glb out.glb --compress draco --texture-compress webp`.
- Orçamento total da página: manter abaixo de ~12 MB com tudo.

## 6. DECISÕES TÉCNICAS

- **Stack:** HTML/JS + Three.js (GLTFLoader + DRACOLoader). Vite para dev. Sem framework pesado; React só se o George preferir pelo padrão dos outros projetos.
- **Conteúdo desacoplado:** textos das lições em `data/licoes.json` (uma DI pode editar sem tocar no motor). Estrutura: `{id, titulo, perfil_variacoes, abas: {passo, porque, dica}}`.
- **Perfis:** variações de conteúdo por perfil no próprio JSON (`default`, `encosta`, `baixada`, `aberto`).
- **Mobile-first:** cena 3D com câmera fixa isométrica, interação por toque, painel de lição vira bottom-sheet no mobile.
- **Acessibilidade:** toda informação da cena 3D existe também em texto; contraste AA; reduzir movimento com `prefers-reduced-motion`.
- **Áudio:** chuva ambiente leve com botão de mute (padrão aprovado no Sala de Situação).
- **Deploy:** Vercel (mesmo modelo da referência).
- **Estrutura de pastas sugerida:**

```
trilha-prevencao/
├── index.html
├── src/
│   ├── main.js          # setup Three.js, roteamento de lições
│   ├── scenes/          # uma cena por lição (blockout → GLB)
│   └── ui/              # painel de abas, perfis, plano familiar
├── public/
│   ├── models/          # GLBs do Tripo otimizados
│   └── audio/
└── data/
    └── licoes.json
```

## 7. ESCOPO v1 E ROADMAP

**v1 (construir agora):**
- Hero + seletor de perfil (3 perfis)
- Trilha com 7 lições, cenas em blockout → GLBs Tripo
- 3 abas por lição + checklist do kit + mini-jogo "perigoso ou normal?"
- Plano Familiar exportável (copiar/WhatsApp)
- CTA 40199 + 199/193

**Backlog (vender como roadmap):**
1. Simulado de decisão ("você recebeu o alerta, e agora?") com consequências — reaproveita motor de cartas do Sala de Situação
2. Cards compartilháveis por lição para WhatsApp
3. Modo escola/NUDEC (roteiro de 1 aula para professores e líderes comunitários)
4. Sazonalidade (destaques mudam por estação: alagamento no verão, vendaval na primavera)
5. Personalização real por município/CEP com mapas de risco

## 8. PRIMEIRA TAREFA NO CLAUDE CODE

1. Criar o projeto com a estrutura acima (Vite + Three.js).
2. Montar o blockout da cena 1 (terreno com morro/rio) com câmera isométrica fixa e 7 marcadores de parada clicáveis.
3. Implementar o painel de lição com as 3 abas lendo de `licoes.json` (textos deste brief como placeholder).
4. Rodar local e ajustar enquadramento antes de gerar qualquer modelo no Tripo.
