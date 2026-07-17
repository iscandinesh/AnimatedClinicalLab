import os
from PIL import Image

artifacts_dir = r"C:\Users\D E L L\.gemini\antigravity-ide\brain\0708e2ce-085c-4e74-9802-af0d14577b03"

images = {
    "Clock Tower": "media__1784197542006.png",
    "Bull Statue": "media__1784197542037.jpg",
    "Turmeric": "creative_turmeric_1784197669804.png",
    "Thindal Temple": "media__1784197542737.jpg",
    "Periyar House": "media__1784197542795.jpg"
}

for name, filename in images.items():
    path = os.path.join(artifacts_dir, filename)
    if os.path.exists(path):
        with Image.open(path) as img:
            print(f"{name}: {img.size} ({img.format})")
    else:
        print(f"{name} NOT FOUND at {path}")
