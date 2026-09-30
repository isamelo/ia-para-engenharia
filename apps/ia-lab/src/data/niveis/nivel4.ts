import type { Level } from '../types';

export const nivel4: Level = {
  id: 'nlp-llms',
  number: 4,
  title: 'NLP e LLMs',
  subtitle: 'Como máquinas leem texto',
  description:
    'Tokenização, subpalavras (BPE), embeddings e o mecanismo de atenção — as peças que formam um Transformer.',
  lessons: [
    {
      id: 'tokenizacao',
      title: 'Tokenização e vocabulário',
      summary: 'Transforme texto em números que um modelo consegue processar.',
      minutes: 12,
      theory: `
# Texto → tokens → números

Modelos não leem letras: eles recebem **IDs de tokens**. O pipeline é:

~~~
"Olá, mundo!"  →  ["olá", "mundo"]  →  [7, 42]
    texto            tokens            IDs
~~~

## Tokenização por palavras

A forma mais simples: converter para minúsculas e extrair sequências de caracteres alfanuméricos. Com expressões regulares:

~~~python
import re
re.findall(r"\\w+", "Olá, mundo! IA 2025".lower())
# ['olá', 'mundo', 'ia', '2025']
~~~

Em Python 3, \`\\w\` reconhece letras acentuadas — importante para o português.

## Vocabulário

O **vocabulário** mapeia cada token para um ID inteiro. Palavras que o modelo nunca viu viram um token especial \`<unk>\` (desconhecido). Neste exercício, \`<unk>\` terá o ID 0 e os demais tokens recebem IDs na **ordem da primeira aparição**.

~~~python
vocab = {"<unk>": 0, "o": 1, "gato": 2}
vocab.get("cachorro", vocab["<unk>"])   # 0
~~~

> O problema do \`<unk>\`: todo nome próprio, gíria ou erro de digitação novo perde a informação. Na próxima lição você verá como LLMs resolvem isso com **subpalavras**.
`,
      instructions: `
## Exercício

1. \`tokenizar(texto)\` — minúsculas + \`re.findall(r"\\w+", ...)\`.
2. \`construir_vocab(textos)\` — recebe uma lista de textos e retorna um \`dict\` com \`"<unk>": 0\` e os demais tokens com IDs 1, 2, 3... na ordem da primeira aparição.
3. \`codificar(texto, vocab)\` — retorna a lista de IDs; tokens fora do vocabulário viram o ID de \`<unk>\`.
`,
      starterCode: `import re


def tokenizar(texto):
    # TODO
    pass


def construir_vocab(textos):
    vocab = {"<unk>": 0}
    # TODO: percorra os textos e adicione tokens novos
    return vocab


def codificar(texto, vocab):
    # TODO
    pass


vocab = construir_vocab(["O gato subiu no telhado", "O cão latiu"])
print(vocab)
print(codificar("o gato latiu para o carteiro", vocab))
`,
      solution: `import re


def tokenizar(texto):
    return re.findall(r"\\w+", texto.lower())


def construir_vocab(textos):
    vocab = {"<unk>": 0}
    for texto in textos:
        for token in tokenizar(texto):
            if token not in vocab:
                vocab[token] = len(vocab)
    return vocab


def codificar(texto, vocab):
    return [vocab.get(token, vocab["<unk>"]) for token in tokenizar(texto)]


vocab = construir_vocab(["O gato subiu no telhado", "O cão latiu"])
print(vocab)
print(codificar("o gato latiu para o carteiro", vocab))
`,
      hints: [
        'tokenizar: return re.findall(r"\\w+", texto.lower())',
        'Ao adicionar um token novo, o próximo ID é simplesmente len(vocab).',
        'dict.get(chave, padrao) retorna o padrão quando a chave não existe.',
      ],
      tests: [
        {
          name: 'Tokeniza com acentos e pontuação',
          code: `r = tokenizar("Olá, mundo! A IA chegou.")
assert r == ["olá", "mundo", "a", "ia", "chegou"], f"Obtive {r}"`,
        },
        {
          name: 'Vocabulário na ordem de aparição',
          code: `v = construir_vocab(["o gato", "o cão"])
assert v == {"<unk>": 0, "o": 1, "gato": 2, "cão": 3}, f"Obtive {v}"`,
        },
        {
          name: 'Codifica usando <unk>',
          code: `v = construir_vocab(["o gato", "o cão"])
r = codificar("O gato voa", v)
assert r == [1, 2, 0], f"Esperava [1, 2, 0], obtive {r}"`,
        },
      ],
    },
    {
      id: 'bpe',
      title: 'Subpalavras com BPE',
      summary: 'O algoritmo de tokenização usado por GPT e companhia.',
      minutes: 20,
      theory: `
# Byte Pair Encoding (BPE)

LLMs modernos usam tokens de **subpalavras**: palavras comuns viram um token só, e palavras raras são quebradas em pedaços (\`"inteligentíssimo"\` → \`"intelig" + "ent" + "íssimo"\`). Assim nunca há \`<unk>\`.

## O algoritmo

1. Comece com cada **caractere** como um token.
2. Conte todos os **pares adjacentes** de tokens.
3. **Mescle** o par mais frequente em um novo token.
4. Repita os passos 2–3 por \`n\` mesclas.

~~~
"aaabdaaabac"
a a a b d a a a b a c      par mais frequente: (a, a)
aa a b d aa a b a c        par mais frequente: (aa, a)
aaa b d aaa b a c
~~~

## Detalhes importantes

- A mesclagem percorre a sequência da **esquerda para a direita** sem sobreposição: mesclar \`(a, a)\` em \`a a a\` resulta em \`aa a\`.
- **Empate**: escolha o par que aparece **primeiro** na sequência. (\`Counter\` preserva a ordem de inserção e \`max\` retorna o primeiro máximo.)

~~~python
from collections import Counter
tokens = ["a", "b", "a", "b"]
list(zip(tokens, tokens[1:]))   # [('a','b'), ('b','a'), ('a','b')]
~~~
`,
      instructions: `
## Exercício

1. \`par_mais_frequente(tokens)\` — retorna a tupla do par adjacente mais frequente (empate: o que aparece primeiro) ou \`None\` se houver menos de 2 tokens.
2. \`mesclar(tokens, par)\` — retorna uma **nova** lista substituindo cada ocorrência do par pela concatenação, da esquerda para a direita, sem sobreposição.
3. \`bpe(texto, n_mesclas)\` — aplica o algoritmo começando por \`list(texto)\`; pare antes se não houver mais pares.
`,
      starterCode: `from collections import Counter


def par_mais_frequente(tokens):
    # TODO
    pass


def mesclar(tokens, par):
    novo = []
    i = 0
    # TODO: percorra tokens; se (tokens[i], tokens[i+1]) == par, junte e pule 2
    return novo


def bpe(texto, n_mesclas):
    tokens = list(texto)
    # TODO
    return tokens


print(par_mais_frequente(list("abababc")))
print(mesclar(list("abababc"), ("a", "b")))
print(bpe("aaabdaaabac", 2))
`,
      solution: `from collections import Counter


def par_mais_frequente(tokens):
    pares = Counter(zip(tokens, tokens[1:]))
    if not pares:
        return None
    return max(pares, key=pares.get)


def mesclar(tokens, par):
    novo = []
    i = 0
    while i < len(tokens):
        if i < len(tokens) - 1 and (tokens[i], tokens[i + 1]) == par:
            novo.append(tokens[i] + tokens[i + 1])
            i += 2
        else:
            novo.append(tokens[i])
            i += 1
    return novo


def bpe(texto, n_mesclas):
    tokens = list(texto)
    for _ in range(n_mesclas):
        par = par_mais_frequente(tokens)
        if par is None:
            break
        tokens = mesclar(tokens, par)
    return tokens


print(par_mais_frequente(list("abababc")))
print(mesclar(list("abababc"), ("a", "b")))
print(bpe("aaabdaaabac", 2))
`,
      hints: [
        'Counter(zip(tokens, tokens[1:])) conta todos os pares adjacentes.',
        'max(pares, key=pares.get) devolve o par com maior contagem (o primeiro, em caso de empate).',
        'Em mesclar, use um while com índice i: avance 2 posições quando mesclar e 1 caso contrário.',
      ],
      tests: [
        {
          name: 'Par mais frequente',
          code: `r = par_mais_frequente(list("abababc"))
assert r == ("a", "b"), f"Esperava ('a', 'b'), obtive {r}"
assert par_mais_frequente(["a"]) is None, "Com menos de 2 tokens, retorne None"`,
        },
        {
          name: 'Mescla da esquerda para a direita',
          code: `r = mesclar(list("abababc"), ("a", "b"))
assert r == ["ab", "ab", "ab", "c"], f"Obtive {r}"
r2 = mesclar(["a", "a", "a"], ("a", "a"))
assert r2 == ["aa", "a"], f"Sem sobreposição: esperava ['aa', 'a'], obtive {r2}"`,
        },
        {
          name: 'BPE completo',
          code: `r = bpe("aaabdaaabac", 2)
assert r == ["aaa", "b", "d", "aaa", "b", "a", "c"], f"Obtive {r}"
r2 = bpe("ab", 10)
assert r2 == ["ab"], f"Deve parar quando não houver mais pares; obtive {r2}"`,
        },
      ],
    },
    {
      id: 'embeddings',
      title: 'Embeddings e similaridade de cosseno',
      summary: 'Encontre significados parecidos medindo ângulos entre vetores.',
      minutes: 15,
      packages: ['numpy'],
      theory: `
# Embeddings: significado como geometria

Um **embedding** é um vetor que representa o *significado* de um token, frase ou documento. Modelos são treinados para que textos parecidos fiquem **próximos** no espaço vetorial:

~~~
"rei"    → [0.90, 0.80, 0.10]
"rainha" → [0.85, 0.90, 0.15]
"maçã"   → [0.10, 0.05, 0.95]
~~~

(Embeddings reais têm de 384 a mais de 3.000 dimensões.)

## Similaridade de cosseno

Em vez da distância, normalmente medimos o **ângulo** entre os vetores:

~~~
cos(a, b) = (a · b) / (|a| * |b|)
~~~

- \`1\` → mesma direção (muito similares)
- \`0\` → ortogonais (sem relação)
- \`-1\` → direções opostas

~~~python
import numpy as np
a = np.array([1.0, 2.0])
np.linalg.norm(a)   # 2.236...
~~~

É assim que funcionam **busca semântica** e **bancos vetoriais**: transformamos a consulta em embedding e procuramos os vetores com maior cosseno.
`,
      instructions: `
## Exercício

1. \`cosseno(a, b)\` — similaridade de cosseno como \`float\` (aceite listas ou arrays).
2. \`mais_similares(consulta, embeddings, k=1)\` — \`embeddings\` é um \`dict\` \`{nome: vetor}\`; retorne a **lista** com os \`k\` nomes mais similares à consulta, do mais para o menos similar.
`,
      starterCode: `import numpy as np


def cosseno(a, b):
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    # TODO
    pass


def mais_similares(consulta, embeddings, k=1):
    # TODO: ordene os nomes pelo cosseno com a consulta (maior primeiro)
    pass


embeddings = {
    "rei": [0.9, 0.8, 0.1],
    "rainha": [0.85, 0.9, 0.15],
    "maçã": [0.1, 0.05, 0.95],
    "banana": [0.15, 0.1, 0.9],
}
print(cosseno(embeddings["rei"], embeddings["rainha"]))
print(mais_similares([0.1, 0.1, 1.0], embeddings, k=2))
`,
      solution: `import numpy as np


def cosseno(a, b):
    a = np.asarray(a, dtype=float)
    b = np.asarray(b, dtype=float)
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)))


def mais_similares(consulta, embeddings, k=1):
    nomes = sorted(embeddings, key=lambda nome: cosseno(consulta, embeddings[nome]), reverse=True)
    return nomes[:k]


embeddings = {
    "rei": [0.9, 0.8, 0.1],
    "rainha": [0.85, 0.9, 0.15],
    "maçã": [0.1, 0.05, 0.95],
    "banana": [0.15, 0.1, 0.9],
}
print(cosseno(embeddings["rei"], embeddings["rainha"]))
print(mais_similares([0.1, 0.1, 1.0], embeddings, k=2))
`,
      hints: [
        'cosseno: a @ b / (np.linalg.norm(a) * np.linalg.norm(b))',
        'sorted(embeddings, key=..., reverse=True) ordena as chaves do dicionário.',
      ],
      tests: [
        {
          name: 'Casos básicos do cosseno',
          code: `c1, c2, c3 = cosseno([1, 0], [0, 1]), cosseno([1, 2], [2, 4]), cosseno([1, 0], [-1, 0])
assert c1 is not None and abs(c1) < 1e-9, "Vetores ortogonais: cosseno 0"
assert abs(c2 - 1) < 1e-9, "Vetores na mesma direção: cosseno 1"
assert abs(c3 + 1) < 1e-9, "Vetores opostos: cosseno -1"`,
        },
        {
          name: 'Busca semântica: frutas',
          code: `emb = {"rei": [0.9, 0.8, 0.1], "rainha": [0.85, 0.9, 0.15], "maçã": [0.1, 0.05, 0.95], "banana": [0.15, 0.1, 0.9]}
r = mais_similares([0.1, 0.1, 1.0], emb, k=2)
assert r == ["maçã", "banana"], f"Esperava ['maçã', 'banana'], obtive {r}"`,
        },
        {
          name: 'Busca semântica: realeza',
          code: `emb = {"rei": [0.9, 0.8, 0.1], "rainha": [0.85, 0.9, 0.15], "maçã": [0.1, 0.05, 0.95], "banana": [0.15, 0.1, 0.9]}
r = mais_similares([1.0, 0.9, 0.1], emb)
assert r == ["rei"], f"Esperava ['rei'], obtive {r}"`,
        },
      ],
    },
    {
      id: 'atencao',
      title: 'Atenção: o coração do Transformer',
      summary: 'Implemente scaled dot-product attention com máscara causal.',
      minutes: 25,
      packages: ['numpy'],
      theory: `
# "Attention is all you need"

No Transformer, cada token "olha" para os outros tokens da sequência e decide **em quais prestar atenção**. Cada token gera três vetores:

- **Q** (query): o que estou procurando?
- **K** (key): o que eu ofereço?
- **V** (value): a informação que eu carrego.

## Scaled dot-product attention

~~~
pesos = softmax( Q @ K.T / sqrt(d) )
saída = pesos @ V
~~~

- \`Q @ K.T\` dá uma matriz \`(n, n)\` de afinidades entre todos os pares de tokens;
- dividir por \`sqrt(d)\` (d = dimensão das queries) evita que o softmax sature;
- o softmax é aplicado **por linha**: cada token distribui 100% da sua atenção.

## Máscara causal

Em modelos que geram texto (GPT), um token **não pode ver o futuro**. Antes do softmax, colocamos \`-inf\` acima da diagonal:

~~~
     t0    t1    t2
t0 [ s00  -inf  -inf ]
t1 [ s10   s11  -inf ]
t2 [ s20   s21   s22 ]
~~~

Como \`exp(-inf) = 0\`, essas posições recebem peso zero.

~~~python
import numpy as np
np.triu(np.ones((3, 3), dtype=bool), k=1)   # True acima da diagonal
np.where(mascara, -np.inf, scores)
x.max(axis=-1, keepdims=True)               # máximo por linha
~~~
`,
      instructions: `
## Exercício

1. \`softmax(z)\` — softmax estável aplicado **na última dimensão** (por linha).
2. \`atencao(Q, K, V, causal=False)\` — retorna a tupla \`(saida, pesos)\`:
   - \`pesos\` com shape \`(n, m)\` e cada linha somando 1;
   - \`saida = pesos @ V\`;
   - se \`causal=True\`, aplique a máscara causal antes do softmax.
`,
      starterCode: `import numpy as np


def softmax(z):
    # TODO: softmax estável por linha (axis=-1, keepdims=True)
    pass


def atencao(Q, K, V, causal=False):
    d = Q.shape[-1]
    # TODO: scores, máscara (se causal), pesos e saída
    pass


rng = np.random.default_rng(0)
Q, K, V = rng.normal(size=(3, 4)), rng.normal(size=(3, 4)), rng.normal(size=(3, 2))
saida, pesos = atencao(Q, K, V, causal=True)
print("pesos de atenção:")
print(np.round(pesos, 3))
`,
      solution: `import numpy as np


def softmax(z):
    z = z - z.max(axis=-1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=-1, keepdims=True)


def atencao(Q, K, V, causal=False):
    d = Q.shape[-1]
    scores = Q @ K.T / np.sqrt(d)
    if causal:
        n = scores.shape[0]
        mascara = np.triu(np.ones((n, n), dtype=bool), k=1)
        scores = np.where(mascara, -np.inf, scores)
    pesos = softmax(scores)
    return pesos @ V, pesos


rng = np.random.default_rng(0)
Q, K, V = rng.normal(size=(3, 4)), rng.normal(size=(3, 4)), rng.normal(size=(3, 2))
saida, pesos = atencao(Q, K, V, causal=True)
print("pesos de atenção:")
print(np.round(pesos, 3))
`,
      hints: [
        'scores = Q @ K.T / np.sqrt(d)',
        'Máscara: np.triu(np.ones((n, n), dtype=bool), k=1) e depois np.where(mascara, -np.inf, scores).',
        'No softmax, use z.max(axis=-1, keepdims=True) e e.sum(axis=-1, keepdims=True).',
      ],
      tests: [
        {
          name: 'Softmax por linha',
          code: `import numpy as np
p = softmax(np.array([[1.0, 2.0, 3.0], [1000.0, 1000.0, 1000.0]]))
assert p is not None and p.shape == (2, 3), "softmax deve preservar o shape"
assert np.allclose(p.sum(axis=-1), 1.0), "Cada linha deve somar 1"
assert np.allclose(p[1], [1 / 3, 1 / 3, 1 / 3]), "Logits iguais → probabilidades iguais (sem nan)"`,
        },
        {
          name: 'Atenção confere com a referência',
          code: `import numpy as np
rng = np.random.default_rng(7)
Q, K, V = rng.normal(size=(4, 8)), rng.normal(size=(4, 8)), rng.normal(size=(4, 5))
r = atencao(Q, K, V)
assert r is not None, "atencao retornou None"
saida, pesos = r
s = Q @ K.T / np.sqrt(8)
ref_p = np.exp(s - s.max(axis=1, keepdims=True))
ref_p = ref_p / ref_p.sum(axis=1, keepdims=True)
assert pesos.shape == (4, 4) and saida.shape == (4, 5), "Shapes incorretos"
assert np.allclose(pesos, ref_p), "Pesos de atenção incorretos (lembrou de dividir por sqrt(d)?)"
assert np.allclose(saida, ref_p @ V), "Saída incorreta"`,
        },
        {
          name: 'Máscara causal',
          code: `import numpy as np
rng = np.random.default_rng(3)
Q, K, V = rng.normal(size=(4, 8)), rng.normal(size=(4, 8)), rng.normal(size=(4, 5))
r = atencao(Q, K, V, causal=True)
assert r is not None, "atencao retornou None"
saida, pesos = r
assert np.allclose(np.triu(pesos, k=1), 0), "Tokens não podem prestar atenção no futuro"
assert np.allclose(pesos.sum(axis=-1), 1.0), "Cada linha deve somar 1"
assert np.allclose(saida[0], V[0]), "O primeiro token só pode ver a si mesmo"`,
        },
      ],
    },
  ],
};
