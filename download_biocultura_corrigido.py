import os
import requests

base_path = "/Users/ricardogaspar/Documents/PERSONAL/bioCulture/site_bioculture/images"
if not os.path.exists(base_path):
    os.makedirs(base_path)

images_map = {
    # IMPACTO DIGITAL & IA
    "digital_ia.jpg": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop",
    "digital_ia1.jpg": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop",
    "digital_ia2.jpg": "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop",
    
    # MINERAÇÃO
    "mineracao.jpg": "https://www.portal-energia.com/wp-content/uploadsthumbs/minas-extracao-litio-1-jpg.webp",
    "mineracao1.jpg": "https://www.digitaljournal.com/wp-content/uploads/2022/10/5fa2ac7a94d70995551982f885cc8d6ee939a3b0.jpg",
    "mineracao2.jpg": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQBrhptfcXgTpqBNNqBK8FTb6hHtayv5ZaMFn4TX1oCvt9XjHGJ5_wvjSto&s=10",
    "mineracao3.jpg": "https://ichef.bbci.co.uk/ace/ws/640/cpsprodpb/ab11/live/9dd053e0-656a-11f0-9c94-35a6128c06e3.jpg.webp",
    
    # TRANSIÇÃO ÉTICA
    "transicao_etica.jpg": "https://plus.unsplash.com/premium_photo-1678743133488-3e3400aafee2?q=80&w=2071&auto=format&fit=crop",
    "transicao_etica1.jpg": "https://images.unsplash.com/photo-1610028290816-5d937a395a49?q=80&w=2071&auto=format&fit=crop",
    "transicao_etica2.jpg": "https://images.unsplash.com/photo-1543484967-376c003831e0?q=80&w=2071&auto=format&fit=crop",
    "transicao_etica3.jpg": "https://images.unsplash.com/photo-1718110445810-ff0949d21b50?q=80&w=1975&auto=format&fit=crop",
    
    # PECUÁRIA INDUSTRIAL
    "pecuaria.jpg": "https://thumbs.web.sapo.io/?H=960&W=1920&crop=center&delay_optim=1&epic=V2%3AJdTaKqprM%2FfJ4ZwdeWMDUh5%2F8z56LNoI9ex5tQdkxP33aeSOmyagQC9zhbgqqGIOgilqb9wISvZ%2FQFd%2B0Tqza8seOv3YFkATxd2StjVokI3LPrd84sPyb0%2B2BSf7UMqB5np64vJZjKbaHpCjVkbKejPl7tS4ga0onXiFU3xCvUSz3pinAJ85PIZl2BGpAWma6YhNALWhmdwiUVrjcXGu2yveakXfXXz%2BodmjYTIAWnArm%2FIIWcbhBhyWN4kWWW5p&webp=1&Q=50&tv=1",
    "pecuaria1.jpg": "https://imagens.publico.pt/imagens.aspx/1988274?tp=UH&db=IMAGENS&type=JPG",
    "pecuaria2.jpg": "https://images.unsplash.com/photo-1580570598977-4b2412d01bbc?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8cmViYW5obyUyMGRlJTIwdmFjYXN8ZW58MHx8MHx8fDA%3D",
    
    # ENERGIA (USO CONSCIENTE)
    "energia.jpg": "https://images.unsplash.com/photo-1586071921485-4c493567232c?q=80&w=2070&auto=format&fit=crop",
    "energia1.jpg": "https://plus.unsplash.com/premium_photo-1679953756235-b26cddf1eb1c?q=80&w=2532&auto=format&fit=crop",
    "energia2.jpg": "https://plus.unsplash.com/premium_photo-1754211718037-469956c9709f?q=80&w=2486&auto=format&fit=crop",
    "energia3.jpg": "https://images.unsplash.com/photo-1548337138-e87d889cc369?q=80&w=2096&auto=format&fit=crop"
}

def download_images():
    print(f"A iniciar download das imagens atuais para: {base_path}\n")
    headers = {"User-Agent": "Mozilla/5.0"}
    for filename, url in images_map.items():
        try:
            response = requests.get(url, headers=headers, stream=True, timeout=15)
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
