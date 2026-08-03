import requests
from bs4 import BeautifulSoup
import json
import time

def extrair():
    base = "https://www.hortasbiologicas.pt"
    # Adicionamos o User-Agent de um browser real
    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}
    categorias = ["consociacoes", "fichas-tecnicas", "pragas-e-doencas"]
    resultados = []

    for cat in categorias:
        url = f"{base}/category/{cat}/"
        try:
            r = requests.get(url, headers=headers, timeout=10)
            soup = BeautifulSoup(r.text, 'html.parser')
            # O site usa h2.entry-title para os links
            artigos = soup.select('article')
            for art in artigos:
                t_el = art.select_one('.entry-title a')
                p_el = art.select_one('.entry-content p') or art.select_one('.entry-summary p')
                if t_el:
                    resultados.append({
                        "id": t_el.get_text().strip().lower().replace(" ","-")[:30],
                        "categoria": cat.replace("-"," ").title(),
                        "titulo": t_el.get_text().strip(),
                        "resumo": p_el.get_text().strip()[:200] + "..." if p_el else "Consultar detalhe.",
                        "url_original": t_el['href'],
                        "fonte": "Hortas Biológicas"
                    })
            time.sleep(2)
        except Exception as e: print(f"Erro em {cat}: {e}")

    with open('data/dicas.json', 'w', encoding='utf-8') as f:
        json.dump(resultados, f, ensure_ascii=False, indent=2)
    print(f"Finalizado: {len(resultados)} dicas extraídas.")

if __name__ == "__main__":
    extrair()
