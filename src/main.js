// Aplicação: palco em tela cheia, mapa da trilha e lições.
// Rotas: ./ (mapa da trilha) e ./?parada=N (lição N), compartilháveis no WhatsApp.

import './style.css';
import dados from '../data/licoes.json';
import { criarPalco } from './motor/palco.js';
import { criarEtiquetas } from './motor/etiquetas.js';
import { criarCena1, DESTAQUES_PERFIL } from './scenes/cena1-terreno.js';
import { criarCenaKit } from './scenes/cena3-kit.js';
import { criarGuia, paragrafos, lista, avisoRascunho } from './ui/guia.js';
import { criarLinhaTempo } from './ui/linha-tempo.js';
import { criarSeletorPerfil } from './ui/perfil.js';
import { criarLicaoMontagem } from './licoes/montagem.js';

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
  return { esquerda: 8, topo: topo.offsetHeight + 8, direita: 8, base: Math.max(base, 0) + 8 };
}

const palco = criarPalco($('#palco'), { areaLivre });
const etiquetas = criarEtiquetas($('#etiquetas'), palco);
const guia = criarGuia(guiaEl, { aoMudarTamanho: () => requestAnimationFrame(palco.redimensionar) });
// No celular a cena manda: o guia começa recolhido (título + subpasso atual).
if (!desktop.matches) guia.recolher(true);
new ResizeObserver(() => palco.redimensionar()).observe(guiaEl);
new ResizeObserver(() => {
  document.documentElement.style.setProperty('--lt-h', `${linhaEl.offsetHeight}px`);
  palco.redimensionar();
}).observe(linhaEl);

let navegar = () => {};
const linhaTempo = criarLinhaTempo(linhaEl, { aoEscolher: (i) => navegar(i) });

// ---------- Cenas ----------
const cena1 = criarCena1();
const cenaKit = criarCenaKit();
cenaKit.conectar(palco);

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
for (const l of dados.licoes) {
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = `?parada=${l.id}`;
  a.className = 'menu-item';
  a.textContent = `${l.id}. ${l.titulo}${l.etapas ? ' · 3D' : ''}`;
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
    b.textContent = palco.pausado ? '▶' : '⏸';
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
const ICONES_PARADA = ['🗺️', '📱', '🎒', '⚠️', '🏃', '🌧️', '☀️'];

function irParaParada(id) {
  if (id < 1 || id > dados.licoes.length) return;
  history.pushState(null, '', `?parada=${id}`);
  rotear();
}

function mostrarTrilha(selecionada = null) {
  document.body.dataset.modo = 'trilha';
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
          if (perfil) paragrafos(el, 'As paradas com anel laranja foram adaptadas para onde você mora.');
        },
      },
    ],
  });
}

// Lições ainda sem cena animada: o mapa fica ao fundo e o guia mostra as 3 abas.
function mostrarLicaoSimples(l) {
  document.body.dataset.modo = 'simples';
  guia.recolher(false); // sem animação, o texto é o conteúdo
  const abas = { ...l.abas, ...(l.perfil_variacoes?.[perfil] ?? {}) };
  const adaptado = Boolean(l.perfil_variacoes?.[perfil]);
  guia.mostrar({
    cabeca: `Parada ${l.id} de ${dados.licoes.length}${adaptado ? ' · adaptada para você' : ''}`,
    titulo: l.titulo,
    abas: [
      { chave: 'passo', rotulo: 'Passo a passo', render: (el) => lista(el, abas.passo, true) },
      { chave: 'porque', rotulo: 'Por que importa', render: (el) => paragrafos(el, abas.porque) },
      { chave: 'dica', rotulo: 'Dica do agente', render: (el) => paragrafos(el, abas.dica) },
    ],
    rodape: (el) => {
      const p = document.createElement('p');
      p.className = 'em-breve';
      p.textContent = 'Cena animada desta parada: em produção.';
      el.appendChild(p);
      if (l.rascunho) avisoRascunho(el);
    },
  });
}

function mostrarLicaoMontagem(l) {
  document.body.dataset.modo = 'licao';
  if (!desktop.matches) guia.recolher(true);
  palco.definirCena(cenaKit);
  licaoAtiva = criarLicaoMontagem({
    licao: l,
    cena: cenaKit,
    palco,
    guia,
    linhaTempo,
    etiquetas,
    progresso,
    aoTerminar: () => irParaParada(l.id + 1),
  });
  navegar = (i) => licaoAtiva.irPara(i);
  licaoAtiva.iniciar();
}

function rotear() {
  const id = Number(new URLSearchParams(location.search).get('parada'));
  const l = dados.licoes.find((x) => x.id === id);
  licaoAtiva?.parar();
  licaoAtiva = null;
  etiquetas.limpar();
  palco.pausado = false;
  const bp = document.querySelector('[data-acao=pausar]');
  bp.textContent = '⏸';
  bp.setAttribute('aria-pressed', 'false');
  bp.setAttribute('aria-label', 'Pausar');
  if (!l) return mostrarTrilha();
  if (l.etapas) return mostrarLicaoMontagem(l);
  mostrarTrilha(l.id);
  mostrarLicaoSimples(l);
}

aplicarPerfil();
rotear();
if (!perfil) abrirIntro();
