# Originais (não publicados)

Ficheiros-mestre em alta resolução das ilustrações do site. As páginas usam as versões
otimizadas em `images/` (normalmente `.webp`); esta pasta não faz parte do build
(`scripts/build-pages.mjs` só publica as pastas listadas em `publicEntries`).

Para gerar uma versão web a partir de um original:

```bash
cwebp -q 82 -resize 900 0 originais/imagens/NOME.png -o images/NOME.webp
```
