import { py } from "../py";
import type { Desafio } from "../types";

export const itemFundamentos: Desafio = {
  id: "diag-fundamentos",
  capacidade: "fundamentos",
  titulo: "O assistente esquece as próprias instruções",
  minutos: 3,
  briefing: `
Em conversas longas, o assistente de suporte da Orla Pagamentos para de seguir as regras do prompt de sistema e responde sobre o começo da conversa, não sobre a última pergunta.

A função \`aparar(mensagens, limite)\` reduz o histórico antes de cada chamada ao modelo. O limite do modelo é dado em **tokens**. Use \`contar_tokens(texto)\`, que já existe no cenário.

Corrija \`aparar\` para que o histórico devolvido:

- caiba em \`limite\` tokens e não descarte nada quando tudo cabe;
- quando não couber, mantenha a mensagem de sistema e as mensagens mais recentes, na ordem original.
`,
  cenario: py`
import re


def contar_tokens(texto):
    """Aproximação do tokenizador do modelo: cada palavra e cada sinal conta um token."""
    return len(re.findall(r"\w+|[^\w\s]", texto))
`,
  starterCode: py`
def aparar(mensagens, limite):
    """Reduz o histórico para caber no limite do modelo.

    mensagens: lista de {"papel": "sistema" | "usuario" | "assistente", "texto": str}
    """
    total = 0
    resultado = []
    for mensagem in mensagens:
        total += len(mensagem["texto"])
        if total > limite:
            break
        resultado.append(mensagem)
    return resultado


historico = [
    {"papel": "sistema", "texto": "Responda apenas sobre produtos da Orla. Nunca informe dados de outro cliente."},
    {"papel": "usuario", "texto": "Oi, minha maquininha não liga."},
    {"papel": "assistente", "texto": "Ela está carregada? Segure o botão verde por cinco segundos."},
    {"papel": "usuario", "texto": "Agora ligou. Como vejo as vendas de ontem?"},
]
for mensagem in aparar(historico, 40):
    print(mensagem["papel"], "-", mensagem["texto"])
`,
  solution: py`
def aparar(mensagens, limite):
    sistema = [m for m in mensagens if m["papel"] == "sistema"]
    conversa = [m for m in mensagens if m["papel"] != "sistema"]
    total = sum(contar_tokens(m["texto"]) for m in sistema)
    recentes = []
    for mensagem in reversed(conversa):
        custo = contar_tokens(mensagem["texto"])
        if total + custo > limite:
            break
        total += custo
        recentes.append(mensagem)
    recentes.reverse()
    return sistema + recentes
`,
  solucaoParcial: py`
def aparar(mensagens, limite):
    total = 0
    resultado = []
    for mensagem in mensagens:
        total += contar_tokens(mensagem["texto"])
        if total > limite:
            break
        resultado.append(mensagem)
    return resultado
`,
  criterios: [
    {
      name: "Mede o histórico em tokens e mantém tudo o que cabe",
      nivel: 2,
      code: py`
_h = [
    {"papel": "sistema", "texto": "Seja breve e educado."},
    {"papel": "usuario", "texto": "Qual o prazo de repasse das vendas no débito?"},
    {"papel": "assistente", "texto": "Um dia útil."},
]
_total = sum(contar_tokens(m["texto"]) for m in _h)
_r = aparar(list(_h), _total)
assert _r == _h, "Um histórico que cabia no limite voltou cortado"
`,
    },
    {
      name: "Nunca devolve mais tokens que o limite",
      nivel: 2,
      code: py`
_h = [{"papel": "sistema", "texto": "Regra um."}] + [
    {"papel": "usuario" if i % 2 == 0 else "assistente", "texto": "mensagem numero %d com algumas palavras" % i}
    for i in range(12)
]
for _limite in (10, 25, 40):
    _r = aparar(list(_h), _limite)
    assert _r, "Com espaço para ao menos uma mensagem, o histórico voltou vazio"
    _usado = sum(contar_tokens(m["texto"]) for m in _r)
    assert _usado <= _limite, "O histórico devolvido passou do limite de tokens"
`,
    },
    {
      name: "Preserva a mensagem de sistema e as mensagens mais recentes",
      nivel: 3,
      code: py`
_h = [{"papel": "sistema", "texto": "Regra um."}] + [
    {"papel": "usuario" if i % 2 == 0 else "assistente", "texto": "mensagem numero %d com algumas palavras" % i}
    for i in range(12)
]
_r = aparar(list(_h), 25)
assert _r and _r[0]["papel"] == "sistema", "A mensagem de sistema foi descartada"
assert _r[-1] == _h[-1], "A mensagem mais recente foi descartada"
assert len(_r) >= 3, "Cabiam mais mensagens recentes do que as devolvidas"
_posicoes = [_h.index(m) for m in _r]
assert _posicoes == sorted(_posicoes), "As mensagens voltaram fora da ordem original"
assert _posicoes[1:] == list(range(len(_h) - len(_r) + 1, len(_h))), "Foram mantidas mensagens antigas no lugar das recentes"
`,
    },
  ],
};
