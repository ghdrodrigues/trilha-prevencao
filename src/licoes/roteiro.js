// Lição do tipo "roteiro": uma etapa por vez, com as mesmas abas das outras
// paradas (O que fazer, Por quê, Dicas). "Ver todos os passos" abre a lista
// completa. A cena 3D é ilustração: tocar num item leva a câmera ao ponto,
// dispara o efeito e mostra a etiqueta. Nada roda sozinho.

import * as THREE from 'three';
import { paragrafos, lista, avisoRascunho, citarFontes } from '../ui/guia.js';
import { renderAcoes } from '../ui/meu-plano.js';
import { abrirGrupo, fecharGrupo, rodapeNavegacao, botao, renderObjetivo, renderPratica, renderFinal } from './comum.js';

export function criarLicaoRoteiro({ licao, total, perfil, efeitos, personagens, enquadramentos, palco, guia, linhaTempo, etiquetas, progresso, aoTerminar, abrirPlano }) {
  // Etapas marcadas com ordenarPorPerfil mostram primeiro o perfil de quem usa.
  const etapas = licao.etapas.map((e) => {
    if (!e.ordenarPorPerfil || !perfil) return e;
    const subpassos = [...e.subpassos].sort((a, b) => (b.perfil === perfil) - (a.perfil === perfil));
    return { ...e, subpassos };
  });
  const variacao = licao.perfil_variacoes?.[perfil] ?? {};
  const totalItens = etapas.reduce((n, e) => n + e.subpassos.length, 0);
  const vistos = new Set();
  let atual = null; // [etapa, subpasso] ilustrado agora
  let token = 0;
  let focoAtual = null;
  const chave = (ei, si) => `${ei}:${si}`;

  function atualizarProgresso() {
    progresso({ rotulo: 'Itens vistos', feitas: vistos.size, total: totalItens });
    linhaTempo.marcar(
      atual?.[0] ?? 0,
      etapas.map((e, ei) => e.subpassos.every((_, si) => vistos.has(chave(ei, si)))),
    );
  }

  const textoEtiqueta = (s) => (s.perfil && s.perfil === perfil ? `${s.etiqueta} · você mora aqui` : s.etiqueta ?? s.texto);

  // Estado "antes do subpasso si": efeitos de base da etapa e dos subpassos
  // anteriores já aplicados.
  function prepararCena(ei, si) {
    efeitos.limpar();
    etiquetas.limpar();
    personagens?.recomecar?.();
    (etapas[ei].base ?? []).forEach((ef) => efeitos.aplicar(ef, { instantaneo: true }));
    etapas[ei].subpassos.slice(0, si).forEach((s) => efeitos.aplicar(s.efeito, { instantaneo: true }));
  }

  function encenar(s, foco) {
    if (!personagens) return;
    const ancora = s.ancora && efeitos.ancoras[s.ancora];
    const mira = ancora ? ancora.getWorldPosition(new THREE.Vector3()) : null;
    const vizinho = s.perfil && s.perfil === perfil ? 'acenar' : typeof s.vizinho === 'object' ? s.vizinho?.[perfil] : s.vizinho;
    personagens.encenar({ foco, mira, agente: s.agente, vizinho, vizinhoPara: s.vizinhoPara });
  }

  // Ilustra um item: câmera rápida, efeito e etiqueta. Sem cadeia automática.
  async function ilustrar(ei, si, { instantaneo = false } = {}) {
    const meu = ++token;
    palco.tweens.concluirTodos();
    if (ei !== etapa) {
      etapa = ei; // tocou num item de outra etapa (lista completa)
      if (!todos) renderGuia();
    }
    atual = [ei, si];
    vistos.add(chave(ei, si));
    marcarItens();
    atualizarProgresso();
    prepararCena(ei, si);
    const s = etapas[ei].subpassos[si];
    const foco = s.foco ?? 'geral';
    if (foco !== focoAtual) {
      focoAtual = foco;
      await palco.enquadrar(enquadramentos[foco] ?? enquadramentos.geral, { instantaneo, duracao: 0.45 });
      if (meu !== token) return;
    }
    encenar(s, foco);
    efeitos.aplicar(s.efeito, { instantaneo });
    if (s.ancora && efeitos.ancoras[s.ancora]) {
      etiquetas.adicionar('atual', { ancora: efeitos.ancoras[s.ancora], texto: textoEtiqueta(s) });
    }
  }

  // Linha do tempo: abre a etapa e ilustra o primeiro item.
  function irPara(ei) {
    abrirEtapa(ei);
  }

  function reiniciar() {
    vistos.clear();
    focoAtual = null;
    abrirEtapa(0);
  }

  function parar() {
    token++;
    personagens?.sair();
    efeitos.limpar();
    etiquetas.limpar();
  }

  // ---------- Guia: uma etapa por vez (mesmo modelo das paradas 3, 4 e 7) ----------
  let etapa = 0;
  let todos = false; // "Ver todos os passos": a lista completa da parada
  let botoesItens = [];
  function marcarItens() {
    for (const b of botoesItens) {
      const k = b.dataset.item;
      const eAtual = atual && k === chave(...atual);
      b.parentElement.classList.toggle('atual', Boolean(eAtual));
      b.parentElement.classList.toggle('visto', vistos.has(k) && !eAtual);
      if (eAtual) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    }
  }

  // Item de ação ganha número; item "fato" (o que saber) ganha um "i" e não
  // conta como passo. Os dois ilustram a cena ao toque.
  function listaEtapa(el, ei, numero) {
    const e = etapas[ei];
    const ol = document.createElement('ol');
    ol.className = 'subpassos';
    let n = numero;
    e.subpassos.forEach((s, si) => {
      const li = document.createElement('li');
      if (s.fato) li.className = 'fato';
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'subpasso';
      b.dataset.item = chave(ei, si);
      b.innerHTML = `<span class="sp-num" aria-hidden="true"></span><span class="sp-texto"></span>`;
      const texto = `${s.texto}${s.perfil && s.perfil === perfil ? ' (você)' : ''}`;
      b.querySelector('.sp-texto').textContent = texto;
      if (s.fato) {
        b.querySelector('.sp-num').textContent = 'i';
        b.setAttribute('aria-label', `Saiba: ${texto}. Mostrar na cena`);
      } else {
        n += 1;
        b.querySelector('.sp-num').textContent = n;
        b.setAttribute('aria-label', `Passo ${n}: ${texto}. Mostrar na cena`);
      }
      b.addEventListener('click', () => ilustrar(ei, si));
      li.append(b);
      ol.append(li);
      botoesItens.push(b);
    });
    return { ol, n };
  }

  function renderFazer(el) {
    botoesItens = [];
    const e = etapas[etapa];
    if (etapa === 0 && !todos) renderObjetivo(el, licao);
    if (todos) {
      let n = 0;
      etapas.forEach((x, ei) => {
        const sec = abrirGrupo(el, x, ei);
        const r = listaEtapa(sec, ei, n);
        n = r.n;
        sec.append(r.ol);
        fecharGrupo(sec, x, licao.fontes, { max: 1, dicas: false });
      });
    } else {
      paragrafos(el, e.resumo);
      const sec = document.createElement('div');
      sec.className = 'grupo';
      sec.append(listaEtapa(sec, etapa, 0).ol);
      el.append(sec);
      fecharGrupo(sec, e, licao.fontes, { max: 1, dicas: false });
    }
    const alternar = document.createElement('button');
    alternar.type = 'button';
    alternar.className = 'ver-todos';
    alternar.textContent = todos ? 'Ver só esta etapa' : 'Ver todos os passos da parada';
    alternar.setAttribute('aria-expanded', String(todos));
    alternar.addEventListener('click', () => {
      todos = !todos;
      guia.atualizar();
    });
    el.append(alternar);
    if (todos || etapa === etapas.length - 1) {
      renderAcoes(el, licao);
      renderPratica(el, licao);
      if (licao.id === total) renderFinal(el, licao);
    }
    marcarItens();
  }

  function renderPorque(el) {
    const e = etapas[etapa];
    if (variacao.porque && etapa === 0) {
      const p = document.createElement('p');
      p.className = 'dica-perfil';
      p.textContent = variacao.porque;
      el.append(p);
    }
    paragrafos(el, e.explicacao);
    citarFontes(el, e.fontes?.length ? e.fontes : licao.fontes);
    if (licao.rascunho) avisoRascunho(el);
  }

  function renderDicas(el) {
    const e = etapas[etapa];
    if (variacao.dica) {
      const p = document.createElement('p');
      p.className = 'dica-perfil';
      p.textContent = variacao.dica;
      el.append(p);
    }
    const norm = (t) => t.toLowerCase().replace(/[.\s]+$/, '');
    const itens = new Set(e.subpassos.map((s) => norm(s.texto)));
    const dicas = (e.dicas ?? []).filter((d) => !itens.has(norm(d)));
    if (dicas.length) lista(el, dicas);
    else if (!variacao.dica) paragrafos(el, 'Sem dica extra nesta etapa.');
  }

  function renderGuia() {
    const ultima = etapa === etapas.length - 1;
    guia.mostrar({
      cabeca: `Parada ${licao.id} de ${total} · Etapa ${etapa + 1} de ${etapas.length}`,
      titulo: etapas[etapa].titulo,
      manterAba: true,
      abas: [
        { chave: 'fazer', rotulo: licao.abaPrincipal ?? 'O que fazer', render: renderFazer },
        { chave: 'porque', rotulo: 'Por quê', render: renderPorque },
        { chave: 'dicas', rotulo: 'Dicas', render: renderDicas },
      ],
      rodape: (el) => {
        if (ultima) return rodapeNavegacao(el, { licao, total, aoTerminar, abrirPlano });
        const div = document.createElement('div');
        div.className = 'rodape-botoes';
        div.append(botao('Próxima etapa →', () => abrirEtapa(etapa + 1), 'botao primario'));
        div.append(botao('Meu plano', () => abrirPlano?.(), 'botao'));
        el.append(div);
      },
    });
  }

  function abrirEtapa(ei, { instantaneo = false } = {}) {
    etapa = ei;
    renderGuia();
    ilustrar(ei, 0, { instantaneo });
  }

  function iniciar() {
    linhaTempo.definir({
      titulo: `Parada ${licao.id}: ${licao.titulo}`,
      itens: etapas.map((e) => ({ icone: e.icone, titulo: e.curto ?? e.titulo })),
      atual: 0,
    });
    personagens?.entrar(perfil);
    // Abre já ilustrando o primeiro item, sem esperar animação de câmera.
    abrirEtapa(0, { instantaneo: true });
  }

  return { iniciar, irPara, reiniciar, parar };
}
