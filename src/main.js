// Aplicação: palco em tela cheia, mapa da trilha e lições.
// Rotas: ./ (mapa da trilha) e ./?parada=N (lição N), compartilháveis no WhatsApp.

import './style.css';
import dados from '../data/licoes.json';
import { criarPalco } from './motor/palco.js';
import { criarEtiquetas } from './motor/etiquetas.js';
import { criarCena1, DESTAQUES_PERFIL } from './scenes/cena1-terreno.js';
import { criarGuia, paragrafos } from './ui/guia.js';
import { criarLinhaTempo } from './ui/linha-tempo.js';
import { criarSeletorPerfil } from './ui/perfil.js';
import { criarLicaoRoteiro } from './licoes/roteiro.js';
import { criarEfeitosRisco, ENQUADRAMENTOS } from './scenes/efeitos-risco.js';
import { criarPersonagensRisco } from './scenes/personagens-risco.js';
import { criarLicaoFazer } from './licoes/fazer.js';
import { aplicarIcones, icone } from './ui/icones.js';
import { abrirMeuPlano } from './ui/meu-plano.js';
import { criarLicaoPassos } from './licoes/passos.js';

aplicarIcones();

const $ = (s) => document.querySelector(s);
const CHAVE_PERFIL = 'trilha.perfil';
const ler = (k) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const gravar = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* sem armazenamento */
  }
};

// ---------- Palco e área livre (o que os painéis não cobrem) ----------
const topo = $('#topo');
const guiaEl = $('#guia');
const linhaEl = $('#linha-tempo');
const desktop = window.matchMedia('(min-width: 900px)');

function areaLivre() {
  const h = window.innerHeight;
  if (desktop.matches) {
    return {
      esquerda: 16,
      topo: topo.offsetHeight + 8,
      direita: guiaEl.offsetWidth + 32,
      base: linhaEl.offsetHeight + 16,
    };
  }
  const base = h - Math.min(guiaEl.getBoundingClientRect().top, linhaEl.getBoundingClientRect().top);
  // no celular o topo tem uma linha só; os controles da parada 7 ficam
  // sobre o canto da cena e não tiram altura dela
  const alto = topo.getBoundingClientRect().bottom;
  return { esquerda: 8, topo: alto + 4, direita: 8, base: Math.max(base, 0) + 6 };
}

const palco = criarPalco($('#palco'), { areaLivre });
const etiquetas = criarEtiquetas($('#etiquetas'), palco);
const guia = criarGuia(guiaEl, { aoMudarTamanho: () => requestAnimationFrame(palco.redimensionar) });
new ResizeObserver(() => palco.redimensionar()).observe(guiaEl);
new ResizeObserver(() => {
  document.documentElement.style.setProperty('--lt-h', `${linhaEl.offsetHeight}px`);
  palco.redimensionar();
}).observe(linhaEl);

let navegar = () => {};
const linhaTempo = criarLinhaTempo(linhaEl, { aoEscolher: (i) => navegar(i) });

// ---------- Cenas ----------
const cena1 = criarCena1();
const efeitosRisco = criarEfeitosRisco({ cena1, palco });
cena1.raiz.add(efeitosRisco.grupo);
const personagensRisco = criarPersonagensRisco({ palco });
cena1.raiz.add(personagensRisco.grupo);
// Cena da parada 1: o mesmo mapa, sem marcadores, com os efeitos de risco.
const cenaRisco = {
  raiz: cena1.raiz,
  alvos: [],
  enquadramento: ENQUADRAMENTOS.geral,
  animar: (t, dt, r) => {
    cena1.animar(t, dt, r);
    efeitosRisco.animar(t, dt, r);
    personagensRisco.animar(t, dt, r);
  },
};

// Cenas de roteiro das paradas 2, 4, 5 e 6: o código de cada uma só é baixado
// e montado na primeira visita, para não pesar a abertura no celular.
function cenaRoteiro(carregar, nome, alturaAtor = 1.1) {
  let pronta = null;
  return async () => {
    if (pronta) return pronta;
    const m = await carregar();
    const enquadramentos = m[`ENQUADRAMENTOS_${nome}`];
    const c = m[Object.keys(m).find((k) => k.startsWith('criarCena'))]({ palco });
    const personagens = criarPersonagensRisco({
      palco,
      relevo: m.relevo,
      posicoesAgente: m[`POSICOES_AGENTE_${nome}`],
      vizinhos: m[`VIZINHOS_${nome}`],
      alturaAtor,
    });
    c.raiz.add(personagens.grupo);
    const cena = {
      raiz: c.raiz,
      alvos: [],
      enquadramento: enquadramentos.geral,
      animar: (t, dt, r) => {
        c.efeitos.animar(t, dt, r);
        personagens.animar(t, dt, r);
      },
    };
    pronta = { cena, efeitos: c.efeitos, personagens, enquadramentos };
    return pronta;
  };
}

// Cada lição do tipo roteiro escolhe a cena pelo campo "cena".
const CENAS_ROTEIRO = {
  terreno: async () => ({ cena: cenaRisco, efeitos: efeitosRisco, personagens: personagensRisco, enquadramentos: ENQUADRAMENTOS }),
  alerta: cenaRoteiro(() => import('./scenes/cena2-alerta.js'), 'ALERTA'),
  sinais: cenaRoteiro(() => import('./scenes/cena4-sinais.js'), 'SINAIS', 1.15),
  plano: cenaRoteiro(() => import('./scenes/cena5-plano.js'), 'PLANO'),
  enchente: cenaRoteiro(() => import('./scenes/cena6-enchente.js'), 'ENCHENTE'),
};

window.addEventListener('resize', () => licaoAtiva?.reenquadrar?.());

// ---------- Perfil ----------
let perfil = ler(CHAVE_PERFIL);
if (perfil && !dados.perfis[perfil]) perfil = null;
const seletor = criarSeletorPerfil({
  elemento: $('#perfis'),
  perfis: dados.perfis,
  aoEscolher: (p) => {
    perfil = p;
    gravar(CHAVE_PERFIL, p);
    $('#comecar').disabled = false;
    $('#comecar-dica').hidden = true;
    aplicarPerfil();
  },
});
function aplicarPerfil() {
  cena1.aplicarPerfil(perfil);
  $('#perfil-atual').textContent = perfil ? dados.perfis[perfil].titulo.toLowerCase() : 'escolher';
  if (perfil) seletor.marcar(perfil);
}

function abrirIntro() {
  $('#intro').hidden = false;
  $('#comecar').disabled = !perfil;
  $('#comecar-dica').hidden = Boolean(perfil);
  ($('#perfis [aria-pressed=true]') ?? $('#perfis button'))?.focus();
}
$('#comecar').addEventListener('click', () => {
  $('#intro').hidden = true;
  rotear();
});
$('#trocar-perfil').addEventListener('click', () => {
  fecharMenu();
  abrirIntro();
});

// ---------- Menu ----------
const menu = $('#menu');
function fecharMenu() {
  menu.hidden = true;
  $('#abrir-menu').setAttribute('aria-expanded', 'false');
}
$('#abrir-menu').addEventListener('click', () => {
  menu.hidden = false;
  $('#abrir-menu').setAttribute('aria-expanded', 'true');
  $('#fechar-menu').focus();
});
$('#fechar-menu').addEventListener('click', fecharMenu);
document.addEventListener('keydown', (e) => e.key === 'Escape' && fecharMenu());
const ICONES_MENU = ['mapa', 'celular', 'mochila', 'alerta', 'rota', 'chuva', 'sol'];
for (const l of dados.licoes) {
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = `?parada=${l.id}`;
  a.className = 'menu-item';
  a.innerHTML = `${icone(ICONES_MENU[l.id - 1])} <span></span>`;
  a.querySelector('span').textContent = `${l.id}. ${l.titulo}`;
  li.appendChild(a);
  $('#menu-paradas').appendChild(li);
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="?parada="], a[data-rota="trilha"], a#marca');
  if (!a) return;
  e.preventDefault();
  fecharMenu();
  history.pushState(null, '', a.getAttribute('href'));
  rotear();
});
window.addEventListener('popstate', () => rotear());

// ---------- Controles ----------
const VELOCIDADES = [1, 1.5, 2, 0.5];
let licaoAtiva = null;
$('.controles').addEventListener('click', (e) => {
  const b = e.target.closest('[data-acao]');
  if (!b) return;
  const acao = b.dataset.acao;
  if (acao === 'girar-esq') palco.girar(-1);
  if (acao === 'girar-dir') palco.girar(1);
  if (acao === 'redefinir') palco.redefinirVista();
  if (acao === 'reiniciar') licaoAtiva?.reiniciar();
  if (acao === 'pausar') {
    palco.pausado = !palco.pausado;
    b.setAttribute('aria-pressed', String(palco.pausado));
    b.setAttribute('aria-label', palco.pausado ? 'Continuar' : 'Pausar');
    b.innerHTML = icone(palco.pausado ? 'tocar' : 'pausar');
  }
  if (acao === 'velocidade') {
    const v = VELOCIDADES[(VELOCIDADES.indexOf(palco.velocidade) + 1) % VELOCIDADES.length];
    palco.velocidade = v;
    const txt = String(v).replace('.', ',');
    b.textContent = `${txt}×`;
    b.setAttribute('aria-label', `Velocidade da animação: ${txt} vez${v > 1 ? 'es' : ''}`);
  }
});

function progresso({ rotulo, feitas, total }) {
  const el = $('#progresso');
  el.querySelector('.progresso-rotulo').textContent = rotulo;
  el.querySelector('.progresso-num').textContent = `${feitas}/${total}`;
  el.querySelector('.progresso-barra span').style.width = `${(feitas / total) * 100}%`;
}

// ---------- Modos ----------
const ICONES_PARADA = ['mapa', 'celular', 'mochila', 'alerta', 'rota', 'chuva', 'sol'];
const letreiro = document.getElementById('letreiro');

function abrirPlano() {
  const volta = document.activeElement;
  abrirMeuPlano({ perfil, aoFechar: () => volta?.focus?.() });
}
$('#abrir-plano').addEventListener('click', () => {
  fecharMenu();
  abrirPlano();
});

function irParaParada(id) {
  if (id > dados.licoes.length) {
    // fim da trilha: volta ao mapa
    history.pushState(null, '', location.pathname);
    return rotear();
  }
  if (id < 1) return;
  history.pushState(null, '', `?parada=${id}`);
  rotear();
}

function mostrarTrilha(selecionada = null) {
  document.body.dataset.modo = 'trilha';
  letreiro.textContent = 'Prepare-se';
  efeitosRisco.limpar();
  personagensRisco.sair();
  cena1.mostrarTrilha(true);
  palco.definirCena(cena1);
  cena1.selecionar(selecionada);
  cena1.aoTocar = (n) => irParaParada(n);
  aplicarPerfil();

  const destaque = DESTAQUES_PERFIL[perfil] ?? [];
  linhaTempo.definir({
    titulo: 'A trilha: 7 paradas',
    itens: dados.licoes.map((l) => ({
      icone: ICONES_PARADA[l.id - 1],
      titulo: l.titulo,
      marca: destaque.includes(l.id) ? 'para você' : '',
    })),
    atual: selecionada ? selecionada - 1 : -1,
  });
  navegar = (i) => irParaParada(i + 1);

  guia.mostrar({
    cabeca: perfil ? `Você mora em: ${dados.perfis[perfil].titulo.toLowerCase()}` : 'Defesa Civil · Santa Catarina',
    titulo: 'Toque numa parada',
    abas: [
      {
        chave: 'trilha',
        rotulo: 'Trilha',
        render: (el) => {
          paragrafos(el, 'Sete paradas para preparar sua família para chuva forte, enchente e deslizamento.');
          if (perfil) paragrafos(el, 'As paradas com anel laranja têm orientação própria para onde você mora.');
        },
      },
    ],
  });
}

// Rota atual: uma troca de parada durante um carregamento cancela a anterior.
let rota = 0;
const carregando = () => document.body.classList.add('carregando');
const carregado = () => document.body.classList.remove('carregando');

async function mostrarLicaoRoteiro(l, minha) {
  carregando();
  const c = await (CENAS_ROTEIRO[l.cena] ?? CENAS_ROTEIRO.terreno)();
  carregado();
  if (minha !== rota) return;
  document.body.dataset.modo = 'licao';
  letreiro.textContent = l.letreiro ?? l.titulo;
  guia.recolher(false);
  cena1.mostrarTrilha(false);
  palco.definirCena(c.cena);
  licaoAtiva = criarLicaoRoteiro({
    licao: l,
    perfil,
    efeitos: c.efeitos,
    personagens: c.personagens,
    enquadramentos: c.enquadramentos,
    palco,
    guia,
    linhaTempo,
    etiquetas,
    progresso,
    total: dados.licoes.length,
    abrirPlano: () => abrirPlano(),
    aoTerminar: () => irParaParada(l.id + 1),
  });
  navegar = (i) => licaoAtiva.irPara(i);
  licaoAtiva.iniciar();
}

// Cenas das lições "fazer": uma ação animada por subpasso, sem personagens.
const CENAS_FAZER = { depois: () => import('./scenes/cena7-fazer.js').then((m) => m.criarCenaFazer7) };
const cenasFazer = {};
async function mostrarLicaoFazer(l, minha) {
  if (!cenasFazer[l.cena]) {
    carregando();
    const criar = await CENAS_FAZER[l.cena]();
    carregado();
    cenasFazer[l.cena] ??= criar({ palco });
  }
  if (minha !== rota) return;
  document.body.dataset.modo = 'licao';
  document.body.dataset.fazer = 'sim';
  letreiro.textContent = l.letreiro ?? l.titulo;
  guia.recolher(false);
  personagensRisco.sair();
  const c = cenasFazer[l.cena];
  palco.definirCena(c);
  licaoAtiva = criarLicaoFazer({
    licao: l,
    total: dados.licoes.length,
    perfil,
    cena: c,
    palco,
    guia,
    linhaTempo,
    etiquetas,
    progresso,
    abrirPlano: () => abrirPlano(),
    aoTerminar: () => irParaParada(l.id + 1),
  });
  navegar = (i) => licaoAtiva.irPara(i);
  licaoAtiva.iniciar();
  if (new URLSearchParams(location.search).has('depurar')) window.__trilha = { palco, cena: c, licao: licaoAtiva };
}

// Vitrines das lições "passos" (palco limpo), montadas na primeira visita.
const ITENS_VITRINE = {
  kit: () => import('./scenes/objetos-kit.js').then((m) => m.ITENS_KIT),
  sinais: () => import('./scenes/objetos-sinais.js').then((m) => m.ITENS_SINAIS),
};
const vitrines = {};
async function vitrinePara(l) {
  if (!vitrines[l.id]) {
    const [itens, { criarVitrine }] = await Promise.all([ITENS_VITRINE[l.cena](), import('./scenes/vitrine.js')]);
    if (vitrines[l.id]) return vitrines[l.id];
    const etapas = l.etapas.map((e) => e.subpassos.map((s) => s.objeto));
    const usados = Object.fromEntries(etapas.flat().map((id) => [id, itens[id]]));
    vitrines[l.id] = criarVitrine({ itens: usados, etapas });
    vitrines[l.id].conectar(palco);
  }
  return vitrines[l.id];
}

// Quantos objetos cabem lado a lado: todos no desktop; 2 em tela estreita.
function colunasVitrine(n) {
  const l = areaLivre();
  const prop = (window.innerWidth - l.esquerda - l.direita) / Math.max(window.innerHeight - l.topo - l.base, 1);
  if (prop >= 1.3) return Math.min(n, 4);
  return prop >= 0.85 ? Math.min(n, 3) : Math.min(n, 2);
}

async function mostrarLicaoPassos(l, minha) {
  carregando();
  const v = await vitrinePara(l);
  carregado();
  if (minha !== rota) return;
  document.body.dataset.modo = 'licao';
  document.body.dataset.vitrine = 'sim';
  letreiro.textContent = l.letreiro ?? l.titulo;
  guia.recolher(false);
  personagensRisco.sair();
  palco.definirCena(v);
  licaoAtiva = criarLicaoPassos({
    licao: l,
    total: dados.licoes.length,
    perfil,
    cena: v,
    palco,
    guia,
    linhaTempo,
    etiquetas,
    progresso,
    colunas: colunasVitrine,
    abrirPlano: () => abrirPlano(),
    aoTerminar: () => irParaParada(l.id + 1),
  });
  navegar = (i) => licaoAtiva.irPara(i);
  licaoAtiva.iniciar();
}

function rotear() {
  const minha = ++rota;
  const id = Number(new URLSearchParams(location.search).get('parada'));
  const l = dados.licoes.find((x) => x.id === id);
  licaoAtiva?.parar();
  licaoAtiva = null;
  const mp = document.getElementById('meu-plano');
  if (mp && !mp.hidden) {
    mp.hidden = true;
    document.body.classList.remove('com-meu-plano');
  }
  etiquetas.limpar();
  palco.pausado = false;
  const bp = document.querySelector('[data-acao=pausar]');
  bp.innerHTML = icone('pausar');
  bp.setAttribute('aria-pressed', 'false');
  bp.setAttribute('aria-label', 'Pausar');
  delete document.body.dataset.vitrine;
  delete document.body.dataset.fazer;
  if (!l) return mostrarTrilha();
  if (l.tipo === 'passos') return mostrarLicaoPassos(l, minha);
  if (l.tipo === 'fazer') return mostrarLicaoFazer(l, minha);
  return mostrarLicaoRoteiro(l, minha);
}

aplicarPerfil();
rotear();
if (!perfil) abrirIntro();
