// Lição do tipo "montagem" (Kit de emergência) em lista: todos os itens do
// kit aparecem de uma vez, cada um com "Tenho em casa" salvo no aparelho. A
// cena mostra todos os objetos; tocar num item (ou num objeto) destaca o
// objeto e mostra a etiqueta. O que falta vira a lista de compras.

import { paragrafos, avisoRascunho } from '../ui/guia.js';
import { temNoKit, marcarKit, itensKit } from '../ui/meu-plano.js';
import { abrirGrupo, fecharGrupo, rodapeNavegacao, rolarAte } from './comum.js';

export function criarLicaoMontagem({ licao, total, cena, palco, guia, linhaTempo, etiquetas, progresso, aoTerminar, abrirPlano }) {
  const etapas = licao.etapas;
  const todos = itensKit();
  let atual = null;

  // Objeto da cena → item da lista, para o toque na cena.
  const onde = {};
  etapas.forEach((e, ei) =>
    e.subpassos.forEach((s, si) => {
      for (const id of s.objetos ?? []) onde[id] = [ei, si];
    }),
  );

  const chave = (ei, si) => `${etapas[ei].id}:${si}`;
  const contarTenho = () => todos.filter((i) => temNoKit(i.chave)).length;

  function atualizarProgresso() {
    progresso({ rotulo: 'Tenho em casa', feitas: contarTenho(), total: todos.length });
    linhaTempo.marcar(
      atual?.[0] ?? 0,
      etapas.map((e, ei) => e.subpassos.every((_, si) => temNoKit(chave(ei, si)))),
    );
    const c = document.querySelector('.contagem-kit');
    if (c) c.textContent = `Seu kit em casa: ${contarTenho()} de ${todos.length} itens`;
  }

  function mostrarTudo() {
    etapas.forEach((e) => e.subpassos.forEach((s) => (s.objetos ?? []).forEach((id) => cena.mostrarImediato(id))));
    cena.mostrarImediato('mochila');
  }

  function ilustrar(ei, si) {
    atual = [ei, si];
    const s = etapas[ei].subpassos[si];
    const objs = s.objetos ?? s.destaque ?? [];
    cena.destacar(objs);
    etiquetas.limpar();
    if (objs[0] && cena.ancoras[objs[0]]) {
      etiquetas.adicionar('atual', { ancora: cena.ancoras[objs[0]], texto: s.etiqueta ?? s.texto });
    }
    marcarItens();
    atualizarProgresso();
  }

  function tocarObjeto(id) {
    const pos = onde[id];
    if (!pos) return;
    guia.mostrarAba('instrucoes');
    ilustrar(...pos);
    rolarAte(`item-${chave(...pos)}`);
  }

  function irPara(ei) {
    guia.mostrarAba('instrucoes');
    rolarAte(`grupo-${ei}`);
    ilustrar(ei, 0);
  }

  function reiniciar() {
    atual = null;
    cena.destacar([]);
    etiquetas.limpar();
    marcarItens();
    rolarAte('grupo-0');
  }

  // ---------- Guia ----------
  let linhas = [];
  function marcarItens() {
    for (const li of linhas) li.classList.toggle('atual', Boolean(atual) && li.dataset.item === chave(...atual));
  }

  function renderLista(el) {
    linhas = [];
    paragrafos(el, licao.resumo);
    let n = 0;
    etapas.forEach((e, ei) => {
      const sec = abrirGrupo(el, e, ei);
      const ol = document.createElement('ol');
      ol.className = 'subpassos kit';
      e.subpassos.forEach((s, si) => {
        n += 1;
        const k = chave(ei, si);
        const li = document.createElement('li');
        li.id = `item-${k}`;
        li.dataset.item = k;
        const rot = document.createElement('label');
        rot.className = 'tenho';
        rot.innerHTML = `<input type="checkbox" /><span class="sp-num" aria-hidden="true"></span><span class="sp-texto"></span>`;
        rot.querySelector('.sp-num').textContent = n;
        rot.querySelector('.sp-texto').textContent = s.texto;
        const cb = rot.querySelector('input');
        cb.checked = temNoKit(k);
        cb.setAttribute('aria-label', `${s.texto}: tenho em casa`);
        cb.addEventListener('change', () => {
          marcarKit(k, cb.checked);
          li.classList.toggle('tenho-sim', cb.checked);
          ilustrar(ei, si);
        });
        li.classList.toggle('tenho-sim', cb.checked);
        // tocar no texto também mostra o objeto na cena
        rot.addEventListener('pointerenter', () => s.objetos && cena.destacar(s.objetos));
        li.append(rot);
        ol.append(li);
        linhas.push(li);
      });
      sec.append(ol);
      fecharGrupo(sec, e, licao.fontes);
    });
    if (licao.rascunho) avisoRascunho(el);
    marcarItens();
  }

  function renderPorque(el) {
    etapas.forEach((e, ei) => {
      if (!e.explicacao?.length) return;
      const sec = abrirGrupo(el, e, `porque-${ei}`);
      paragrafos(sec, e.explicacao);
    });
  }

  function renderGuia() {
    guia.mostrar({
      cabeca: `Parada ${licao.id} de ${total} · ${todos.length} itens`,
      titulo: licao.titulo,
      aba: 'instrucoes',
      abas: [
        { chave: 'instrucoes', rotulo: 'O que ter', render: renderLista },
        { chave: 'explicacao', rotulo: 'Por que importa', render: renderPorque },
      ],
      rodape: (el) => {
        const p = document.createElement('p');
        p.className = 'contagem-kit';
        el.append(p);
        rodapeNavegacao(el, { licao, total, aoTerminar, abrirPlano });
      },
    });
    atualizarProgresso();
  }

  function iniciar() {
    linhaTempo.definir({
      titulo: `Parada ${licao.id}: ${licao.titulo}`,
      itens: etapas.map((e) => ({ icone: e.icone, titulo: e.curto ?? e.titulo })),
      atual: 0,
    });
    cena.aoTocar = tocarObjeto;
    palco.tweens.concluirTodos();
    mostrarTudo();
    cena.destacar([]);
    etiquetas.limpar();
    renderGuia();
  }

  return { iniciar, irPara, reiniciar, parar: () => etiquetas.limpar() };
}
