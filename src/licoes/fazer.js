// Lição "fazer" (método da lição do fogo do backcountry-101): cada subpasso é
// uma ação animada numa cena só, que se acumula até o resultado final.
// Os subpassos tocam em sequência e ganham ✓; ao fim da etapa, a próxima
// começa sozinha. Tocar num subpasso pula para ele: o que vem antes fica
// pronto na hora e a ação dele toca. Pausar, reiniciar e velocidade valem
// porque as ações correm no tempo de lição do palco.

import { paragrafos, lista, avisoRascunho, citarFontes } from '../ui/guia.js';
import { renderAcoes } from '../ui/meu-plano.js';
import { botao, rodapeNavegacao } from './comum.js';

let licaoNoQuadro = null; // só a lição ativa atualiza a barra do subpasso
let quadroRegistrado = false;

export function criarLicaoFazer({ licao, total, perfil, cena, palco, guia, linhaTempo, etiquetas, progresso, aoTerminar, abrirPlano }) {
  const etapas = licao.etapas;
  const variacao = licao.perfil_variacoes?.[perfil] ?? {};
  const ordem = [];
  etapas.forEach((e, ei) => e.subpassos.forEach((s, si) => ordem.push({ ei, si, s })));
  const indice = (ei, si) => ordem.findIndex((o) => o.ei === ei && o.si === si);
  const feitos = new Set();
  let atual = 0;
  let vez = 0;
  let etapaNoGuia = -1;
  let linhas = [];
  let caixaFinal = null;

  const esperar = (seg) => palco.tweens.animar({ duracao: seg, aoAtualizar: () => {} });

  // barra laranja do subpasso atual acompanha a ação
  const api = {
    quadro() {
      const li = linhas[ordem[atual].si];
      if (li && ordem[atual].ei === etapaNoGuia) li.style.setProperty('--p', String(feitos.has(atual) ? 1 : cena.estado[ordem[atual].s.acao] ?? 0));
    },
  };
  licaoNoQuadro = api;
  if (!quadroRegistrado) {
    quadroRegistrado = true;
    palco.aCadaQuadro(() => licaoNoQuadro?.quadro());
  }

  function atualizarProgresso() {
    progresso({ rotulo: licao.titulo, feitas: feitos.size, total: ordem.length });
    const { ei } = ordem[atual];
    linhaTempo.marcar(
      ei,
      etapas.map((_, i) => ordem.every((o, g) => o.ei !== i || feitos.has(g))),
    );
  }

  function marcarItens() {
    const { ei, si } = ordem[atual];
    linhas.forEach((li, i) => {
      const g = indice(ei, i);
      const feito = feitos.has(g);
      li.classList.toggle('atual', i === si);
      li.classList.toggle('feito', feito);
      li.style.setProperty('--p', feito ? '1' : '0');
      li.querySelector('.sp-num').textContent = feito ? '✓' : String(i + 1);
      const b = li.querySelector('.subpasso');
      if (i === si) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
    if (caixaFinal) caixaFinal.hidden = feitos.size < ordem.length;
  }

  // ---------- Toca um subpasso ----------
  async function tocar(g) {
    const v = ++vez;
    palco.tweens.concluirTodos(); // encerra a ação e a espera anteriores
    atual = g;
    const { ei, s } = ordem[g];
    cena.definirAte(cena.acoes.indexOf(s.acao));
    for (let k = 0; k < g; k++) feitos.add(k);
    for (let k = g; k < ordem.length; k++) feitos.delete(k);
    if (etapaNoGuia !== ei) renderGuia();
    marcarItens();
    atualizarProgresso();
    etiquetas.limpar();
    const anc = cena.ancoras[s.acao];
    if (anc) etiquetas.adicionar('acao', { ancora: anc, texto: s.etiqueta, sub: s.uso, dx: s.lado === 'esq' ? -46 : 46 });
    palco.enquadrar(cena.enquadramentos[s.foco] ?? cena.enquadramento, { duracao: 0.8 });
    await esperar(0.6);
    if (v !== vez) return;
    await cena.aplicar(s.acao);
    if (v !== vez) return;
    feitos.add(g);
    marcarItens();
    atualizarProgresso();
    await esperar(s.pausa ?? 1.8);
    if (v !== vez) return;
    if (g + 1 < ordem.length) tocar(g + 1);
    else terminar();
  }

  function terminar() {
    etiquetas.limpar();
    palco.enquadrar(cena.enquadramentos.geral, { duracao: 1.2 });
    guia.mostrarAba('fazer');
    marcarItens();
  }

  // ---------- Guia ----------
  function renderFazer(el) {
    const ei = etapaNoGuia;
    const e = etapas[ei];
    paragrafos(el, e.resumo);
    const ol = document.createElement('ol');
    ol.className = 'subpassos fazer';
    linhas = [];
    e.subpassos.forEach((s, si) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'subpasso';
      b.innerHTML = `<span class="sp-num" aria-hidden="true"></span><span class="sp-texto"></span><span class="sp-seta" aria-hidden="true">›</span>`;
      b.querySelector('.sp-texto').textContent = s.texto;
      b.addEventListener('click', () => tocar(indice(ei, si)));
      li.append(b);
      ol.append(li);
      linhas.push(li);
    });
    el.append(ol);
    citarFontes(el, e.fontes?.length ? e.fontes : licao.fontes, { curto: true });
    caixaFinal = null;
    if (ei === etapas.length - 1) {
      renderAcoes(el, licao);
      if (licao.final) {
        const div = document.createElement('div');
        div.className = 'final';
        div.innerHTML = `<p class="final-titulo"></p><p></p>`;
        div.querySelector('.final-titulo').textContent = licao.final.titulo;
        div.querySelector('p:last-child').textContent = licao.final.texto;
        el.append(div);
        caixaFinal = div;
      }
    }
    if (licao.rascunho) avisoRascunho(el);
    if (ordem[atual]?.ei === ei) marcarItens();
  }

  function renderPorque(el) {
    const e = etapas[etapaNoGuia];
    paragrafos(el, e.explicacao);
    citarFontes(el, e.fontes?.length ? e.fontes : licao.fontes, { curto: true });
  }

  function renderDicas(el) {
    const e = etapas[etapaNoGuia];
    if (variacao.dica) {
      const p = document.createElement('p');
      p.className = 'dica-perfil';
      p.textContent = variacao.dica;
      el.append(p);
    }
    if (e.dicas?.length) lista(el, e.dicas);
    else if (!variacao.dica) paragrafos(el, 'Sem dica extra nesta etapa.');
  }

  function renderGuia() {
    etapaNoGuia = ordem[atual].ei;
    const ei = etapaNoGuia;
    const ultima = ei === etapas.length - 1;
    guia.mostrar({
      cabeca: `Parada ${licao.id} · Etapa ${ei + 1} de ${etapas.length}`,
      titulo: etapas[ei].titulo,
      manterAba: true,
      abas: [
        { chave: 'fazer', rotulo: 'O que fazer', render: renderFazer },
        { chave: 'porque', rotulo: 'Por quê', render: renderPorque },
        { chave: 'dicas', rotulo: 'Dicas', render: renderDicas },
      ],
      rodape: (el) => {
        if (ultima) return rodapeNavegacao(el, { licao, total, aoTerminar, abrirPlano });
        const div = document.createElement('div');
        div.className = 'rodape-botoes';
        div.append(botao('Próxima etapa →', () => tocar(indice(ei + 1, 0)), 'botao primario'));
        div.append(botao('Meu plano', () => abrirPlano?.(), 'botao'));
        el.append(div);
      },
    });
  }

  function iniciar() {
    linhaTempo.definir({
      titulo: `Parada ${licao.id}: ${licao.titulo}`,
      itens: etapas.map((e) => ({ icone: e.icone, titulo: e.curto ?? e.titulo })),
      atual: 0,
    });
    palco.enquadrar(cena.enquadramentos.geral, { instantaneo: true });
    tocar(0);
  }

  function reiniciar() {
    feitos.clear();
    tocar(0);
  }

  function reenquadrar() {
    const { s } = ordem[atual];
    palco.enquadrar(cena.enquadramentos[s.foco] ?? cena.enquadramento, { instantaneo: true });
  }

  function parar() {
    vez++;
    if (licaoNoQuadro === api) licaoNoQuadro = null;
    palco.tweens.concluirTodos();
    etiquetas.limpar();
    cena.sair?.();
  }

  return { iniciar, irPara: (ei) => tocar(indice(ei, 0)), reiniciar, reenquadrar, parar };
}
