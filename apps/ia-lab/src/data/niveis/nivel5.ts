import type { Level } from '../types';

export const nivel5: Level = {
  id: 'avancado',
  number: 5,
  title: 'Avançado: aplicações com LLMs',
  subtitle: 'Geração, RAG, avaliação e agentes',
  description:
    'Controle a geração com temperatura e top-k, construa um pipeline de RAG, avalie respostas de LLMs e implemente o loop de um agente com ferramentas.',
  lessons: [
    {
      id: 'amostragem',
      title: 'Geração: temperatura e top-k',
      summary: 'Controle a criatividade de um LLM na hora de escolher tokens.',
      minutes: 15,
      packages: ['numpy'],
      theory: `
# Como um LLM escolhe a próxima palavra

A cada passo, o modelo produz **logits** — um número por token do vocabulário. O softmax os converte em probabilidades e então **amostramos** um token.

## Temperatura

Antes do softmax, dividimos os logits pela temperatura \`T\`:

~~~
p = softmax(logits / T)
~~~

| T | Efeito |
|---|---|
| T → 0 | quase determinístico (sempre o token mais provável) |
| T = 1 | distribuição original do modelo |
| T > 1 | mais aleatório/"criativo" (distribuição achatada) |

\`T = 0\` causaria divisão por zero — APIs tratam isso como *greedy decoding*; aqui vamos exigir \`T > 0\`.

## Top-k

Para evitar tokens absurdos da "cauda" da distribuição, mantemos só os \`k\` tokens mais prováveis, zeramos o resto e **renormalizamos** para somar 1.

~~~python
import numpy as np
p = np.array([0.1, 0.6, 0.3])
np.argsort(p)[::-1]        # índices do maior para o menor: [1, 2, 0]
rng = np.random.default_rng()
rng.choice(len(p), p=p)    # amostra um índice
~~~

Existe também o **top-p (nucleus)**, que mantém o menor conjunto de tokens cuja probabilidade acumulada passa de \`p\`.
`,
      instructions: `
## Exercício

1. \`aplicar_temperatura(logits, temperatura)\` — retorna as probabilidades \`softmax(logits / T)\`. Se \`temperatura <= 0\`, levante \`ValueError\`.
2. \`top_k(probs, k)\` — mantém as \`k\` maiores probabilidades, zera as demais e renormaliza (retorne um array do mesmo tamanho).
`,
      starterCode: `import numpy as np


def softmax(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(z - z.max())
    return e / e.sum()


def aplicar_temperatura(logits, temperatura):
    # TODO
    pass


def top_k(probs, k):
    probs = np.asarray(probs, dtype=float)
    # TODO
    pass


logits = [2.0, 1.0, 0.5, -1.0]
for T in (0.2, 1.0, 5.0):
    print(f"T={T}:", np.round(aplicar_temperatura(logits, T), 3))
print("top-2:", top_k([0.5, 0.3, 0.15, 0.05], 2))
`,
      solution: `import numpy as np


def softmax(z):
    z = np.asarray(z, dtype=float)
    e = np.exp(z - z.max())
    return e / e.sum()


def aplicar_temperatura(logits, temperatura):
    if temperatura <= 0:
        raise ValueError("A temperatura deve ser maior que zero")
    return softmax(np.asarray(logits, dtype=float) / temperatura)


def top_k(probs, k):
    probs = np.asarray(probs, dtype=float)
    indices = np.argsort(probs)[::-1][:k]
    filtrado = np.zeros_like(probs)
    filtrado[indices] = probs[indices]
    return filtrado / filtrado.sum()


logits = [2.0, 1.0, 0.5, -1.0]
for T in (0.2, 1.0, 5.0):
    print(f"T={T}:", np.round(aplicar_temperatura(logits, T), 3))
print("top-2:", top_k([0.5, 0.3, 0.15, 0.05], 2))
`,
      hints: [
        'aplicar_temperatura é só softmax(np.asarray(logits) / temperatura), com a validação antes.',
        'top_k: indices = np.argsort(probs)[::-1][:k]; crie np.zeros_like(probs) e copie só esses índices.',
      ],
      tests: [
        {
          name: 'T = 1 é o softmax original',
          code: `import numpy as np
logits = [2.0, 1.0, 0.5]
p = aplicar_temperatura(logits, 1.0)
assert p is not None and np.allclose(p, softmax(logits)), "Com T=1 a distribuição não muda"`,
        },
        {
          name: 'Temperatura baixa concentra, alta achata',
          code: `import numpy as np
frio = aplicar_temperatura([2.0, 1.0, 0.5], 0.1)
quente = aplicar_temperatura([2.0, 1.0, 0.5], 100.0)
assert frio[0] > 0.99, "T baixa deve concentrar quase toda a probabilidade no maior logit"
assert quente.max() - quente.min() < 0.01, "T alta deve deixar a distribuição quase uniforme"`,
        },
        {
          name: 'Temperatura inválida',
          code: `try:
    aplicar_temperatura([1.0, 2.0], 0)
    raise AssertionError("Esperava ValueError para temperatura 0")
except ValueError:
    pass`,
        },
        {
          name: 'Top-k renormaliza',
          code: `import numpy as np
r = top_k([0.5, 0.3, 0.15, 0.05], 2)
assert r is not None and np.allclose(r, [0.625, 0.375, 0.0, 0.0]), f"Esperava [0.625, 0.375, 0, 0], obtive {r}"`,
        },
      ],
    },
    {
      id: 'rag',
      title: 'RAG: recuperação + geração',
      summary: 'Busque os documentos certos e monte o prompt para o LLM.',
      minutes: 25,
      theory: `
# Retrieval-Augmented Generation

LLMs não conhecem seus documentos internos e podem "alucinar". O **RAG** resolve isso em duas etapas:

1. **Recuperação:** encontrar os trechos mais relevantes para a pergunta;
2. **Geração:** enviar esses trechos no prompt e pedir ao LLM que responda **apenas com base neles**.

~~~
pergunta → [buscador] → top-k trechos → prompt → LLM → resposta
~~~

## Buscador TF-IDF

Antes dos embeddings, o padrão era o **TF-IDF** — e ele ainda é muito usado em buscas híbridas:

~~~
tf(t, d)  = ocorrências de t em d / nº de tokens de d
idf(t)    = log((1 + N) / (1 + df(t))) + 1
tfidf     = tf * idf
~~~

Palavras que aparecem em todos os documentos (como "o", "de") recebem idf baixo; termos raros e específicos pesam mais. Depois comparamos a consulta com cada documento pela **similaridade de cosseno**.

No código inicial, as funções de TF-IDF já estão prontas — sua tarefa é usá-las para montar o buscador e o prompt.

## Um bom prompt de RAG

~~~
Responda apenas com base no contexto abaixo. Se a resposta não estiver no contexto, diga que não sabe.

Contexto:
[0] trecho recuperado...
[3] outro trecho...

Pergunta: ...
~~~
`,
      instructions: `
## Exercício

1. \`buscar(consulta, documentos, k=2)\` — retorna a lista com os **índices** dos \`k\` documentos mais similares à consulta (maior similaridade primeiro), usando as funções de TF-IDF fornecidas.
2. \`montar_prompt(pergunta, documentos, k=2)\` — retorna uma string contendo:
   - a frase \`Responda apenas com base no contexto\`;
   - \`Contexto:\` seguido **apenas** dos \`k\` documentos recuperados;
   - \`Pergunta: <pergunta>\`.
`,
      starterCode: `import math
import re
from collections import Counter


def tokenizar(texto):
    return re.findall(r"\\w+", texto.lower())


def calcular_idf(documentos):
    n = len(documentos)
    df = Counter()
    for doc in documentos:
        df.update(set(tokenizar(doc)))
    return {t: math.log((1 + n) / (1 + c)) + 1 for t, c in df.items()}


def vetor_tfidf(texto, idf):
    tokens = tokenizar(texto)
    contagem = Counter(t for t in tokens if t in idf)
    total = len(tokens) or 1
    return {t: (c / total) * idf[t] for t, c in contagem.items()}


def cosseno_esparso(a, b):
    num = sum(v * b.get(t, 0.0) for t, v in a.items())
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    return num / (na * nb) if na and nb else 0.0


def buscar(consulta, documentos, k=2):
    # TODO: calcule o idf, vetorize consulta e documentos e ordene pelo cosseno
    pass


def montar_prompt(pergunta, documentos, k=2):
    # TODO: use buscar() e monte o prompt
    pass


documentos = [
    "O Pyodide executa Python no navegador usando WebAssembly.",
    "Redes neurais são compostas por camadas de neurônios artificiais.",
    "O gradiente descendente ajusta os pesos para minimizar a perda.",
    "Transformers usam atenção para relacionar os tokens de uma sequência.",
    "A capital do Brasil é Brasília.",
]
print(buscar("Como o Python roda no navegador?", documentos))
print(montar_prompt("O que é atenção em transformers?", documentos))
`,
      solution: `import math
import re
from collections import Counter


def tokenizar(texto):
    return re.findall(r"\\w+", texto.lower())


def calcular_idf(documentos):
    n = len(documentos)
    df = Counter()
    for doc in documentos:
        df.update(set(tokenizar(doc)))
    return {t: math.log((1 + n) / (1 + c)) + 1 for t, c in df.items()}


def vetor_tfidf(texto, idf):
    tokens = tokenizar(texto)
    contagem = Counter(t for t in tokens if t in idf)
    total = len(tokens) or 1
    return {t: (c / total) * idf[t] for t, c in contagem.items()}


def cosseno_esparso(a, b):
    num = sum(v * b.get(t, 0.0) for t, v in a.items())
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    return num / (na * nb) if na and nb else 0.0


def buscar(consulta, documentos, k=2):
    idf = calcular_idf(documentos)
    q = vetor_tfidf(consulta, idf)
    notas = [cosseno_esparso(q, vetor_tfidf(doc, idf)) for doc in documentos]
    return sorted(range(len(documentos)), key=lambda i: notas[i], reverse=True)[:k]


def montar_prompt(pergunta, documentos, k=2):
    indices = buscar(pergunta, documentos, k)
    contexto = "\\n".join(f"[{i}] {documentos[i]}" for i in indices)
    return (
        "Responda apenas com base no contexto abaixo. "
        "Se a resposta não estiver no contexto, diga que não sabe.\\n\\n"
        f"Contexto:\\n{contexto}\\n\\n"
        f"Pergunta: {pergunta}"
    )


documentos = [
    "O Pyodide executa Python no navegador usando WebAssembly.",
    "Redes neurais são compostas por camadas de neurônios artificiais.",
    "O gradiente descendente ajusta os pesos para minimizar a perda.",
    "Transformers usam atenção para relacionar os tokens de uma sequência.",
    "A capital do Brasil é Brasília.",
]
print(buscar("Como o Python roda no navegador?", documentos))
print(montar_prompt("O que é atenção em transformers?", documentos))
`,
      hints: [
        'Em buscar: idf = calcular_idf(documentos); q = vetor_tfidf(consulta, idf).',
        'Calcule uma nota por documento e ordene range(len(documentos)) por essa nota, do maior para o menor.',
        'Em montar_prompt, junte os trechos com "\\n".join(...) e use f-strings para o resto.',
      ],
      tests: [
        {
          name: 'Recupera o documento certo',
          code: `docs = [
    "O Pyodide executa Python no navegador usando WebAssembly.",
    "Redes neurais são compostas por camadas de neurônios artificiais.",
    "O gradiente descendente ajusta os pesos para minimizar a perda.",
    "Transformers usam atenção para relacionar os tokens de uma sequência.",
    "A capital do Brasil é Brasília.",
]
r1 = buscar("Como o Python roda no navegador?", docs, k=1)
assert r1 == [0], f"Esperava [0], obtive {r1}"
r2 = buscar("O que é atenção em transformers?", docs, k=1)
assert r2 == [3], f"Esperava [3], obtive {r2}"
r3 = buscar("Qual é a capital do Brasil?", docs, k=1)
assert r3 == [4], f"Esperava [4], obtive {r3}"`,
        },
        {
          name: 'Respeita k e não quebra com termos desconhecidos',
          code: `docs = ["gatos miam", "cães latem", "pássaros cantam"]
r = buscar("gatos", docs, k=3)
assert r is not None and len(r) == 3 and r[0] == 0, f"Esperava 3 índices começando por 0, obtive {r}"
r2 = buscar("xyz", docs, k=2)
assert r2 is not None and len(r2) == 2, "Consulta sem termos conhecidos ainda deve retornar k índices"`,
        },
        {
          name: 'Prompt contém instrução, contexto e pergunta',
          code: `docs = [
    "O Pyodide executa Python no navegador usando WebAssembly.",
    "Redes neurais são compostas por camadas de neurônios artificiais.",
    "O gradiente descendente ajusta os pesos para minimizar a perda.",
    "Transformers usam atenção para relacionar os tokens de uma sequência.",
    "A capital do Brasil é Brasília.",
]
p = montar_prompt("Qual é a capital do Brasil?", docs, k=1)
assert isinstance(p, str), "montar_prompt deve retornar uma string"
assert "Responda apenas com base no contexto" in p, "Falta a instrução de ancoragem no contexto"
assert "Contexto:" in p, "Falta a seção 'Contexto:'"
assert docs[4] in p, "O documento recuperado deve estar no prompt"
assert docs[0] not in p, "Documentos não recuperados não devem entrar no prompt"
assert "Pergunta: Qual é a capital do Brasil?" in p, "Falta a pergunta no formato 'Pergunta: ...'"`,
        },
      ],
    },
    {
      id: 'avaliacao',
      title: 'Avaliação de LLMs: exact match e F1',
      summary: 'Meça objetivamente a qualidade das respostas de um modelo.',
      minutes: 15,
      theory: `
# "Parece bom" não é métrica

Para melhorar um sistema com LLM (trocar o prompt, o modelo, o RAG...) você precisa de um **conjunto de avaliação**: perguntas com respostas de referência e uma métrica automática.

## Normalização

Antes de comparar, normalizamos as respostas para não punir diferenças irrelevantes:

1. minúsculas;
2. remover pontuação (\`string.punctuation\`);
3. remover artigos (\`o, a, os, as, um, uma, uns, umas\`);
4. colapsar espaços.

~~~
"A capital é Brasília!"  →  "capital é brasília"
~~~

## Exact Match (EM)

\`1.0\` se as respostas normalizadas forem idênticas, senão \`0.0\`. Rigoroso demais para respostas longas.

## F1 por tokens

Compara os **tokens em comum** (contando repetições):

~~~
precisão = comuns / tokens_previstos
recall   = comuns / tokens_referência
F1       = 2 * P * R / (P + R)
~~~

~~~python
from collections import Counter
comuns = Counter(["a", "b", "b"]) & Counter(["b", "b", "c"])   # Counter({'b': 2})
sum(comuns.values())   # 2
~~~

Casos-limite: se **ambas** forem vazias após normalizar, F1 = 1.0; se só uma for vazia, F1 = 0.0.

> Em produção, combine métricas automáticas com **LLM-as-a-judge** e revisão humana amostral.
`,
      instructions: `
## Exercício

1. \`normalizar_resposta(texto)\`
2. \`exact_match(previsto, referencia)\` → \`float\`
3. \`f1_tokens(previsto, referencia)\` → \`float\`
4. \`avaliar(pares)\` — recebe uma lista de tuplas \`(previsto, referencia)\` e retorna \`{"exact_match": média, "f1": média}\`.
`,
      starterCode: `import string
from collections import Counter

ARTIGOS = {"o", "a", "os", "as", "um", "uma", "uns", "umas"}


def normalizar_resposta(texto):
    # TODO: minúsculas, sem pontuação, sem artigos, espaços colapsados
    pass


def exact_match(previsto, referencia):
    # TODO
    pass


def f1_tokens(previsto, referencia):
    # TODO
    pass


def avaliar(pares):
    # TODO
    pass


print(normalizar_resposta("A capital é Brasília!"))
print(f1_tokens("a capital é Brasília", "Brasília"))
`,
      solution: `import string
from collections import Counter

ARTIGOS = {"o", "a", "os", "as", "um", "uma", "uns", "umas"}


def normalizar_resposta(texto):
    texto = texto.lower()
    texto = "".join(c for c in texto if c not in string.punctuation)
    return " ".join(t for t in texto.split() if t not in ARTIGOS)


def exact_match(previsto, referencia):
    return float(normalizar_resposta(previsto) == normalizar_resposta(referencia))


def f1_tokens(previsto, referencia):
    p = normalizar_resposta(previsto).split()
    r = normalizar_resposta(referencia).split()
    if not p and not r:
        return 1.0
    if not p or not r:
        return 0.0
    comuns = sum((Counter(p) & Counter(r)).values())
    if comuns == 0:
        return 0.0
    precisao = comuns / len(p)
    recall = comuns / len(r)
    return 2 * precisao * recall / (precisao + recall)


def avaliar(pares):
    n = len(pares)
    return {
        "exact_match": sum(exact_match(p, r) for p, r in pares) / n,
        "f1": sum(f1_tokens(p, r) for p, r in pares) / n,
    }


print(normalizar_resposta("A capital é Brasília!"))
print(f1_tokens("a capital é Brasília", "Brasília"))
`,
      hints: [
        'Remova a pontuação com "".join(c for c in texto if c not in string.punctuation).',
        'Depois de split(), filtre os tokens que estão em ARTIGOS e junte com " ".join(...).',
        'Para os tokens em comum: sum((Counter(p) & Counter(r)).values()).',
      ],
      tests: [
        {
          name: 'Normalização',
          code: `r = normalizar_resposta("A capital é   Brasília!")
assert r == "capital é brasília", f"Esperava 'capital é brasília', obtive {r!r}"`,
        },
        {
          name: 'Exact match',
          code: `assert exact_match("Brasília.", "brasília") == 1.0, "Devem ser iguais após normalizar"
assert exact_match("São Paulo", "Brasília") == 0.0, "Respostas diferentes → 0.0"`,
        },
        {
          name: 'F1 por tokens',
          code: `v = f1_tokens("a capital é Brasília", "Brasília")
assert v is not None and abs(v - 0.5) < 1e-9, f"P=1/3, R=1 → F1=0.5; obtive {v}"
assert f1_tokens("", "") == 1.0, "Duas respostas vazias → 1.0"
assert f1_tokens("algo", "") == 0.0, "Só uma vazia → 0.0"
assert f1_tokens("gato", "cachorro") == 0.0, "Nenhum token em comum → 0.0"`,
        },
        {
          name: 'Avaliação agregada',
          code: `r = avaliar([("Brasília", "Brasília"), ("a capital é Brasília", "Brasília")])
assert r is not None and abs(r["exact_match"] - 0.5) < 1e-9, f"EM médio deveria ser 0.5, obtive {r}"
assert abs(r["f1"] - 0.75) < 1e-9, f"F1 médio deveria ser 0.75, obtive {r}"`,
        },
      ],
    },
    {
      id: 'agentes',
      title: 'Agentes: LLMs que usam ferramentas',
      summary: 'Implemente o loop de um agente que chama ferramentas.',
      minutes: 25,
      theory: `
# De chatbot a agente

Um **agente** é um LLM em um loop: ele pode decidir **chamar ferramentas** (calculadora, busca, APIs, banco de dados), observar o resultado e continuar raciocinando até ter a resposta final.

~~~
usuário → LLM ──(chamada de ferramenta)──▶ ferramenta
            ▲                                  │
            └──────────(resultado)─────────────┘
          ... até o LLM emitir a resposta final
~~~

## Protocolo (simplificado)

O modelo responde **JSON** em um de dois formatos:

~~~json
{"ferramenta": "calculadora", "argumentos": {"a": 12, "b": 30, "operacao": "soma"}}
{"resposta_final": "O total é 42"}
~~~

O agente mantém um **histórico** de mensagens (\`papel\` + \`conteudo\`) que é enviado ao modelo a cada passo:

~~~python
[
  {"papel": "usuario",    "conteudo": "Quanto é 12 + 30?"},
  {"papel": "assistente", "conteudo": "{\\"ferramenta\\": \\"calculadora\\", ...}"},
  {"papel": "ferramenta", "conteudo": "{\\"resultado\\": 42}"},
]
~~~

## Robustez

Agentes reais precisam lidar com:

- JSON malformado vindo do modelo;
- ferramentas inexistentes (o modelo "inventa" nomes);
- erros dentro da ferramenta (ex.: divisão por zero);
- **loops infinitos** → sempre imponha um limite de passos.

Em vez de derrubar o programa, devolva o erro ao modelo como observação (\`{"erro": "..."}\`) para que ele possa se corrigir.

> Aqui o "LLM" é uma função Python que simula o modelo — assim você testa a lógica do agente de forma determinística, exatamente como se faz em testes de produção.
`,
      instructions: `
## Exercício

1. \`executar_chamada(resposta_modelo, ferramentas)\` — recebe a string JSON do modelo e um \`dict\` \`{nome: função}\`. Retorna:
   - \`{"resultado": valor}\` em caso de sucesso (\`ferramentas[nome](**argumentos)\`);
   - \`{"erro": "..."}\` se o JSON for inválido, a ferramenta não existir ou a ferramenta levantar uma exceção.
2. \`agente(pergunta, modelo, ferramentas, max_passos=5)\` — o loop:
   - histórico começa com \`{"papel": "usuario", "conteudo": pergunta}\`;
   - a cada passo chame \`modelo(historico)\`; se o JSON tiver \`"resposta_final"\`, retorne esse valor;
   - senão, execute a chamada e acrescente ao histórico a mensagem do \`"assistente"\` (a saída do modelo) e a da \`"ferramenta"\` (\`json.dumps\` do resultado);
   - se estourar \`max_passos\`, retorne \`"Limite de passos atingido"\`.
`,
      starterCode: `import json


def calculadora(a, b, operacao):
    if operacao == "soma":
        return a + b
    if operacao == "subtracao":
        return a - b
    if operacao == "multiplicacao":
        return a * b
    if operacao == "divisao":
        if b == 0:
            raise ValueError("divisão por zero")
        return a / b
    raise ValueError(f"operação desconhecida: {operacao}")


def executar_chamada(resposta_modelo, ferramentas):
    # TODO: json.loads com tratamento de erro, valide a ferramenta e execute
    pass


def agente(pergunta, modelo, ferramentas, max_passos=5):
    historico = [{"papel": "usuario", "conteudo": pergunta}]
    # TODO: implemente o loop do agente
    return "Limite de passos atingido"


# Um "LLM" falso e determinístico para testar o agente
def modelo_falso(historico):
    observacoes = [m for m in historico if m["papel"] == "ferramenta"]
    if not observacoes:
        return json.dumps({"ferramenta": "calculadora", "argumentos": {"a": 12, "b": 30, "operacao": "soma"}})
    resultado = json.loads(observacoes[-1]["conteudo"])["resultado"]
    return json.dumps({"resposta_final": f"O total é {resultado}"})


print(agente("Quanto é 12 + 30?", modelo_falso, {"calculadora": calculadora}))
`,
      solution: `import json


def calculadora(a, b, operacao):
    if operacao == "soma":
        return a + b
    if operacao == "subtracao":
        return a - b
    if operacao == "multiplicacao":
        return a * b
    if operacao == "divisao":
        if b == 0:
            raise ValueError("divisão por zero")
        return a / b
    raise ValueError(f"operação desconhecida: {operacao}")


def executar_chamada(resposta_modelo, ferramentas):
    try:
        chamada = json.loads(resposta_modelo)
    except json.JSONDecodeError:
        return {"erro": "JSON inválido"}
    nome = chamada.get("ferramenta")
    if nome not in ferramentas:
        return {"erro": f"Ferramenta desconhecida: {nome}"}
    try:
        return {"resultado": ferramentas[nome](**chamada.get("argumentos", {}))}
    except Exception as e:
        return {"erro": str(e)}


def agente(pergunta, modelo, ferramentas, max_passos=5):
    historico = [{"papel": "usuario", "conteudo": pergunta}]
    for _ in range(max_passos):
        saida = modelo(historico)
        try:
            dados = json.loads(saida)
        except json.JSONDecodeError:
            dados = {}
        if "resposta_final" in dados:
            return dados["resposta_final"]
        resultado = executar_chamada(saida, ferramentas)
        historico.append({"papel": "assistente", "conteudo": saida})
        historico.append({"papel": "ferramenta", "conteudo": json.dumps(resultado)})
    return "Limite de passos atingido"


# Um "LLM" falso e determinístico para testar o agente
def modelo_falso(historico):
    observacoes = [m for m in historico if m["papel"] == "ferramenta"]
    if not observacoes:
        return json.dumps({"ferramenta": "calculadora", "argumentos": {"a": 12, "b": 30, "operacao": "soma"}})
    resultado = json.loads(observacoes[-1]["conteudo"])["resultado"]
    return json.dumps({"resposta_final": f"O total é {resultado}"})


print(agente("Quanto é 12 + 30?", modelo_falso, {"calculadora": calculadora}))
`,
      hints: [
        'Envolva json.loads em try/except json.JSONDecodeError.',
        'Verifique se chamada.get("ferramenta") está em ferramentas antes de chamar ferramentas[nome](**argumentos).',
        'No agente, use for _ in range(max_passos) e retorne assim que encontrar "resposta_final".',
      ],
      tests: [
        {
          name: 'Executa uma chamada válida',
          code: `import json
r = executar_chamada(json.dumps({"ferramenta": "calculadora", "argumentos": {"a": 6, "b": 7, "operacao": "multiplicacao"}}), {"calculadora": calculadora})
assert r == {"resultado": 42}, f"Esperava {{'resultado': 42}}, obtive {r}"`,
        },
        {
          name: 'Trata erros sem quebrar',
          code: `import json
f = {"calculadora": calculadora}
r1 = executar_chamada("isso não é json", f)
assert isinstance(r1, dict) and "erro" in r1, "JSON inválido deve retornar {'erro': ...}"
r2 = executar_chamada(json.dumps({"ferramenta": "clima", "argumentos": {}}), f)
assert isinstance(r2, dict) and "erro" in r2, "Ferramenta inexistente deve retornar {'erro': ...}"
r3 = executar_chamada(json.dumps({"ferramenta": "calculadora", "argumentos": {"a": 1, "b": 0, "operacao": "divisao"}}), f)
assert isinstance(r3, dict) and "erro" in r3, "Exceções da ferramenta devem virar {'erro': ...}"`,
        },
        {
          name: 'Loop do agente chega à resposta final',
          code: `import json
def modelo_teste(historico):
    obs = [m for m in historico if m["papel"] == "ferramenta"]
    if len(obs) == 0:
        return json.dumps({"ferramenta": "calculadora", "argumentos": {"a": 10, "b": 4, "operacao": "subtracao"}})
    if len(obs) == 1:
        anterior = json.loads(obs[0]["conteudo"])["resultado"]
        return json.dumps({"ferramenta": "calculadora", "argumentos": {"a": anterior, "b": 5, "operacao": "multiplicacao"}})
    return json.dumps({"resposta_final": f"Resultado: {json.loads(obs[-1]['conteudo'])['resultado']}"})
r = agente("(10 - 4) * 5", modelo_teste, {"calculadora": calculadora})
assert r == "Resultado: 30", f"Esperava 'Resultado: 30', obtive {r!r}"`,
        },
        {
          name: 'Histórico no formato correto',
          code: `import json
vistos = []
def modelo_espiao(historico):
    vistos.append([dict(m) for m in historico])
    if len(historico) == 1:
        return json.dumps({"ferramenta": "calculadora", "argumentos": {"a": 1, "b": 2, "operacao": "soma"}})
    return json.dumps({"resposta_final": "ok"})
agente("1 + 2", modelo_espiao, {"calculadora": calculadora})
assert len(vistos) == 2, "O modelo deveria ter sido chamado 2 vezes"
h = vistos[1]
assert [m["papel"] for m in h] == ["usuario", "assistente", "ferramenta"], f"Papéis no histórico: {[m['papel'] for m in h]}"
assert json.loads(h[2]["conteudo"]) == {"resultado": 3}, "A mensagem da ferramenta deve ser json.dumps do resultado"`,
        },
        {
          name: 'Respeita o limite de passos',
          code: `import json
def modelo_teimoso(historico):
    return json.dumps({"ferramenta": "calculadora", "argumentos": {"a": 1, "b": 1, "operacao": "soma"}})
r = agente("loop", modelo_teimoso, {"calculadora": calculadora}, max_passos=3)
assert r == "Limite de passos atingido", f"Obtive {r!r}"`,
        },
      ],
    },
  ],
};
