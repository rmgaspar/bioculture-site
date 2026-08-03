import requests
import json
import time
import urllib.parse
import sys

def get_wiki(term, lang="pt"):
    # A Wikipedia exige um User-Agent descritivo para evitar o erro 403
    headers = {
        'User-Agent': 'bioCulturaBot/1.0 (https://biocultura.net; contato@biocultura.net)'
    }
    url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(term)}"
    
    try:
        r = requests.get(url, headers=headers, timeout=5)
        if r.status_code == 200:
            return r.json().get('extract')
        elif r.status_code == 403:
            print(f"\n[ERRO 403] Bloqueio de acesso. Tenta mudar de IP ou aguarda uns minutos.")
            return "BLOQUEADO"
    except:
        return None
    return None

def enriquecer_total():
    with open('data/especies_master.json', 'r', encoding='utf-8') as f:
        master = json.load(f)

    total = len(master)
    print(f"Iniciando processamento de {total} espécies com bypass 403...")
    
    novos = 0
    processados = 0

    for esp_id, info in master.items():
        processados += 1
        sintese = info.get('sintese', '')
        
        # Condição de gatilho: atualiza se for genérico ou curto
        if len(sintese) < 200 or "foi registada" in sintese:
            sc_name = info.get('nome_cientifico', '')
            common_name = info.get('nome', '')

            # Feedback no terminal
            sys.stdout.write(f"\rProgresso: {processados}/{total} | Novos: {novos} | A tentar: {common_name[:15]}... ")
            sys.stdout.flush()

            # Tenta PT Científico -> PT Comum -> EN Científico
            resumo = get_wiki(sc_name, "pt")
            if not resumo: resumo = get_wiki(common_name, "pt")
            if not resumo and sc_name: resumo = get_wiki(sc_name, "en")

            if resumo == "BLOQUEADO":
                break # Pára o script se o IP for banido

            if resumo:
                info['sintese'] = resumo
                novos += 1
            
            # Aumentar ligeiramente o delay para não ser banido novamente
            time.sleep(0.3)

        # Grava a cada 20 espécies para não perder progresso
        if processados % 20 == 0:
            with open('data/especies_master.json', 'w', encoding='utf-8') as f:
                json.dump(master, f, ensure_ascii=False, indent=2)

    # Gravação final
    with open('data/especies_master.json', 'w', encoding='utf-8') as f:
        json.dump(master, f, ensure_ascii=False, indent=2)

    print(f"\n\nConcluído! {novos} descrições reais adicionadas.")

if __name__ == "__main__":
    enriquecer_total()
