// "Meu plano": o que a pessoa marca e preenche ao longo da trilha (CEP, kit,
// plano da família) fica só no aparelho (localStorage), sem cadastro. Este
// módulo guarda os dados, desenha os blocos de ação das paradas e a página
// final que reúne tudo para enviar pelo WhatsApp, copiar ou imprimir.

import dados from '../../data/licoes.json';
import { icone } from './icones.js';

const CHAVE = 'trilha.plano';
export const CHAVE_KIT = 'trilha.kit.tenho';

function ler(chave, padrao) {
  try {
    const v = localStorage.getItem(chave);
    return v ? JSON.parse(v) : padrao;
  } catch {
    return padrao;
  }
}
function gravar(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
}

let plano = ler(CHAVE, {});
export const lerPlano = () => plano;
export function salvarCampo(campo, valor) {
  plano = { ...plano, [campo]: valor };
  gravar(CHAVE, plano);
}

let kit = new Set(ler(CHAVE_KIT, []));
export const temNoKit = (chave) => kit.has(chave);
export function marcarKit(chave, sim) {
  if (sim) kit.add(chave);
  else kit.delete(chave);
  gravar(CHAVE_KIT, [...kit]);
}

// Itens do kit (parada 3): cada subpasso é um item marcável.
// A chave é a mesma que a lição grava ao marcar "Tenho": "<etapa>:<índice>".
export function itensKit() {
  const l = dados.licoes.find((x) => x.marcavel) ?? dados.licoes.find((x) => x.tipo === 'montagem');
  if (!l) return [];
  return l.etapas.flatMap((e) => e.subpassos.map((s, si) => ({ chave: `${e.id}:${si}`, texto: s.texto, grupo: e.titulo })).filter((x) => !x.texto.startsWith('Monte')));
}

// Campos do plano da família (parada 5), com os rótulos do Plano Emergencial Familiar.
export const CAMPOS_PLANO = [
  { campo: 'ponto', rotulo: 'Ponto de encontro (fora do bairro)', dica: 'Ex.: praça da igreja matriz' },
  { campo: 'area', rotulo: 'Área de segurança mais próxima', dica: 'Lugar alto e seguro perto de casa' },
  { campo: 'rotaInterna', rotulo: 'Rota de fuga dentro de casa', dica: 'Por qual porta sair' },
  { campo: 'rotaExterna', rotulo: 'Rota de fuga externa', dica: 'O caminho até o ponto de encontro' },
  { campo: 'contatoNome', rotulo: 'Contato de apoio: nome', dica: 'Familiar ou amigo' },
  { campo: 'contatoTel', rotulo: 'Contato de apoio: telefone', dica: '(48) 9 0000-0000', tipo: 'tel' },
  { campo: 'familia', rotulo: 'A família: nome, idade, parentesco, saúde e telefone', dica: 'Ex.: Ana, 72, avó, usa bengala, (48) 9…', multi: true },
  { campo: 'acoes', rotulo: 'Ações de emergência e responsável', dica: 'Ex.: desligar a energia: João', multi: true },
];

// ---------- Blocos de ação das paradas ----------

function el(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto != null) e.textContent = texto;
  return e;
}

function linkAcao(href, iconeNome, texto, sub) {
  const a = el('a', 'acao');
  a.href = href;
  if (href.startsWith('http')) {
    a.target = '_blank';
    a.rel = 'noopener';
  }
  a.innerHTML = icone(iconeNome);
  const t = el('span', 'acao-texto');
  t.append(el('strong', null, texto));
  if (sub) t.append(el('small', null, sub));
  a.append(t);
  return a;
}

const smsHref = (cep) => `sms:40199${cep ? `?&body=${encodeURIComponent(cep)}` : ''}`;

function blocoSms(alvo) {
  const box = el('div', 'acao-bloco');
  const rot = el('label', 'campo');
  rot.htmlFor = 'cep';
  rot.append(el('span', null, 'CEP da sua casa'));
  const inp = el('input');
  inp.id = 'cep';
  inp.inputMode = 'numeric';
  inp.autocomplete = 'postal-code';
  inp.placeholder = '00000-000';
  inp.value = plano.cep ?? '';
  rot.append(inp);
  const link = linkAcao(smsHref(inp.value), 'sms', 'Enviar CEP por SMS para 40199', 'Gratuito');
  inp.addEventListener('input', () => {
    const d = inp.value.replace(/\D/g, '').slice(0, 8);
    inp.value = d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
    salvarCampo('cep', inp.value);
    link.href = smsHref(inp.value);
  });
  box.append(rot, link);
  alvo.append(box);
}

function blocoPlano(alvo) {
  const form = el('form', 'plano-form');
  form.addEventListener('submit', (e) => e.preventDefault());
  for (const c of CAMPOS_PLANO) {
    const rot = el('label', 'campo');
    rot.htmlFor = `plano-${c.campo}`;
    rot.append(el('span', null, c.rotulo));
    const inp = el(c.multi ? 'textarea' : 'input');
    inp.id = `plano-${c.campo}`;
    if (c.tipo) inp.type = c.tipo;
    if (c.multi) inp.rows = 3;
    inp.placeholder = c.dica;
    inp.value = plano[c.campo] ?? '';
    inp.addEventListener('input', () => salvarCampo(c.campo, inp.value));
    rot.append(inp);
    form.append(rot);
  }
  form.append(el('p', 'nota', 'Fica salvo só neste aparelho.'));
  alvo.append(form);
}

const ACOES = {
  sms40199: blocoSms,
  whatsapp: (alvo) => alvo.append(linkAcao('https://wa.me/556120344611?text=ol%C3%A1', 'celular', 'Alerta pelo WhatsApp', 'Mande “olá” para (61) 2034-4611')),
  ligar199: (alvo) => alvo.append(linkAcao('tel:199', 'telefone', 'Ligar 199', 'Defesa Civil, emergência')),
  plano: blocoPlano,
};

// Desenha as ações da lição (campo "acoes" do licoes.json) e o atalho para Meu plano.
export function renderAcoes(alvo, licao) {
  const lista = licao.acoes ?? [];
  if (lista.length) {
    const sec = el('section', 'acoes');
    sec.append(el('h3', 'acoes-titulo', licao.acoesTitulo ?? 'Faça agora'));
    for (const a of lista) ACOES[a]?.(sec);
    alvo.append(sec);
  }
}

// ---------- Página "Meu plano" ----------

function textoPlano(perfil) {
  const p = plano;
  const kitItens = itensKit();
  const tem = kitItens.filter((i) => kit.has(i.chave)).map((i) => i.texto);
  const falta = kitItens.filter((i) => !kit.has(i.chave)).map((i) => i.texto);
  const linhas = ['MEU PLANO DE EMERGÊNCIA (Trilha da Prevenção)', ''];
  if (perfil) linhas.push(`Onde moramos: ${dados.perfis[perfil]?.titulo ?? ''}`);
  if (p.cep) linhas.push(`CEP para alertas: ${p.cep} (SMS 40199)`);
  for (const c of CAMPOS_PLANO) if (p[c.campo]) linhas.push(`${c.rotulo}: ${p[c.campo]}`);
  linhas.push('', `Kit: tenho ${tem.length} de ${kitItens.length}`);
  if (falta.length) linhas.push(`Falta: ${falta.join(', ')}`);
  linhas.push('', 'Emergência: Defesa Civil 199 · Bombeiros 193', 'Alertas: SMS 40199 com o CEP · WhatsApp (61) 2034-4611', 'Revisar o plano a cada seis meses.');
  return linhas.join('\n');
}

export function abrirMeuPlano({ perfil, aoFechar } = {}) {
  let dlg = document.getElementById('meu-plano');
  if (!dlg) {
    dlg = el('div', 'meu-plano');
    dlg.id = 'meu-plano';
    dlg.setAttribute('role', 'dialog');
    dlg.setAttribute('aria-modal', 'true');
    dlg.setAttribute('aria-labelledby', 'mp-titulo');
    document.body.append(dlg);
  }
  const p = plano;
  const kitItens = itensKit();
  const falta = kitItens.filter((i) => !kit.has(i.chave));
  dlg.replaceChildren();
  const caixa = el('div', 'mp-caixa');
  const topo = el('div', 'mp-topo');
  const h = el('h2', null, 'Meu plano');
  h.id = 'mp-titulo';
  const fechar = el('button', 'icone-botao');
  fechar.type = 'button';
  fechar.setAttribute('aria-label', 'Fechar');
  fechar.innerHTML = icone('fechar');
  topo.append(h, fechar);
  caixa.append(topo, el('p', 'mp-sub', 'Reúne o que você marcou e preencheu na trilha. Fica só neste aparelho.'));

  const sec = (titulo) => {
    const s = el('section', 'mp-sec');
    s.append(el('h3', null, titulo));
    caixa.append(s);
    return s;
  };
  const dl = (s, pares) => {
    const d = el('dl');
    for (const [k, v] of pares) {
      d.append(el('dt', null, k), el('dd', v ? null : 'vazio', v || 'Não preenchido'));
    }
    s.append(d);
  };

  dl(sec('Alertas'), [
    ['Onde você mora', perfil ? dados.perfis[perfil]?.titulo : ''],
    ['CEP para o SMS 40199', p.cep],
  ]);
  dl(
    sec('Plano da família'),
    CAMPOS_PLANO.map((c) => [c.rotulo, p[c.campo]]),
  );
  const sk = sec(`Kit de emergência: ${kitItens.length - falta.length} de ${kitItens.length}`);
  if (falta.length) {
    sk.append(el('p', null, 'Falta:'));
    const ul = el('ul', 'mp-falta');
    for (const i of falta) ul.append(el('li', null, i.texto));
    sk.append(ul);
  } else sk.append(el('p', null, 'Você marcou todos os itens.'));
  const se = sec('Emergência');
  se.append(el('p', 'mp-num', 'Defesa Civil: 199 · Bombeiros: 193'), el('p', 'mp-num', 'Alertas: SMS 40199 com o CEP · WhatsApp (61) 2034-4611'));
  caixa.append(el('p', 'nota', 'Reveja o plano com a família a cada seis meses. Fonte: Plano Emergencial Familiar, Defesa Civil SC.'));

  const botoes = el('div', 'mp-botoes');
  const texto = textoPlano(perfil);
  const wa = el('a', 'botao primario', 'Enviar pelo WhatsApp');
  wa.href = `https://wa.me/?text=${encodeURIComponent(texto)}`;
  wa.target = '_blank';
  wa.rel = 'noopener';
  const copiar = el('button', 'botao', 'Copiar texto');
  copiar.type = 'button';
  copiar.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(texto);
      copiar.textContent = 'Copiado';
    } catch {
      copiar.textContent = 'Não foi possível copiar';
    }
  });
  const imprimir = el('button', 'botao', 'Imprimir ou salvar em PDF');
  imprimir.type = 'button';
  imprimir.addEventListener('click', () => window.print());
  // Plano vazio: o primeiro passo é preencher, não enviar.
  const vazio = !p.cep && CAMPOS_PLANO.every((c) => !p[c.campo]);
  const editar = el('a', vazio ? 'botao primario' : 'botao', 'Preencher o plano');
  editar.href = '?parada=5';
  if (vazio) {
    wa.className = 'botao';
    botoes.append(editar, wa, copiar, imprimir);
    caixa.insertBefore(el('p', 'mp-vazio', 'Seu plano ainda está vazio. Comece pela parada 5, Plano de fuga da família.'), caixa.children[2]);
  } else botoes.append(wa, copiar, imprimir, editar);
  // os botões vêm logo abaixo do título
  caixa.insertBefore(botoes, caixa.children[vazio ? 3 : 2]);
  dlg.append(caixa);

  function fecharDlg() {
    dlg.hidden = true;
    document.body.classList.remove('com-meu-plano');
    aoFechar?.();
  }
  fechar.addEventListener('click', fecharDlg);
  dlg.onkeydown = (e) => e.key === 'Escape' && fecharDlg();
  dlg.hidden = false;
  document.body.classList.add('com-meu-plano');
  fechar.focus();
}
