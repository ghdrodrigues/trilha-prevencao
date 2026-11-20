// Tweens mínimos para as animações dos subpassos.
// Cada tween interpola de `de` para `para` em `duracao` segundos de "tempo de
// lição", que respeita pausa e velocidade (ver palco.js).

export const easing = {
  linear: (t) => t,
  saida: (t) => 1 - (1 - t) ** 3,
  // Leve quique no fim: objetos "pousam" no lugar.
  pouso: (t) => {
    const c1 = 1.4;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
  entradaSaida: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
};

export class Tweens {
  constructor() {
    this.ativos = new Set();
  }

  // Retorna uma Promise resolvida no fim (ou ao cancelar).
  animar({ duracao = 0.6, atraso = 0, ease = easing.saida, aoAtualizar }) {
    return new Promise((resolve) => {
      const t = { decorrido: -atraso, duracao, ease, aoAtualizar, resolve };
      if (duracao <= 0) {
        aoAtualizar(1);
        resolve();
        return;
      }
      this.ativos.add(t);
    });
  }

  passo(dt) {
    for (const t of this.ativos) {
      t.decorrido += dt;
      if (t.decorrido < 0) continue;
      const p = Math.min(t.decorrido / t.duracao, 1);
      t.aoAtualizar(t.ease(p));
      if (p >= 1) {
        this.ativos.delete(t);
        t.resolve();
      }
    }
  }

  // Termina tudo na hora (pular para o fim).
  concluirTodos() {
    for (const t of this.ativos) {
      t.aoAtualizar(1);
      t.resolve();
    }
    this.ativos.clear();
  }
}
