# Atualização automática dos dados mundiais

Fluxo: `.github/workflows/atualizar-dados.yml` (quartas-feiras, 05:43 UTC, e manualmente em
*Actions → Atualizar dados do observatório → Run workflow*).

| Script | Fonte | Ficheiros em `data/` |
|---|---|---|
| `banco_mundial.py` | API do Banco Mundial | `energy-*`, `renewables-territory-*`, `air-*` |
| `ods_onu.py` | API dos Indicadores ODS da ONU (UNSD) | `water-*`, `soil-*`, `biodiversity-*` |
| `ipma_clima.py` | IPMA — Boletim Climatológico Anual | `observatorio_terra.json` (temperatura, desvio e precipitação de Portugal continental; acrescenta o ano novo quando o boletim sai, normalmente em janeiro ou fevereiro) |
| `apa_rea.py` | APA — Relatório do Estado do Ambiente (fichas) | `observatorio_terra.json` e `solo_stats.json`: emissões de gases com efeito de estufa, erosão costeira e suscetibilidade à desertificação (ISD) |
| `relatorio_terra.py` | os ficheiros acima (não chama APIs) | `observatorio-terra-relatorio.json`: séries compactas por país (ISO3) e por agregado para o relatório «Observatório da Terra»; só reorganiza valores oficiais, sem interpolar nem calcular médias |
| `bioweb.py` | Banco Mundial (clima), Eurostat (aves, vendas e risco de pesticidas), FAOSTAT (pesticidas), FirstRecords/Zenodo (espécies não nativas) | `bioweb.json`: séries da página «A teia». Corre sem argumentos com as fontes leves; as espécies não nativas (30 MB, mudam raramente) só com `--only invasoras` |
| `paises_iso.py` | API do Banco Mundial + tabela ISO 3166-1 (datasets/country-codes) | `paises-iso.json`: países reais (sem agregados) com ISO3, ISO2, código M49, região, rendimento e se é Estado independente. Tabela de referência, corre-se à mão |
| `aviacao.py` | Eurostat (contas de emissões atmosféricas, CO₂ do transporte aéreo) e OurAirports (domínio público) | `aviacao-portugal.json`, `aeroportos.json` e `aviacao-rotas-portugal.json` (voos e passageiros por rota, Eurostat `avia_par_pt`; aquecimento e casas para as equivalências) `aviacao-recursos.json` (querosene fornecido em Portugal, `nrg_bal_c`, e NOx da aviação, `env_ac_ainah_r2`) e `aviacao-tempo.json` (passageiros e voos desde 1970, temperatura NASA, quota no CO₂ da OWID, rotas de Portugal desde 1993), usados por `energia/aviacao.html`; ainda não está no fluxo semanal (corre à mão: `python3 scripts/dados/aviacao.py`). Os fatores por passageiro-km (DESNZ, anual em junho) estão à mão em `aviacao.json` |
| `construcao_textil.py` | Eurostat (CO₂ por atividade, resíduos e população) | `ambiente-construido-portugal.json` e `moda-texteis-portugal.json`, usados por `energia/ambiente-construido.html` e `energia/moda-texteis.html`; corre à mão (`python3 scripts/dados/construcao_textil.py`). Os fatores por tonelada (DESNZ, anual em junho) estão à mão em `ambiente-construido.json` e `moda-texteis.json` |
| `vigia_fontes.py` | APA — Relatório do Estado do Ambiente | não altera dados: abre uma notificação `dados:atualizar` (com os valores lidos da qualidade do ar) quando sai uma edição nova |
| `validar.py` | — | valida estrutura, intervalos e valor mundial antes de publicar |
| `../noticias/arquivar.py` | — | retira das listagens as notícias com prazo terminado |

## Regras
- Nunca se inventa, interpola ou preenche um valor em falta.
- Só observações, últimos valores, sínteses mundiais, períodos e datas são reescritos. Textos
  editoriais (achados contextuais, definições, notas) não são tocados.
- Se uma API falhar ou devolver menos de 98% das observações atuais, esse conjunto não é escrito.
- Só se faz commit se os dados mudaram **e** passam em `validar.py`, o site compila e os testes passam.
- Em caso de falha abre-se (ou atualiza-se) uma notificação com a etiqueta `dados:falha`.

## Uso local
```
python3 scripts/dados/banco_mundial.py [--dry-run] [--only energia,renovaveis,ar]
python3 scripts/dados/ods_onu.py [--dry-run] [--only agua,solo,biodiversidade]
python3 scripts/dados/validar.py
```

## Dados portugueses
- **Automático:** clima do IPMA (acima) e consultas públicas do Participa.pt (fluxo próprio).
- **Automático a partir do REA:** emissões de gases com efeito de estufa, erosão costeira e
  suscetibilidade à desertificação (frases-modelo das fichas; se o formato ou o período mudarem, avisa
  e não escreve). A desertificação usa o ISD (REA 2025); a série antiga, do índice de aridez, fica
  guardada em `solo_stats.json` como «metodologia anterior» e não se compara.
- **Com aviso e revisão humana:** qualidade do ar (textos interpretativos). O vigia avisa quando há
  edição nova do REA. Depois de atualizar, subir `conhecida` em `config/vigia_fontes.json`.
- **Não automatizável com fiabilidade:** área ardida (a cartografia do ICNF não coincide com as
  estatísticas oficiais, por isso não se misturam), séries do Pordata/INE sem código de API estável e
  textos de relatórios.

## Não automatizado (curadoria editorial)
Pecuária, mineração, centros de dados, inventário de espécies, culturas e notícias (aprovação
manual). As traduções têm o seu próprio fluxo.

## Texto fixo que pode ficar desatualizado
Algumas frases editoriais mencionam anos concretos (por exemplo «o último valor JMP refere-se a
2024»). Os intervalos de anos nos cabeçalhos dos gráficos já acompanham os dados.
