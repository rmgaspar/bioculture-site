import json
import time
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

BASE_URL = "https://plantar.pt/plantas/"
OUTPUT_FILE = "plantas.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
}

def clean_text(value):
    if not value:
        return ""
    return re.sub(r"\s+", " ", value).strip()

def get_soup(url):
    r = requests.get(url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    return BeautifulSoup(r.text, "html.parser")

def get_listing_links():
    soup = get_soup(BASE_URL)

    links = []
    seen = set()

    for a in soup.select("a[href]"):
        href = a.get("href", "")
        full_url = urljoin(BASE_URL, href)

        # Mantém só links internos da secção /plantas/
        if "/plantas/" not in full_url:
            continue

        # Evita links genéricos da página principal
        if full_url.rstrip("/") == BASE_URL.rstrip("/"):
            continue

        if full_url not in seen:
            seen.add(full_url)
            links.append(full_url)

    return links

def parse_species_page(url):
    soup = get_soup(url)

    title = clean_text(soup.find("h1").get_text()) if soup.find("h1") else ""

    # Tenta apanhar descrição principal
    description = ""
    for selector in ["main p", ".entry-content p", "article p"]:
        p = soup.select_one(selector)
        if p:
            description = clean_text(p.get_text())
            if description:
                break

    # Tenta apanhar imagem
    image = ""
    img = soup.select_one("meta[property='og:image']")
    if img and img.get("content"):
        image = img["content"]
    else:
        first_img = soup.select_one("img")
        if first_img and first_img.get("src"):
            image = urljoin(url, first_img["src"])

    return {
        "name": title,
        "url": url,
        "image": image,
        "description": description,
    }

def main():
    links = get_listing_links()

    # Remove duplicados e ordena
    links = sorted(set(links))

    species = []
    for i, link in enumerate(links, 1):
        try:
            data = parse_species_page(link)
            species.append(data)
            print(f"[{i}/{len(links)}] OK: {data['name'] or link}")
            time.sleep(0.5)
        except Exception as e:
            print(f"[{i}/{len(links)}] FAIL: {link} -> {e}")

    output = {
        "source": BASE_URL,
        "count": len(species),
        "species": species,
    }

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"Done: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
