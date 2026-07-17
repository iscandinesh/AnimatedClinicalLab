import os
from PIL import Image, ImageEnhance, ImageDraw, ImageFilter

artifacts_dir = r"C:\Users\D E L L\.gemini\antigravity-ide\brain\0708e2ce-085c-4e74-9802-af0d14577b03"
dest_dir = r"d:\My project\AnimatedClinicalLab-main\AnimatedClinicalLab-main\wwwroot\images"

# Load background and source images
bg_src = Image.open(os.path.join(artifacts_dir, "erode_base_bg_1784203523617.png")).convert("RGBA")
temple_src = Image.open(r"C:\Users\D E L L\.gemini\antigravity-ide\brain\89c085ef-d0b9-4591-bbb7-f9d891933478\clean_temple_1784282467277.png").convert("RGBA")
bull_src = Image.open(r"C:\Users\D E L L\.gemini\antigravity-ide\brain\89c085ef-d0b9-4591-bbb7-f9d891933478\clean_bull_statue_1784283375369.png").convert("RGBA")
periyar_src = Image.open(os.path.join(artifacts_dir, "media__1784197542795.jpg")).convert("RGBA")
clock_src = Image.open(os.path.join(artifacts_dir, "media__1784197542006.png")).convert("RGBA")
turmeric_src = Image.open(os.path.join(artifacts_dir, "creative_turmeric_1784197669804.png")).convert("RGBA")

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

# --- DESKTOP BANNER (2048 x 600) ---
canvas_w = 2048
canvas_h = 600

# 1. Base Background (resized to 2048x600)
desktop = bg_src.resize((canvas_w, canvas_h), Image.Resampling.LANCZOS)

# 2. Add Temple on the left (w: 550, h: 600, x: 0, y: 0)
temple_w, temple_h = 550, 600
temple_crop = temple_src.resize((temple_w, temple_h), Image.Resampling.LANCZOS)
temple_mask = create_feathered_mask(temple_w, temple_h, fade_right=150, fade_bottom=80)
desktop.paste(temple_crop, (0, 0), temple_mask)

# 3. Add Periyar House (w: 420, h: 420, x: 380, y: 180)
periyar_w, periyar_h = 420, 420
periyar_crop = periyar_src.resize((periyar_w, periyar_h), Image.Resampling.LANCZOS)
periyar_mask = create_feathered_mask(periyar_w, periyar_h, fade_left=80, fade_right=80, fade_top=80, fade_bottom=80)
desktop.paste(periyar_crop, (380, 180), periyar_mask)

# 4. Add Bull Statue in the foreground (w: 480, h: 480, x: 740, y: 120)
bull_w, bull_h = 480, 480
bull_crop = bull_src.resize((bull_w, bull_h), Image.Resampling.LANCZOS)
bull_mask = create_feathered_mask(bull_w, bull_h, fade_left=100, fade_right=100, fade_top=80, fade_bottom=80)
desktop.paste(bull_crop, (740, 120), bull_mask)

# 5. Add Clock Tower (w: 420, h: 600, x: 1150, y: 0)
clock_w, clock_h = 420, 600
clock_crop = clock_src.resize((clock_w, clock_h), Image.Resampling.LANCZOS)
clock_mask = create_feathered_mask(clock_w, clock_h, fade_left=120, fade_right=120, fade_bottom=100)
desktop.paste(clock_crop, (1150, 0), clock_mask)

# 6. Add Turmeric on the bottom right (w: 600, h: 480, x: 1448, y: 120)
turmeric_w, turmeric_h = 600, 480
turmeric_crop = turmeric_src.resize((turmeric_w, turmeric_h), Image.Resampling.LANCZOS)
turmeric_mask = create_feathered_mask(turmeric_w, turmeric_h, fade_left=150, fade_top=100, fade_bottom=80)
desktop.paste(turmeric_crop, (1448, 120), turmeric_mask)

# Apply color grading to match Tiruppur aesthetic
# Desaturate slightly (0.75 saturation)
converter = ImageEnhance.Color(desktop)
desktop = converter.enhance(0.70)

# Darken slightly (0.75 brightness)
brightness_enhancer = ImageEnhance.Brightness(desktop)
desktop = brightness_enhancer.enhance(0.70)

# Apply dark blue gradient overlay vignette
overlay = Image.new("RGBA", (canvas_w, canvas_h), (9, 12, 21, 0))
draw = ImageDraw.Draw(overlay)

for x in range(canvas_w):
    dist_from_center = abs(x - canvas_w // 2) / (canvas_w // 2)
    alpha = int(90 + 90 * dist_from_center) # 90 to 180 (35% to 70% opacity)
    draw.line([(x, 0), (x, canvas_h)], fill=(9, 15, 27, alpha))

final_desktop = Image.alpha_composite(desktop, overlay).convert("RGB")
final_desktop.save(os.path.join(dest_dir, "erode-famous-banner-desktop.png"), "PNG")
print("Saved Desktop Custom Composite Banner successfully!")


# --- MOBILE BANNER (800 x 1200) ---
m_w = 800
m_h = 1200

# 1. Base Background (resized to 800x1200)
mobile = bg_src.resize((m_w, m_h), Image.Resampling.LANCZOS)

# 2. Add Temple on the top (w: 800, h: 320, x: 0, y: 0)
m_temple_h = 320
m_temple_crop = temple_src.resize((m_w, m_temple_h), Image.Resampling.LANCZOS)
m_temple_mask = create_feathered_mask(m_w, m_temple_h, fade_bottom=60)
mobile.paste(m_temple_crop, (0, 0), m_temple_mask)

# 3. Add Periyar House (w: 800, h: 280, x: 0, y: 250)
m_periyar_h = 280
m_periyar_crop = periyar_src.resize((m_w, m_periyar_h), Image.Resampling.LANCZOS)
m_periyar_mask = create_feathered_mask(m_w, m_periyar_h, fade_top=60, fade_bottom=60)
mobile.paste(m_periyar_crop, (0, 250), m_periyar_mask)

# 4. Add Bull Statue (w: 800, h: 320, x: 0, y: 480)
m_bull_h = 320
m_bull_crop = bull_src.resize((m_w, m_bull_h), Image.Resampling.LANCZOS)
m_bull_mask = create_feathered_mask(m_w, m_bull_h, fade_top=60, fade_bottom=60)
mobile.paste(m_bull_crop, (0, 480), m_bull_mask)

# 5. Add Clock Tower (w: 800, h: 300, x: 0, y: 750)
m_clock_h = 300
m_clock_crop = clock_src.resize((m_w, m_clock_h), Image.Resampling.LANCZOS)
m_clock_mask = create_feathered_mask(m_w, m_clock_h, fade_top=60, fade_bottom=60)
mobile.paste(m_clock_crop, (0, 750), m_clock_mask)

# 6. Add Turmeric on the bottom (w: 800, h: 300, x: 0, y: 950)
m_turmeric_h = 300
m_turmeric_crop = turmeric_src.resize((m_w, m_turmeric_h), Image.Resampling.LANCZOS)
m_turmeric_mask = create_feathered_mask(m_w, m_turmeric_h, fade_top=60)
mobile.paste(m_turmeric_crop, (0, 950), m_turmeric_mask)

# Color grade mobile version
converter_m = ImageEnhance.Color(mobile)
mobile = converter_m.enhance(0.70)

brightness_m = ImageEnhance.Brightness(mobile)
mobile = brightness_m.enhance(0.70)

# Mobile overlay (vertical gradient vignette)
m_overlay = Image.new("RGBA", (m_w, m_h), (9, 12, 21, 0))
draw_m_overlay = ImageDraw.Draw(m_overlay)

for y in range(m_h):
    dist_from_center = abs(y - m_h // 2) / (m_h // 2)
    alpha = int(120 + 80 * dist_from_center) # 120 to 200 opacity
    draw_m_overlay.line([(0, y), (m_w, y)], fill=(9, 15, 27, alpha))

final_mobile = Image.alpha_composite(mobile, m_overlay).convert("RGB")
final_mobile.save(os.path.join(dest_dir, "erode-famous-banner-mobile.png"), "PNG")
print("Saved Mobile Custom Composite Banner successfully!")
