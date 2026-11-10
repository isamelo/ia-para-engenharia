import { py } from "../py";
import type { Desafio } from "../types";

const REFERENCIA = py`
def _correta(total, cupom, limite_inclusivo=True, piso=True):
    vale = total >= cupom["minimo"] if limite_inclusivo else total > cupom["minimo"]
    if vale:
        if cupom["tipo"] == "percentual":
            total = total - total * cupom["valor"] / 100
        else:
            total = total - cupom["valor"]
        if piso:
            total = max(total, 0)
    return round(total, 2)


def _conferir(casos_enviados):
    assert isinstance(casos_enviados, list) and casos_enviados, "casos() deve devolver uma lista com ao menos um caso"
    for _caso in casos_enviados:
        assert len(_caso) == 3, "Cada caso deve ser (total, cupom, esperado)"
        _total, _cupom, _esperado = _caso
        assert abs(_correta(_total, _cupom) - _esperado) < 0.005, "Há um caso com valor esperado que contraria as regras do chamado"


def _expoe(casos_enviados, **defeito):
    return any(abs(_correta(t, c, **defeito) - e) >= 0.005 for t, c, e in casos_enviados)
`;

export const itemAgentesCodigo: Desafio = {
  id: "diag-agentes-codigo",
  capacidade: "agentes-codigo",
  titulo: "O agente entregou a função com os testes verdes",
  minutos: 4,
  briefing: `
Um agente de código implementou \`aplicar_desconto\` a partir do chamado abaixo e escreveu três testes, que passam. A função está em **Arquivos do cenário**. Antes de aprovar, você precisa conferir se ela cumpre as regras.

Regras do chamado:

1. Cupom \`percentual\` desconta \`valor\` por cento do total. Cupom \`fixo\` desconta \`valor\` reais.
2. O cupom vale quando o total é **igual ou maior** que \`minimo\`. Abaixo disso, o total volta sem alteração.
3. O total com desconto nunca fica abaixo de zero.
4. O resultado tem duas casas decimais.

Escreva em \`casos()\` os casos de teste que faltaram: tuplas \`(total, cupom, esperado)\`, em que \`esperado\` é o valor **correto pelas regras**. A correção verifica se seus casos expõem os defeitos da entrega e se nenhum valor esperado está errado.
`,
  cenario: py`
def aplicar_desconto(total, cupom):
    """Entregue pelo agente. Aplica o cupom ao total do pedido, em reais."""
    if total > cupom["minimo"]:
        if cupom["tipo"] == "percentual":
            total = total - total * cupom["valor"] / 100
        else:
            total = total - cupom["valor"]
    return round(total, 2)


def testes_do_agente():
    """Os testes que vieram com a entrega. Todos passam."""
    assert aplicar_desconto(200.0, {"tipo": "percentual", "valor": 10, "minimo": 100}) == 180.0
    assert aplicar_desconto(200.0, {"tipo": "fixo", "valor": 30, "minimo": 100}) == 170.0
    assert aplicar_desconto(50.0, {"tipo": "fixo", "valor": 30, "minimo": 100}) == 50.0
    return "3 testes passaram"
`,
  starterCode: py`
def casos():
    """Casos (total, cupom, esperado). O esperado é o valor correto pelas regras do chamado."""
    return [
        (200.0, {"tipo": "percentual", "valor": 10, "minimo": 100}, 180.0),
    ]


print(testes_do_agente())
for total, cupom, esperado in casos():
    obtido = aplicar_desconto(total, cupom)
    print("ok   " if obtido == esperado else "FALHA", total, cupom, "esperado", esperado, "obtido", obtido)
`,
  solution: py`
def casos():
    return [
        (100.0, {"tipo": "percentual", "valor": 10, "minimo": 100}, 90.0),
        (40.0, {"tipo": "fixo", "valor": 60, "minimo": 20}, 0.0),
    ]
`,
  solucaoParcial: py`
def casos():
    return [
        (40.0, {"tipo": "fixo", "valor": 60, "minimo": 20}, 0.0),
    ]
`,
  criterios: [
    {
      name: "Os valores esperados seguem as regras do chamado",
      nivel: 2,
      code: REFERENCIA + py`
_conferir(casos())
`,
    },
    {
      name: "Ao menos um caso falha na função entregue",
      nivel: 2,
      code: REFERENCIA + py`
_conferir(casos())
assert any(abs(aplicar_desconto(t, c) - e) >= 0.005 for t, c, e in casos()), "Nenhum caso falha na função entregue pelo agente"
`,
    },
    {
      name: "Os casos expõem todos os defeitos da entrega",
      nivel: 3,
      code: REFERENCIA + py`
_conferir(casos())
_achados = [_expoe(casos(), limite_inclusivo=False), _expoe(casos(), piso=False)]
assert all(_achados), "Os casos expõem %d dos 2 defeitos da entrega" % sum(_achados)
`,
    },
  ],
};
