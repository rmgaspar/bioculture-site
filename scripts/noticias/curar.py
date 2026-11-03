#!/usr/bin/env python3
"""Curadoria editorial das notícias ativas: arquiva o que já não se justifica nas listagens.

As notícias arquivadas saem de data/noticias.json para data/noticias_arquivo.json (nada se apaga: as ligações antigas
continuam a abrir na página de detalhe). Cada uma fica com «arquivada_em» e «motivo_arquivo».

Regras (por esta ordem):
  1. prazo: expira_em até à data pedida (por omissão, hoje + 2 dias, o que o arquivo diário faria a seguir);
  2. fora do tema: marcadas com fora_do_tema;
  3. sazonais: ids escolhidos à mão (acontecimentos de verão já ultrapassados: ondas de calor, incêndios, cheias, tufões,
     boletins mensais já substituídos);
  4. estudos técnicos de pouca relevância: tipo «estudo», prioridade até 66, publicados há mais de 14 dias.

Uso: python3 scripts/noticias/curar.py [--hoje AAAA-MM-DD] [--simular]
"""
import argparse
import datetime as dt
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ATIVAS = ROOT / "data" / "noticias.json"
ARQUIVO = ROOT / "data" / "noticias_arquivo.json"

SAZONAIS = {
    "publico-calor-extremo-agua-europa-2026", "copernicus-floracao-algas-baltico-2026", "wmo-segundo-julho-mais-quente-2026",
    "independent-uk-drought-map-2026", "copernicus-marine-heatwave-med-2026", "observador-vindima-precoce-portugal-2026",
    "independent-wildfires-europe-africa-2026", "voz-tras-os-montes-incendios-boticas-moncorvo-2026", "independent-super-el-nino-2026",
    "copernicus-huelva-wildfire-2026", "copernicus-tufao-saudel-2026", "voz-tras-os-montes-vila-real-area-ardida-2026",
    "copernicus-nepal-cheia-rapida-2026", "natgeo-nepal-glaciares-clima-2026",
}
ANTIGAS_POUCO_RELEVANTES = {"20260327-sete-maneiras-de-reduzir-o-desperdicio", "bbc-c8jnm4ldxyko"}  # prefixos


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--hoje", default=dt.date.today().isoformat())
    ap.add_argument("--simular", action="store_true")
    args = ap.parse_args()
    hoje = dt.date.fromisoformat(args.hoje)
    limite = (hoje + dt.timedelta(days=2)).isoformat()
    ativas = json.loads(ATIVAS.read_text(encoding="utf-8"))
    arquivo = json.loads(ARQUIVO.read_text(encoding="utf-8")) if ARQUIVO.exists() else []
    ja = {x.get("id") for x in arquivo}
    ids = {x["id"] for x in ativas}
    ficam, saem = [], []
    for x in ativas:
        motivo = None
        pub = (x.get("publicado_em") or "")[:10]
        if x.get("expira_em") and not x.get("permanente") and x["expira_em"] <= limite:
            motivo = "prazo terminado"
        elif x.get("fora_do_tema"):
            motivo = "fora do tema"
        elif x["id"] in SAZONAIS:
            motivo = "sazonal ou ultrapassada"
        elif any(x["id"].startswith(i) for i in ANTIGAS_POUCO_RELEVANTES):
            motivo = "antiga e pouco relevante"
        elif x.get("tipo_conteudo") == "estudo" and (x.get("prioridade") or x.get("relevancia") or 0) <= 66 and pub and (hoje - dt.date.fromisoformat(pub)).days > 14:
            motivo = "estudo técnico de pouca relevância"
        if motivo and x["id"] not in ja:
            x["estado"] = "arquivada"
            x["arquivada_em"] = hoje.isoformat()
            x["motivo_arquivo"] = motivo
            saem.append(x)
        else:
            ficam.append(x)
    por_motivo = {}
    for x in saem:
        por_motivo[x["motivo_arquivo"]] = por_motivo.get(x["motivo_arquivo"], 0) + 1
    print(f"{len(saem)} notícias a arquivar, {len(ficam)} ficam ativas:", por_motivo)
    nao_encontrados = [i for i in SAZONAIS if i not in ids] + [i for i in ANTIGAS_POUCO_RELEVANTES if not any(j.startswith(i) for j in ids)]
    if nao_encontrados:
        print("ids da lista manual que não existem:", nao_encontrados)
    if args.simular or not saem:
        return 0
    ATIVAS.write_text(json.dumps(ficam, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    ARQUIVO.write_text(json.dumps(saem + arquivo, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
