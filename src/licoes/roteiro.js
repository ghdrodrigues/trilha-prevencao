// Lição do tipo "roteiro": etapas → subpassos sobre uma cena fixa. Cada
// subpasso leva a câmera a um ponto da cena (foco), dispara um efeito e mostra
// uma etiqueta. Usada na parada 1 ("Conheça seu risco") sobre o mapa.

import * as THREE from 'three';
import { paragrafos, lista, avisoRascunho, citarFontes } from '../ui/guia.js';

export function criarLicaoRoteiro({ licao, perfil, efeitos, personagens, enquadramentos, palco, guia, linhaTempo, etiquetas, progresso, aoTerminar }) {
  // Etapas marcadas com ordenarPorPerfil mostram primeiro o perfil de quem usa.
  const etapas = licao.etapas.map((e) => {
    if (!e.ordenarPorPerfil || !perfil) return e;
    const subpassos = [...e.subpassos].sort((a, b) => (b.perfil === perfil) - (a.perfil === perfil));
    return { ...e, subpassos };
  });
  const variacao = licao.perfil_variacoes?.[perfil] ?? {};
  const concluidas = new Set();
  let etapa = 0;
  let sub = -1;
  let token = 0;
  let final = false;
  let focoAtual = null; // evita reenquadrar quando o foco não muda

  const esperar = (seg) => palco.tweens.animar({ duracao: seg, aoAtualizar: () => {} });

  function atualizarProgresso() {
    progresso({ rotulo: licao.titulo, feitas: concluidas.size, total: etapas.length });
    linhaTempo.marcar(
      etapa,
      etapas.map((_, i) => concluidas.has(i)),
    );
  }

  const textoEtiqueta = (s) => (s.perfil && s.perfil === perfil ? `${s.etiqueta} · você mora aqui` : s.etiqueta ?? s.texto);

  // Estado "antes do subpasso si": efeitos dos subpassos anteriores já aplicados.
  function prepararCena(ei, si) {
    efeitos.limpar();
    etiquetas.limpar();
    etapas[ei].subpassos.slice(0, si).forEach((s) => efeitos.aplicar(s.efeito, { instantaneo: true }));
  }

  // Personagens: a Agente vai para o foco e indica a âncora; o vizinho acena
  // quando a zona dele aparece. Ações vêm do subpasso (agente, vizinho).
  function encenar(s, foco) {
    if (!personagens) return;
    const ancora = s.ancora && efeitos.ancoras[s.ancora];
    const mira = ancora ? ancora.getWorldPosition(new THREE.Vector3()) : null;
    const vizinho = s.perfil && s.perfil === perfil ? 'acenar' : typeof s.vizinho === 'object' ? s.vizinho?.[perfil] : s.vizinho;
    personagens.encenar({ foco, mira, agente: s.agente, vizinho });
  }

  async function tocarSubpasso(ei, si, meu) {
    const s = etapas[ei].subpassos[si];
    sub = si;
    renderGuia();
    etiquetas.limpar();
    const foco = s.foco ?? 'geral';
    if (foco !== focoAtual) {
      focoAtual = foco;
      await palco.enquadrar(enquadramentos[foco]);
      if (meu !== token) return false;
    }
    encenar(s, foco);
    const efeito = efeitos.aplicar(s.efeito);
    if (s.ancora && efeitos.ancoras[s.ancora]) {
      etiquetas.adicionar('atual', { ancora: efeitos.ancoras[s.ancora], texto: textoEtiqueta(s) });
    }
    await efeito;
    if (meu !== token) return false;
    await esperar(s.pausa ?? 1.8);
    return meu === token;
  }

  async function tocarEtapa(ei, de = 0) {
    const meu = ++token;
    final = false;
    etapa = ei;
    prepararCena(ei, de);
    atualizarProgresso();
    renderGuia();
    for (let si = de; si < etapas[ei].subpassos.length; si++) {
      if (!(await tocarSubpasso(ei, si, meu))) return;
    }
    concluidas.add(ei);
    sub = etapas[ei].subpassos.length;
    if (ei === etapas.length - 1) final = true;
    atualizarProgresso();
    renderGuia();
  }

  function irPara(ei) {
    focoAtual = null;
    palco.tweens.concluirTodos();
    tocarEtapa(ei, 0);
  }

  function reiniciar() {
    concluidas.clear();
    palco.tweens.concluirTodos();
    tocarEtapa(0, 0);
  }

  function parar() {
    token++;
    personagens?.sair();
    efeitos.limpar();
    etiquetas.limpar();
  }

  // ---------- Guia ----------
  function botao(texto, aoClicar, classe) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = classe;
    b.textContent = texto;
    b.addEventListener('click', aoClicar);
    return b;
  }

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
      b.querySelector('.sp-texto').textContent = `${si + 1}. ${s.texto}${s.perfil && s.perfil === perfil ? ' (você)' : ''}`;
      if (si === sub) b.setAttribute('aria-current', 'step');
      b.addEventListener('click', () => {
        palco.tweens.concluirTodos();
        tocarEtapa(etapa, si);
      });
      li.appendChild(b);
      ol.appendChild(li);
    });
    el.appendChild(ol);

    const fim = sub >= e.subpassos.length;
    if (fim && etapa < etapas.length - 1) {
      el.appendChild(botao('Próxima etapa →', () => irPara(etapa + 1), 'botao primario pulsar'));
    }
    if (final) {
      const div = document.createElement('div');
      div.className = 'final';
      div.innerHTML = `<p class="final-titulo">Agora você conhece seu risco</p><p></p>`;
      div.querySelector('p:last-child').textContent =
        'Próximo passo: cadastrar o alerta por SMS para saber antes quando a chuva forte vier.';
      div.appendChild(botao('Próxima parada →', () => aoTerminar?.(), 'botao primario'));
      el.appendChild(div);
    }
  }

  function renderGuia() {
    const e = etapas[etapa];
    guia.mostrar({
      cabeca: `Parada ${licao.id} · Etapa ${etapa + 1} de ${etapas.length}`,
      titulo: e.titulo,
      manterAba: true,
      abas: [
        { chave: 'instrucoes', rotulo: 'Instruções', render: renderInstrucoes },
        {
          chave: 'explicacao',
          rotulo: 'Por que importa',
          render: (el) => paragrafos(el, etapa === 0 && variacao.porque ? [variacao.porque, ...[].concat(e.explicacao)] : e.explicacao),
        },
        { chave: 'dicas', rotulo: 'Dica do agente', render: (el) => lista(el, e.dicas) },
      ],
      rodape: (el) => {
        if (e.nota) {
          const p = document.createElement('p');
          p.className = 'contagem-kit';
          p.textContent = e.nota;
          el.appendChild(p);
        }
        citarFontes(el, e.fontes?.length ? e.fontes : licao.fontes);
        if (licao.rascunho) avisoRascunho(el);
      },
    });
  }

  function iniciar() {
    linhaTempo.definir({
      titulo: `Parada ${licao.id}: ${licao.titulo}`,
      itens: etapas.map((e) => ({ icone: e.icone, titulo: e.curto ?? e.titulo })),
      atual: 0,
    });
    personagens?.entrar(perfil);
    tocarEtapa(0, 0);
  }

  return { iniciar, irPara, reiniciar, parar };
}
