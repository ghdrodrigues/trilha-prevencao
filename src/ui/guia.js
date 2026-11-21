// Guia: painel compacto com abas. Desktop: coluna à direita, por cima do palco.
// Celular: bottom-sheet recolhível acima da linha do tempo (a cena fica livre).

import dados from '../../data/licoes.json';

export function criarGuia(elemento, { aoMudarTamanho } = {}) {
  elemento.innerHTML = `
    <button type="button" class="guia-alca" aria-expanded="true" aria-controls="guia-corpo">
      <span class="guia-alca-barra" aria-hidden="true"></span>
      <span class="guia-alca-texto">Recolher guia</span>
    </button>
    <div class="guia-corpo" id="guia-corpo">
      <p class="guia-cabeca"></p>
      <h2 class="guia-titulo" id="guia-titulo"></h2>
      <div role="tablist" class="abas" aria-labelledby="guia-titulo"></div>
      <div class="aba-conteudo" role="tabpanel" tabindex="0"></div>
      <div class="guia-rodape"></div>
    </div>`;

  const $ = (s) => elemento.querySelector(s);
  const alca = $('.guia-alca');
  const lista = $('[role=tablist]');
  const conteudo = $('.aba-conteudo');
  let abas = [];
  let abaAtual = null;
  let tabs = [];

  alca.addEventListener('click', () => recolher(!elemento.classList.contains('recolhido')));

  function recolher(sim) {
    elemento.classList.toggle('recolhido', sim);
    alca.setAttribute('aria-expanded', String(!sim));
    $('.guia-alca-texto').textContent = sim ? 'Abrir guia' : 'Recolher guia';
    aoMudarTamanho?.();
  }

  lista.addEventListener('keydown', (e) => {
    const passo = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!passo || !abas.length) return;
    const i = abas.findIndex((a) => a.chave === abaAtual);
    const prox = abas[(i + passo + abas.length) % abas.length].chave;
    mostrarAba(prox);
    tabs.find((t) => t.dataset.aba === prox).focus();
  });

  function mostrarAba(chave) {
    abaAtual = chave;
    for (const t of tabs) {
      const ativa = t.dataset.aba === chave;
      t.setAttribute('aria-selected', String(ativa));
      t.tabIndex = ativa ? 0 : -1;
    }
    conteudo.setAttribute('aria-labelledby', `aba-${chave}`);
    conteudo.replaceChildren();
    abas.find((a) => a.chave === chave)?.render(conteudo);
  }

  // conf: { cabeca, titulo, abas: [{chave, rotulo, render(el)}], aba, rodape(el) }
  function mostrar(conf) {
    $('.guia-cabeca').textContent = conf.cabeca ?? '';
    $('.guia-titulo').textContent = conf.titulo ?? '';
    abas = conf.abas ?? [];
    lista.replaceChildren();
    lista.hidden = abas.length < 2;
    tabs = abas.map(({ chave, rotulo }) => {
      const t = document.createElement('button');
      t.type = 'button';
      t.role = 'tab';
      t.id = `aba-${chave}`;
      t.dataset.aba = chave;
      t.textContent = rotulo;
      t.addEventListener('click', () => mostrarAba(chave));
      lista.appendChild(t);
      return t;
    });
    const manter = abas.some((a) => a.chave === abaAtual) && conf.manterAba;
    mostrarAba(manter ? abaAtual : conf.aba ?? abas[0]?.chave);
    const rodape = $('.guia-rodape');
    rodape.replaceChildren();
    conf.rodape?.(rodape);
    aoMudarTamanho?.();
  }

  // Redesenha só a aba atual (ex.: subpasso mudou).
  function atualizar() {
    if (abaAtual) mostrarAba(abaAtual);
  }

  return { mostrar, atualizar, mostrarAba, recolher, get aba() {
    return abaAtual;
  } };
}

// Helpers de conteúdo
export function paragrafos(el, textos) {
  for (const t of [].concat(textos ?? [])) {
    const p = document.createElement('p');
    p.textContent = t;
    el.appendChild(p);
  }
}

export function lista(el, itens, ordenada = false) {
  const l = document.createElement(ordenada ? 'ol' : 'ul');
  for (const t of itens ?? []) {
    const li = document.createElement('li');
    li.textContent = t;
    l.appendChild(li);
  }
  el.appendChild(l);
}

export function avisoRascunho(el) {
  const p = document.createElement('p');
  p.className = 'aviso-rascunho';
  p.textContent = 'Conteúdo em rascunho. Será validado com a Defesa Civil SC antes de publicar.';
  el.appendChild(p);
}

// Fontes oficiais da etapa ou da lição (códigos de _fontes no licoes.json),
// mostradas como links no rodapé do guia.
export function citarFontes(el, codigos, { curto = false } = {}) {
  const cat = dados._fontes ?? {};
  const itens = (codigos ?? []).map((c) => cat[c]).filter((f) => f?.url);
  if (!itens.length) return;
  const p = document.createElement('p');
  p.className = 'fontes';
  p.append(itens.length > 1 ? 'Fontes: ' : 'Fonte: ');
  itens.forEach((f, i) => {
    if (i) p.append(' · ');
    const a = document.createElement('a');
    a.href = f.url;
    a.target = '_blank';
    a.rel = 'noopener';
    const repetido = itens.filter((x) => x.orgao === f.orgao).length > 1;
    a.textContent = curto ? (repetido ? f.titulo : f.orgao) : `${f.titulo} (${f.orgao})`;
    if (curto) a.title = f.titulo;
    p.appendChild(a);
  });
  el.appendChild(p);
}
