import os
import requests

base_path = "/Users/ricardogaspar/Documents/PERSONAL/bioCulture/site_bioculture/images"
if not os.path.exists(base_path):
    os.makedirs(base_path)

images_map = {
    "agua.jpg": "https://plus.unsplash.com/premium_photo-1683288081743-5161d099f16e?q=80&w=1035&auto=format&fit=crop",
    "ar.jpg": "https://plus.unsplash.com/premium_photo-1668241683623-5f94424a9fe8?q=80&w=987&auto=format&fit=crop",
    "solo.jpg": "https://plus.unsplash.com/premium_photo-1779486080078-3785b006c212?q=80&w=2070&auto=format&fit=crop",
    "biodiversidade.jpg": "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?q=80&w=2070&auto=format&fit=crop",
    "biodiversidade1.jpg": "https://images.unsplash.com/photo-1641959166364-6c9b9898e804?q=80&w=2071&auto=format&fit=crop",
    "biodiversidade2.jpg": "https://images.unsplash.com/photo-1586400792375-d6b8f82db2e6?q=80&w=2071&auto=format&fit=crop",
    "index.jpg": "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?q=80&w=2070&auto=format&fit=crop",
    "index1.jpg": "https://images.unsplash.com/photo-1641959166364-6c9b9898e804?q=80&w=2071&auto=format&fit=crop",
    "index2.jpg": "https://images.unsplash.com/photo-1586400792375-d6b8f82db2e6?q=80&w=2071&auto=format&fit=crop"
}

def download_images():
    print(f"Iniciando download para: {base_path}\n")
    headers = {"User-Agent": "Mozilla/5.0"}
    for filename, url in images_map.items():
        try:
            response = requests.get(url, headers=headers, stream=True)
            if response.status_code == 200:
                file_path = os.path.join(base_path, filename)
                with open(file_path, 'wb') as f:
                    for chunk in response.iter_content(1024):
                        f.write(chunk)
                print(f"✓ Sucesso: {filename}")
            else:
                print(f"✗ Erro {response.status_code} em {filename}")
        except Exception as e:
            print(f"✗ Falha em {filename}: {str(e)}")

if __name__ == "__main__":
    download_images()
