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
export function fecharGrupo(sec, etapa, fontesLicao) {
  const norm = (t) => t.toLowerCase().replace(/[.\s]+$/, '');
  const itens = new Set(etapa.subpassos.map((s) => norm(s.texto)));
  for (const d of etapa.dicas ?? []) {
    if (itens.has(norm(d))) continue; // não repete o que já está na lista
    const p = document.createElement('p');
    p.className = 'grupo-dica';
    p.textContent = d;
    sec.append(p);
  }
  citarFontes(sec, etapa.fontes?.length ? etapa.fontes : fontesLicao, { curto: true });
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
