import { py } from "../py";
import type { Desafio } from "../types";

export const itemContexto: Desafio = {
  id: "diag-contexto",
  capacidade: "contexto",
  titulo: "A triagem quebra quando o modelo responde fora do formato",
  minutos: 3,
  briefing: `
O prompt de triagem pede ao modelo um JSON com \`categoria\`, \`prioridade\` e \`valor\`. Na maior parte das vezes ele obedece. Às vezes devolve o JSON dentro de um bloco de código, com uma frase antes, cortado no meio ou com uma categoria que não existe. O serviço cai com exceção ou grava lixo no banco.

Corrija \`interpretar(saida)\` para que ela:

- devolva o dicionário quando o JSON vier limpo ou cercado de texto;
- devolva \`None\`, sem exceção, quando a saída não cumprir o contrato. Quem chama usa o \`None\` para repetir a chamada.

Contrato: \`categoria\` em \`CATEGORIAS\`, \`prioridade\` em \`PRIORIDADES\`, \`valor\` numérico ou \`null\`. \`EXEMPLOS\` traz saídas reais coletadas em produção.
`,
  cenario: py`
CATEGORIAS = ("cobranca", "reembolso", "acesso", "outro")
PRIORIDADES = ("baixa", "media", "alta")
CERCA = chr(96) * 3

EXEMPLOS = [
    '{"categoria": "reembolso", "prioridade": "alta", "valor": 120.5}',
    "Claro! Segue a classificação:\n" + CERCA + 'json\n{"categoria": "acesso", "prioridade": "media", "valor": null}\n' + CERCA,
    '{"categoria": "cobranca", "prioridade": "al',
    '{"categoria": "financeiro", "prioridade": "alta", "valor": 10}',
]
`,
  starterCode: py`
import json


def interpretar(saida):
    """Converte a saída crua do modelo em dict. None quando não dá para confiar nela."""
    return json.loads(saida)


for exemplo in EXEMPLOS:
    try:
        print(interpretar(exemplo))
    except Exception as erro:
        print("EXCEÇÃO:", type(erro).__name__)
`,
  solution: py`
import json


def interpretar(saida):
    inicio, fim = saida.find("{"), saida.rfind("}")
    if inicio == -1 or fim <= inicio:
        return None
    try:
        dados = json.loads(saida[inicio:fim + 1])
    except json.JSONDecodeError:
        return None
    if not isinstance(dados, dict):
        return None
    if dados.get("categoria") not in CATEGORIAS or dados.get("prioridade") not in PRIORIDADES:
        return None
    if "valor" not in dados:
        return None
    valor = dados["valor"]
    if valor is not None and (isinstance(valor, bool) or not isinstance(valor, (int, float))):
        return None
    return dados
`,
  solucaoParcial: py`
import json


def interpretar(saida):
    inicio, fim = saida.find("{"), saida.rfind("}")
    return json.loads(saida[inicio:fim + 1])
`,
  criterios: [
    {
      name: "Interpreta JSON limpo",
      nivel: 2,
      code: py`
_r = interpretar('{"categoria": "cobranca", "prioridade": "baixa", "valor": 89.9}')
assert _r == {"categoria": "cobranca", "prioridade": "baixa", "valor": 89.9}, "Uma saída válida não foi interpretada"
`,
    },
    {
      name: "Interpreta JSON cercado de texto ou em bloco de código",
      nivel: 2,
      code: py`
_esperado = {"categoria": "outro", "prioridade": "media", "valor": None}
_json = '{"categoria": "outro", "prioridade": "media", "valor": null}'
_r = interpretar("Aqui está:\n" + CERCA + "json\n" + _json + "\n" + CERCA + "\nPosso ajudar em algo mais?")
assert _r == _esperado, "O JSON dentro de um bloco de código não foi interpretado"
_r = interpretar("Resultado: " + _json)
assert _r == _esperado, "O JSON precedido de texto não foi interpretado"
`,
    },
    {
      name: "Saída cortada ou sem JSON devolve None, sem exceção",
      nivel: 3,
      code: py`
for _saida in ('{"categoria": "acesso", "prioridade": "me', "Não consegui classificar esse chamado.", ""):
    try:
        _r = interpretar(_saida)
    except Exception as _erro:
        raise AssertionError("Uma saída inválida gerou exceção em vez de None")
    assert _r is None, "Uma saída inválida não devolveu None"
`,
    },
    {
      name: "Saída que viola o contrato devolve None",
      nivel: 3,
      code: py`
_ruins = [
    '{"categoria": "juridico", "prioridade": "alta", "valor": 10}',
    '{"categoria": "acesso", "prioridade": "urgentissima", "valor": null}',
    '{"categoria": "acesso", "valor": null}',
    '{"categoria": "reembolso", "prioridade": "alta", "valor": "cento e vinte"}',
    '["reembolso", "alta", 120]',
]
for _saida in _ruins:
    try:
        _r = interpretar(_saida)
    except Exception as _erro:
        raise AssertionError("Uma saída fora do contrato gerou exceção em vez de None")
    assert _r is None, "Uma saída fora do contrato foi aceita"
assert interpretar('{"categoria": "reembolso", "prioridade": "alta", "valor": 120}') is not None, "Uma saída válida foi rejeitada"
`,
    },
  ],
};
