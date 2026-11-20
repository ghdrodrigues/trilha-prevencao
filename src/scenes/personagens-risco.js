// Personagens da parada 1 ("Conheça seu risco"): a Agente da Defesa Civil e o
// vizinho do perfil de quem usa. Cada subpasso da lição pode pedir uma ação
// (clipe do GLB). O relógio é o da lição: pausa, velocidade e movimento
// reduzido valem para eles também.

import * as THREE from 'three';
import { altura } from './cena1-terreno.js';
import { carregarModelo } from './assets.js';

const ALTURA = 1.0; // um pouco maior que a escala das casas, para ler no mapa
const FADE = 0.3;

// Onde a Agente fica em cada enquadramento da lição: [x, z].
const POSICAO_AGENTE = {
  geral: [1.6, 0.6],
  encosta: [0.3, 0.2],
  baixada: [-0.2, 4.0],
  aberto: [4.6, -1.0],
};

// Vizinho de cada perfil: chave do GLB e lugar ao lado de casa.
const VIZINHOS = {
  encosta: { chave: 'vizinhoEncosta', pos: [-1.3, 0.1] },
  baixada: { chave: 'vizinhoBaixada', pos: [1.5, 3.5] },
  aberto: { chave: 'vizinhoAberto', pos: [6.1, -2.2] },
};

// Um personagem: modelo, mixer e troca suave de clipe.
function criarAtor(gltf, alturaAtor) {
  const modelo = gltf.scene;
  const caixa = new THREE.Box3().setFromObject(modelo);
  modelo.scale.setScalar(alturaAtor / Math.max(caixa.max.y - caixa.min.y, 1e-6));
  modelo.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.frustumCulled = false; // malha com esqueleto: a caixa não acompanha a pose
    }
  });
  const raiz = new THREE.Group();
  raiz.add(modelo);
  const mixer = new THREE.AnimationMixer(modelo);
  const clipes = Object.fromEntries(gltf.animations.map((c) => [c.name, mixer.clipAction(c)]));
  let atual = null;

  function tocar(nome, { reduzido = false } = {}) {
    const acao = clipes[nome] ?? clipes.parado;
    if (!acao || acao === atual) return;
    acao.reset().play();
    if (atual && !reduzido) atual.crossFadeTo(acao, FADE, false);
    else {
      atual?.stop();
      // Sem movimento: congela no meio do clipe, onde o gesto aparece.
      if (reduzido) acao.time = acao.getClip().duration / 2;
    }
    atual = acao;
    if (reduzido) mixer.update(0);
  }

  return { raiz, mixer, tocar };
}

// Outras cenas (parada 4) passam o próprio relevo, as posições e a escala.
export function criarPersonagensRisco({
  palco,
  relevo = altura,
  posicoesAgente = POSICAO_AGENTE,
  vizinhos = VIZINHOS,
  alturaAtor = ALTURA,
  velocidadeAndar = 1.1, // unidades de cena por segundo
}) {
  const noChao = (obj, [x, z]) => obj.position.set(x, relevo(x, z), z);
  const grupo = new THREE.Group();
  grupo.name = 'personagens';
  let agente = null;
  let vizinho = null;
  let perfilVizinho = null;
  let alvo = null; // ponto que a Agente indica
  let caminhada = null; // { de, para, t, dur }: o vizinho andando até um ponto
  let ultimaCena = null; // reaplicada quando um modelo termina de carregar

  carregarModelo('agente').then((gltf) => {
    if (!gltf) return;
    agente = criarAtor(gltf, alturaAtor);
    agente.raiz.visible = false;
    grupo.add(agente.raiz);
    if (ultimaCena) encenar(ultimaCena);
  });

  const cacheVizinhos = {};
  function carregarVizinho(perfil) {
    const def = vizinhos[perfil];
    if (!def) return Promise.resolve(null);
    cacheVizinhos[perfil] ??= carregarModelo(def.chave).then((gltf) => {
      if (!gltf) return null;
      const ator = criarAtor(gltf, alturaAtor);
      ator.casa = def.pos;
      noChao(ator.raiz, def.pos);
      ator.raiz.visible = false;
      grupo.add(ator.raiz);
      return ator;
    });
    return cacheVizinhos[perfil];
  }

  // Vira o personagem para a câmera, puxando um pouco para o alvo.
  function orientar(ator, mira) {
    const cam = palco.camera.position;
    const p = ator.raiz.position;
    const paraCam = Math.atan2(cam.x - p.x, cam.z - p.z);
    if (!mira) {
      ator.raiz.rotation.y = paraCam;
      return;
    }
    const paraAlvo = Math.atan2(mira.x - p.x, mira.z - p.z);
    let d = paraAlvo - paraCam;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    ator.raiz.rotation.y = paraCam + d * 0.45;
  }

  /** Mostra os personagens da lição para o perfil escolhido (ou só a Agente). */
  async function entrar(perfil) {
    perfilVizinho = perfil;
    if (agente) agente.raiz.visible = true;
    for (const [p, promessa] of Object.entries(cacheVizinhos)) {
      promessa.then((a) => a && (a.raiz.visible = false));
    }
    vizinho = null;
    const ator = await carregarVizinho(perfil);
    if (ator && perfilVizinho === perfil) {
      vizinho = ator;
      vizinho.raiz.visible = true;
      orientar(vizinho);
      vizinho.tocar('parado', { reduzido: palco.movimentoReduzido() });
      if (ultimaCena) encenar(ultimaCena);
    }
  }

  // Volta o vizinho para casa: a próxima caminhada sai do começo.
  function recomecar() {
    caminhada = null;
  }

  function sair() {
    caminhada = null;
    perfilVizinho = null;
    ultimaCena = null;
    grupo.children.forEach((c) => (c.visible = false));
  }

  /**
   * Aplica a cena de um subpasso: foco (onde a Agente fica), ponto indicado
   * e ações { agente, vizinho }. Ações ausentes voltam para "parado".
   * vizinhoPara: [x, z] faz o vizinho andar de casa até lá e então tocar a ação.
   */
  function encenar(cena = {}) {
    const { foco = 'geral', mira = null, agente: acaoAgente, vizinho: acaoVizinho, vizinhoPara } = cena;
    ultimaCena = cena;
    const reduzido = palco.movimentoReduzido();
    alvo = mira;
    if (agente) {
      agente.raiz.visible = true;
      noChao(agente.raiz, posicoesAgente[foco] ?? posicoesAgente.geral);
      agente.tocar(acaoAgente ?? 'parado', { reduzido });
    }
    if (vizinho) {
      const chegou = caminhada && caminhada.t >= caminhada.dur;
      const mesmoDestino = vizinhoPara && caminhada && caminhada.para.x === vizinhoPara[0] && caminhada.para.y === vizinhoPara[1];
      if (mesmoDestino) {
        // subpasso seguinte com o mesmo destino: segue andando ou só troca a ação
        caminhada.acao = acaoVizinho ?? 'parado';
        if (chegou || reduzido) {
          caminhada.t = caminhada.dur;
          noChao(vizinho.raiz, vizinhoPara);
          vizinho.tocar(caminhada.acao, { reduzido });
        }
        return;
      }
      caminhada = null;
      if (vizinhoPara) {
        const de = new THREE.Vector2(...vizinho.casa);
        const para = new THREE.Vector2(...vizinhoPara);
        caminhada = { de, para, t: 0, dur: de.distanceTo(para) / velocidadeAndar, acao: acaoVizinho ?? 'acenar' };
        if (reduzido) caminhada.t = caminhada.dur;
        noChao(vizinho.raiz, reduzido ? vizinhoPara : vizinho.casa);
        vizinho.tocar(reduzido ? caminhada.acao : 'andar', { reduzido });
      } else {
        noChao(vizinho.raiz, vizinho.casa);
        vizinho.tocar(acaoVizinho ?? 'parado', { reduzido });
      }
    }
  }

  const p2 = new THREE.Vector2();
  function andar(dt) {
    if (!caminhada || !vizinho) return false;
    const c = caminhada;
    if (c.t >= c.dur) return false;
    c.t = Math.min(c.t + dt, c.dur);
    p2.lerpVectors(c.de, c.para, c.t / c.dur);
    noChao(vizinho.raiz, [p2.x, p2.y]);
    vizinho.raiz.rotation.y = Math.atan2(c.para.x - c.de.x, c.para.y - c.de.y);
    if (c.t >= c.dur) vizinho.tocar(c.acao);
    return true;
  }

  function animar(tempo, dt, reduzido) {
    if (agente?.raiz.visible) {
      orientar(agente, alvo);
      if (!reduzido) agente.mixer.update(dt);
    }
    if (vizinho?.raiz.visible) {
      if (!andar(reduzido ? 0 : dt)) orientar(vizinho, alvo);
      if (!reduzido) vizinho.mixer.update(dt);
    }
  }

  return { grupo, entrar, sair, encenar, animar, recomecar };
}
