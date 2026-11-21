// Lição do tipo "roteiro" em lista: ao abrir a parada, o guia mostra tudo o
// que fazer, numerado e agrupado por etapa, com a fonte de cada grupo. A cena
// 3D é só ilustração: tocar num item leva a câmera ao ponto, dispara o efeito
// e mostra a etiqueta. Nada roda sozinho; quem ignora a cena não perde nada.

import * as THREE from 'three';
import { paragrafos, avisoRascunho } from '../ui/guia.js';
import { renderAcoes } from '../ui/meu-plano.js';
import { abrirGrupo, fecharGrupo, rodapeNavegacao, rolarAte } from './comum.js';

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
    progresso({ rotulo: licao.titulo, feitas: vistos.size, total: totalItens });
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

  // Linha do tempo: leva ao grupo na lista e ilustra o primeiro item.
  function irPara(ei) {
    guia.mostrarAba('instrucoes');
    rolarAte(`grupo-${ei}`);
    ilustrar(ei, 0);
  }

  function reiniciar() {
    vistos.clear();
    focoAtual = null;
    ilustrar(0, 0);
    rolarAte(`grupo-0`);
  }

  function parar() {
    token++;
    personagens?.sair();
    efeitos.limpar();
    etiquetas.limpar();
  }

  // ---------- Guia ----------
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

  function renderLista(el) {
    botoesItens = [];
    if (variacao.dica) {
      const p = document.createElement('p');
      p.className = 'dica-perfil';
      p.textContent = variacao.dica;
      el.append(p);
    }
    let n = 0;
    etapas.forEach((e, ei) => {
      const sec = abrirGrupo(el, e, ei);
      const ol = document.createElement('ol');
      ol.className = 'subpassos';
      e.subpassos.forEach((s, si) => {
        n += 1;
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'subpasso';
        b.dataset.item = chave(ei, si);
        b.innerHTML = `<span class="sp-num" aria-hidden="true"></span><span class="sp-texto"></span>`;
        b.querySelector('.sp-num').textContent = n;
        b.querySelector('.sp-texto').textContent = `${s.texto}${s.perfil && s.perfil === perfil ? ' (você)' : ''}`;
        b.setAttribute('aria-label', `${n}. ${b.querySelector('.sp-texto').textContent}. Mostrar na cena`);
        b.addEventListener('click', () => ilustrar(ei, si));
        li.append(b);
        ol.append(li);
        botoesItens.push(b);
      });
      sec.append(ol);
      fecharGrupo(sec, e, licao.fontes);
    });
    renderAcoes(el, licao);
    if (licao.final && licao.id === total) {
      const div = document.createElement('div');
      div.className = 'final';
      div.innerHTML = `<p class="final-titulo"></p><p></p>`;
      div.querySelector('.final-titulo').textContent = licao.final.titulo;
      div.querySelector('p:last-child').textContent = licao.final.texto;
      el.append(div);
    }
    if (licao.rascunho) avisoRascunho(el);
    marcarItens();
  }

  function renderPorque(el) {
    if (variacao.porque) paragrafos(el, variacao.porque);
    etapas.forEach((e, ei) => {
      if (!e.explicacao?.length) return;
      const sec = abrirGrupo(el, e, `porque-${ei}`);
      paragrafos(sec, e.explicacao);
    });
  }

  function renderGuia() {
    guia.mostrar({
      cabeca: `Parada ${licao.id} de ${total} · ${totalItens} itens`,
      titulo: licao.titulo,
      aba: 'instrucoes',
      abas: [
        { chave: 'instrucoes', rotulo: 'O que fazer', render: renderLista },
        { chave: 'explicacao', rotulo: 'Por que importa', render: renderPorque },
      ],
      rodape: (el) => rodapeNavegacao(el, { licao, total, aoTerminar, abrirPlano }),
    });
  }

  function iniciar() {
    linhaTempo.definir({
      titulo: `Parada ${licao.id}: ${licao.titulo}`,
      itens: etapas.map((e) => ({ icone: e.icone, titulo: e.curto ?? e.titulo })),
      atual: 0,
    });
    personagens?.entrar(perfil);
    renderGuia();
    // Abre já ilustrando o primeiro item, sem esperar animação de câmera.
    ilustrar(0, 0, { instantaneo: true });
  }

  return { iniciar, irPara, reiniciar, parar };
}
