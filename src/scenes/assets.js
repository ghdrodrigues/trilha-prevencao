// Troca primitiva → GLB.
//
// Cada cena monta seus objetos com primitivas (blockout). Quando o arquivo
// listado em MODELOS existir em public/models/, ele substitui a primitiva,
// ajustado à caixa dela (mesma largura e mesma base). Sem o arquivo, a
// primitiva continua na cena. Para trocar um asset, basta salvar o GLB
// otimizado com o nome abaixo (veja `npm run assets:otimizar`).

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// Nomes dos arquivos seguem os prompts do BRIEF.md §5.3.
export const MODELOS = {
  terreno: 'terreno-base.glb', // 1. Terreno-base (cena 1)
  celular: 'celular.glb', // 2. Celular (cena 2)
  kit: 'kit-72h.glb', // 3. Kit 72h (cena 3)
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

/**
 * Coloca `placeholder` dentro de um grupo e tenta trocá-lo pelo GLB da chave.
 * Retorna o grupo imediatamente; a troca acontece quando o arquivo carregar.
 */
export function assetTrocavel(chave, placeholder, { aoTrocar } = {}) {
  const grupo = new THREE.Group();
  grupo.name = `asset:${chave}`;
  grupo.add(placeholder);

  const arquivo = MODELOS[chave];
  if (!arquivo) return grupo;

  loader.load(
    `${base}models/${arquivo}`,
    (gltf) => {
      const modelo = gltf.scene;
      grupo.add(modelo);
      grupo.updateMatrixWorld(true);
      encaixar(modelo, placeholder);
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
      // Arquivo ainda não existe: segue com a primitiva.
    },
  );
  return grupo;
}

// Escala o modelo para a largura da primitiva e apoia na mesma base.
// O grupo pode ser movido, mas não girado nem escalado.
function encaixar(modelo, placeholder) {
  const alvo = new THREE.Box3().setFromObject(placeholder);
  const caixa = new THREE.Box3().setFromObject(modelo);
  const tamAlvo = alvo.getSize(new THREE.Vector3());
  const tam = caixa.getSize(new THREE.Vector3());
  const escala = Math.max(tamAlvo.x, tamAlvo.z) / Math.max(tam.x, tam.z || 1e-6);
  modelo.scale.multiplyScalar(escala);
  modelo.updateMatrixWorld(true);

  caixa.setFromObject(modelo);
  const centro = caixa.getCenter(new THREE.Vector3());
  const centroAlvo = alvo.getCenter(new THREE.Vector3());
  modelo.position.x += centroAlvo.x - centro.x;
  modelo.position.z += centroAlvo.z - centro.z;
  modelo.position.y += alvo.min.y - caixa.min.y;
}
