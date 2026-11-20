// Linha do tempo na base da tela: cartões de etapa (ou de parada, no mapa)
// com anterior/próxima. No celular vira uma faixa com rolagem horizontal.

export function criarLinhaTempo(elemento, { aoEscolher }) {
  let itens = [];
  let atual = 0;

  elemento.innerHTML = `
    <p class="lt-rotulo"></p>
    <div class="lt-trilho"><ol class="lt-itens"></ol></div>
    <div class="lt-nav">
      <button type="button" class="icone-botao lt-anterior" aria-label="Anterior">‹</button>
      <button type="button" class="icone-botao lt-proxima primario" aria-label="Próxima">›</button>
    </div>`;
  const ol = elemento.querySelector('.lt-itens');
  const rotulo = elemento.querySelector('.lt-rotulo');
  const anterior = elemento.querySelector('.lt-anterior');
  const proxima = elemento.querySelector('.lt-proxima');
  anterior.addEventListener('click', () => atual > 0 && aoEscolher(atual - 1));
  proxima.addEventListener('click', () => atual < itens.length - 1 && aoEscolher(atual + 1));

  // itens: [{ icone, titulo, estado: 'feito'|'atual'|'' , marca: 'para você' }]
  function definir({ titulo, itens: novos, atual: a = 0 }) {
    itens = novos;
    rotulo.textContent = titulo;
    ol.replaceChildren();
    novos.forEach((it, i) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lt-cartao';
      b.innerHTML = `<span class="lt-icone" aria-hidden="true"></span><span class="lt-texto"><span class="lt-num">${i + 1}.</span> <span class="lt-titulo"></span></span><span class="lt-marca"></span>`;
      b.querySelector('.lt-icone').textContent = it.icone ?? '';
      b.querySelector('.lt-titulo').textContent = it.titulo;
      b.querySelector('.lt-marca').textContent = it.marca ?? '';
      b.addEventListener('click', () => aoEscolher(i));
      li.appendChild(b);
      ol.appendChild(li);
    });
    marcar(a);
  }

  function marcar(i, estados = []) {
    atual = i;
    [...ol.querySelectorAll('.lt-cartao')].forEach((b, j) => {
      b.setAttribute('aria-current', j === i ? 'step' : 'false');
      b.classList.toggle('feito', Boolean(estados[j]));
    });
    anterior.disabled = i <= 0;
    proxima.disabled = i >= itens.length - 1;
    ol.querySelectorAll('.lt-cartao')[i]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }

  return { definir, marcar };
}
