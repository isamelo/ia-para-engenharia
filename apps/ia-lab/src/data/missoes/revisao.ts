import { py } from "../py";
import type { CapacidadeId, ResultadoCriterio } from "../types";

export interface ArquivoPr {
  nome: string;
  antes: string;
  depois: string;
}

export interface LinhaDiff {
  tipo: "igual" | "removida" | "adicionada";
  texto: string;
  numAntes: number | null;
  numDepois: number | null;
}

export type Severidade = "bloqueia" | "ajuste";

export interface Achado {
  arquivo: string;
  tipo: "removida" | "adicionada";
  texto: string;
  severidade: Severidade;
  nota: string;
}

export interface DefeitoPr {
  id: string;
  titulo: string;
  explicacao: string;
  arquivo: string;
  /** Trechos de linhas alteradas que localizam o defeito. */
  marcas: string[];
}

const REEMBOLSOS_ANTES = py`
from decimal import Decimal, ROUND_HALF_UP


class GatewayTimeout(Exception):
    pass


def calcular_reembolso(valor_pago, percentual):
    """Valor a devolver, em reais, com arredondamento comercial."""
    valor = Decimal(str(valor_pago)) * Decimal(str(percentual)) / Decimal("100")
    return valor.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def listar_reembolsos(db, cliente_id):
    return db.execute(
        "SELECT id, pedido_id, valor FROM reembolsos WHERE cliente_id = ?",
        (cliente_id,),
    ).fetchall()


def processar_reembolso(gateway, pedido, percentual, chave):
    valor = calcular_reembolso(pedido["valor_pago"], percentual)
    if valor > Decimal(str(pedido["valor_pago"])) - Decimal(str(pedido["reembolsado"])):
        raise ValueError("reembolso maior que o saldo do pedido")
    return gateway.estornar(pedido["id"], valor, chave_idempotencia=chave)
`;

const REEMBOLSOS_DEPOIS = py`
import logging

logger = logging.getLogger(__name__)

MAX_TENTATIVAS = 3


class GatewayTimeout(Exception):
    pass


def calcular_reembolso(valor_pago: float, percentual: float) -> float:
    """Valor a devolver, em reais."""
    return round(valor_pago * percentual / 100, 2)


def _saldo(pedido: dict) -> float:
    return pedido["valor_pago"] - pedido["reembolsado"]


def listar_reembolsos(db, cliente_id: str, status: str | None = None):
    consulta = "SELECT id, pedido_id, valor FROM reembolsos WHERE cliente_id = ?"
    if status:
        consulta += f" AND status = '{status}'"
    return db.execute(consulta, (cliente_id,)).fetchall()


def processar_reembolso(gateway, pedido: dict, percentual: float):
    valor = calcular_reembolso(pedido["valor_pago"], percentual)
    if valor > _saldo(pedido):
        raise ValueError("reembolso maior que o saldo do pedido")
    for tentativa in range(1, MAX_TENTATIVAS + 1):
        try:
            return gateway.estornar(pedido["id"], valor)
        except GatewayTimeout:
            logger.warning("timeout no gateway, tentativa %d", tentativa)
    raise GatewayTimeout("gateway indisponível")
`;

const TESTES_ANTES = py`
from decimal import Decimal

from reembolsos import calcular_reembolso


def test_arredondamento_comercial():
    assert calcular_reembolso(49.90, 35) == Decimal("17.47")


def test_reembolso_integral():
    assert calcular_reembolso(200.00, 100) == Decimal("200.00")
`;

const TESTES_DEPOIS = py`
import pytest

from reembolsos import calcular_reembolso, processar_reembolso


def test_arredondamento_comercial():
    assert calcular_reembolso(49.90, 35) == pytest.approx(17.47, abs=0.01)


def test_reembolso_integral():
    assert calcular_reembolso(200.00, 100) == 200.00


def test_retry_em_timeout(gateway_instavel):
    pedido = {"id": "P-1", "valor_pago": 100.0, "reembolsado": 0.0}
    processar_reembolso(gateway_instavel, pedido, 50)
    assert gateway_instavel.chamadas == 2
`;

export const missaoRevisao = {
  id: "revisao-pr-agente",
  capacidade: "agentes-codigo" as CapacidadeId,
  titulo: "Revise o PR do agente",
  resumo: "Um agente de código abriu um PR com os testes verdes. Quatro mudanças não podem ir para produção. Encontre-as sem barrar o que está correto.",
  chamado: "PR #482, aberto por um agente de código: “Adiciona filtro por status na listagem de reembolsos e retry em timeout do gateway. Simplifica o cálculo e atualiza os testes.” CI verde, 3 testes passando.",
  minutos: 25,
  briefing: `
O módulo de reembolsos da Orla Pagamentos move dinheiro de verdade. O agente recebeu a tarefa de adicionar um filtro por status e uma nova tentativa quando o gateway dá timeout. O PR faz isso e mais algumas coisas.

## Sua tarefa

Revise o diff. Clique em uma linha alterada para registrar um achado e classifique:

- **Bloqueia o merge**: defeito que causa perda financeira, falha de segurança ou esconde um erro;
- **Pede ajuste**: observação de estilo ou melhoria que não impede o merge.

Há **quatro** defeitos que bloqueiam. O restante do PR está correto, mesmo quando parece suspeito.

## Como a correção funciona

Contam os defeitos que você bloqueou e os bloqueios indevidos. Marcar tudo como bloqueio reprova: uma revisão que barra código correto custa o tempo do time e ensina a ignorar o revisor. Achados classificados como "pede ajuste" não entram na conta.

Use o **sandbox** abaixo do diff para comparar as duas versões. Os módulos \`antes\` e \`depois\` já estão carregados, e \`GatewayDeTeste\` simula um gateway que processa o estorno e só depois dá timeout.
`,
  arquivos: [
    { nome: "reembolsos.py", antes: REEMBOLSOS_ANTES, depois: REEMBOLSOS_DEPOIS },
    { nome: "test_reembolsos.py", antes: TESTES_ANTES, depois: TESTES_DEPOIS },
  ] as ArquivoPr[],
  defeitos: [
    {
      id: "arredondamento",
      titulo: "O cálculo trocou Decimal por float",
      explicacao: "round() sobre float não faz arredondamento comercial: 35% de R$ 49,90 passa de 17,47 para 17,46. Em dinheiro, um centavo por operação vira diferença de conciliação.",
      arquivo: "reembolsos.py",
      marcas: [
        "return round(valor_pago * percentual / 100, 2)",
        "def calcular_reembolso(valor_pago: float",
        "valor = Decimal(str(valor_pago))",
        "return valor.quantize(",
        "from decimal import Decimal, ROUND_HALF_UP",
      ],
    },
    {
      id: "sql",
      titulo: "O filtro por status monta SQL com f-string",
      explicacao: "status vem da requisição e é concatenado na consulta. É injeção de SQL: um valor como ' OR '1'='1 lista reembolsos de todos os clientes. O parâmetro deveria entrar como ?, igual a cliente_id.",
      arquivo: "reembolsos.py",
      marcas: ["consulta += f\" AND status = '{status}'\"", "if status:"],
    },
    {
      id: "idempotencia",
      titulo: "O retry repete o estorno sem chave de idempotência",
      explicacao: "Timeout não significa que o estorno falhou. O PR removeu chave_idempotencia e passou a repetir a chamada: se o gateway processou e demorou a responder, o cliente recebe o reembolso duas ou três vezes.",
      arquivo: "reembolsos.py",
      marcas: [
        "return gateway.estornar(pedido[\"id\"], valor)",
        "for tentativa in range(1, MAX_TENTATIVAS + 1):",
        "except GatewayTimeout:",
        "def processar_reembolso(gateway, pedido: dict, percentual: float):",
        "chave_idempotencia=chave",
        "def processar_reembolso(gateway, pedido, percentual, chave):",
      ],
    },
    {
      id: "teste",
      titulo: "O teste de arredondamento foi afrouxado para passar",
      explicacao: "A asserção exata virou pytest.approx com tolerância de um centavo, justamente o tamanho do erro introduzido. O teste que pegaria a regressão foi alterado para aceitá-la.",
      arquivo: "test_reembolsos.py",
      marcas: ["pytest.approx(17.47, abs=0.01)", "== Decimal(\"17.47\")"],
    },
  ] as DefeitoPr[],
  experimento: py`
# Compare as duas versões. Este código não é corrigido: serve para você investigar.
for valor, percentual in [(200.0, 50), (80.0, 25)]:
    print(valor, percentual, "antes:", antes.calcular_reembolso(valor, percentual), "depois:", depois.calcular_reembolso(valor, percentual))

gateway = GatewayDeTeste(depois, timeouts=0)
depois.processar_reembolso(gateway, {"id": "P-1", "valor_pago": 100.0, "reembolsado": 0.0}, 50)
print("estornos registrados:", gateway.estornos)
`,
};

export const cenarioRevisao =
  `FONTE_ANTES = ${JSON.stringify(REEMBOLSOS_ANTES)}\nFONTE_DEPOIS = ${JSON.stringify(REEMBOLSOS_DEPOIS)}\n` +
  py`
import types


def _modulo(nome, fonte):
    modulo = types.ModuleType(nome)
    exec(compile(fonte, nome + "/reembolsos.py", "exec"), modulo.__dict__)
    return modulo


antes = _modulo("antes", FONTE_ANTES)
depois = _modulo("depois", FONTE_DEPOIS)


class GatewayDeTeste:
    """Gateway simulado. Nas primeiras chamadas, processa o estorno e só depois dá timeout."""

    def __init__(self, modulo, timeouts=1):
        self.modulo = modulo
        self.timeouts = timeouts
        self.estornos = []
        self.chaves = set()

    def estornar(self, pedido_id, valor, chave_idempotencia=None):
        if chave_idempotencia is None or chave_idempotencia not in self.chaves:
            self.estornos.append((pedido_id, valor))
        if chave_idempotencia is not None:
            self.chaves.add(chave_idempotencia)
        if self.timeouts > 0:
            self.timeouts -= 1
            raise self.modulo.GatewayTimeout("tempo esgotado")
        return {"status": "ok"}
`;

export function diffLinhas(antes: string, depois: string): LinhaDiff[] {
  const a = antes.replace(/\n$/, "").split("\n");
  const b = depois.replace(/\n$/, "").split("\n");
  const lcs = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      lcs[i][j] =
        a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const linhas: LinhaDiff[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      linhas.push({ tipo: "igual", texto: a[i], numAntes: i + 1, numDepois: j + 1 });
      i += 1;
      j += 1;
    } else if (i < a.length && (j >= b.length || lcs[i + 1][j] >= lcs[i][j + 1])) {
      linhas.push({ tipo: "removida", texto: a[i], numAntes: i + 1, numDepois: null });
      i += 1;
    } else {
      linhas.push({ tipo: "adicionada", texto: b[j], numAntes: null, numDepois: j + 1 });
      j += 1;
    }
  }
  return linhas;
}

export function defeitoDoAchado(achado: Pick<Achado, "arquivo" | "texto">): DefeitoPr | undefined {
  return missaoRevisao.defeitos.find(
    (defeito) =>
      defeito.arquivo === achado.arquivo &&
      defeito.marcas.some((marca) => achado.texto.includes(marca)),
  );
}

export interface ResumoRevisao {
  encontrados: string[];
  indevidos: number;
  criterios: ResultadoCriterio[];
}

export function corrigirRevisao(achados: Achado[]): ResumoRevisao {
  const bloqueios = achados.filter((achado) => achado.severidade === "bloqueia");
  const encontrados = new Set<string>();
  let indevidos = 0;
  for (const achado of bloqueios) {
    const defeito = defeitoDoAchado(achado);
    if (defeito) encontrados.add(defeito.id);
    else indevidos += 1;
  }
  const total = missaoRevisao.defeitos.length;
  const criterio = (name: string, nivel: 2 | 3, passed: boolean, message: string) => ({
    name,
    nivel,
    passed,
    message: passed ? "" : message,
  });
  return {
    encontrados: [...encontrados],
    indevidos,
    criterios: [
      criterio("Bloqueia ao menos 2 dos 4 defeitos", 2, encontrados.size >= 2, `Você bloqueou ${encontrados.size} de ${total} defeitos`),
      criterio("No máximo 2 bloqueios indevidos", 2, indevidos <= 2, `${indevidos} bloqueios em código correto`),
      criterio("Bloqueia os 4 defeitos", 3, encontrados.size === total, `Você bloqueou ${encontrados.size} de ${total} defeitos`),
      criterio("No máximo 1 bloqueio indevido", 3, indevidos <= 1, `${indevidos} bloqueios em código correto`),
    ],
  };
}
