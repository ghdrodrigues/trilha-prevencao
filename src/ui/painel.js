// Painel da lição com 3 abas (Passo a passo / Por que importa / Dica do agente).
// Desktop: painel lateral sobre a cena. Celular: bottom-sheet.

const ABAS = [
  { chave: 'passo', rotulo: 'Passo a passo' },
  { chave: 'porque', rotulo: 'Por que importa' },
  { chave: 'dica', rotulo: 'Dica do agente' },
];

// Conteúdo da aba = padrão + sobrescrita do perfil, quando houver.
export function conteudoLicao(licao, perfil) {
  return { ...licao.abas, ...(licao.perfil_variacoes?.[perfil] ?? {}) };
}

export function criarPainel({ elemento, dados, aoFechar, aoNavegar }) {
  let licaoAtual = null;
  let perfilAtual = null;
  let abaAtual = 'passo';
  let focoAnterior = null;

  elemento.innerHTML = `
    <div class="painel-topo">
      <p class="painel-parada"></p>
      <h2 id="painel-titulo"></h2>
      <button type="button" class="fechar" aria-label="Fechar lição">×</button>
    </div>
    <p class="painel-perfil" hidden></p>
    <div role="tablist" aria-label="Seções da lição" class="abas"></div>
    <div class="aba-conteudo" role="tabpanel" tabindex="0"></div>
    <p class="aviso-rascunho">Conteúdo em rascunho. Será validado com a Defesa Civil SC antes de publicar.</p>
    <nav class="painel-nav" aria-label="Navegar entre paradas">
      <button type="button" class="anterior">← Anterior</button>
      <button type="button" class="proxima">Próxima →</button>
    </nav>`;
  elemento.setAttribute('aria-labelledby', 'painel-titulo');

  const $ = (s) => elemento.querySelector(s);
  const lista = $('[role=tablist]');
  const conteudo = $('.aba-conteudo');

  const tabs = ABAS.map(({ chave, rotulo }) => {
    const t = document.createElement('button');
    t.type = 'button';
    t.role = 'tab';
    t.id = `aba-${chave}`;
    t.textContent = rotulo;
    t.dataset.aba = chave;
    t.addEventListener('click', () => mostrarAba(chave));
    lista.appendChild(t);
    return t;
  });

  // Setas trocam de aba (padrão WAI-ARIA de tabs).
  lista.addEventListener('keydown', (e) => {
    const i = ABAS.findIndex((a) => a.chave === abaAtual);
    const passo = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!passo) return;
    const prox = ABAS[(i + passo + ABAS.length) % ABAS.length].chave;
    mostrarAba(prox);
    tabs.find((t) => t.dataset.aba === prox).focus();
  });

  $('.fechar').addEventListener('click', fechar);
  $('.anterior').addEventListener('click', () => licaoAtual > 1 && aoNavegar(licaoAtual - 1));
  $('.proxima').addEventListener('click', () => licaoAtual < dados.licoes.length && aoNavegar(licaoAtual + 1));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !elemento.hidden) fechar();
  });

  function mostrarAba(chave) {
    abaAtual = chave;
    for (const t of tabs) {
      const ativa = t.dataset.aba === chave;
      t.setAttribute('aria-selected', String(ativa));
      t.tabIndex = ativa ? 0 : -1;
    }
    conteudo.setAttribute('aria-labelledby', `aba-${chave}`);
    render();
  }

  function render() {
    const licao = dados.licoes.find((l) => l.id === licaoAtual);
    if (!licao) return;
    const abas = conteudoLicao(licao, perfilAtual);
    const valor = abas[abaAtual];
    conteudo.replaceChildren();
    if (Array.isArray(valor)) {
      const ol = document.createElement('ol');
      for (const item of valor) {
        const li = document.createElement('li');
        li.textContent = item;
        ol.appendChild(li);
      }
      conteudo.appendChild(ol);
    } else {
      const p = document.createElement('p');
      p.textContent = valor;
      if (abaAtual === 'dica') p.className = 'dica';
      conteudo.appendChild(p);
    }
    const temVariacao = Boolean(licao.perfil_variacoes?.[perfilAtual]);
    const aviso = $('.painel-perfil');
    aviso.hidden = !temVariacao;
    if (temVariacao) aviso.textContent = `Adaptado para quem mora em: ${dados.perfis[perfilAtual].titulo.toLowerCase()}`;
    $('.aviso-rascunho').hidden = !licao.rascunho;
  }

  function abrir(id, perfil) {
    const jaAberto = !elemento.hidden;
    if (!jaAberto) focoAnterior = document.activeElement;
    licaoAtual = id;
    perfilAtual = perfil;
    const licao = dados.licoes.find((l) => l.id === id);
    $('.painel-parada').textContent = `Parada ${id} de ${dados.licoes.length}`;
    $('#painel-titulo').textContent = licao.titulo;
    $('.anterior').disabled = id === 1;
    $('.proxima').disabled = id === dados.licoes.length;
    elemento.hidden = false;
    mostrarAba('passo');
    tabs[0].focus({ preventScroll: true });
  }

  function fechar() {
    elemento.hidden = true;
    licaoAtual = null;
    aoFechar?.();
    focoAnterior?.focus?.({ preventScroll: true });
  }

  function atualizarPerfil(perfil) {
    perfilAtual = perfil;
    if (licaoAtual) render();
  }

  return { abrir, fechar, atualizarPerfil };
}
