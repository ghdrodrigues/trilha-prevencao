// Peças comuns às lições em lista (roteiro e montagem): botões, cabeçalho de
// grupo e rodapé fixo com "Próxima parada" e "Meu plano".

import { icone } from '../ui/icones.js';
import { citarFontes } from '../ui/guia.js';

export function botao(texto, aoClicar, classe = 'botao') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = classe;
  b.textContent = texto;
  b.addEventListener('click', aoClicar);
  return b;
}

// Cabeçalho de um grupo da lista (uma etapa da lição).
export function abrirGrupo(el, etapa, ei) {
  const sec = document.createElement('section');
  sec.className = 'grupo';
  sec.id = `grupo-${ei}`;
  const h = document.createElement('h3');
  h.className = 'grupo-titulo';
  h.innerHTML = etapa.icone ? icone(etapa.icone) : '';
  h.append(document.createTextNode(etapa.titulo));
  sec.append(h);
  el.append(sec);
  return sec;
}

// Fecha o grupo com dica (se houver) e fonte.
export function fecharGrupo(sec, etapa, fontesLicao, { max = Infinity, dicas = true } = {}) {
  const norm = (t) => t.toLowerCase().replace(/[.\s]+$/, '');
  const itens = new Set(etapa.subpassos.map((s) => norm(s.texto)));
  for (const d of dicas ? etapa.dicas ?? [] : []) {
    if (itens.has(norm(d))) continue; // não repete o que já está na lista
    const p = document.createElement('p');
    p.className = 'grupo-dica';
    p.textContent = d;
    sec.append(p);
  }
  citarFontes(sec, etapa.fontes?.length ? etapa.fontes : fontesLicao, { curto: true, max });
}

// Rodapé fixo: segue para a próxima parada ou, na última, abre o plano.
export function rodapeNavegacao(el, { licao, total, aoTerminar, abrirPlano }) {
  const div = document.createElement('div');
  div.className = 'rodape-botoes';
  if (licao.id < total) {
    div.append(botao('Próxima parada →', () => aoTerminar?.(), 'botao primario'));
    div.append(botao('Meu plano', () => abrirPlano?.(), 'botao'));
  } else {
    div.append(botao('Ver meu plano', () => abrirPlano?.(), 'botao primario'));
    div.append(botao('Voltar ao mapa', () => aoTerminar?.(), 'botao'));
  }
  el.append(div);
}

export function rolarAte(id) {
  const alvo = document.getElementById(id);
  if (!alvo) return;
  const reduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  alvo.scrollIntoView({ block: 'start', behavior: reduzido ? 'auto' : 'smooth' });
}

// Objetivo da parada: uma linha no topo da primeira etapa (o que a pessoa
// leva ao terminar). Vem do campo "objetivo" do licoes.json.
export function renderObjetivo(el, licao) {
  if (!licao.objetivo) return;
  const p = document.createElement('p');
  p.className = 'objetivo';
  p.textContent = licao.objetivo;
  el.append(p);
}

// Caixa de fim de parada ("final" no licoes.json).
export function renderFinal(el, licao) {
  if (!licao.final) return null;
  const div = document.createElement('div');
  div.className = 'final';
  div.innerHTML = `<p class="final-titulo"></p><p></p>`;
  div.querySelector('.final-titulo').textContent = licao.final.titulo;
  div.querySelector('p:last-child').textContent = licao.final.texto;
  el.append(div);
  return div;
}

// Prática: perguntas de escolha com resposta tirada da própria lição. O
// retorno cita a fonte. Fica na última etapa, antes do fim da parada.
const respostas = new Map(); // "parada:pergunta" -> índice escolhido (só nesta visita)
export function renderPratica(el, licao) {
  const lista = licao.pratica ?? [];
  if (!lista.length) return;
  const sec = document.createElement('section');
  sec.className = 'pratica';
  sec.setAttribute('aria-labelledby', `pratica-${licao.id}`);
  const h = document.createElement('h3');
  h.className = 'pratica-titulo';
  h.id = `pratica-${licao.id}`;
  h.textContent = 'Pratique';
  sec.append(h);
  lista.forEach((q, qi) => {
    const chave = `${licao.id}:${qi}`;
    const bloco = document.createElement('fieldset');
    bloco.className = 'pergunta';
    const leg = document.createElement('legend');
    leg.textContent = q.pergunta;
    bloco.append(leg);
    // ordem fixa por pergunta, mas a certa não fica sempre em primeiro
    const ordem = q.opcoes.map((o, i) => i);
    const giro = (licao.id + qi) % ordem.length;
    const opcoes = [...ordem.slice(giro), ...ordem.slice(0, giro)];
    const retorno = document.createElement('p');
    retorno.className = 'retorno';
    retorno.setAttribute('role', 'status');
    const botoes = [];
    const responder = (i, { foco = true } = {}) => {
      respostas.set(chave, i);
      const certa = Boolean(q.opcoes[i].certa);
      for (const b of botoes) {
        const o = q.opcoes[Number(b.dataset.i)];
        b.classList.toggle('certa', Boolean(o.certa));
        b.classList.toggle('errada', Number(b.dataset.i) === i && !certa);
        b.setAttribute('aria-pressed', String(Number(b.dataset.i) === i));
      }
      retorno.replaceChildren();
      const forte = document.createElement('strong');
      forte.textContent = certa ? 'Isso. ' : 'Não. ';
      retorno.append(forte, document.createTextNode(q.explicacao));
      citarFontes(retorno, q.fontes, { curto: true, max: 1 });
      retorno.classList.toggle('acertou', certa);
      if (foco) retorno.focus?.();
    };
    for (const i of opcoes) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'opcao';
      b.dataset.i = i;
      b.textContent = q.opcoes[i].texto;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => responder(i, { foco: false }));
      botoes.push(b);
      bloco.append(b);
    }
    bloco.append(retorno);
    sec.append(bloco);
    if (respostas.has(chave)) responder(respostas.get(chave), { foco: false });
  });
  el.append(sec);
}
