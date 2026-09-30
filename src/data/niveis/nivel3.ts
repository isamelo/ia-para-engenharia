import type { Level } from '../types';

export const nivel3: Level = {
  id: 'redes-neurais',
  number: 3,
  title: 'Redes neurais',
  subtitle: 'Do perceptron ao deep learning com NumPy',
  description:
    'Construa neurônios artificiais, entenda funções de ativação e implemente o forward pass e a função de perda de uma rede neural.',
  lessons: [
    {
      id: 'perceptron',
      title: 'O perceptron',
      summary: 'O neurônio artificial original aprendendo portas lógicas.',
      minutes: 15,
      packages: ['numpy'],
      theory: `
# O perceptron (1958)

O perceptron é o ancestral de todas as redes neurais. Ele recebe um vetor \`x\`, calcula uma soma ponderada e aplica um **degrau**:

~~~
saída = 1 se (w · x + b) > 0, senão 0
~~~

## Regra de aprendizado

Para cada exemplo \`(x, y)\`:

~~~
erro = y - previsão          (pode ser -1, 0 ou 1)
w    = w + lr * erro * x
b    = b + lr * erro
~~~

Se acertou, \`erro = 0\` e nada muda. Se errou, os pesos são empurrados na direção certa.

## NumPy

A partir daqui usamos **NumPy**, a biblioteca de computação numérica do Python (ela é carregada no sandbox automaticamente):

~~~python
import numpy as np
X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]])
w = np.zeros(2)
X @ w            # produto matriz-vetor → array de 4 valores
(X @ w > 0).astype(int)   # booleanos → 0/1
~~~

## Limitação histórica

Um único perceptron só separa classes com **uma reta**. Ele aprende AND e OR, mas **não consegue aprender XOR** — o que levou ao primeiro "inverno da IA" e, depois, às redes com várias camadas.
`,
      instructions: `
## Exercício

1. \`prever(X, w, b)\` — retorna \`1\` onde \`X @ w + b > 0\` e \`0\` caso contrário (como inteiros). Deve funcionar tanto para uma matriz \`X\` quanto para um único exemplo.
2. \`treinar_perceptron(X, y, lr=0.1, epocas=20)\` — inicia \`w\` com zeros e \`b = 0.0\`, aplica a regra do perceptron exemplo a exemplo e retorna \`(w, b)\`.

Os testes treinam seu perceptron nas portas **AND** e **OR**.
`,
      starterCode: `import numpy as np


def prever(X, w, b):
    # TODO: degrau aplicado a X @ w + b
    pass


def treinar_perceptron(X, y, lr=0.1, epocas=20):
    w = np.zeros(X.shape[1])
    b = 0.0
    for _ in range(epocas):
        for xi, yi in zip(X, y):
            # TODO: calcule o erro e atualize w e b
            pass
    return w, b


X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]])
y_and = np.array([0, 0, 0, 1])
w, b = treinar_perceptron(X, y_and)
print("pesos:", w, "viés:", b)
print("previsões AND:", prever(X, w, b))
`,
      solution: `import numpy as np


def prever(X, w, b):
    return (X @ w + b > 0).astype(int)


def treinar_perceptron(X, y, lr=0.1, epocas=20):
    w = np.zeros(X.shape[1])
    b = 0.0
    for _ in range(epocas):
        for xi, yi in zip(X, y):
            erro = yi - prever(xi, w, b)
            w = w + lr * erro * xi
            b = b + lr * erro
    return w, b


X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]])
y_and = np.array([0, 0, 0, 1])
w, b = treinar_perceptron(X, y_and)
print("pesos:", w, "viés:", b)
print("previsões AND:", prever(X, w, b))
`,
      hints: [
        '(X @ w + b > 0) gera booleanos; .astype(int) converte para 0/1.',
        'Dentro do loop: erro = yi - prever(xi, w, b).',
        'Atualize com w = w + lr * erro * xi e b = b + lr * erro.',
      ],
      tests: [
        {
          name: 'prever aplica o degrau',
          code: `import numpy as np
X = np.array([[0, 0], [1, 1]])
r = prever(X, np.array([1.0, 1.0]), -1.5)
assert r is not None and list(r) == [0, 1], f"Esperava [0, 1], obtive {r}"`,
        },
        {
          name: 'Aprende a porta AND',
          code: `import numpy as np
X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]])
y = np.array([0, 0, 0, 1])
w, b = treinar_perceptron(X, y)
p = prever(X, w, b)
assert list(p) == list(y), f"AND: esperava {list(y)}, obtive {list(p)}"`,
        },
        {
          name: 'Aprende a porta OR',
          code: `import numpy as np
X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]])
y = np.array([0, 1, 1, 1])
w, b = treinar_perceptron(X, y)
p = prever(X, w, b)
assert list(p) == list(y), f"OR: esperava {list(y)}, obtive {list(p)}"`,
        },
      ],
    },
    {
      id: 'ativacoes',
      title: 'Funções de ativação e softmax',
      summary: 'Sigmoid, ReLU e um softmax numericamente estável.',
      minutes: 15,
      packages: ['numpy'],
      theory: `
# Funções de ativação

Sem uma função **não linear** entre as camadas, empilhar camadas seria inútil: a composição de funções lineares ainda é linear. As ativações dão às redes o poder de aprender curvas complexas.

| Função | Fórmula | Uso típico |
|---|---|---|
| **Sigmoid** | \`1 / (1 + e^(-x))\` | saída de probabilidade binária |
| **ReLU** | \`max(0, x)\` | camadas ocultas (padrão moderno) |
| **Softmax** | \`e^(z_i) / Σ e^(z_j)\` | distribuição sobre várias classes / próximos tokens |

## Softmax e estabilidade numérica

O softmax transforma um vetor de **logits** (números quaisquer) em probabilidades que somam 1. É exatamente o que um LLM faz para escolher o próximo token.

Porém \`np.exp(1000)\` estoura para \`inf\`. O truque: subtrair o máximo antes da exponencial — o resultado matemático é o mesmo, pois

~~~
softmax(z) = softmax(z - c)   para qualquer constante c
~~~

~~~python
import numpy as np
np.exp(np.array([1000.0]))          # inf  (overflow!)
z = np.array([1000.0, 1001.0])
np.exp(z - z.max())                 # [0.367..., 1.0]  (ok)
~~~

## Vetorização

Com NumPy, operações se aplicam a arrays inteiros sem loops: \`np.maximum(0, x)\` aplica ReLU a todos os elementos de uma vez.
`,
      instructions: `
## Exercício

Implemente usando NumPy (as funções devem aceitar arrays):

1. \`sigmoid(x)\`
2. \`relu(x)\`
3. \`softmax(z)\` para um vetor 1D — **numericamente estável** (não pode gerar \`nan\` para logits grandes como \`[1000, 1001, 1002]\`).
`,
      starterCode: `import numpy as np


def sigmoid(x):
    # TODO
    pass


def relu(x):
    # TODO
    pass


def softmax(z):
    z = np.asarray(z, dtype=float)
    # TODO: subtraia o máximo antes de exponenciar
    pass


print(sigmoid(np.array([-2.0, 0.0, 2.0])))
print(relu(np.array([-2.0, 0.0, 3.0])))
print(softmax([1.0, 2.0, 3.0]))
print(softmax([1000.0, 1001.0, 1002.0]))
`,
      solution: `import numpy as np


def sigmoid(x):
    return 1 / (1 + np.exp(-x))


def relu(x):
    return np.maximum(0, x)


def softmax(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(z - np.max(z))
    return e / e.sum()


print(sigmoid(np.array([-2.0, 0.0, 2.0])))
print(relu(np.array([-2.0, 0.0, 3.0])))
print(softmax([1.0, 2.0, 3.0]))
print(softmax([1000.0, 1001.0, 1002.0]))
`,
      hints: [
        'np.exp funciona elemento a elemento em arrays.',
        'ReLU: np.maximum(0, x).',
        'Softmax: e = np.exp(z - np.max(z)); return e / e.sum()',
      ],
      tests: [
        {
          name: 'Sigmoid',
          code: `import numpy as np
assert sigmoid(0.0) is not None and abs(float(sigmoid(0.0)) - 0.5) < 1e-9, "sigmoid(0) deve ser 0.5"
s = sigmoid(np.array([-3.0, 3.0]))
assert abs(s[0] + s[1] - 1.0) < 1e-9, "sigmoid(-x) + sigmoid(x) deve ser 1"`,
        },
        {
          name: 'ReLU',
          code: `import numpy as np
r = relu(np.array([-2.0, 0.0, 3.0]))
assert r is not None and list(r) == [0.0, 0.0, 3.0], f"Esperava [0, 0, 3], obtive {r}"`,
        },
        {
          name: 'Softmax soma 1 e preserva a ordem',
          code: `import numpy as np
p = softmax([1.0, 2.0, 3.0])
assert p is not None, "softmax retornou None"
assert abs(p.sum() - 1.0) < 1e-9, "As probabilidades devem somar 1"
assert p[0] < p[1] < p[2], "Logits maiores devem ter probabilidades maiores"
esperado = np.exp([1.0, 2.0, 3.0]) / np.exp([1.0, 2.0, 3.0]).sum()
assert np.allclose(p, esperado), f"Esperava {esperado}, obtive {p}"`,
        },
        {
          name: 'Softmax é numericamente estável',
          code: `import numpy as np
p = softmax([1000.0, 1001.0, 1002.0])
assert p is not None and not np.any(np.isnan(p)), "softmax gerou nan para logits grandes — subtraia o máximo"
assert np.allclose(p, softmax([0.0, 1.0, 2.0])), "softmax(z) deve ser igual a softmax(z - c)"`,
        },
      ],
    },
    {
      id: 'rede-neural',
      title: 'Rede neural: forward pass e perda',
      summary: 'Monte uma rede de duas camadas e a entropia cruzada binária.',
      minutes: 20,
      packages: ['numpy'],
      theory: `
# Uma rede neural de duas camadas

Uma camada densa é só uma multiplicação de matrizes seguida de uma ativação:

~~~
h = sigmoid(X @ W1 + b1)      # camada oculta
ŷ = sigmoid(h @ W2 + b2)      # camada de saída
~~~

Formas (shapes) — com \`n\` exemplos, \`d\` features e \`k\` neurônios ocultos:

| Tensor | Shape |
|---|---|
| X | (n, d) |
| W1, b1 | (d, k), (k,) |
| W2, b2 | (k, 1), (1,) |
| ŷ | (n, 1) |

Isso é o **forward pass**. Com uma camada oculta, a rede já resolve o XOR que o perceptron não conseguia!

## Entropia cruzada binária (BCE)

Para classificação binária, a perda padrão é:

~~~
BCE = -média( y * log(p) + (1 - y) * log(1 - p) )
~~~

Ela pune muito previsões confiantes e erradas. Como \`log(0) = -inf\`, fazemos **clipping**: limitamos \`p\` ao intervalo \`[eps, 1 - eps]\`.

## E o treino?

O **backpropagation** aplica a regra da cadeia para calcular o gradiente da perda em relação a cada peso, e o gradiente descendente (que você já implementou) atualiza os pesos. Depois de validar o exercício, experimente no **Sandbox** um loop de treino completo para o XOR usando suas funções.

~~~python
# esboço do backprop para esta rede (BCE + sigmoid na saída)
dz2 = (y_hat - y) / n
dW2 = h.T @ dz2;  db2 = dz2.sum(axis=0)
dz1 = (dz2 @ W2.T) * h * (1 - h)
dW1 = X.T @ dz1;  db1 = dz1.sum(axis=0)
~~~
`,
      instructions: `
## Exercício

1. \`forward(X, W1, b1, W2, b2)\` — retorna \`ŷ\` com shape \`(n, 1)\` usando sigmoid nas duas camadas.
2. \`bce(y, p, eps=1e-7)\` — retorna a entropia cruzada binária como \`float\`, aplicando \`np.clip(p, eps, 1 - eps)\`.
`,
      starterCode: `import numpy as np


def sigmoid(x):
    return 1 / (1 + np.exp(-x))


def forward(X, W1, b1, W2, b2):
    # TODO: camada oculta e camada de saída
    pass


def bce(y, p, eps=1e-7):
    # TODO: clip + fórmula da entropia cruzada binária
    pass


rng = np.random.default_rng(42)
X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=float)
y = np.array([[0], [1], [1], [0]], dtype=float)
W1, b1 = rng.normal(size=(2, 4)), np.zeros(4)
W2, b2 = rng.normal(size=(4, 1)), np.zeros(1)

y_hat = forward(X, W1, b1, W2, b2)
print("previsões:", y_hat)
print("perda:", bce(y, y_hat))
`,
      solution: `import numpy as np


def sigmoid(x):
    return 1 / (1 + np.exp(-x))


def forward(X, W1, b1, W2, b2):
    h = sigmoid(X @ W1 + b1)
    return sigmoid(h @ W2 + b2)


def bce(y, p, eps=1e-7):
    p = np.clip(p, eps, 1 - eps)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))


rng = np.random.default_rng(42)
X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=float)
y = np.array([[0], [1], [1], [0]], dtype=float)
W1, b1 = rng.normal(size=(2, 4)), np.zeros(4)
W2, b2 = rng.normal(size=(4, 1)), np.zeros(1)

y_hat = forward(X, W1, b1, W2, b2)
print("previsões:", y_hat)
print("perda:", bce(y, y_hat))
`,
      hints: [
        'h = sigmoid(X @ W1 + b1) — o broadcasting soma b1 a cada linha.',
        'A saída é sigmoid(h @ W2 + b2).',
        'bce: p = np.clip(p, eps, 1 - eps) e depois -np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)).',
      ],
      tests: [
        {
          name: 'forward retorna shape (n, 1)',
          code: `import numpy as np
rng = np.random.default_rng(0)
X = rng.normal(size=(5, 3))
out = forward(X, rng.normal(size=(3, 4)), np.zeros(4), rng.normal(size=(4, 1)), np.zeros(1))
assert out is not None and out.shape == (5, 1), f"Esperava shape (5, 1), obtive {None if out is None else out.shape}"
assert np.all((out > 0) & (out < 1)), "A saída sigmoid deve estar entre 0 e 1"`,
        },
        {
          name: 'forward calcula os valores corretos',
          code: `import numpy as np
rng = np.random.default_rng(1)
X = rng.normal(size=(4, 2))
W1, b1 = rng.normal(size=(2, 3)), rng.normal(size=3)
W2, b2 = rng.normal(size=(3, 1)), rng.normal(size=1)
sig = lambda v: 1 / (1 + np.exp(-v))
esperado = sig(sig(X @ W1 + b1) @ W2 + b2)
assert np.allclose(forward(X, W1, b1, W2, b2), esperado), "Os valores do forward não conferem com a referência"`,
        },
        {
          name: 'BCE',
          code: `import numpy as np
v = bce(np.array([1.0, 0.0]), np.array([0.9, 0.1]))
assert v is not None and abs(v - (-np.log(0.9))) < 1e-6, f"BCE deveria ser ~0.1054, obtive {v}"`,
        },
        {
          name: 'BCE não explode com probabilidades 0 e 1',
          code: `import numpy as np
v = bce(np.array([0.0, 1.0]), np.array([1.0, 0.0]))
assert v is not None and np.isfinite(v), "Use np.clip para evitar log(0)"`,
        },
      ],
    },
  ],
};
