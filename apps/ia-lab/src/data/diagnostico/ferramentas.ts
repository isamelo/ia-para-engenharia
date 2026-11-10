import { py } from "../py";
import type { Desafio } from "../types";

const APOIO = py`
class _Roteiro:
    def __init__(self, decisoes, repetir=None):
        self.decisoes = list(decisoes)
        self.repetir = repetir
        self.vistos = []

    def decidir(self, historico):
        self.vistos.append([dict(item) for item in historico])
        if self.decisoes:
            return self.decisoes.pop(0)
        if self.repetir:
            return dict(self.repetir)
        return {"tipo": "resposta", "texto": "fim"}


def _chamar(nome, **argumentos):
    return {"tipo": "ferramenta", "nome": nome, "argumentos": argumentos}


def _observacoes(modelo):
    return [item["conteudo"] for item in modelo.vistos[-1] if item.get("papel") == "ferramenta"]


_ferramentas = {
    "saldo": lambda conta: {"A1": 150, "B2": 40}[conta],
    "dobro": lambda valor: valor * 2,
}
`;

export const itemFerramentas: Desafio = {
  id: "diag-ferramentas",
  capacidade: "ferramentas",
  titulo: "O agente para depois da primeira ferramenta",
  minutos: 4,
  briefing: `
O agente de atendimento usa ferramentas para consultar pedidos e calcular valores. Hoje ele só consegue encadear uma chamada e cai com exceção quando a ferramenta falha ou quando o modelo pede uma ferramenta que não existe.

O modelo expõe \`decidir(historico)\`, que devolve uma destas decisões:

- \`{"tipo": "ferramenta", "nome": str, "argumentos": dict}\`
- \`{"tipo": "resposta", "texto": str}\`

Corrija \`executar(modelo, ferramentas, pergunta, max_passos)\` para que ela:

- repita o ciclo até o modelo responder, acrescentando ao histórico uma observação \`{"papel": "ferramenta", "nome": ..., "conteudo": str(resultado)}\` a cada chamada;
- transforme ferramenta inexistente ou exceção em observação cujo \`conteudo\` começa com \`"ERRO"\`, e siga em frente;
- pare depois de \`max_passos\` chamadas de ferramenta e devolva \`{"resposta": None, "passos": max_passos}\`.

O retorno normal é \`{"resposta": texto, "passos": chamadas_feitas}\`.
`,
  cenario: py`
class ModeloRoteirizado:
    """Modelo simulado: devolve as decisões de um roteiro, na ordem em que foram escritas."""

    def __init__(self, roteiro):
        self.roteiro = list(roteiro)

    def decidir(self, historico):
        if self.roteiro:
            return self.roteiro.pop(0)
        return {"tipo": "resposta", "texto": "Não sei responder."}


def buscar_pedido(pedido_id):
    pedidos = {"P-100": {"valor": 250.0, "parcelas": 5}}
    return pedidos[pedido_id]


def dividir(valor, partes):
    return round(valor / partes, 2)


FERRAMENTAS = {"buscar_pedido": buscar_pedido, "dividir": dividir}
`,
  starterCode: py`
def executar(modelo, ferramentas, pergunta, max_passos=5):
    """Roda o agente até ele responder. Devolve {"resposta": str | None, "passos": int}."""
    historico = [{"papel": "usuario", "conteudo": pergunta}]
    decisao = modelo.decidir(historico)
    if decisao["tipo"] == "ferramenta":
        resultado = ferramentas[decisao["nome"]](**decisao["argumentos"])
        historico.append({"papel": "ferramenta", "nome": decisao["nome"], "conteudo": str(resultado)})
        decisao = modelo.decidir(historico)
    return {"resposta": decisao.get("texto"), "passos": 1}


modelo = ModeloRoteirizado([
    {"tipo": "ferramenta", "nome": "buscar_pedido", "argumentos": {"pedido_id": "P-100"}},
    {"tipo": "ferramenta", "nome": "dividir", "argumentos": {"valor": 250.0, "partes": 5}},
    {"tipo": "resposta", "texto": "Cada parcela do pedido P-100 é de R$ 50,00."},
])
print(executar(modelo, FERRAMENTAS, "Qual o valor da parcela do pedido P-100?"))
`,
  solution: py`
def executar(modelo, ferramentas, pergunta, max_passos=5):
    historico = [{"papel": "usuario", "conteudo": pergunta}]
    passos = 0
    while True:
        decisao = modelo.decidir(historico)
        if decisao["tipo"] == "resposta":
            return {"resposta": decisao["texto"], "passos": passos}
        if passos >= max_passos:
            return {"resposta": None, "passos": passos}
        nome = decisao["nome"]
        if nome not in ferramentas:
            conteudo = "ERRO: a ferramenta %s não existe" % nome
        else:
            try:
                conteudo = str(ferramentas[nome](**decisao["argumentos"]))
            except Exception as erro:
                conteudo = "ERRO: %s: %s" % (type(erro).__name__, erro)
        historico.append({"papel": "ferramenta", "nome": nome, "conteudo": conteudo})
        passos += 1
`,
  solucaoParcial: py`
def executar(modelo, ferramentas, pergunta, max_passos=5):
    historico = [{"papel": "usuario", "conteudo": pergunta}]
    passos = 0
    while True:
        decisao = modelo.decidir(historico)
        if decisao["tipo"] == "resposta":
            return {"resposta": decisao["texto"], "passos": passos}
        resultado = ferramentas[decisao["nome"]](**decisao["argumentos"])
        historico.append({"papel": "ferramenta", "nome": decisao["nome"], "conteudo": str(resultado)})
        passos += 1
`,
  criterios: [
    {
      name: "Encadeia várias chamadas de ferramenta até a resposta",
      nivel: 2,
      code: APOIO + py`
_m = _Roteiro([_chamar("saldo", conta="A1"), _chamar("dobro", valor=150), _chamar("saldo", conta="B2"), {"tipo": "resposta", "texto": "pronto"}])
_r = executar(_m, _ferramentas, "pergunta")
assert _r["resposta"] == "pronto", "O agente não chegou à resposta final depois de três chamadas"
assert _r["passos"] == 3, "A contagem de passos não corresponde às chamadas feitas"
`,
    },
    {
      name: "O modelo recebe o resultado de cada ferramenta no histórico",
      nivel: 2,
      code: APOIO + py`
_m = _Roteiro([_chamar("saldo", conta="A1"), _chamar("dobro", valor=150), {"tipo": "resposta", "texto": "pronto"}])
executar(_m, _ferramentas, "pergunta")
assert _observacoes(_m) == ["150", "300"], "As observações das ferramentas não chegaram ao modelo na ordem certa"
assert _m.vistos[-1][0] == {"papel": "usuario", "conteudo": "pergunta"}, "A pergunta do usuário saiu do histórico"
`,
    },
    {
      name: "Ferramenta inexistente ou com exceção vira observação de erro",
      nivel: 3,
      code: APOIO + py`
_m = _Roteiro([_chamar("apagar_tudo"), _chamar("saldo", conta="Z9"), _chamar("saldo", conta="B2"), {"tipo": "resposta", "texto": "pronto"}])
try:
    _r = executar(_m, _ferramentas, "pergunta")
except Exception as _erro:
    raise AssertionError("Uma falha de ferramenta derrubou o agente")
assert _r["resposta"] == "pronto", "O agente não seguiu em frente depois de uma falha de ferramenta"
_obs = _observacoes(_m)
assert len(_obs) == 3 and _obs[0].startswith("ERRO") and _obs[1].startswith("ERRO"), "A falha não foi devolvida ao modelo como observação de erro"
assert _obs[2] == "40", "A chamada válida depois das falhas não foi executada"
`,
    },
    {
      name: "Interrompe o ciclo ao atingir o limite de passos",
      nivel: 3,
      code: APOIO + py`
_chamadas = []
_f = {"ping": lambda: _chamadas.append(1) or "ok"}
_m = _Roteiro([], repetir=_chamar("ping"))
_r = executar(_m, _f, "pergunta", max_passos=4)
assert _r["resposta"] is None, "Ao atingir o limite, a resposta deveria ser None"
assert len(_chamadas) == 4, "O número de chamadas executadas não respeitou max_passos"
`,
    },
  ],
};
