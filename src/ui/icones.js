// Ícones de linha (24×24, traço 1,75), no estilo dos blocos "Acesso rápido"
// do site da Defesa Civil SC. Desenhos próprios, sem marca oficial.

const P = {
  mapa: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  celular: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/><path d="M14.5 6.5h5v4h-3l-2 2z"/>',
  mochila: '<path d="M6 9a6 6 0 0112 0v11H6z"/><path d="M9 4.5V3h6v1.5"/><path d="M8.5 13h7v4h-7z"/>',
  alerta: '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4.5M12 17.2v.3"/>',
  rota: '<circle cx="5.5" cy="18.5" r="2"/><path d="M7.5 18.5h6a3 3 0 000-6h-4a3 3 0 010-6H17"/><path d="M17 3.5v6M17 3.5h3.5l-1 1.5 1 1.5H17"/>',
  chuva: '<path d="M7 15a4 4 0 01-.5-8 6 6 0 0111.5 1.5A3.5 3.5 0 0117.5 15z"/><path d="M8 18l-1 2.5M12 18l-1 2.5M16 18l-1 2.5"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  agua: '<path d="M12 3s6 6.5 6 11a6 6 0 01-12 0c0-4.5 6-11 6-11z"/><path d="M9 14.5a3 3 0 003 3"/>',
  lata: '<ellipse cx="12" cy="5.5" rx="6" ry="2.5"/><path d="M6 5.5v13c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-13"/><path d="M6 10c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5"/>',
  documento: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 15.5h6M9 9h2"/>',
  lanterna: '<path d="M3 10h9v4H3z"/><path d="M12 9l5-3v12l-5-3z"/><path d="M19.5 9.5l1.5-1M19.5 14.5l1.5 1M20 12h1.5"/>',
  saude: '<rect x="3.5" y="6.5" width="17" height="13" rx="2"/><path d="M9 6.5v-2h6v2"/><path d="M12 10v6M9 13h6"/>',
  trinca: '<path d="M4 4h16v16H4z"/><path d="M13 4l-2 4 3 3-3 4 2 5"/>',
  inclinado: '<path d="M3 20.5h18"/><path d="M8 20.5l5-15"/><path d="M13 5.5l3 1"/><path d="M15 20.5a7 7 0 00-3.5-6"/>',
  estufado: '<path d="M6 3v18M18 3v18"/><path d="M6 6c4 3 4 9 0 12M18 6c-3 3-3 9 0 12"/>',
  encosta: '<path d="M2.5 20l7-12 4 6 2.5-3.5 5.5 9.5z"/><path d="M7 20l2-3"/>',
  baixada: '<path d="M2.5 9c2 0 2-1.5 4-1.5S8.5 9 10.5 9s2-1.5 4-1.5S16.5 9 18.5 9s2-1.5 3-1.5"/><path d="M2.5 14c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 3-1.5"/><path d="M2.5 19c2 0 2-1.5 4-1.5s2 1.5 4 1.5 2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 3-1.5"/>',
  aberto: '<path d="M3 8h11a3 3 0 10-3-3"/><path d="M3 12h16a3 3 0 11-3 3"/><path d="M3 16h7"/>',
  girarEsq: '<path d="M4 4v5h5"/><path d="M4.5 9A8 8 0 1112 20"/>',
  girarDir: '<path d="M20 4v5h-5"/><path d="M19.5 9A8 8 0 1012 20"/>',
  centro: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  reiniciar: '<path d="M5 5v14"/><path d="M19 5l-10 7 10 7z"/>',
  pausar: '<path d="M8 5v14M16 5v14"/>',
  tocar: '<path d="M7 4.5l12 7.5-12 7.5z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  anterior: '<path d="M15 5l-7 7 7 7"/>',
  proxima: '<path d="M9 5l7 7-7 7"/>',
  sms: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10.5h.01M12 10.5h.01M16 10.5h.01"/>',
  telefone: '<path d="M5 3.5h4l1.5 4.5-2.5 1.5a11 11 0 006.5 6.5l1.5-2.5 4.5 1.5v4a2 2 0 01-2 2A17 17 0 013 5.5a2 2 0 012-2z"/>',
  raio: '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z"/>',
  proibido: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
  carro: '<path d="M4 16.5v-4l2-5h12l2 5v4z"/><path d="M4 12.5h16"/><circle cx="8" cy="16.5" r="1.8"/><circle cx="16" cy="16.5" r="1.8"/>',
  casa: '<path d="M3.5 11L12 4l8.5 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
};

export function icone(nome, classe = 'ic') {
  return `<svg class="${classe}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[nome] ?? ''}</svg>`;
}

// Troca <i data-icone="nome"></i> no HTML estático pelo SVG.
export function aplicarIcones(raiz = document) {
  for (const el of raiz.querySelectorAll('[data-icone]')) el.outerHTML = icone(el.dataset.icone);
}
