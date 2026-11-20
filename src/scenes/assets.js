// Troca primitiva → GLB.
//
// Cada cena monta seus objetos com primitivas (blockout). Quando o arquivo
// listado em MODELOS existir em public/models/, ele substitui a primitiva,
// ajustado à caixa dela (mesma largura e mesma base). Sem o arquivo, a
// primitiva continua na cena. Para trocar um asset, salve o GLB bruto com o nome abaixo em
// public/models/_bruto/ e rode `npm run assets:otimizar`.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// Nomes dos arquivos seguem os prompts do BRIEF.md §5.3.
// Um GLB por objeto: o motor anima cada peça separadamente (entrar, pousar,
// guardar na mochila). Dioramas inteiros num único modelo não animam por partes.
export const MODELOS = {
  terreno: 'terreno-base.glb', // 1. Terreno-base (cena 1, mapa da trilha)
  celular: 'celular.glb', // 2. Celular (cena 2)
  // 3. Kit 72h (cena 3): um arquivo por item
  kitMochila: 'kit-mochila.glb',
  kitGarrafa: 'kit-garrafa-agua.glb',
  kitLata: 'kit-lata.glb',
  kitBarra: 'kit-barra-cereal.glb',
  kitDocumentos: 'kit-documentos-saco.glb',
  kitLanterna: 'kit-lanterna.glb',
  kitRadio: 'kit-radio-pilha.glb',
  kitCarregador: 'kit-carregador.glb',
  kitRemedios: 'kit-remedios.glb',
  kitApito: 'kit-apito.glb',
  // Personagens animados (Agente + um vizinho por perfil)
  agente: 'personagem-agente.glb',
  vizinhoEncosta: 'personagem-encosta.glb',
  vizinhoBaixada: 'personagem-baixada.glb',
  vizinhoAberto: 'personagem-interior.glb',
  casaSinais: 'casa-sinais.glb', // 4. Casa com sinais (cena 4)
  bairro: 'bairro-rota.glb', // 5. Bairro com rota (cena 5)
  ruaAlagada: 'rua-alagada.glb', // 6. Rua alagada (cena 6)
  posEnchente: 'pos-enchente.glb', // 7. Pós-enchente (cena 7)
};

const base = import.meta.env.BASE_URL;
// O decodificador Draco vem empacotado com o three (r187+) e só é baixado
// quando o primeiro GLB comprimido carrega.
const draco = new DRACOLoader();
const loader = new GLTFLoader().setDRACOLoader(draco);

// Lista dos GLBs presentes, gerada por `npm run assets:otimizar`. Evita pedir
// arquivos que ainda não existem (e os 404 no console).
const disponiveis = fetch(`${base}models/disponiveis.json`)
  .then((r) => (r.ok ? r.json() : []))
  .catch(() => [])
  .then((l) => new Set(l));

/**
 * Coloca `placeholder` dentro de um grupo e tenta trocá-lo pelo GLB da chave.
 * Retorna o grupo imediatamente; a troca acontece quando o arquivo carregar.
 */
// girar: [x, y, z] em radianos, aplicado ao GLB antes do encaixe (ex.: deitar um objeto exportado em pé).
// escala: multiplica o tamanho encaixado (o encaixe usa a base do placeholder).
export function assetTrocavel(chave, placeholder, { aoTrocar, girar, escala = 1 } = {}) {
  const grupo = new THREE.Group();
  grupo.name = `asset:${chave}`;
  grupo.add(placeholder);

  const arquivo = MODELOS[chave];
  if (!arquivo) return grupo;

  disponiveis.then((lista) => {
    if (!lista.has(arquivo)) return;
    carregar(arquivo, grupo, placeholder, aoTrocar, girar, escala);
  });
  return grupo;
}

function carregar(arquivo, grupo, placeholder, aoTrocar, girar, escala) {
  loader.load(
    `${base}models/${arquivo}`,
    (gltf) => {
      const modelo = gltf.scene;
      if (girar) modelo.rotation.set(...girar);
      grupo.add(modelo);
      encaixar(modelo, placeholder, grupo, escala);
      modelo.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      grupo.remove(placeholder);
      aoTrocar?.(modelo);
    },
    undefined,
    () => {
      console.warn(`Modelo ${arquivo} não carregou; mantendo a primitiva.`);
    },
  );
}

// Escala o modelo para a largura da primitiva e apoia na mesma base.
// As caixas são medidas no espaço do grupo, então o grupo pode ser movido,
// girado ou escalado.
function caixaNoGrupo(obj, grupo) {
  grupo.updateWorldMatrix(true, true);
  const inv = grupo.matrixWorld.clone().invert();
  const caixa = new THREE.Box3();
  const m = new THREE.Matrix4();
  obj.traverse((o) => {
    if (!o.isMesh) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    m.multiplyMatrices(inv, o.matrixWorld);
    caixa.union(o.geometry.boundingBox.clone().applyMatrix4(m));
  });
  return caixa;
}

function encaixar(modelo, placeholder, grupo, fator = 1) {
  const alvo = caixaNoGrupo(placeholder, grupo);
  const caixa = caixaNoGrupo(modelo, grupo);
  const tamAlvo = alvo.getSize(new THREE.Vector3());
  const tam = caixa.getSize(new THREE.Vector3());
  const escala = (fator * Math.max(tamAlvo.x, tamAlvo.z)) / Math.max(tam.x, tam.z, 1e-6);
  modelo.scale.multiplyScalar(escala);

  const depois = caixaNoGrupo(modelo, grupo);
  const centro = depois.getCenter(new THREE.Vector3());
  const centroAlvo = alvo.getCenter(new THREE.Vector3());
  modelo.position.x += centroAlvo.x - centro.x;
  modelo.position.z += centroAlvo.z - centro.z;
  modelo.position.y += alvo.min.y - depois.min.y;
}

/**
 * Carrega um GLB inteiro (com esqueleto e animações), sem encaixe em primitiva.
 * Resolve com o gltf, ou null se o arquivo não estiver em disponiveis.json.
 */
export function carregarModelo(chave) {
  const arquivo = MODELOS[chave];
  return disponiveis.then((lista) => {
    if (!arquivo || !lista.has(arquivo)) return null;
    return loader.loadAsync(`${base}models/${arquivo}`).catch(() => {
      console.warn(`Modelo ${arquivo} não carregou.`);
      return null;
    });
  });
}
