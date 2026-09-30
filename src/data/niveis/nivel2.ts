import type { Level } from '../types';

export const nivel2: Level = {
  id: 'machine-learning',
  number: 2,
  title: 'Machine Learning clássico',
  subtitle: 'Modelos que aprendem com exemplos',
  description:
    'Treine sua primeira regressão com gradiente descendente, classifique com k-vizinhos e aprenda a medir se um modelo é realmente bom.',
  lessons: [
    {
      id: 'regressao-linear',
      title: 'Regressão linear com gradiente descendente',
      summary: 'Faça o computador descobrir a reta que melhor explica os dados.',
      minutes: 20,
      theory: `
# Aprender = minimizar um erro

Em ML, um **modelo** é uma função com **parâmetros** ajustáveis. Na regressão linear:

~~~
ŷ = w * x + b
~~~

- \`w\` (peso) controla a inclinação;
- \`b\` (viés) controla o deslocamento.

## Função de perda

Para saber se o modelo está bom, medimos o **erro quadrático médio (MSE)**:

~~~
MSE = média( (ŷ - y)² )
~~~

Treinar é encontrar \`w\` e \`b\` que **minimizam** o MSE.

## Gradiente descendente

O gradiente diz em que direção a perda **aumenta**. Então andamos um passinho na direção contrária:

~~~
w ← w - lr * ∂MSE/∂w
b ← b - lr * ∂MSE/∂b
~~~

Para o MSE, as derivadas são:

~~~
∂MSE/∂w = média( 2 * (ŷ - y) * x )
∂MSE/∂b = média( 2 * (ŷ - y) )
~~~

\`lr\` é a **taxa de aprendizado**: grande demais e o treino diverge; pequena demais e ele demora. Cada passada completa pelos dados é uma **época**.

> Esse mesmo algoritmo — com bilhões de parâmetros em vez de dois — é o que treina os LLMs.
`,
      instructions: `
## Exercício

1. \`mse(xs, ys, w, b)\` — retorna o erro quadrático médio das previsões \`w * x + b\`.
2. \`treinar(xs, ys, lr=0.01, epocas=1000)\` — começa com \`w = 0.0\` e \`b = 0.0\`, aplica gradiente descendente e retorna a tupla \`(w, b)\`.

Os testes geram dados de uma reta conhecida (por exemplo \`y = 2x + 1\`) e verificam se seu modelo a redescobre.
`,
      starterCode: `def prever(x, w, b):
    return w * x + b


def mse(xs, ys, w, b):
    # TODO: média de (prever(x) - y) ** 2
    return 0.0


def treinar(xs, ys, lr=0.01, epocas=1000):
    w, b = 0.0, 0.0
    n = len(xs)
    for _ in range(epocas):
        # TODO: calcule os gradientes dw e db e atualize w e b
        pass
    return w, b


xs = list(range(10))
ys = [2 * x + 1 for x in xs]
w, b = treinar(xs, ys)
print(f"w = {w:.3f}, b = {b:.3f}, mse = {mse(xs, ys, w, b):.5f}")
`,
      solution: `def prever(x, w, b):
    return w * x + b


def mse(xs, ys, w, b):
    return sum((prever(x, w, b) - y) ** 2 for x, y in zip(xs, ys)) / len(xs)


def treinar(xs, ys, lr=0.01, epocas=1000):
    w, b = 0.0, 0.0
    n = len(xs)
    for _ in range(epocas):
        dw, db = 0.0, 0.0
        for x, y in zip(xs, ys):
            erro = prever(x, w, b) - y
            dw += 2 * erro * x / n
            db += 2 * erro / n
        w -= lr * dw
        b -= lr * db
    return w, b


xs = list(range(10))
ys = [2 * x + 1 for x in xs]
w, b = treinar(xs, ys)
print(f"w = {w:.3f}, b = {b:.3f}, mse = {mse(xs, ys, w, b):.5f}")
`,
      hints: [
        'Dentro de cada época, zere dw e db e acumule a contribuição de cada exemplo.',
        'erro = prever(x, w, b) - y; dw += 2 * erro * x / n; db += 2 * erro / n.',
        'Depois do loop pelos exemplos: w -= lr * dw e b -= lr * db.',
      ],
      tests: [
        {
          name: 'MSE',
          code: `assert abs(mse([1, 2], [3, 5], 2, 1)) < 1e-9, "Previsões perfeitas devem ter MSE 0"
assert abs(mse([0, 0], [1, 3], 0, 0) - 5.0) < 1e-9, "mse([0,0],[1,3],0,0) deveria ser (1 + 9) / 2 = 5.0"`,
        },
        {
          name: 'Aprende y = 2x + 1',
          code: `xs = list(range(10))
ys = [2 * x + 1 for x in xs]
w, b = treinar(xs, ys)
assert abs(w - 2) < 0.05, f"w deveria convergir para ~2, obtive {w:.4f}"
assert abs(b - 1) < 0.05, f"b deveria convergir para ~1, obtive {b:.4f}"`,
        },
        {
          name: 'Aprende y = -3x + 5',
          code: `xs = list(range(10))
ys = [-3 * x + 5 for x in xs]
w, b = treinar(xs, ys)
assert abs(w + 3) < 0.1, f"w deveria convergir para ~-3, obtive {w:.4f}"
assert abs(b - 5) < 0.1, f"b deveria convergir para ~5, obtive {b:.4f}"`,
        },
      ],
    },
    {
      id: 'knn',
      title: 'k-vizinhos mais próximos (k-NN)',
      summary: 'Classifique um ponto pela votação dos seus vizinhos.',
      minutes: 15,
      theory: `
# k-NN: "diga-me com quem andas..."

O **k-NN** é um dos algoritmos de classificação mais simples: para classificar um ponto novo,

1. calcule a distância dele para **todos** os exemplos de treino;
2. pegue os **k** mais próximos;
3. a classe mais frequente entre eles é a resposta (votação por maioria).

~~~
        gato  gato
     gato   ●?        cachorro
                   cachorro  cachorro
~~~

## Empates

Com k par (ou mais de duas classes) pode haver empate na votação. Uma regra comum: entre as classes empatadas, vence a do **vizinho mais próximo**.

## Ferramentas úteis

~~~python
from collections import Counter
Counter(["a", "b", "a"])            # Counter({'a': 2, 'b': 1})

sorted(pontos, key=lambda p: p[1])  # ordena por uma chave
~~~

> k-NN não tem uma fase de "treino": ele memoriza os dados. É simples e poderoso, mas fica lento com milhões de exemplos — é por isso que bancos vetoriais usam índices de busca aproximada.
`,
      instructions: `
## Exercício

Implemente \`knn_prever(treino, ponto, k=3)\`:

- \`treino\` é uma lista de tuplas \`(features, rotulo)\`, por exemplo \`((1.0, 2.0), "gato")\`;
- \`ponto\` é uma tupla de features;
- retorne o rótulo mais votado entre os \`k\` vizinhos mais próximos (distância euclidiana);
- **empate:** retorne, entre as classes empatadas, a que tem o vizinho mais próximo.
`,
      starterCode: `import math
from collections import Counter


def distancia(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def knn_prever(treino, ponto, k=3):
    # TODO:
    # 1. ordene o treino pela distância até o ponto
    # 2. pegue os k primeiros
    # 3. conte os rótulos e resolva empates pelo vizinho mais próximo
    pass


treino = [
    ((1, 1), "gato"), ((1, 2), "gato"), ((2, 1), "gato"),
    ((8, 8), "cachorro"), ((8, 9), "cachorro"), ((9, 8), "cachorro"),
]
print(knn_prever(treino, (1.5, 1.5)))
print(knn_prever(treino, (8.5, 8.0)))
`,
      solution: `import math
from collections import Counter


def distancia(a, b):
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def knn_prever(treino, ponto, k=3):
    ordenados = sorted(treino, key=lambda item: distancia(item[0], ponto))
    vizinhos = ordenados[:k]
    contagem = Counter(rotulo for _, rotulo in vizinhos)
    maior = max(contagem.values())
    for _, rotulo in vizinhos:
        if contagem[rotulo] == maior:
            return rotulo


treino = [
    ((1, 1), "gato"), ((1, 2), "gato"), ((2, 1), "gato"),
    ((8, 8), "cachorro"), ((8, 9), "cachorro"), ((9, 8), "cachorro"),
]
print(knn_prever(treino, (1.5, 1.5)))
print(knn_prever(treino, (8.5, 8.0)))
`,
      hints: [
        'sorted(treino, key=lambda item: distancia(item[0], ponto)) ordena do mais próximo ao mais distante.',
        'Use Counter nos rótulos dos k vizinhos e descubra a maior contagem.',
        'Para desempatar, percorra os vizinhos já ordenados e retorne o primeiro cujo rótulo tem a maior contagem.',
      ],
      tests: [
        {
          name: 'Classifica pontos óbvios',
          code: `treino = [((1, 1), "gato"), ((1, 2), "gato"), ((2, 1), "gato"),
          ((8, 8), "cachorro"), ((8, 9), "cachorro"), ((9, 8), "cachorro")]
assert knn_prever(treino, (1.5, 1.5)) == "gato", "(1.5, 1.5) está no meio dos gatos"
assert knn_prever(treino, (8.5, 8.5)) == "cachorro", "(8.5, 8.5) está no meio dos cachorros"`,
        },
        {
          name: 'k = 1 usa só o vizinho mais próximo',
          code: `treino = [((1, 1), "gato"), ((1, 2), "gato"), ((2, 1), "gato"),
          ((8, 8), "cachorro"), ((8, 9), "cachorro"), ((9, 8), "cachorro")]
assert knn_prever(treino, (5, 5), k=1) == "cachorro", "O vizinho mais próximo de (5, 5) é (8, 8)"`,
        },
        {
          name: 'Maioria vence o mais próximo',
          code: `treino = [((0, 0), "A"), ((3, 0), "B"), ((10, 0), "B")]
assert knn_prever(treino, (1, 0), k=3) == "B", "Com k=3 há 2 votos para B e 1 para A"`,
        },
        {
          name: 'Empate resolvido pelo vizinho mais próximo',
          code: `treino = [((0, 0), "A"), ((3, 0), "B"), ((10, 0), "B")]
assert knn_prever(treino, (1, 0), k=2) == "A", "Com k=2 há empate 1x1; vence A, que está mais perto"`,
        },
      ],
    },
    {
      id: 'metricas',
      title: 'Métricas: acurácia, precisão, recall e F1',
      summary: 'Descubra por que 90% de acurácia pode ser um péssimo modelo.',
      minutes: 15,
      theory: `
# Como saber se um modelo é bom?

Para um classificador binário (1 = positivo, 0 = negativo), comparamos previsões com a verdade e montamos a **matriz de confusão**:

| | Previsto 1 | Previsto 0 |
|---|---|---|
| **Real 1** | VP (verdadeiro positivo) | FN (falso negativo) |
| **Real 0** | FP (falso positivo) | VN (verdadeiro negativo) |

## As métricas

~~~
acurácia = (VP + VN) / total
precisão = VP / (VP + FP)     "dos que eu disse que eram 1, quantos eram?"
recall   = VP / (VP + FN)     "dos que eram 1, quantos eu encontrei?"
F1       = 2 * precisão * recall / (precisão + recall)
~~~

## A armadilha da acurácia

Num detector de fraude onde só 1% das transações são fraudes, um modelo que **sempre** responde "não é fraude" tem 99% de acurácia — e recall **zero**. Por isso, em dados desbalanceados, olhe precisão, recall e F1.

> **Divisão por zero:** se o denominador de uma métrica for 0 (por exemplo, o modelo nunca previu 1), a convenção é retornar \`0.0\`.
`,
      instructions: `
## Exercício

Implemente \`metricas(y_true, y_pred)\` que recebe duas listas de 0/1 e retorna um dicionário com as chaves:

\`"acuracia"\`, \`"precisao"\`, \`"recall"\` e \`"f1"\` (todas \`float\`).

Quando um denominador for zero, a métrica correspondente deve ser \`0.0\`.
`,
      starterCode: `def metricas(y_true, y_pred):
    vp = vn = fp = fn = 0
    # TODO: conte VP, VN, FP e FN percorrendo zip(y_true, y_pred)

    # TODO: calcule as métricas (cuidado com divisão por zero)
    return {"acuracia": 0.0, "precisao": 0.0, "recall": 0.0, "f1": 0.0}


print(metricas([1, 0, 1, 1, 0, 0, 1, 0], [1, 1, 0, 1, 0, 1, 1, 0]))
`,
      solution: `def metricas(y_true, y_pred):
    vp = vn = fp = fn = 0
    for t, p in zip(y_true, y_pred):
        if t == 1 and p == 1:
            vp += 1
        elif t == 0 and p == 0:
            vn += 1
        elif t == 0 and p == 1:
            fp += 1
        else:
            fn += 1

    acuracia = (vp + vn) / len(y_true)
    precisao = vp / (vp + fp) if vp + fp else 0.0
    recall = vp / (vp + fn) if vp + fn else 0.0
    f1 = 2 * precisao * recall / (precisao + recall) if precisao + recall else 0.0
    return {"acuracia": acuracia, "precisao": precisao, "recall": recall, "f1": f1}


print(metricas([1, 0, 1, 1, 0, 0, 1, 0], [1, 1, 0, 1, 0, 1, 1, 0]))
`,
      hints: [
        'Percorra zip(y_true, y_pred) e incremente vp, vn, fp ou fn conforme o par (real, previsto).',
        'Use expressões condicionais: precisao = vp / (vp + fp) if vp + fp else 0.0',
      ],
      tests: [
        {
          name: 'Métricas num caso misto',
          code: `m = metricas([1, 0, 1, 1, 0, 0, 1, 0], [1, 1, 0, 1, 0, 1, 1, 0])
esperado = {"acuracia": 0.625, "precisao": 0.6, "recall": 0.75, "f1": 2 * 0.6 * 0.75 / 1.35}
for chave, valor in esperado.items():
    assert chave in m, f"Falta a chave '{chave}'"
    assert abs(m[chave] - valor) < 1e-9, f"{chave} deveria ser {valor:.4f}, obtive {m[chave]}"`,
        },
        {
          name: 'A armadilha da acurácia',
          code: `m = metricas([0] * 9 + [1], [0] * 10)
assert abs(m["acuracia"] - 0.9) < 1e-9, "Sempre prever 0 dá 90% de acurácia aqui"
assert m["recall"] == 0.0, "...mas o recall é 0: nenhum positivo foi encontrado"`,
        },
        {
          name: 'Sem divisão por zero',
          code: `m = metricas([0, 0, 1], [0, 0, 0])
assert m["precisao"] == 0.0 and m["f1"] == 0.0, "Sem previsões positivas, precisão e F1 devem ser 0.0"`,
        },
      ],
    },
  ],
};
