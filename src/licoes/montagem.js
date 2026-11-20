// Lição do tipo "montagem" (Kit de emergência): etapas → subpassos. Cada subpasso faz
// seus objetos entrarem na cena e mostra uma etiqueta. Reprodução automática
// dos subpassos da etapa, com pausa e velocidade do palco.

import { paragrafos, lista, avisoRascunho, citarFontes } from '../ui/guia.js';

const CHAVE_TENHO = 'trilha.kit.tenho';

function lerTenho() {
  try {
    return new Set(JSON.parse(localStorage.getItem(CHAVE_TENHO) ?? '[]'));
  } catch {
    return new Set();
  }
}
function salvarTenho(s) {
  try {
    localStorage.setItem(CHAVE_TENHO, JSON.stringify([...s]));
  } catch {
    /* sem armazenamento: o checklist vale só nesta visita */
  }
}

export function criarLicaoMontagem({ licao, cena, palco, guia, linhaTempo, etiquetas, progresso, aoTerminar }) {
  const etapas = licao.etapas;
  const tenho = lerTenho();
  const concluidas = new Set();
  let etapa = 0;
  let sub = -1; // subpasso atual (-1 = ainda não começou)
  let token = 0; // cancela sequências antigas
  let final = false;

  // Itens do checklist: subpassos com objetos.
  const itensChecklist = etapas.flatMap((e, ei) =>
    e.subpassos.map((s, si) => ({ chave: `${e.id}:${si}`, s, ei })).filter((x) => x.s.objetos?.length),
  );

  // Mapa objeto → [etapa, subpasso] para o toque na cena.
  const onde = {};
  etapas.forEach((e, ei) =>
    e.subpassos.forEach((s, si) => {
      for (const id of s.objetos ?? []) onde[id] = [ei, si];
    }),
  );

  const esperar = (seg) => palco.tweens.animar({ duracao: seg, aoAtualizar: () => {} });

  function atualizarProgresso() {
    progresso({ rotulo: licao.titulo, feitas: concluidas.size, total: etapas.length });
    linhaTempo.marcar(
      etapa,
      etapas.map((_, i) => concluidas.has(i)),
    );
  }

  // Coloca a cena no estado "antes do subpasso `si` da etapa `ei`".
  function prepararCena(ei, si) {
    etapas.forEach((e, i) =>
      e.subpassos.forEach((s, j) => {
        for (const id of s.objetos ?? []) {
          if (i < ei || (i === ei && j < si)) cena.mostrarImediato(id);
          else cena.ocultar(id);
        }
      }),
    );
    cena.destacar([]);
    etiquetas.limpar();
  }

  async function tocarSubpasso(ei, si, meu) {
    const s = etapas[ei].subpassos[si];
    sub = si;
    renderGuia();
    const reduzido = palco.movimentoReduzido();
    const objs = s.objetos ?? [];
    await Promise.all(objs.map((id, k) => cena.entrar(id, { atraso: k * 0.18, reduzido })));
    if (meu !== token) return false;
    const alvoEtiqueta = objs[0] ?? s.destaque?.[0];
    cena.destacar(s.destaque ?? objs);
    etiquetas.limpar();
    if (alvoEtiqueta) {
      etiquetas.adicionar('atual', { ancora: cena.ancoras[alvoEtiqueta], texto: s.etiqueta ?? s.texto });
    }
    await esperar(1.6);
    return meu === token;
  }

  // Toca a etapa a partir do subpasso `de`.
  async function tocarEtapa(ei, de = 0) {
    const meu = ++token;
    final = false;
    etapa = ei;
    prepararCena(ei, de);
    atualizarProgresso();
    renderGuia();
    for (let si = de; si < etapas[ei].subpassos.length; si++) {
      const ok = await tocarSubpasso(ei, si, meu);
      if (!ok) return;
    }
    concluidas.add(ei);
    sub = etapas[ei].subpassos.length; // todos vistos
    cena.destacar([]);
    atualizarProgresso();
    renderGuia();
  }

  function irPara(ei) {
    palco.tweens.concluirTodos();
    tocarEtapa(ei, 0);
  }

  function tocarObjeto(id) {
    const pos = onde[id];
    if (!pos) return;
    const [ei, si] = pos;
    palco.tweens.concluirTodos();
    tocarEtapa(ei, si);
  }

  async function guardar() {
    const meu = ++token;
    etapas.forEach((e) => e.subpassos.forEach((s) => (s.objetos ?? []).forEach((id) => cena.mostrarImediato(id))));
    etiquetas.limpar();
    etiquetas.adicionar('mochila', { ancora: cena.ancoras.mochila, texto: 'Kit pronto' });
    await cena.guardarNaMochila(palco.movimentoReduzido());
    if (meu !== token) return;
    final = true;
    renderGuia();
  }

  function reiniciar() {
    concluidas.clear();
    palco.tweens.concluirTodos();
    tocarEtapa(0, 0);
  }

  // ---------- Guia ----------
  function renderInstrucoes(el) {
    const e = etapas[etapa];
    paragrafos(el, e.resumo);
    const ol = document.createElement('ol');
    ol.className = 'subpassos';
    e.subpassos.forEach((s, si) => {
      const li = document.createElement('li');
      li.className = si === sub ? 'atual' : si < sub ? 'visto' : '';
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'subpasso';
      b.innerHTML = `<span class="sp-marca" aria-hidden="true"></span><span class="sp-texto"></span>`;
      b.querySelector('.sp-texto').textContent = `${si + 1}. ${s.texto}`;
      if (si === sub) b.setAttribute('aria-current', 'step');
      b.addEventListener('click', () => {
        palco.tweens.concluirTodos();
        tocarEtapa(etapa, si);
      });
      li.appendChild(b);
      if (s.objetos?.length) {
        const chave = `${e.id}:${si}`;
        const rot = document.createElement('label');
        rot.className = 'tenho';
        rot.innerHTML = `<input type="checkbox" /> Tenho em casa`;
        const cb = rot.querySelector('input');
        cb.checked = tenho.has(chave);
        cb.addEventListener('change', () => {
          if (cb.checked) tenho.add(chave);
          else tenho.delete(chave);
          salvarTenho(tenho);
          renderContagem();
        });
        li.appendChild(rot);
      }
      ol.appendChild(li);
    });
    el.appendChild(ol);

    const fim = sub >= e.subpassos.length;
    if (fim && etapa < etapas.length - 1) {
      const b = botao('Próxima etapa →', () => irPara(etapa + 1), 'botao primario pulsar');
      el.appendChild(b);
    } else if (fim && !final) {
      el.appendChild(botao('Guardar tudo na mochila', guardar, 'botao primario pulsar'));
    }
    if (final) {
      const div = document.createElement('div');
      div.className = 'final';
      const n = itensChecklist.filter((x) => tenho.has(x.chave)).length;
      div.innerHTML = `<p class="final-titulo">Kit pronto!</p><p></p>`;
      div.querySelector('p:last-child').textContent =
        n === itensChecklist.length
          ? 'Você já tem todos os itens em casa. Confira o kit de tempos em tempos.'
          : `Você marcou ${n} de ${itensChecklist.length} itens que já tem em casa. Os que faltam são sua lista de compras.`;
      div.appendChild(botao('Próxima parada →', () => aoTerminar?.(), 'botao primario'));
      el.appendChild(div);
    }
  }

  function botao(texto, aoClicar, classe) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = classe;
    b.textContent = texto;
    b.addEventListener('click', aoClicar);
    return b;
  }

  function renderContagem() {
    const el = document.querySelector('.contagem-kit');
    if (!el) return;
    const n = itensChecklist.filter((x) => tenho.has(x.chave)).length;
    el.textContent = `Seu kit em casa: ${n} de ${itensChecklist.length} itens`;
  }

  function renderGuia() {
    const e = etapas[etapa];
    guia.mostrar({
      cabeca: `Parada ${licao.id} · Etapa ${etapa + 1} de ${etapas.length}`,
      titulo: e.titulo,
      manterAba: true,
      abas: [
        { chave: 'instrucoes', rotulo: 'Instruções', render: renderInstrucoes },
        { chave: 'explicacao', rotulo: 'Por que importa', render: (el) => paragrafos(el, e.explicacao) },
        { chave: 'dicas', rotulo: 'Dica do agente', render: (el) => lista(el, e.dicas) },
      ],
      rodape: (el) => {
        const p = document.createElement('p');
        p.className = 'contagem-kit';
        el.appendChild(p);
        renderContagem();
        citarFontes(el, e.fontes?.length ? e.fontes : licao.fontes);
        if (licao.rascunho) avisoRascunho(el);
      },
    });
  }

  // ---------- Início ----------
  function iniciar() {
    linhaTempo.definir({
      titulo: `Parada ${licao.id}: ${licao.titulo}`,
      itens: etapas.map((e) => ({ icone: e.icone, titulo: e.curto ?? e.titulo })),
      atual: 0,
    });
    cena.aoTocar = tocarObjeto;
    tocarEtapa(0, 0);
  }

  return { iniciar, irPara, reiniciar, parar: () => token++ };
}
