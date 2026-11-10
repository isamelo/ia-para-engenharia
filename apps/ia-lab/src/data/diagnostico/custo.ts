import { py } from "../py";
import type { Desafio } from "../types";

export const itemCusto: Desafio = {
  id: "diag-custo",
  capacidade: "custo",
  titulo: "A fatura veio três vezes maior que a estimativa",
  minutos: 4,
  briefing: `
A estimativa de custo do assistente errou feio e, para compensar, alguém trocou todas as chamadas para o modelo mais barato. A qualidade das respostas de cobrança caiu.

Corrija as duas funções:

**\`custo(uso, preco)\`** devolve o custo em reais de uma requisição.

- \`uso = {"entrada": tokens, "entrada_em_cache": tokens, "saida": tokens}\`. Os tokens em cache estão **contidos** em \`entrada\` e são cobrados pelo preço de cache.
- \`preco = {"entrada": ..., "entrada_em_cache": ..., "saida": ...}\`, em reais por **milhão** de tokens.

**\`escolher_modelo(modelos, qualidade_minima)\`** devolve o nome do modelo mais barato cuja \`qualidade\` medida no eval do time atinge o mínimo. Se nenhum atingir, devolve o de maior qualidade.

Veja \`PRECOS\` e \`MODELOS\` no cenário.
`,
  cenario: py`
# Preços em reais por milhão de tokens.
PRECOS = {
    "grande": {"entrada": 15.0, "entrada_em_cache": 1.5, "saida": 75.0},
    "pequeno": {"entrada": 1.0, "entrada_em_cache": 0.1, "saida": 5.0},
}

# qualidade: acerto medido no eval do time para a tarefa. custo_medio: reais por requisição.
MODELOS = [
    {"nome": "grande", "qualidade": 0.94, "custo_medio": 0.0420},
    {"nome": "medio", "qualidade": 0.91, "custo_medio": 0.0110},
    {"nome": "pequeno", "qualidade": 0.78, "custo_medio": 0.0021},
]
`,
  starterCode: py`
def custo(uso, preco):
    """Custo em reais de uma requisição."""
    return (uso["entrada"] + uso["saida"]) * preco["entrada"] / 1000


def escolher_modelo(modelos, qualidade_minima):
    """Nome do modelo a usar para a tarefa."""
    return min(modelos, key=lambda modelo: modelo["custo_medio"])["nome"]


uso = {"entrada": 6000, "entrada_em_cache": 5000, "saida": 400}
print("custo no modelo grande: R$ %.4f" % custo(uso, PRECOS["grande"]))
print("modelo para cobrança (mínimo 0.90):", escolher_modelo(MODELOS, 0.90))
`,
  solution: py`
def custo(uso, preco):
    em_cache = uso.get("entrada_em_cache", 0)
    normal = uso["entrada"] - em_cache
    total = normal * preco["entrada"] + em_cache * preco["entrada_em_cache"] + uso["saida"] * preco["saida"]
    return total / 1_000_000


def escolher_modelo(modelos, qualidade_minima):
    aptos = [modelo for modelo in modelos if modelo["qualidade"] >= qualidade_minima]
    if not aptos:
        return max(modelos, key=lambda modelo: modelo["qualidade"])["nome"]
    return min(aptos, key=lambda modelo: modelo["custo_medio"])["nome"]
`,
  solucaoParcial: py`
def custo(uso, preco):
    return (uso["entrada"] * preco["entrada"] + uso["saida"] * preco["saida"]) / 1_000_000


def escolher_modelo(modelos, qualidade_minima):
    return min(modelos, key=lambda modelo: modelo["custo_medio"])["nome"]
`,
  criterios: [
    {
      name: "Cobra entrada e saída pelos seus preços, por milhão de tokens",
      nivel: 2,
      code: py`
_preco = {"entrada": 10.0, "entrada_em_cache": 1.0, "saida": 40.0}
_r = custo({"entrada": 2000, "entrada_em_cache": 0, "saida": 500}, _preco)
assert abs(_r - 0.04) < 1e-9, "O custo de uma requisição sem cache está errado"
_r = custo({"entrada": 1_000_000, "entrada_em_cache": 0, "saida": 0}, _preco)
assert abs(_r - 10.0) < 1e-9, "O custo de um milhão de tokens de entrada está errado"
`,
    },
    {
      name: "Aplica o preço de cache à parte da entrada que veio do cache",
      nivel: 3,
      code: py`
_preco = {"entrada": 10.0, "entrada_em_cache": 1.0, "saida": 40.0}
_r = custo({"entrada": 10000, "entrada_em_cache": 8000, "saida": 1000}, _preco)
assert abs(_r - 0.068) < 1e-9, "O custo de uma requisição com entrada em cache está errado"
`,
    },
    {
      name: "Escolhe o modelo mais barato que atinge a qualidade mínima",
      nivel: 3,
      code: py`
_modelos = [
    {"nome": "x", "qualidade": 0.97, "custo_medio": 0.09},
    {"nome": "y", "qualidade": 0.88, "custo_medio": 0.004},
    {"nome": "z", "qualidade": 0.93, "custo_medio": 0.02},
    {"nome": "w", "qualidade": 0.92, "custo_medio": 0.03},
]
assert escolher_modelo(_modelos, 0.90) == "z", "O modelo escolhido não é o mais barato entre os que atingem o mínimo"
assert escolher_modelo(_modelos, 0.80) == "y", "O modelo escolhido não é o mais barato entre os que atingem o mínimo"
assert escolher_modelo(_modelos, 0.88) == "y", "Um modelo que atinge exatamente o mínimo foi descartado"
assert escolher_modelo(_modelos, 0.99) == "x", "Sem modelo que atinja o mínimo, deveria voltar o de maior qualidade"
`,
    },
  ],
};
