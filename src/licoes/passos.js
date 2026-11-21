// Lição "passos" (método do exemplo backcountry-101): uma etapa por vez, com
// palco limpo mostrando só os objetos da etapa. Cada subpasso tem um objeto:
// tocar no passo destaca o objeto; tocar no objeto abre o passo. Painel com
// três abas: O que fazer, Por quê e Dicas. Nada roda sozinho.

import { paragrafos, lista, avisoRascunho, citarFontes } from '../ui/guia.js';
import { renderAcoes, temNoKit, marcarKit } from '../ui/meu-plano.js';
import { botao, rodapeNavegacao } from './comum.js';

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
    else progresso({ rotulo: licao.titulo, feitas: vistos.size, total: totalItens });
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
    const n = etapas[etapa].subpassos.length;
    etapas[etapa].subpassos.forEach((s, si) => {
      const ancora = cena.ancoras[s.objeto];
      const lado = n > 1 && si >= n / 2 ? -1 : 1; // metade direita aponta para a esquerda
      if (!ancora) return;
      const ativo = si === sub;
      // tela estreita: só a etiqueta do item ativo, para não amontoar
      if (!ativo && window.innerWidth < 600) return;
      etiquetas.adicionar(`p${si}`, {
        ancora,
        texto: ativo ? s.etiqueta ?? s.texto : `${si + 1}. ${s.etiqueta ?? s.texto}`,
        tipo: ativo ? '' : 'secundaria',
        dy: ativo ? -58 : -34,
        dx: (ativo ? 46 : 28) * lado,
      });
    });
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
    citarFontes(el, e.fontes?.length ? e.fontes : licao.fontes, { curto: true });
    if (etapa === etapas.length - 1) {
      renderAcoes(el, licao);
      if (licao.final) {
        const div = document.createElement('div');
        div.className = 'final';
        div.innerHTML = `<p class="final-titulo"></p><p></p>`;
        div.querySelector('.final-titulo').textContent = licao.final.titulo;
        div.querySelector('p:last-child').textContent = licao.final.texto;
        el.append(div);
      }
    }
    if (licao.rascunho) avisoRascunho(el);
    marcarItens();
  }

  function renderPorque(el) {
    const e = etapas[etapa];
    paragrafos(el, e.explicacao);
    citarFontes(el, e.fontes?.length ? e.fontes : licao.fontes, { curto: true });
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
      cabeca: `Parada ${licao.id} · Etapa ${etapa + 1} de ${etapas.length}`,
      titulo: e.titulo,
      manterAba: true,
      abas: [
        { chave: 'fazer', rotulo: marcavel ? 'O que ter' : 'O que fazer', render: renderFazer },
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
