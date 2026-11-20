// Casa térrea de bairro catarinense, montada em código (sem créditos do Tripo):
// reboco pintado, esquadrias com vidro, porta com batente, telhado colonial com
// beiral, testeiras, calha e condutor, cumeeira, caixa d'água e relógio de luz.
// Usada nas paradas 4 e 5. A origem fica no chão, no centro da planta; a
// fachada principal olha para +z.

import * as THREE from 'three';
import * as TX from './texturas.js';

const BRANCO = 0xf4f1ea;
const INCLINACAO = 0.5; // ~28,6° de caimento
const BEIRAL = 0.32;

const sombras = (m) => {
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

function em(m, x, y, z) {
  m.position.set(x, y, z);
  return m;
}

function caixa(w, h, d, mat) {
  return sombras(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
}

// Janela de correr com moldura, folhas, vidro e peitoril. Plano local: x, y; frente +z.
function janela(w, h, matMoldura, matVidro) {
  const g = new THREE.Group();
  const e = 0.05; // espessura do perfil
  const p = 0.05; // profundidade da moldura
  g.add(
    em(caixa(w, e, p, matMoldura), 0, h / 2 - e / 2, 0),
    em(caixa(w, e, p, matMoldura), 0, -h / 2 + e / 2, 0),
    em(caixa(e, h, p, matMoldura), -w / 2 + e / 2, 0, 0),
    em(caixa(e, h, p, matMoldura), w / 2 - e / 2, 0, 0),
    em(caixa(e * 0.7, h - e, p * 0.8, matMoldura), 0, 0, 0.01),
  );
  const vidro = new THREE.Mesh(new THREE.PlaneGeometry(w - e, h - e), matVidro);
  vidro.position.z = -0.01;
  g.add(vidro);
  // peitoril
  const peitoril = caixa(w + 0.12, 0.04, 0.1, matMoldura);
  peitoril.position.set(0, -h / 2 - 0.02, 0.03);
  g.add(peitoril);
  return g;
}

function porta(w, h, matMoldura) {
  const g = new THREE.Group();
  const madeira = new THREE.MeshStandardMaterial({ color: 0x7a4a2a, roughness: 0.7 });
  const folha = caixa(w - 0.06, h - 0.03, 0.04, madeira);
  folha.position.set(0, (h - 0.03) / 2, -0.005);
  g.add(folha);
  // almofadas da porta
  const almofada = new THREE.MeshStandardMaterial({ color: 0x6a3f22, roughness: 0.75 });
  [0.28, 0.68].forEach((t) => {
    const a = caixa(w * 0.62, h * 0.28, 0.01, almofada);
    a.position.set(0, h * t, 0.018);
    g.add(a);
  });
  const macaneta = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshStandardMaterial({ color: 0xc9a84a, metalness: 0.8, roughness: 0.3 }));
  macaneta.position.set(w * 0.32, h * 0.48, 0.04);
  g.add(macaneta);
  // batente
  const b = 0.045;
  g.add(
    em(caixa(b, h, 0.07, matMoldura), -w / 2, h / 2, 0),
    em(caixa(b, h, 0.07, matMoldura), w / 2, h / 2, 0),
    em(caixa(w + b, b, 0.07, matMoldura), 0, h, 0),
  );
  return g;
}

/**
 * Cria a casa.
 * w: largura (x), d: profundidade (z), h: pé-direito.
 * aberturas: lista { face: 'frente'|'fundos'|'leste'|'oeste', tipo: 'janela'|'porta', u, v, largura, altura }
 *   u e v vão de 0 a 1 na face (u da esquerda para a direita de quem olha a face; v de baixo para cima).
 */
export function criarCasa({
  w = 2.6,
  h = 1.6,
  d = 2.0,
  cor = '#efe6d6',
  semente = 91,
  aberturas = null,
  caixaDagua = true,
  relogio = true,
} = {}) {
  const g = new THREE.Group();
  const texParede = TX.reboco(cor, semente);
  const matParede = new THREE.MeshStandardMaterial({ map: texParede, roughness: 0.92 });
  const matMoldura = new THREE.MeshStandardMaterial({ color: BRANCO, roughness: 0.5 });
  const matVidro = new THREE.MeshPhysicalMaterial({ color: 0x2c4658, roughness: 0.08, metalness: 0.1, clearcoat: 1, envMapIntensity: 1.4 });

  // Paredes e laje
  const corpo = caixa(w, h, d, matParede);
  corpo.position.y = h / 2;
  g.add(corpo);

  // Rodapé pintado e soleira
  const rodape = caixa(w + 0.03, 0.18, d + 0.03, new THREE.MeshStandardMaterial({ color: 0x8b8173, roughness: 0.95 }));
  rodape.position.y = 0.09;
  g.add(rodape);

  // Aberturas
  const padrao = [
    { face: 'frente', tipo: 'porta', u: 0.29, largura: 0.22, altura: 0.6 },
    { face: 'frente', tipo: 'janela', u: 0.7, v: 0.51, largura: 0.28, altura: 0.26 },
    { face: 'leste', tipo: 'janela', u: 0.5, v: 0.52, largura: 0.34, altura: 0.26 },
    { face: 'oeste', tipo: 'janela', u: 0.5, v: 0.52, largura: 0.34, altura: 0.26 },
  ];
  for (const a of aberturas ?? padrao) {
    const larguraFace = a.face === 'frente' || a.face === 'fundos' ? w : d;
    const el = a.tipo === 'porta' ? porta(a.largura * larguraFace, a.altura * h, matMoldura) : janela(a.largura * larguraFace, a.altura * h, matMoldura, matVidro);
    const x = (a.u - 0.5) * larguraFace;
    const y = a.tipo === 'porta' ? 0 : (a.v ?? 0.5) * h;
    const o = new THREE.Group();
    o.add(el);
    el.position.set(x, y, 0.02);
    if (a.face === 'frente') o.position.z = d / 2;
    if (a.face === 'fundos') {
      o.position.z = -d / 2;
      o.rotation.y = Math.PI;
    }
    if (a.face === 'leste') {
      o.position.x = w / 2;
      o.rotation.y = Math.PI / 2;
    }
    if (a.face === 'oeste') {
      o.position.x = -w / 2;
      o.rotation.y = -Math.PI / 2;
    }
    g.add(o);
    if (a.tipo === 'porta' && a.face === 'frente') {
      const degrau = caixa(a.largura * larguraFace + 0.3, 0.08, 0.32, new THREE.MeshStandardMaterial({ map: TX.cimento(), roughness: 0.95 }));
      degrau.position.set(x, 0.04, d / 2 + 0.16);
      g.add(degrau);
    }
  }

  // Telhado de duas águas, cumeeira paralela à fachada (eixo x).
  const vao = d / 2 + BEIRAL;
  const subida = (d / 2) * INCLINACAO;
  const yCumeeira = h + subida + 0.04;
  const comp = vao / Math.cos(Math.atan(INCLINACAO));
  const ang = Math.atan(INCLINACAO);
  const tex = TX.telhasColonial().clone();
  tex.repeat.set(w * 2.2, comp * 2.4);
  tex.needsUpdate = true;
  const matTelha = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 });
  const matTesteira = new THREE.MeshStandardMaterial({ color: BRANCO, roughness: 0.6 });
  for (const lado of [1, -1]) {
    const agua = caixa(w + BEIRAL * 2, 0.07, comp, [matTesteira, matTesteira, matTelha, matTesteira, matTesteira, matTesteira]);
    agua.rotation.x = lado * ang;
    agua.position.set(0, yCumeeira - (vao / 2) * INCLINACAO, (lado * vao) / 2);
    g.add(agua);
    // testeira (tábua branca na ponta do beiral)
    const yBeiral = yCumeeira - vao * INCLINACAO;
    const testeira = caixa(w + BEIRAL * 2 + 0.02, 0.1, 0.03, matTesteira);
    testeira.position.set(0, yBeiral - 0.03, lado * (vao + 0.01));
    g.add(testeira);
    // calha (meia-cana) e condutor no canto
    const calha = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, w + BEIRAL * 2, 10, 1, true, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x9da3a6, metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide }));
    calha.rotation.z = Math.PI / 2;
    calha.rotation.x = Math.PI;
    calha.position.set(0, yBeiral - 0.06, lado * (vao + 0.05));
    sombras(calha);
    g.add(calha);
    const condutor = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, yBeiral, 8), calha.material);
    condutor.position.set(lado * (w / 2 + 0.06), yBeiral / 2, lado * (d / 2 + 0.05));
    sombras(condutor);
    g.add(condutor);
  }
  // oitões (triângulos de parede nas laterais)
  const tri = new THREE.Shape();
  tri.moveTo(-d / 2, 0);
  tri.lineTo(d / 2, 0);
  tri.lineTo(0, subida);
  tri.closePath();
  for (const lado of [1, -1]) {
    const oitao = sombras(new THREE.Mesh(new THREE.ShapeGeometry(tri), matParede));
    oitao.rotation.y = lado * (Math.PI / 2);
    oitao.position.set(lado * (w / 2), h, 0);
    g.add(oitao);
  }
  // cumeeira
  const cumeeira = sombras(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, w + BEIRAL * 2, 10, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0xa4472c, roughness: 0.7 })));
  cumeeira.rotation.z = Math.PI / 2;
  cumeeira.position.y = yCumeeira + 0.02;
  g.add(cumeeira);

  // Caixa d'água azul sobre a água dos fundos
  if (caixaDagua) {
    const cx = new THREE.Group();
    const tanque = sombras(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.3, 20), new THREE.MeshStandardMaterial({ color: 0x2f6fb0, roughness: 0.55 })));
    tanque.position.y = 0.15;
    const tampa = sombras(new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.05, 20), new THREE.MeshStandardMaterial({ color: 0x3a7cc0, roughness: 0.5 })));
    tampa.position.y = 0.32;
    // base de madeira que nivela a caixa sobre o telhado inclinado
    const base = sombras(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.26, 0.5), new THREE.MeshStandardMaterial({ color: 0x7d6a55, roughness: 1 })));
    base.position.y = -0.1;
    cx.add(tanque, tampa, base);
    cx.position.set(w * 0.22, yCumeeira - 0.35 * INCLINACAO + 0.06, -0.35);
    g.add(cx);
  }

  // Relógio de luz na fachada, perto do canto onde chega o fio
  let pontoFio = new THREE.Vector3(w / 2 - 0.12, h - 0.05, d / 2 + 0.05);
  if (relogio) {
    const caixaLuz = caixa(0.18, 0.26, 0.08, new THREE.MeshStandardMaterial({ color: 0xd9d6cf, roughness: 0.6 }));
    caixaLuz.position.set(w / 2 - 0.2, h * 0.62, d / 2 + 0.04);
    g.add(caixaLuz);
    const visor = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.08), new THREE.MeshStandardMaterial({ color: 0x3a4a52, roughness: 0.2 }));
    visor.position.set(w / 2 - 0.2, h * 0.65, d / 2 + 0.081);
    g.add(visor);
    // isolador no beiral
    const iso = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8), new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.3 }));
    iso.position.set(w / 2 - 0.12, h - 0.06, d / 2 + 0.06);
    g.add(iso);
    pontoFio = iso.position.clone();
  }

  g.userData = { pontoFio, fachadaZ: d / 2 };
  return g;
}
