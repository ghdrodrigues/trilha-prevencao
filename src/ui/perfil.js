// Seletor de perfil de risco: "Onde você mora?" (BRIEF §3.1, passo 2).

import { icone } from './icones.js';

export function criarSeletorPerfil({ elemento, perfis, aoEscolher }) {
  const botoes = [];
  for (const [chave, p] of Object.entries(perfis)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cartao-perfil';
    b.dataset.perfil = chave;
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `<span class="icone">${icone(chave)}</span>
      <strong></strong><span class="enfase"></span>`;
    b.querySelector('strong').textContent = p.titulo;
    b.querySelector('.enfase').textContent = `Ênfase em ${p.enfase}`;
    b.addEventListener('click', () => {
      marcar(chave);
      aoEscolher(chave);
    });
    botoes.push(b);
    elemento.appendChild(b);
  }
  function marcar(chave) {
    for (const o of botoes) o.setAttribute('aria-pressed', String(o.dataset.perfil === chave));
  }
  return { marcar };
}
