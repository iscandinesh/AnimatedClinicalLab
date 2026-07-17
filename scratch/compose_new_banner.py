import os
from PIL import Image, ImageEnhance, ImageDraw, ImageFilter

artifacts_dir = r"C:\Users\D E L L\.gemini\antigravity-ide\brain\0708e2ce-085c-4e74-9802-af0d14577b03"
dest_dir = r"d:\My project\AnimatedClinicalLab-main\AnimatedClinicalLab-main\wwwroot\images"

# Get current directory and locate brain folder dynamically
current_brain_dir = r"C:\Users\D E L L\.gemini\antigravity-ide\brain\de37b8fb-246e-4094-812b-6dbbb788c602"

# Load background and source images
bg_src = Image.open(os.path.join(artifacts_dir, "erode_base_bg_1784203523617.png")).convert("RGBA")
temple_src = Image.open(r"C:\Users\D E L L\.gemini\antigravity-ide\brain\89c085ef-d0b9-4591-bbb7-f9d891933478\no_gate_temple_1784288415771.png").convert("RGBA")
bull_src = Image.open(r"C:\Users\D E L L\.gemini\antigravity-ide\brain\89c085ef-d0b9-4591-bbb7-f9d891933478\clean_bull_statue_1784283375369.png").convert("RGBA")
periyar_src = Image.open(r"C:\Users\D E L L\.gemini\antigravity-ide\brain\89c085ef-d0b9-4591-bbb7-f9d891933478\clean_periyar_house_1784288715669.png").convert("RGBA")
clock_src = Image.open(os.path.join(artifacts_dir, "media__1784197542006.png")).convert("RGBA")
turmeric_src = Image.open(os.path.join(artifacts_dir, "creative_turmeric_1784197669804.png")).convert("RGBA")

# Locate Kaveri river image dynamically in current brain directory
kaveri_path = None
for f in os.listdir(current_brain_dir):
    if f.startswith("kaveri_river_erode") and f.endswith(".png"):
        kaveri_path = os.path.join(current_brain_dir, f)
        break

if not kaveri_path:
    raise FileNotFoundError("Kaveri river image not found in current brain directory!")

kaveri_src = Image.open(kaveri_path).convert("RGBA")

def create_feathered_mask(w, h, fade_left=0, fade_right=0, fade_top=0, fade_bottom=0):
    mask = Image.new("L", (w, h), 255)
    draw = ImageDraw.Draw(mask)
    
    # Left edge fade
    if fade_left > 0:
        for x in range(fade_left):
            val = int(255 * (x / fade_left))
            for y in range(h):
                current_val = mask.getpixel((x, y))
                mask.putpixel((x, y), min(current_val, val))
                
    # Right edge fade
    if fade_right > 0:
        for x in range(fade_right):
            target_x = w - 1 - x
            val = int(255 * (x / fade_right))
            for y in range(h):
                current_val = mask.getpixel((target_x, y))
                mask.putpixel((target_x, y), min(current_val, val))
                
    # Top edge fade
    if fade_top > 0:
        for y in range(fade_top):
            val = int(255 * (y / fade_top))
            for x in range(w):
                current_val = mask.getpixel((x, y))
                mask.putpixel((x, y), min(current_val, val))
                
    # Bottom edge fade
    if fade_bottom > 0:
        for y in range(fade_bottom):
            target_y = h - 1 - y
            val = int(255 * (y / fade_bottom))
            for x in range(w):
                current_val = mask.getpixel((x, target_y))
                mask.putpixel((x, target_y), min(current_val, val))
                
    return mask

# --- DESKTOP BANNER (4096 x 1200 - Full HD / 4K Crisp) ---
canvas_w = 4096
canvas_h = 1200

# 1. Base Background: Kaveri River blurred and blended with bg_src
kaveri_bg = kaveri_src.resize((canvas_w, canvas_h), Image.Resampling.LANCZOS)
kaveri_bg_blurred = kaveri_bg.filter(ImageFilter.GaussianBlur(radius=16))

# Blend with base background
bg_blend = Image.blend(bg_src.resize((canvas_w, canvas_h), Image.Resampling.LANCZOS), kaveri_bg_blurred, 0.65)
desktop = bg_blend.copy()

# 2. Add Clock Tower on the left (swapped) (w: 840, h: 1200, x: 0, y: 0)
clock_w, clock_h = 840, 1200
clock_crop = clock_src.resize((clock_w, clock_h), Image.Resampling.LANCZOS)
clock_mask = create_feathered_mask(clock_w, clock_h, fade_right=280, fade_bottom=160)
desktop.paste(clock_crop, (0, 0), clock_mask)

# 3. Add Kaveri River panel (w: 880, h: 1000, x: 640, y: 200)
kaveri_p_w, kaveri_p_h = 880, 1000
kaveri_p_crop = kaveri_src.resize((kaveri_p_w, kaveri_p_h), Image.Resampling.LANCZOS)
kaveri_p_mask = create_feathered_mask(kaveri_p_w, kaveri_p_h, fade_left=180, fade_right=180, fade_top=160, fade_bottom=160)
desktop.paste(kaveri_p_crop, (640, 200), kaveri_p_mask)

# 4. Add Bull Statue in the middle (w: 840, h: 960, x: 1150, y: 240)
bull_w, bull_h = 840, 960
bull_crop = bull_src.resize((bull_w, bull_h), Image.Resampling.LANCZOS)
bull_mask = create_feathered_mask(bull_w, bull_h, fade_left=180, fade_right=180, fade_top=160, fade_bottom=160)
desktop.paste(bull_crop, (1150, 240), bull_mask)

# 5. Add Temple in the middle-right (w: 1100, h: 1200, x: 1750, y: 0)
# Zoom by cropping the 1024x1024 image to a smaller central region
crop_box = (100, 0, 924, 900) # Width: 824, Height: 900 (AR ~0.91)
temple_zoomed = temple_src.crop(crop_box)
temple_w, temple_h = 1100, 1200 # Resized to fill height and be wider (AR 0.91)
temple_crop = temple_zoomed.resize((temple_w, temple_h), Image.Resampling.LANCZOS)
temple_mask = create_feathered_mask(temple_w, temple_h, fade_left=250, fade_right=250, fade_bottom=0)
desktop.paste(temple_crop, (1750, 0), temple_mask)

# 6. Add Periyar House on the right (w: 720, h: 840, x: 2520, y: 360)
periyar_w, periyar_h = 720, 840
periyar_crop = periyar_src.resize((periyar_w, periyar_h), Image.Resampling.LANCZOS)
periyar_mask = create_feathered_mask(periyar_w, periyar_h, fade_left=160, fade_right=160, fade_top=160, fade_bottom=160)
desktop.paste(periyar_crop, (2520, 360), periyar_mask)

# 7. Add Turmeric on the bottom right (w: 960, h: 960, x: 3040, y: 240)
turmeric_w, turmeric_h = 960, 960
turmeric_crop = turmeric_src.resize((turmeric_w, turmeric_h), Image.Resampling.LANCZOS)
turmeric_mask = create_feathered_mask(turmeric_w, turmeric_h, fade_left=240, fade_top=200, fade_bottom=160)
desktop.paste(turmeric_crop, (3040, 240), turmeric_mask)

# Apply color grading to match aesthetic and provide high text contrast
# Saturation: 1.00
converter = ImageEnhance.Color(desktop)
desktop = converter.enhance(1.00)

# Brightness: 0.92 (Make the whole image brighter)
brightness_enhancer = ImageEnhance.Brightness(desktop)
desktop = brightness_enhancer.enhance(0.92)

# Apply dark blue gradient overlay vignette to ensure readability in the center
# and high visibility for the statues on the sides
overlay = Image.new("RGBA", (canvas_w, canvas_h), (9, 12, 21, 0))
draw = ImageDraw.Draw(overlay)

for x in range(canvas_w):
    dist_from_center = abs(x - canvas_w // 2) / (canvas_w // 2)
    # 130 opacity in the center (for high text readability)
    # and 30 opacity at the edges (to make the side statues clear and visible)
    alpha = int(130 - 100 * dist_from_center) 
    draw.line([(x, 0), (x, canvas_h)], fill=(9, 15, 27, alpha))

final_desktop = Image.alpha_composite(desktop, overlay).convert("RGB")
final_desktop.save(os.path.join(dest_dir, "erode-famous-banner-desktop.png"), "PNG")
final_desktop.save(os.path.join(dest_dir, "erode-famous-banner-desktop.jpg"), "JPEG", quality=98)
print("Saved HD Desktop Banner successfully!")


# --- MOBILE BANNER (1600 x 2400 - Full HD / Retina Crisp) ---
m_w = 1600
m_h = 2400

# 1. Base Background: Kaveri River blurred and blended with bg_src
kaveri_bg_m = kaveri_src.resize((m_w, m_h), Image.Resampling.LANCZOS)
kaveri_bg_m_blurred = kaveri_bg_m.filter(ImageFilter.GaussianBlur(radius=20))
bg_blend_m = Image.blend(bg_src.resize((m_w, m_h), Image.Resampling.LANCZOS), kaveri_bg_m_blurred, 0.65)
mobile = bg_blend_m.copy()

# 2. Add Clock Tower at top (swapped) (w: 1600, h: 640, x: 0, y: 0)
m_clock_h = 640
m_clock_crop = clock_src.resize((m_w, m_clock_h), Image.Resampling.LANCZOS)
m_clock_mask = create_feathered_mask(m_w, m_clock_h, fade_bottom=160)
mobile.paste(m_clock_crop, (0, 0), m_clock_mask)

# 3. Add Kaveri River panel (w: 1600, h: 560, x: 0, y: 480)
m_kaveri_h = 560
m_kaveri_crop = kaveri_src.resize((m_w, m_kaveri_h), Image.Resampling.LANCZOS)
m_kaveri_mask = create_feathered_mask(m_w, m_kaveri_h, fade_top=120, fade_bottom=120)
mobile.paste(m_kaveri_crop, (0, 480), m_kaveri_mask)

# 4. Add Bull Statue (w: 1600, h: 600, x: 0, y: 920)
m_bull_h = 600
m_bull_crop = bull_src.resize((m_w, m_bull_h), Image.Resampling.LANCZOS)
m_bull_mask = create_feathered_mask(m_w, m_bull_h, fade_top=120, fade_bottom=120)
mobile.paste(m_bull_crop, (0, 920), m_bull_mask)

# 5. Add Periyar House (w: 1600, h: 560, x: 0, y: 1360)
m_periyar_h = 560
m_periyar_crop = periyar_src.resize((m_w, m_periyar_h), Image.Resampling.LANCZOS)
m_periyar_mask = create_feathered_mask(m_w, m_periyar_h, fade_top=120, fade_bottom=120)
mobile.paste(m_periyar_crop, (0, 1360), m_periyar_mask)

# 6. Add Temple (swapped) (w: 1600, h: 900, x: 0, y: 1700)
# Zoom by cropping to keep correct aspect ratio and avoid distortion
m_crop_box = (0, 100, 1024, 700) # AR ~1.7
m_temple_zoomed = temple_src.crop(m_crop_box)
m_temple_h = 900
m_temple_crop = m_temple_zoomed.resize((m_w, m_temple_h), Image.Resampling.LANCZOS)
m_temple_mask = create_feathered_mask(m_w, m_temple_h, fade_top=150, fade_bottom=0)
mobile.paste(m_temple_crop, (0, 1700), m_temple_mask)

# 7. Add Turmeric on the bottom (w: 1600, h: 480, x: 0, y: 2080)
m_turmeric_h = 480
m_turmeric_crop = turmeric_src.resize((m_w, m_turmeric_h), Image.Resampling.LANCZOS)
m_turmeric_mask = create_feathered_mask(m_w, m_turmeric_h, fade_top=120)
mobile.paste(m_turmeric_crop, (0, 2080), m_turmeric_mask)

# Color grade mobile version
converter_m = ImageEnhance.Color(mobile)
mobile = converter_m.enhance(1.00)

brightness_m = ImageEnhance.Brightness(mobile)
mobile = brightness_m.enhance(0.92)

# Mobile overlay (vertical gradient vignette) to improve contrast
m_overlay = Image.new("RGBA", (m_w, m_h), (9, 12, 21, 0))
draw_m_overlay = ImageDraw.Draw(m_overlay)

for y in range(m_h):
    dist_from_center = abs(y - m_h // 2) / (m_h // 2)
    alpha = int(130 - 100 * dist_from_center)
    draw_m_overlay.line([(0, y), (m_w, y)], fill=(9, 15, 27, alpha))

final_mobile = Image.alpha_composite(mobile, m_overlay).convert("RGB")
final_mobile.save(os.path.join(dest_dir, "erode-famous-banner-mobile.png"), "PNG")
final_mobile.save(os.path.join(dest_dir, "erode-famous-banner-mobile.jpg"), "JPEG", quality=98)
print("Saved HD Mobile Banner successfully!")
