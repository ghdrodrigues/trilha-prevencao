// Efeitos da parada 1 ("Conheça seu risco") sobre o mapa da trilha: zonas de
// cada perfil, chuva, deslizamento, enchente, vento, marca da água e mapa de
// risco. Tom didático e contido (decisão do George): nada destrói casas.

import * as THREE from 'three';
import { altura, CASAS_BAIXADA, ZONAS_PERFIL, RIO_Z } from './cena1-terreno.js';
import * as TX from './texturas.js';

const COR_ZONA = 0xf77f00;

export const ENQUADRAMENTOS = {
  geral: { centro: [0, 0.6, 0], largura: 25, altura: 15 },
  encosta: { centro: [-2.6, 2.4, -1.6], largura: 14, altura: 9.5 },
  baixada: { centro: [3.6, 0.4, 3.4], largura: 14, altura: 9 },
  aberto: { centro: [6.4, 0.4, -2.8], largura: 13, altura: 8.5 },
};

// Caminho do deslizamento: encosta dos fundos, longe das casas.
const DESLIZE = [
  [-3.0, -2.3],
  [-2.0, -2.0],
  [-1.0, -1.9],
  [0.2, -1.7],
];

// Mancha que acompanha o relevo (malha fina com y = altura do terreno).
function manchaNoTerreno(cx, cz, raio, cor, mapa = TX.manchaRadial()) {
  const geo = new THREE.PlaneGeometry(raio * 2, raio * 2, 28, 28);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + cx;
    const z = pos.getZ(i) + cz;
    pos.setXYZ(i, x, altura(x, z) + 0.07, z);
  }
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ color: cor, map: mapa, transparent: true, opacity: 0, depthWrite: false }),
  );
  m.renderOrder = 2;
  return m;
}

// Faixa de lama que desce a encosta; revelada aos poucos com drawRange.
function lama() {
  const curva = new THREE.CatmullRomCurve3(DESLIZE.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const N = 40;
  const pos = [];
  const pontos = curva.getSpacedPoints(N);
  const lado = new THREE.Vector3();
  const perfil = [];
  for (let i = 0; i <= N; i++) {
    const p = pontos[i];
    const t = curva.getTangentAt(Math.min(i / N, 0.999));
    lado.set(-t.z, 0, t.x).normalize();
    // abre em leque no pé da encosta, com bordas irregulares
    const w = 0.22 + (i / N) * 0.5;
    const wa = w * (1 + 0.22 * Math.sin(i * 1.7) + 0.12 * Math.sin(i * 4.3));
    const wb = w * (1 + 0.22 * Math.sin(i * 2.3 + 1) + 0.12 * Math.sin(i * 5.1));
    const a = p.clone().addScaledVector(lado, -wa);
    const b = p.clone().addScaledVector(lado, wb);
    a.y = altura(a.x, a.z) + 0.05;
    b.y = altura(b.x, b.z) + 0.05;
    perfil.push([a, b]);
  }
  for (let i = 0; i < N; i++) {
    const [a0, b0] = perfil[i];
    const [a1, b1] = perfil[i + 1];
    pos.push(...a0.toArray(), ...b0.toArray(), ...a1.toArray(), ...b0.toArray(), ...b1.toArray(), ...a1.toArray());
  }
  // Tons de terra variados, mais escuros (úmidos) no centro.
  const cores = [];
  const c = new THREE.Color();
  for (let i = 0; i < pos.length / 3; i++) {
    const borda = i % 6 === 0 || i % 6 === 2 || i % 6 === 5 ? 0 : 1;
    const v = 0.72 + borda * 0.18 + Math.random() * 0.12; // multiplica a cor da lama
    c.setRGB(v, v, v);
    cores.push(c.r, c.g, c.b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cores, 3));
  geo.computeVertexNormals();
  geo.setDrawRange(0, 0);
  const m = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: 0x6e4a2c, vertexColors: true, roughness: 1, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }),
  );
  m.receiveShadow = true;
  m.userData = { N, curva };
  return m;
}

// Chuva: segmentos de linha que caem e voltam ao topo.
function chuva() {
  const N = 900;
  const pos = new Float32Array(N * 6);
  const r = () => Math.random();
  for (let i = 0; i < N; i++) {
    const x = (r() - 0.5) * 20;
    const z = (r() - 0.5) * 14;
    const y = r() * 9;
    pos.set([x, y, z, x - 0.05, y + 0.45, z], i * 6);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xd6e6ff, transparent: true, opacity: 0, depthWrite: false }));
  m.frustumCulled = false;
  return m;
}

// Água da enchente: barrenta, com bordas suaves, sobe a partir do rio.
function enchente() {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 6.2),
    new THREE.MeshStandardMaterial({
      color: 0xd2b27c,
      map: TX.agua(),
      alphaMap: TX.bordaSuave(),
      transparent: true,
      opacity: 0,
      roughness: 0.2,
      depthWrite: false,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(0, -0.2, RIO_Z - 0.4);
  m.renderOrder = 1;
  return m;
}

// Marca da altura que a água já alcançou, nas casas mais baixas da baixada.
function marcas() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x5a3b1e, transparent: true, opacity: 0, roughness: 1 });
  for (const [x, z, r] of CASAS_BAIXADA) {
    const y = altura(x, z);
    if (y > 1) continue; // a casa no alto do barranco não alaga
    const faixa = new THREE.Mesh(new THREE.BoxGeometry(1.03, 0.09, 0.93), mat);
    faixa.position.set(x, y + 0.32, z);
    faixa.rotation.y = r;
    g.add(faixa);
  }
  g.userData.mat = mat;
  return g;
}

// Rajadas de vento: traços brancos que cruzam a área aberta.
function vento() {
  const N = 18;
  const pos = new Float32Array(N * 6);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
  m.frustumCulled = false;
  m.userData.sementes = Array.from({ length: N }, () => [Math.random(), Math.random(), Math.random()]);
  return m;
}

export function criarEfeitosRisco({ cena1, palco }) {
  const grupo = new THREE.Group();
  grupo.name = 'efeitos-risco';

  const zonas = {};
  for (const [k, z] of Object.entries(ZONAS_PERFIL)) {
    zonas[k] = manchaNoTerreno(z.x, z.z, z.raio * 1.1, COR_ZONA, TX.anelZona());
    grupo.add(zonas[k]);
  }
  const risco = [
    manchaNoTerreno(-3.4, -1.2, 3.2, 0xd90000), // encosta ocupada
    manchaNoTerreno(-1.4, -1.9, 1.8, 0xd90000), // cicatriz do deslizamento
    manchaNoTerreno(4.2, 4.0, 3.6, 0xf77f00), // margem do rio
    manchaNoTerreno(6.6, -3.0, 2.8, 0xf4c20d), // vendaval
  ];
  risco.forEach((m) => grupo.add(m));
  const objLama = lama();
  const objChuva = chuva();
  const objEnchente = enchente();
  const objMarcas = marcas();
  const objVento = vento();
  grupo.add(objLama, objChuva, objEnchente, objMarcas, objVento);

  // Pedras que rolam junto com a lama.
  const pedras = Array.from({ length: 5 }, (_, i) => {
    const p = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1 + (i % 3) * 0.04), new THREE.MeshStandardMaterial({ color: 0x8a8178, roughness: 1 }));
    p.castShadow = true;
    p.visible = false;
    p.userData.lateral = (i - 2) * 0.22;
    p.userData.atraso = i * 0.05;
    grupo.add(p);
    return p;
  });

  // Âncoras das etiquetas.
  const ancora = (x, z, dy) => {
    const o = new THREE.Object3D();
    o.position.set(x, altura(x, z) + dy, z);
    grupo.add(o);
    return o;
  };
  const fimDeslize = DESLIZE[DESLIZE.length - 1];
  const casaMarcada = CASAS_BAIXADA.find(([x, z]) => altura(x, z) < 1);
  const ancoras = {
    encosta: ancora(-3.6, -0.6, 1.4),
    baixada: ancora(3.4, 3.6, 1.2),
    aberto: ancora(6.6, -3.0, 1.6),
    chuva: ancora(-1.5, -1.5, 3.2),
    deslizamento: ancora(fimDeslize[0], fimDeslize[1], 0.4),
    enchente: ancora(5.2, 4.2, 0.5),
    vento: ancora(7.8, -4.8, 1.8),
    marca: ancora(casaMarcada[0], casaMarcada[1], 0.4),
    vizinho: ancora(CASAS_BAIXADA[1][0], CASAS_BAIXADA[1][1], 1.3),
    mapa: ancora(-3.4, -1.2, 1.6),
  };

  const arvores = [];
  cena1.raiz.traverse((o) => {
    if (o.name === 'arvore') arvores.push(o);
  });

  const estado = { chuva: false, vento: false, deslize: 0, enchente: 0 };

  function aparecer(material, alvo, { instantaneo, duracao = 0.8 } = {}) {
    if (instantaneo) {
      material.opacity = alvo;
      return Promise.resolve();
    }
    const de = material.opacity;
    return palco.tweens.animar({ duracao, aoAtualizar: (p) => (material.opacity = de + (alvo - de) * p) });
  }

  function progresso(chave, duracao, instantaneo) {
    if (instantaneo) {
      estado[chave] = 1;
      return Promise.resolve();
    }
    return palco.tweens.animar({ duracao, aoAtualizar: (p) => (estado[chave] = p) });
  }

  // Aplica um efeito. Devolve uma Promise que termina quando ele assenta.
  function aplicar(chave, { instantaneo = false } = {}) {
    if (!chave) return Promise.resolve();
    const inst = instantaneo || palco.movimentoReduzido();
    const [tipo, arg] = chave.split(':');
    switch (tipo) {
      case 'zona':
        return aparecer(zonas[arg].material, 1, { instantaneo: inst });
      case 'zonas':
        return Promise.all(Object.values(zonas).map((z) => aparecer(z.material, 1, { instantaneo: inst })));
      case 'chuva':
        estado.chuva = true;
        return aparecer(objChuva.material, 0.55, { instantaneo: inst, duracao: 1.2 });
      case 'deslizamento':
        pedras.forEach((p) => (p.visible = true));
        return progresso('deslize', 3.2, inst);
      case 'enchente':
        objEnchente.material.opacity = 0.82;
        return progresso('enchente', 3.2, inst);
      case 'vento':
        estado.vento = true;
        return aparecer(objVento.material, 0.7, { instantaneo: inst });
      case 'marca':
        return aparecer(objMarcas.userData.mat, 1, { instantaneo: inst });
      case 'mapa':
        return Promise.all(risco.map((m, i) => aparecer(m.material, i === 3 ? 0.5 : 0.6, { instantaneo: inst, duracao: 1 + i * 0.2 })));
      default:
        return Promise.resolve();
    }
  }

  function limpar() {
    for (const z of Object.values(zonas)) z.material.opacity = 0;
    for (const m of risco) m.material.opacity = 0;
    objChuva.material.opacity = 0;
    objVento.material.opacity = 0;
    objMarcas.userData.mat.opacity = 0;
    objEnchente.material.opacity = 0;
    Object.assign(estado, { chuva: false, vento: false, deslize: 0, enchente: 0 });
    objLama.geometry.setDrawRange(0, 0);
    pedras.forEach((p) => (p.visible = false));
    for (const a of arvores) a.rotation.set(0, 0, 0);
  }

  const tmp = new THREE.Vector3();
  function animar(tempo, dt, reduzido) {
    // chuva cai e volta ao topo
    if (estado.chuva && !reduzido) {
      const pos = objChuva.geometry.attributes.position;
      const a = pos.array;
      for (let i = 0; i < a.length; i += 6) {
        a[i + 1] -= dt * 9;
        a[i + 4] -= dt * 9;
        if (a[i + 1] < 0) {
          a[i + 1] += 9;
          a[i + 4] += 9;
        }
      }
      pos.needsUpdate = true;
    }
    // lama descendo
    const { N, curva } = objLama.userData;
    const k = Math.floor(estado.deslize * N);
    objLama.geometry.setDrawRange(0, k * 6);
    for (const p of pedras) {
      if (!p.visible) continue;
      const t = Math.min(Math.max(estado.deslize - p.userData.atraso, 0) / 0.95, 1);
      curva.getPointAt(Math.min(t, 0.999), tmp);
      const x = tmp.x + p.userData.lateral * (0.4 + t);
      const z = tmp.z;
      p.position.set(x, altura(x, z) + 0.12, z);
      p.rotation.x = t * 12;
    }
    // água sobe do leito até o pé das casas (sem cobri-las)
    objEnchente.position.y = -0.2 + estado.enchente * 0.55;
    // vento: árvores vergam; mais forte na área aberta
    for (const [i, a] of arvores.entries()) {
      const forte = a.position.x > 4 && a.position.z < 0 ? 1 : 0.4;
      a.rotation.z = estado.vento && !reduzido ? (0.06 + Math.sin(tempo * 3.2 + i) * 0.06) * forte : 0;
    }
    if (estado.vento && !reduzido) {
      const pos = objVento.geometry.attributes.position;
      objVento.userData.sementes.forEach(([sx, sz, sy], i) => {
        const x = ((tempo * 5 + sx * 20) % 10) + 2;
        const z = -6 + sz * 6;
        const y = altura(x, z) + 0.4 + sy * 1.4;
        pos.array.set([x - 0.9, y, z + 0.3, x, y, z], i * 6);
      });
      pos.needsUpdate = true;
    }
  }

  return { grupo, ancoras, aplicar, limpar, animar };
}
