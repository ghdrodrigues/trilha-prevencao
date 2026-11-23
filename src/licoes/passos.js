// Lição "passos" (método do exemplo backcountry-101): uma etapa por vez, com
// palco limpo mostrando só os objetos da etapa. Cada subpasso tem um objeto:
// tocar no passo destaca o objeto; tocar no objeto abre o passo. Painel com
// três abas: O que fazer, Por quê e Dicas. Nada roda sozinho.

import { paragrafos, lista, avisoRascunho, citarFontes } from '../ui/guia.js';
import { renderAcoes, temNoKit, marcarKit } from '../ui/meu-plano.js';
import { botao, rodapeNavegacao, renderObjetivo, renderPratica, renderFinal } from './comum.js';

export function criarLicaoPassos({ licao, total, perfil, cena, palco, guia, linhaTempo, etiquetas, progresso, colunas, aoTerminar, abrirPlano }) {
  const etapas = licao.etapas;
  const marcavel = Boolean(licao.marcavel); // kit: "Tenho em casa" em cada item
  const variacao = licao.perfil_variacoes?.[perfil] ?? {};
  const totalItens = etapas.reduce((n, e) => n + e.subpassos.length, 0);
  const vistos = new Set();
  let etapa = 0;
  let sub = 0;
  const chave = (ei, si) => `${etapas[ei].id}:${si}`;
  const contarTenho = () => etapas.reduce((n, e, ei) => n + e.subpassos.filter((_, si) => temNoKit(chave(ei, si))).length, 0);

  function atualizarProgresso() {
    if (marcavel) progresso({ rotulo: 'Tenho em casa', feitas: contarTenho(), total: totalItens });
    else progresso({ rotulo: 'Itens vistos', feitas: vistos.size, total: totalItens });
    linhaTempo.marcar(
      etapa,
      etapas.map((e, ei) => e.subpassos.every((_, si) => (marcavel ? temNoKit(chave(ei, si)) : vistos.has(chave(ei, si))))),
    );
    const c = document.querySelector('.contagem-kit');
    if (c) c.textContent = `Seu kit em casa: ${contarTenho()} de ${totalItens} itens`;
  }

  // ---------- Cena ----------
  function etiquetar() {
    etiquetas.limpar();
    const s = etapas[etapa].subpassos[sub];
    const ancora = s && cena.ancoras[s.objeto];
    if (!ancora) return;
    // só a etiqueta do item ativo: as numeradas se sobrepunham e cortavam
    const n = etapas[etapa].subpassos.length;
    const lado = n > 1 && sub >= n / 2 ? -1 : 1; // metade direita aponta para a esquerda
    etiquetas.adicionar('ativo', { ancora, texto: s.etiqueta ?? s.texto, dy: -58, dx: 46 * lado });
  }

  function selecionar(si) {
    sub = si;
    vistos.add(chave(etapa, si));
    cena.destacar(etapas[etapa].subpassos[si].objeto);
    etiquetar();
    marcarItens();
    atualizarProgresso();
  }

  function abrirEtapa(ei, si = 0, { instantaneo = false } = {}) {
    etapa = ei;
    const n = etapas[ei].subpassos.length;
    const enq = cena.mostrarEtapa(ei, { colunas: colunas(n), instantaneo });
    palco.enquadrar(enq, { instantaneo, duracao: 0.45 });
    renderGuia();
    selecionar(si);
  }

  cena.aoTocar = (id) => {
    const si = etapas[etapa].subpassos.findIndex((s) => s.objeto === id);
    if (si < 0) return;
    guia.mostrarAba('fazer');
    selecionar(si);
  };

  // ---------- Guia ----------
  let linhas = [];
  function marcarItens() {
    linhas.forEach((li, si) => {
      li.classList.toggle('atual', si === sub);
      li.classList.toggle('visto', si !== sub && vistos.has(chave(etapa, si)));
      const b = li.querySelector('.subpasso');
      if (si === sub) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
  }

  function renderFazer(el) {
    const e = etapas[etapa];
    linhas = [];
    if (etapa === 0) renderObjetivo(el, licao);
    paragrafos(el, e.resumo);
    const ol = document.createElement('ol');
    ol.className = `subpassos${marcavel ? ' kit' : ''}`;
    e.subpassos.forEach((s, si) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'subpasso';
      b.innerHTML = `<span class="sp-num" aria-hidden="true"></span><span class="sp-texto"></span>`;
      b.querySelector('.sp-num').textContent = si + 1;
      b.querySelector('.sp-texto').textContent = s.texto;
      b.addEventListener('click', () => selecionar(si));
      li.append(b);
      if (marcavel) {
        const k = chave(etapa, si);
        const rot = document.createElement('label');
        rot.className = 'tenho';
        rot.innerHTML = `<input type="checkbox" /> Tenho`;
        const cb = rot.querySelector('input');
        cb.setAttribute('aria-label', `${s.texto}: tenho em casa`);
        cb.checked = temNoKit(k);
        li.classList.toggle('tenho-sim', cb.checked);
        cb.addEventListener('change', () => {
          marcarKit(k, cb.checked);
          li.classList.toggle('tenho-sim', cb.checked);
          selecionar(si);
        });
        li.append(rot);
      }
      ol.append(li);
      linhas.push(li);
    });
    el.append(ol);
    citarFontes(el, e.fontes?.length ? e.fontes : licao.fontes, { curto: true, max: 1 });
    if (etapa === etapas.length - 1) {
      renderAcoes(el, licao);
      renderPratica(el, licao);
      renderFinal(el, licao);
    }
    marcarItens();
  }

  function renderPorque(el) {
    const e = etapas[etapa];
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
    if (e.dicas?.length) lista(el, e.dicas);
    else if (!variacao.dica) paragrafos(el, 'Sem dica extra nesta etapa.');
  }

  function renderGuia() {
    const e = etapas[etapa];
    const ultima = etapa === etapas.length - 1;
    guia.mostrar({
      cabeca: `Parada ${licao.id} de ${total} · Etapa ${etapa + 1} de ${etapas.length}`,
      titulo: e.titulo,
      manterAba: true,
      abas: [
        { chave: 'fazer', rotulo: licao.abaPrincipal ?? 'O que fazer', render: renderFazer },
        { chave: 'porque', rotulo: 'Por quê', render: renderPorque },
        { chave: 'dicas', rotulo: 'Dicas', render: renderDicas },
      ],
      rodape: (el) => {
        if (marcavel) {
          const p = document.createElement('p');
          p.className = 'contagem-kit';
          el.append(p);
        }
        if (ultima) return rodapeNavegacao(el, { licao, total, aoTerminar, abrirPlano });
        const div = document.createElement('div');
        div.className = 'rodape-botoes';
        div.append(botao('Próxima etapa →', () => abrirEtapa(etapa + 1), 'botao primario'));
        div.append(botao('Meu plano', () => abrirPlano?.(), 'botao'));
        el.append(div);
      },
    });
  }

  // Tela mudou de tamanho: refaz a fila ou grade e o enquadramento.
  function reenquadrar() {
    const enq = cena.mostrarEtapa(etapa, { colunas: colunas(etapas[etapa].subpassos.length), instantaneo: true });
    palco.enquadrar(enq, { instantaneo: true });
  }

  function irPara(ei) {
    abrirEtapa(ei);
  }

  function reiniciar() {
    vistos.clear();
    abrirEtapa(0);
  }

  function iniciar() {
    linhaTempo.definir({
      titulo: `Parada ${licao.id}: ${licao.titulo}`,
      itens: etapas.map((e) => ({ icone: e.icone, titulo: e.curto ?? e.titulo })),
      atual: 0,
    });
    abrirEtapa(0, 0, { instantaneo: true });
  }

  return { iniciar, irPara, reiniciar, reenquadrar, parar: () => etiquetas.limpar() };
}
