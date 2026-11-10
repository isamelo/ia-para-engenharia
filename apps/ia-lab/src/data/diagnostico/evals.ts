import { py } from "../py";
import type { Desafio } from "../types";

const GERADOR = py`
def _rodada(acertos_por_categoria):
    linhas = []
    for categoria, (acertos, total) in acertos_por_categoria.items():
        linhas += [{"categoria": categoria, "acertou": i < acertos} for i in range(total)]
    return linhas
`;

export const itemEvals: Desafio = {
  id: "diag-evals",
  capacidade: "evals",
  titulo: "A média subiu e os reembolsos pioraram",
  minutos: 4,
  briefing: `
O time trocou o prompt do classificador de chamados. O relatório de avaliação disse que a acurácia subiu e a mudança foi liberada. Dois dias depois, o financeiro reclamou: os chamados de reembolso passaram a ser classificados errado.

\`comparar(base, candidata)\` recebe o resultado das duas versões no mesmo conjunto de casos. Cada item é \`{"categoria": str, "acertou": bool}\`. Corrija a função para devolver:

- \`acuracia_base\` e \`acuracia_candidata\`, entre 0 e 1, para conjuntos de qualquer tamanho;
- \`regrediu\`: \`True\` quando a acurácia geral cai mais de 2 pontos percentuais **ou** quando alguma categoria com 5 casos ou mais cai mais de 10 pontos percentuais.

Categorias com menos de 5 casos não entram na regra por categoria: a variação delas é ruído.
`,
  cenario: py`
BASE = (
    [{"categoria": "cobranca", "acertou": True}] * 18 + [{"categoria": "cobranca", "acertou": False}] * 2
    + [{"categoria": "reembolso", "acertou": True}] * 9 + [{"categoria": "reembolso", "acertou": False}] * 1
    + [{"categoria": "acesso", "acertou": True}] * 14 + [{"categoria": "acesso", "acertou": False}] * 6
)

CANDIDATA = (
    [{"categoria": "cobranca", "acertou": True}] * 20
    + [{"categoria": "reembolso", "acertou": True}] * 6 + [{"categoria": "reembolso", "acertou": False}] * 4
    + [{"categoria": "acesso", "acertou": True}] * 18 + [{"categoria": "acesso", "acertou": False}] * 2
)
`,
  starterCode: py`
def comparar(base, candidata):
    """Compara duas versões avaliadas no mesmo conjunto de casos."""
    acuracia_base = sum(1 for item in base if item["acertou"]) / 100
    acuracia_candidata = sum(1 for item in candidata if item["acertou"]) / 100
    return {
        "acuracia_base": acuracia_base,
        "acuracia_candidata": acuracia_candidata,
        "regrediu": acuracia_candidata < acuracia_base,
    }


print(comparar(BASE, CANDIDATA))
`,
  solution: py`
def acuracia(itens):
    return sum(1 for item in itens if item["acertou"]) / len(itens) if itens else 0.0


def comparar(base, candidata):
    acuracia_base = acuracia(base)
    acuracia_candidata = acuracia(candidata)
    regrediu = acuracia_base - acuracia_candidata > 0.02 + 1e-9
    for categoria in {item["categoria"] for item in base}:
        antes = [item for item in base if item["categoria"] == categoria]
        depois = [item for item in candidata if item["categoria"] == categoria]
        if len(antes) >= 5 and len(depois) >= 5 and acuracia(antes) - acuracia(depois) > 0.10 + 1e-9:
            regrediu = True
    return {
        "acuracia_base": acuracia_base,
        "acuracia_candidata": acuracia_candidata,
        "regrediu": regrediu,
    }
`,
  solucaoParcial: py`
def acuracia(itens):
    return sum(1 for item in itens if item["acertou"]) / len(itens) if itens else 0.0


def comparar(base, candidata):
    acuracia_base = acuracia(base)
    acuracia_candidata = acuracia(candidata)
    return {
        "acuracia_base": acuracia_base,
        "acuracia_candidata": acuracia_candidata,
        "regrediu": acuracia_base - acuracia_candidata > 0.02 + 1e-9,
    }
`,
  criterios: [
    {
      name: "Calcula a acurácia para conjuntos de qualquer tamanho",
      nivel: 2,
      code: GERADOR + py`
_r = comparar(_rodada({"a": (6, 8), "b": (3, 4)}), _rodada({"a": (7, 8), "b": (2, 4)}))
assert abs(_r["acuracia_base"] - 0.75) < 1e-6, "A acurácia da versão base está errada"
assert abs(_r["acuracia_candidata"] - 0.75) < 1e-6, "A acurácia da versão candidata está errada"
`,
    },
    {
      name: "Acusa queda da acurácia geral e tolera variação de até 2 pontos",
      nivel: 2,
      code: GERADOR + py`
_r = comparar(_rodada({"a": (90, 100)}), _rodada({"a": (80, 100)}))
assert _r["regrediu"] is True, "Uma queda de 10 pontos na acurácia geral não foi acusada"
_r = comparar(_rodada({"a": (90, 100)}), _rodada({"a": (89, 100)}))
assert _r["regrediu"] is False, "Uma variação de 1 ponto foi acusada como regressão"
_r = comparar(_rodada({"a": (90, 100)}), _rodada({"a": (94, 100)}))
assert _r["regrediu"] is False, "Uma melhora foi acusada como regressão"
`,
    },
    {
      name: "Acusa regressão em uma categoria mesmo com a média melhor",
      nivel: 3,
      code: GERADOR + py`
_base = _rodada({"a": (30, 40), "b": (18, 20), "c": (30, 40)})
_cand = _rodada({"a": (38, 40), "b": (12, 20), "c": (34, 40)})
_r = comparar(_base, _cand)
assert _r["acuracia_candidata"] > _r["acuracia_base"], "As acurácias gerais estão erradas"
assert _r["regrediu"] is True, "Uma categoria caiu 30 pontos e a regressão não foi acusada"
`,
    },
    {
      name: "Não acusa ruído de categoria pequena nem queda dentro da tolerância",
      nivel: 3,
      code: GERADOR + py`
_base = _rodada({"a": (45, 50), "raro": (3, 3), "c": (40, 47)})
_cand = _rodada({"a": (46, 50), "raro": (2, 3), "c": (40, 47)})
assert comparar(_base, _cand)["regrediu"] is False, "Uma categoria com menos de 5 casos foi tratada como regressão"
_base = _rodada({"a": (18, 20), "b": (70, 80)})
_cand = _rodada({"a": (17, 20), "b": (71, 80)})
assert comparar(_base, _cand)["regrediu"] is False, "Uma queda de 5 pontos em uma categoria foi tratada como regressão"
`,
    },
  ],
};
