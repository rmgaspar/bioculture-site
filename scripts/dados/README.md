# Atualização automática dos dados mundiais

Fluxo: `.github/workflows/atualizar-dados.yml` (quartas-feiras, 05:43 UTC, e manualmente em
*Actions → Atualizar dados do observatório → Run workflow*).

| Script | Fonte | Ficheiros em `data/` |
|---|---|---|
| `banco_mundial.py` | API do Banco Mundial | `energy-*`, `renewables-territory-*`, `air-*` |
| `ods_onu.py` | API dos Indicadores ODS da ONU (UNSD) | `water-*`, `soil-*`, `biodiversity-*` |
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

## Não automatizado (curadoria editorial)
Pecuária, mineração, centros de dados, inventário de espécies, culturas, notícias (aprovação
manual) e os indicadores portugueses (qualidade do ar, solo, observatório da terra). O Participa.pt
e as traduções têm os seus próprios fluxos.

## Texto fixo que pode ficar desatualizado
Algumas frases editoriais mencionam anos concretos (por exemplo «o último valor JMP refere-se a
2024»). Os intervalos de anos nos cabeçalhos dos gráficos já acompanham os dados.
