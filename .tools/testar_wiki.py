import requests
import urllib.parse

def testar(termo):
    url = f"https://pt.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(termo)}"
    r = requests.get(url)
    print(f"Testando: {termo}")
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        print(f"Resposta: {r.json().get('extract')[:100]}...")
    else:
        print("Erro: Não encontrado ou bloqueado.")

testar("Sus scrofa") # Javali Nome Científico
testar("Javali")     # Javali Nome Comum
