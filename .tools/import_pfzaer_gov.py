import requests
import json
import zipfile
import io
import os
import shapefile

def sync_paer_biocultura():
    # Dataset ID oficial no dados.gov.pt
    api_url = "https://dados.gov.pt/api/1/datasets/potenciais-areas-de-aceleracao-de-energias-renovaveis-paer/"
    output_json = 'paer.json'
    
    try:
        print("-> A consultar portal dados.gov.pt para evitar 404...")
        ds_res = requests.get(api_url, timeout=20)
        ds_res.raise_for_status()
        resources = ds_res.json().get('resources', [])
        
        # Procura o link do ZIP (Shapefile) dinamicamente
        download_url = next((r['url'] for r in resources if 'zip' in r['format'].lower() or 'shape' in r['title'].lower()), None)
        
        if not download_url:
            # Fallback para o link do IPMA (PAER Marinho 2025/2026) se o LNEG falhar
            download_url = "https://geoportal.lneg.pt/pt/dados_abertos/download_ficheiro?id=4004&tipo=shapefile"

        print(f"-> A descarregar de: {download_url}")
        r = requests.get(download_url, timeout=60)
        r.raise_for_status()

        # Processamento do ZIP
        with zipfile.ZipFile(io.BytesIO(r.content)) as z:
            z.extractall("temp_paer")

        shp_path = next((os.path.join(root, f) for root, _, files in os.walk("temp_paer") for f in files if f.endswith(".shp")), None)
        
        if not shp_path:
            print("Erro: Shapefile não encontrado no pacote descarregado.")
            return

        # Conversão para GeoJSON (Estrutura bioCultura)
        reader = shapefile.Reader(shp_path)
        fields = [f[0] for f in reader.fields[1:]]
        features = []
        
        for sr in reader.shapeRecords():
            features.append({
                "type": "Feature",
                "geometry": sr.shape.__geo_interface__,
                "properties": dict(zip(fields, sr.record))
            })

        with open(output_json, 'w', encoding='utf-8') as f:
            json.dump({"type": "FeatureCollection", "features": features}, f, ensure_ascii=False, indent=2)
            
        print(f"-> Sucesso: {output_json} gerado com {len(features)} áreas de aceleração.")

    except Exception as e:
        print(f"-> Falha crítica: {e}")

if __name__ == "__main__":
    sync_paer_biocultura()
