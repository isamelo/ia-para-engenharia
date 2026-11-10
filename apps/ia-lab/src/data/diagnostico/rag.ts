import { py } from "../py";
import type { Desafio } from "../types";

const BASE_OCULTA = py`
_docs = [
    {"id": "tarifa-2023", "texto": "A tarifa de antecipação é de 3,2% ao mês.", "status": "revogado"},
    {"id": "tarifa-2025", "texto": "A tarifa de antecipação é de 2,4% ao mês.", "status": "vigente"},
    {"id": "chargeback", "texto": "A contestação de uma venda deve ser respondida em até 7 dias.", "status": "vigente"},
    {"id": "maquininha", "texto": "A troca da maquininha com defeito é gratuita no primeiro ano.", "status": "vigente"},
]
`;

export const itemRag: Desafio = {
  id: "diag-rag",
  capacidade: "rag",
  titulo: "A busca não encontra o que está na base",
  minutos: 3,
  briefing: `
A busca da central de ajuda devolve documentos que não têm relação com a pergunta e já respondeu com uma tabela de tarifas revogada. A base está em \`DOCS\`; cada documento tem \`id\`, \`texto\` e \`status\` (\`vigente\` ou \`revogado\`).

O cenário traz \`termos(texto)\`, que devolve o conjunto de palavras de um texto sem acentos, sem pontuação, em minúsculas e sem palavras vazias.

Corrija \`buscar(pergunta, docs, k)\` para que ela:

- encontre o documento certo mesmo quando a pergunta difere do texto em maiúsculas, acentos e pontuação;
- nunca devolva documento revogado;
- devolva lista vazia quando nenhum documento tiver relação com a pergunta.
`,
  cenario: py`
import re
import unicodedata

PALAVRAS_VAZIAS = {"a", "o", "as", "os", "de", "da", "do", "das", "dos", "e", "em", "para", "por", "com", "um", "uma",
                   "que", "qual", "quais", "como", "no", "na", "nos", "nas", "ao", "se", "eu", "meu", "minha"}


def termos(texto):
    """Palavras do texto, sem acento, em minúsculas e sem palavras vazias."""
    sem_acento = unicodedata.normalize("NFD", texto.lower())
    sem_acento = "".join(c for c in sem_acento if unicodedata.category(c) != "Mn")
    return {p for p in re.findall(r"[a-z0-9]+", sem_acento) if p not in PALAVRAS_VAZIAS}


DOCS = [
    {"id": "repasse-2023", "texto": "O repasse das vendas no crédito ocorre em 30 dias.", "status": "revogado"},
    {"id": "repasse-2025", "texto": "O repasse das vendas no crédito ocorre em 2 dias úteis.", "status": "vigente"},
    {"id": "estorno", "texto": "O estorno de uma venda pode ser pedido em até 90 dias.", "status": "vigente"},
    {"id": "senha", "texto": "Para redefinir a senha, use o aplicativo da Orla.", "status": "vigente"},
]
`,
  starterCode: py`
def buscar(pergunta, docs, k=2):
    """Devolve os ids dos documentos mais relevantes para a pergunta, do mais para o menos relevante."""
    palavras = pergunta.split()
    notas = []
    for doc in docs:
        nota = sum(1 for palavra in palavras if palavra in doc["texto"].split())
        notas.append((nota, doc["id"]))
    notas.sort(reverse=True)
    return [doc_id for nota, doc_id in notas[:k]]


print(buscar("Qual o prazo de REPASSE no credito?", DOCS))
print(buscar("Como peço estorno?", DOCS))
print(buscar("Vocês vendem seguro de vida?", DOCS))
`,
  solution: py`
def buscar(pergunta, docs, k=2):
    consulta = termos(pergunta)
    notas = []
    for posicao, doc in enumerate(docs):
        if doc["status"] != "vigente":
            continue
        nota = len(consulta & termos(doc["texto"]))
        if nota > 0:
            notas.append((-nota, posicao, doc["id"]))
    notas.sort()
    return [doc_id for _, _, doc_id in notas[:k]]
`,
  solucaoParcial: py`
def buscar(pergunta, docs, k=2):
    consulta = termos(pergunta)
    notas = []
    for posicao, doc in enumerate(docs):
        nota = len(consulta & termos(doc["texto"]))
        notas.append((-nota, posicao, doc["id"]))
    notas.sort()
    return [doc_id for _, _, doc_id in notas[:k]]
`,
  criterios: [
    {
      name: "Encontra o documento apesar de maiúsculas, acentos e pontuação",
      nivel: 2,
      code: BASE_OCULTA + py`
_r = buscar("PRAZO para responder CONTESTACAO?", _docs, 1)
assert _r == ["chargeback"], "Uma pergunta sem acento e em maiúsculas não encontrou o documento certo"
_r = buscar("a troca da maquininha, é gratuita?", _docs, 1)
assert _r == ["maquininha"], "Uma pergunta com pontuação não encontrou o documento certo"
`,
    },
    {
      name: "Respeita k e ordena do mais para o menos relevante",
      nivel: 2,
      code: BASE_OCULTA + py`
_r = buscar("troca da maquininha com defeito ou contestação", _docs, 2)
assert len(_r) <= 2, "A busca devolveu mais documentos do que k"
assert _r and _r[0] == "maquininha", "O documento mais relevante não veio em primeiro"
`,
    },
    {
      name: "Nunca devolve documento revogado",
      nivel: 3,
      code: BASE_OCULTA + py`
_r = buscar("Qual a tarifa de antecipação ao mês?", _docs, 2)
assert "tarifa-2023" not in _r, "Um documento revogado foi devolvido"
assert _r and _r[0] == "tarifa-2025", "O documento vigente não veio em primeiro"
`,
    },
    {
      name: "Devolve lista vazia quando a base não cobre a pergunta",
      nivel: 3,
      code: BASE_OCULTA + py`
_r = buscar("Vocês financiam a compra de carros?", _docs, 2)
assert _r == [], "Uma pergunta fora da base devolveu documentos"
`,
    },
  ],
};
