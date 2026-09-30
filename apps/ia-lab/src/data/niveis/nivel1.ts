import type { Level } from '../types';

export const nivel1: Level = {
  id: 'fundamentos',
  number: 1,
  title: 'Fundamentos',
  subtitle: 'Do zero: o que é IA, dados e vetores',
  description:
    'Entenda a diferença entre regras e aprendizado, manipule dados com Python e conheça os vetores — a linguagem que todo modelo de IA fala.',
  lessons: [
    {
      id: 'o-que-e-ia',
      title: 'O que é IA? Regras vs. aprendizado',
      summary: 'Escreva seu primeiro "sistema inteligente" baseado em regras.',
      minutes: 10,
      theory: `
# O que é Inteligência Artificial?

**Inteligência Artificial (IA)** é o campo que busca fazer computadores realizarem tarefas que, em humanos, exigiriam inteligência: reconhecer imagens, entender texto, tomar decisões.

Existem duas grandes formas de construir um sistema "inteligente":

| Abordagem | Como funciona | Exemplo |
|---|---|---|
| **Baseada em regras** | Um humano escreve as regras explicitamente | "Se a temperatura < 15 °C, então está frio" |
| **Aprendizado de máquina (ML)** | O computador *aprende* as regras a partir de exemplos | Mostrar 10 mil fotos rotuladas até o modelo reconhecer gatos |

Dentro de ML existe o **Deep Learning** (redes neurais profundas), e dentro dele estão os **LLMs** (modelos de linguagem como GPT, Claude, Llama). Nesta trilha você vai percorrer todo esse caminho: das regras até a atenção dos Transformers e os agentes.

~~~
IA  ⊃  Machine Learning  ⊃  Deep Learning  ⊃  LLMs
~~~

## Por que começar com regras?

Sistemas de regras (os antigos *sistemas especialistas*) ainda são muito usados — e ajudam a entender a limitação que motivou o ML: **para problemas complexos, é impossível escrever todas as regras à mão**.

## Seu ambiente sandbox

Ao lado direito há um editor Python que roda **dentro do seu navegador** (via WebAssembly). Nada é instalado na sua máquina e nada é enviado a servidores. Use:

- **Executar** (ou Ctrl/Cmd + Enter) para rodar o código e ver a saída;
- **Validar** para rodar os testes automáticos do exercício.
`,
      instructions: `
## Exercício: um classificador de temperatura

Implemente \`classificar_temperatura(t)\` que recebe uma temperatura em °C e retorna:

- \`"frio"\` se \`t < 15\`
- \`"agradável"\` se \`15 <= t <= 25\`
- \`"quente"\` se \`t > 25\`

Repare nos limites: 15 e 25 são **agradáveis**.
`,
      starterCode: `def classificar_temperatura(t):
    # Escreva suas regras aqui usando if / elif / else
    return "?"


print(classificar_temperatura(10))
print(classificar_temperatura(20))
print(classificar_temperatura(30))
`,
      solution: `def classificar_temperatura(t):
    if t < 15:
        return "frio"
    elif t <= 25:
        return "agradável"
    else:
        return "quente"


print(classificar_temperatura(10))
print(classificar_temperatura(20))
print(classificar_temperatura(30))
`,
      hints: [
        'Use uma estrutura if / elif / else com três ramos.',
        'A ordem importa: teste primeiro t < 15, depois t <= 25; o que sobrar é "quente".',
      ],
      tests: [
        {
          name: 'Temperaturas frias',
          code: `assert classificar_temperatura(10) == "frio", "10 °C deveria ser 'frio'"
assert classificar_temperatura(14.9) == "frio", "14.9 °C deveria ser 'frio'"`,
        },
        {
          name: 'Limites 15 e 25 são agradáveis',
          code: `assert classificar_temperatura(15) == "agradável", "15 °C deveria ser 'agradável'"
assert classificar_temperatura(25) == "agradável", "25 °C deveria ser 'agradável'"`,
        },
        {
          name: 'Temperaturas quentes',
          code: `assert classificar_temperatura(25.1) == "quente", "25.1 °C deveria ser 'quente'"
assert classificar_temperatura(40) == "quente", "40 °C deveria ser 'quente'"`,
        },
      ],
    },
    {
      id: 'dados-e-normalizacao',
      title: 'Dados: médias e normalização',
      summary: 'Prepare dados para um modelo com média e normalização min-max.',
      minutes: 12,
      theory: `
# Dados são o combustível da IA

Modelos de ML aprendem a partir de **dados**. Antes de treinar qualquer modelo, quase sempre precisamos **pré-processar** esses dados.

## Estatísticas básicas

A **média** resume um conjunto de valores:

~~~
média = (x1 + x2 + ... + xn) / n
~~~

Em Python:

~~~python
valores = [3, 5, 10]
media = sum(valores) / len(valores)   # 6.0
~~~

## Normalização min-max

Imagine um modelo que recebe *idade* (0–100) e *salário* (0–50.000). O salário "domina" os cálculos só porque seus números são maiores. A **normalização** coloca todas as variáveis na mesma escala, geralmente \`[0, 1]\`:

~~~
x_normalizado = (x - mínimo) / (máximo - mínimo)
~~~

Assim o menor valor vira 0 e o maior vira 1.

> **Caso especial:** se todos os valores forem iguais, \`máximo - mínimo = 0\` e teríamos divisão por zero. Nesse caso, retorne uma lista de zeros.

## List comprehensions

Uma forma idiomática de transformar listas em Python:

~~~python
dobro = [x * 2 for x in [1, 2, 3]]   # [2, 4, 6]
~~~
`,
      instructions: `
## Exercício

1. Implemente \`media(xs)\` que retorna a média aritmética de uma lista de números.
2. Implemente \`normalizar(xs)\` que retorna uma **nova lista** com a normalização min-max de \`xs\`.
   - Se todos os valores forem iguais, retorne uma lista de \`0.0\` do mesmo tamanho.
`,
      starterCode: `def media(xs):
    # TODO: retorne a média de xs
    pass


def normalizar(xs):
    # TODO: aplique (x - min) / (max - min) a cada elemento
    pass


print(media([1, 2, 3, 4]))
print(normalizar([10, 20, 30]))
`,
      solution: `def media(xs):
    return sum(xs) / len(xs)


def normalizar(xs):
    menor, maior = min(xs), max(xs)
    if maior == menor:
        return [0.0 for _ in xs]
    return [(x - menor) / (maior - menor) for x in xs]


print(media([1, 2, 3, 4]))
print(normalizar([10, 20, 30]))
`,
      hints: [
        'As funções embutidas sum(), len(), min() e max() resolvem quase tudo.',
        'Trate o caso max == min antes de dividir.',
      ],
      tests: [
        {
          name: 'Média simples',
          code: `assert media([1, 2, 3, 4]) == 2.5, f"media([1, 2, 3, 4]) deveria ser 2.5, obtive {media([1, 2, 3, 4])}"
assert media([10]) == 10, "A média de um único valor é o próprio valor"`,
        },
        {
          name: 'Normalização min-max',
          code: `r = normalizar([10, 20, 30])
assert r is not None and len(r) == 3, "normalizar deve retornar uma lista do mesmo tamanho"
assert all(abs(a - b) < 1e-9 for a, b in zip(r, [0.0, 0.5, 1.0])), f"Esperava [0.0, 0.5, 1.0], obtive {r}"`,
        },
        {
          name: 'Valores negativos',
          code: `r = normalizar([-1, 0, 1])
assert r is not None and all(abs(a - b) < 1e-9 for a, b in zip(r, [0.0, 0.5, 1.0])), f"Esperava [0.0, 0.5, 1.0], obtive {r}"`,
        },
        {
          name: 'Todos os valores iguais',
          code: `r = normalizar([5, 5, 5])
assert r == [0.0, 0.0, 0.0], f"Esperava [0.0, 0.0, 0.0], obtive {r}"`,
        },
      ],
    },
    {
      id: 'vetores',
      title: 'Vetores, produto escalar e distância',
      summary: 'A matemática por trás de embeddings e vizinhos mais próximos.',
      minutes: 15,
      theory: `
# Vetores: como a IA representa o mundo

Para um modelo, tudo vira **vetor** (uma lista de números): uma imagem vira milhares de pixels, uma palavra vira um *embedding* de centenas de dimensões, um cliente vira \`[idade, renda, compras]\`.

## Produto escalar

~~~
a · b = a1*b1 + a2*b2 + ... + an*bn
~~~

O produto escalar é a operação mais executada em IA: toda camada de uma rede neural é, no fundo, um monte de produtos escalares.

## Norma (tamanho do vetor)

~~~
|a| = raiz(a · a)
~~~

## Distância euclidiana

Mede o quão "longe" dois pontos estão:

~~~
d(a, b) = raiz((a1-b1)² + (a2-b2)² + ... )
~~~

É a base do algoritmo **k-vizinhos mais próximos** que você verá no próximo nível.

## zip()

Para percorrer dois vetores em paralelo:

~~~python
for x, y in zip([1, 2], [3, 4]):
    print(x, y)   # 1 3, depois 2 4
~~~

> Vetores de tamanhos diferentes não podem ser combinados. Em código de produção, é melhor **falhar cedo** com um erro claro do que retornar um resultado errado silenciosamente.
`,
      instructions: `
## Exercício

Implemente, **sem usar numpy** (só Python puro e o módulo \`math\`):

1. \`produto_escalar(a, b)\` — se \`len(a) != len(b)\`, levante \`ValueError\`.
2. \`norma(a)\` — o comprimento do vetor.
3. \`distancia_euclidiana(a, b)\` — a distância entre dois pontos.
`,
      starterCode: `import math


def produto_escalar(a, b):
    # TODO: valide os tamanhos e some a[i] * b[i]
    pass


def norma(a):
    # TODO
    pass


def distancia_euclidiana(a, b):
    # TODO
    pass


print(produto_escalar([1, 2, 3], [4, 5, 6]))   # 32
print(norma([3, 4]))                           # 5.0
print(distancia_euclidiana([0, 0], [3, 4]))    # 5.0
`,
      solution: `import math


def produto_escalar(a, b):
    if len(a) != len(b):
        raise ValueError("Os vetores precisam ter o mesmo tamanho")
    return sum(x * y for x, y in zip(a, b))


def norma(a):
    return math.sqrt(produto_escalar(a, a))


def distancia_euclidiana(a, b):
    if len(a) != len(b):
        raise ValueError("Os vetores precisam ter o mesmo tamanho")
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


print(produto_escalar([1, 2, 3], [4, 5, 6]))   # 32
print(norma([3, 4]))                           # 5.0
print(distancia_euclidiana([0, 0], [3, 4]))    # 5.0
`,
      hints: [
        'sum(x * y for x, y in zip(a, b)) calcula o produto escalar em uma linha.',
        'A norma é a raiz quadrada do produto escalar do vetor com ele mesmo: math.sqrt(...).',
        'Para levantar um erro: raise ValueError("mensagem").',
      ],
      tests: [
        {
          name: 'Produto escalar',
          code: `assert produto_escalar([1, 2, 3], [4, 5, 6]) == 32, "produto_escalar([1,2,3],[4,5,6]) deveria ser 32"
assert produto_escalar([1, 0], [0, 1]) == 0, "Vetores ortogonais têm produto escalar 0"`,
        },
        {
          name: 'Tamanhos diferentes levantam ValueError',
          code: `try:
    produto_escalar([1, 2], [1])
    raise AssertionError("Esperava ValueError para vetores de tamanhos diferentes")
except ValueError:
    pass`,
        },
        {
          name: 'Norma',
          code: `assert norma([3, 4]) is not None and abs(norma([3, 4]) - 5.0) < 1e-9, "norma([3, 4]) deveria ser 5.0"`,
        },
        {
          name: 'Distância euclidiana',
          code: `d = distancia_euclidiana([0, 0], [3, 4])
assert d is not None and abs(d - 5.0) < 1e-9, f"distância deveria ser 5.0, obtive {d}"
d2 = distancia_euclidiana([1, 1, 1], [1, 1, 1])
assert d2 is not None and abs(d2) < 1e-9, "a distância de um ponto para ele mesmo é 0"`,
        },
      ],
    },
  ],
};
