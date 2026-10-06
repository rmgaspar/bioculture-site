"""Funções comuns aos atualizadores de dados (APIs públicas oficiais).

Princípios (iguais aos dos ficheiros de dados):
- nunca inventar, interpolar ou preencher valores em falta;
- se uma API falhar ou devolver muito menos dados do que já temos, abortar sem escrever nada;
- só reescrever um ficheiro quando o conteúdo mudou (a data de geração não conta).
"""
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
SECO = False  # --dry-run: indica o que mudaria sem escrever
DADOS = RAIZ / "data"
USER_AGENT = "bioCultura-observatorio/1.0 (+https://www.bioculture.pt)"


class ErroDados(Exception):
    """Falha que deve impedir a escrita de dados."""


def obter_json(url, tentativas=4, espera=3, timeout=60):
    ultimo = None
    for tentativa in range(1, tentativas + 1):
        try:
            pedido = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
            with urllib.request.urlopen(pedido, timeout=timeout) as resposta:
                return json.load(resposta)
        except (OSError, json.JSONDecodeError) as erro:  # OSError cobre URLError, timeouts e ligações perdidas
            ultimo = erro
            time.sleep(espera * tentativa)
    raise ErroDados(f"Não foi possível ler {url}: {ultimo}")


def ler(nome):
    with open(DADOS / nome, encoding="utf-8") as f:
        return json.load(f)


def serializar(dados, compacto):
    if compacto:
        return json.dumps(dados, ensure_ascii=False, separators=(",", ":")) + "\n"
    return json.dumps(dados, ensure_ascii=False, indent=2) + "\n"


def hoje():
    return date.today().isoformat()


def escrever_se_mudou(nome, novo, compacto=None, campos_data=()):
    """Escreve só se o conteúdo mudou, ignorando as datas de geração.

    Devolve True se escreveu.
    """
    caminho = DADOS / nome
    texto_antigo = caminho.read_text(encoding="utf-8") if caminho.exists() else None
    antigo = json.loads(texto_antigo) if texto_antigo is not None else None
    if compacto is None:  # mantém o formato que o ficheiro já tem
        compacto = texto_antigo is not None and texto_antigo.rstrip("\n").count("\n") == 0

    def sem_datas(valor):
        if isinstance(valor, dict):
            return {k: sem_datas(v) for k, v in valor.items() if k not in campos_data}
        if isinstance(valor, list):
            return [sem_datas(v) for v in valor]
        return valor

    if antigo is not None and sem_datas(antigo) == sem_datas(novo):
        return False
    if SECO:
        print(f"  (dry-run) mudaria {nome}")
        return True
    caminho.write_text(serializar(novo, compacto), encoding="utf-8")
    return True


def verificar_perda(nome, antigas, novas, minimo=0.98):
    """Aborta se os dados novos têm muito menos observações do que os atuais."""
    if antigas and novas < antigas * minimo:
        raise ErroDados(
            f"{nome}: {novas} observações contra {antigas} existentes (mínimo aceite {int(antigas * minimo)}). "
            "Nada foi escrito."
        )


def sair_com_erro(erro):
    print(f"ERRO: {erro}", file=sys.stderr)
    sys.exit(2)
