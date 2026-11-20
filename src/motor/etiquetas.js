// Etiquetas com linha (callouts) presas a pontos da cena 3D, em HTML por cima
// do canvas. Cada etiqueta acompanha seu objeto quando a câmera gira.

import * as THREE from 'three';

export function criarEtiquetas(camada, palco) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('etiquetas-linhas');
  svg.setAttribute('aria-hidden', 'true');
  camada.appendChild(svg);

  const lista = new Map(); // id → { ancora, el, linha, ponto, dx, dy }
  const v = new THREE.Vector3();
  // Etiquetas não sobem por baixo da barra do topo.
  // No celular os controles descem para uma segunda linha: conta o que estiver mais abaixo.
  const margemTopo = () => {
    const topo = document.getElementById('topo');
    if (!topo) return 0;
    let base = topo.getBoundingClientRect().bottom;
    for (const el of topo.querySelectorAll('.controles, .progresso')) {
      const r = el.getBoundingClientRect();
      if (r.height) base = Math.max(base, r.bottom);
    }
    return base;
  };

  function adicionar(id, { ancora, texto, sub, dx = 46, dy = -58, tipo = '' }) {
    remover(id);
    const el = document.createElement('div');
    el.className = `etiqueta ${tipo}`;
    el.innerHTML = `<strong></strong>${sub ? '<span></span>' : ''}`;
    el.querySelector('strong').textContent = texto;
    if (sub) el.querySelector('span').textContent = sub;
    const linha = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    const ponto = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    ponto.setAttribute('r', '4');
    svg.append(linha, ponto);
    camada.appendChild(el);
    const e = { ancora, el, linha, ponto, dx, dy };
    lista.set(id, e);
    requestAnimationFrame(() => el.classList.add('visivel'));
    atualizarUma(e);
  }

  function remover(id) {
    const e = lista.get(id);
    if (!e) return;
    e.el.remove();
    e.linha.remove();
    e.ponto.remove();
    lista.delete(id);
  }

  function limpar() {
    for (const id of [...lista.keys()]) remover(id);
  }

  function atualizarUma(e) {
    const w = camada.clientWidth;
    const h = camada.clientHeight;
    if (e.ancora.isObject3D) e.ancora.getWorldPosition(v);
    else v.copy(e.ancora);
    v.project(palco.camera);
    const x = (v.x * 0.5 + 0.5) * w;
    const y = (-v.y * 0.5 + 0.5) * h;
    // etiqueta vira para a esquerda perto da borda direita
    const dx = x + e.dx + 180 > w ? -Math.abs(e.dx) : e.dx;
    const lx = x + dx;
    const ly = Math.max(y + e.dy, margemTopo() + 18);
    e.el.style.transform = `translate(${lx}px, ${ly}px) translate(${dx < 0 ? '-100%' : '0'}, -50%)`;
    e.linha.setAttribute('x1', x);
    e.linha.setAttribute('y1', y);
    e.linha.setAttribute('x2', lx);
    e.linha.setAttribute('y2', ly);
    e.ponto.setAttribute('cx', x);
    e.ponto.setAttribute('cy', y);
  }

  palco.aCadaQuadro(() => {
    for (const e of lista.values()) atualizarUma(e);
  });

  return { adicionar, remover, limpar };
}
