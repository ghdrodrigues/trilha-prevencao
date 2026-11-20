// Seletor de perfil de risco: "Onde você mora?" (BRIEF §3.1, passo 2).

const ICONES = { encosta: '⛰️', baixada: '🌊', aberto: '🌬️' };

export function criarSeletorPerfil({ elemento, perfis, aoEscolher }) {
  const botoes = [];
  for (const [chave, p] of Object.entries(perfis)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cartao-perfil';
    b.dataset.perfil = chave;
    b.setAttribute('aria-pressed', 'false');
    b.innerHTML = `<span class="icone" aria-hidden="true">${ICONES[chave] ?? ''}</span>
      <strong>${p.titulo}</strong><span class="enfase">Ênfase em ${p.enfase}</span>`;
    b.addEventListener('click', () => {
      for (const o of botoes) o.setAttribute('aria-pressed', String(o === b));
      aoEscolher(chave);
    });
    botoes.push(b);
    elemento.appendChild(b);
  }
}
