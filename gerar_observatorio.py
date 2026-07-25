import pandas as pd
import json
import os
from datetime import datetime

def gerar_json():
    observatorio = {
        "config": {
            "ultima_atualizacao": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "fontes": "INE, ICNF, IPMA, ERSAR, PORDATA"
        },
        "datasets": {}
    }

    fontes = {
        "incendios": "area_ardida.csv",
        "agricultura": "producao_agricola.csv",
        "carne": "producao_carne.csv",
        "temperatura": "clima_portugal.csv",
        "agua": "consumo_agua.csv"
    }

    for chave, ficheiro in fontes.items():
        if os.path.exists(ficheiro):
            df = pd.read_csv(ficheiro)
            df['Ano'] = df['Ano'].astype(int)
            df = df.sort_values('Ano')
            observatorio["datasets"][chave] = dict(zip(df['Ano'].astype(str), df['Valor']))
            print(f"✓ {chave}: Processado.")
        else:
            print(f"x {ficheiro}: Não encontrado.")

    with open('observatorio.json', 'w', encoding='utf-8') as f:
        json.dump(observatorio, f, indent=4, ensure_ascii=False)
    print("\n'observatorio.json' gerado com sucesso.")

if __name__ == "__main__":
    gerar_json()
