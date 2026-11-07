#!/usr/bin/env bash
# Atualiza as consultas do Participa.pt a partir deste computador (o Participa.pt recusa os servidores do GitHub),
# valida os dados, confirma que o site compila e publica só se houver alterações.
set -euo pipefail
cd "$(dirname "$0")/../.."
git pull --rebase -q origin main
python3 scripts/participa/atualizar.py
python3 -m json.tool data/zaer_critico.json >/dev/null
python3 -m json.tool data/noticias_propostas.json >/dev/null
node --test scripts/tests/ >/dev/null
if git diff --quiet -- data/zaer_critico.json data/noticias_propostas.json; then
  echo "Sem alterações no Participa.pt."
  exit 0
fi
git add data/zaer_critico.json data/noticias_propostas.json
git commit -q -m "Participa.pt: atualizar consultas públicas (a partir do computador, $(date +%F))"
git pull --rebase -q origin main
git push -q origin HEAD:main
echo "Consultas atualizadas e publicadas."
