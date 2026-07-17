import os
from PIL import Image, ImageEnhance, ImageDraw, ImageFilter

artifacts_dir = r"C:\Users\D E L L\.gemini\antigravity-ide\brain\0708e2ce-085c-4e74-9802-af0d14577b03"
dest_dir = r"d:\My project\AnimatedClinicalLab-main\AnimatedClinicalLab-main\wwwroot\images"

# Input paths
paths = {
    "periyar": r"C:\Users\D E L L\.gemini\antigravity-ide\brain\89c085ef-d0b9-4591-bbb7-f9d891933478\clean_periyar_house_1784288715669.png",
    "clock": os.path.join(artifacts_dir, "media__1784197542006.png"),
    "bull": r"C:\Users\D E L L\.gemini\antigravity-ide\brain\89c085ef-d0b9-4591-bbb7-f9d891933478\clean_bull_statue_1784283375369.png",
    "temple": r"C:\Users\D E L L\.gemini\antigravity-ide\brain\89c085ef-d0b9-4591-bbb7-f9d891933478\no_gate_temple_1784288415771.png",
    "turmeric": os.path.join(artifacts_dir, "creative_turmeric_1784197669804.png")
}

# Load images
imgs = {}
for name, p in paths.items():
    imgs[name] = Image.open(p).convert("RGBA")

def crop_and_resize(img, target_w, target_h):
    # Crop to fill target size
    img_w, img_h = img.size
    aspect_target = target_w / target_h
    aspect_img = img_w / img_h
    
    if aspect_img > aspect_target:
        # Image is wider than target aspect ratio
        new_w = int(img_h * aspect_target)
        offset_x = (img_w - new_w) // 2
        img = img.crop((offset_x, 0, offset_x + new_w, img_h))
    else:
        # Image is taller than target aspect ratio
        new_h = int(img_w / aspect_target)
        offset_y = (img_h - new_h) // 2
        img = img.crop((0, offset_y, img_w, offset_y + new_h))
        
    return img.resize((target_w, target_h), Image.Resampling.LANCZOS)

# Create Desktop Banner (widescreen collage: 2500 x 600)
# 5 images. Let's make each panel 600 wide and overlap by 125 pixels.
# Total width: 5 * 600 - 4 * 125 = 3000 - 500 = 2500!
# Perfect math!
panel_w = 600
panel_h = 600
overlap = 125

desktop_canvas = Image.new("RGBA", (2500, 600), (0, 0, 0, 0))

# Processed panels
panels = [
    crop_and_resize(imgs["periyar"], panel_w, panel_h),
    crop_and_resize(imgs["clock"], panel_w, panel_h),
    crop_and_resize(imgs["bull"], panel_w, panel_h),
    crop_and_resize(imgs["temple"], panel_w, panel_h),
    crop_and_resize(imgs["turmeric"], panel_w, panel_h)
]

# Merge horizontally with smooth transitions
# We'll create alpha masks for the transitions
for i, panel in enumerate(panels):
    # Base position
    x_pos = i * (panel_w - overlap)
    
    # Create mask for this panel
    mask = Image.new("L", (panel_w, panel_h), 255)
    draw = ImageDraw.Draw(mask)
    
    # Fade left edge (except for first image)
    if i > 0:
        for x in range(overlap):
            alpha = int(255 * (x / overlap))
            draw.line([(x, 0), (x, panel_h)], fill=alpha)
            
    # Fade right edge (except for last image)
    if i < len(panels) - 1:
        for x in range(overlap):
            alpha = int(255 * (1.0 - (x / overlap)))
            draw.line([(panel_w - overlap + x, 0), (panel_w - overlap + x, panel_h)], fill=alpha)
            
    # Paste panel onto canvas using the mask
    desktop_canvas.paste(panel, (x_pos, 0), mask)

# Apply a dark theme grading to make text readable and blend cohesively
# 1. Desaturate slightly (0.75 saturation)
converter = ImageEnhance.Color(desktop_canvas)
desktop_canvas = converter.enhance(0.70)

# 2. Darken slightly (0.85 brightness)
brightness_enhancer = ImageEnhance.Brightness(desktop_canvas)
desktop_canvas = brightness_enhancer.enhance(0.75)

# 3. Apply dark-blue/midnight-navy overlay gradient
overlay = Image.new("RGBA", (2500, 600), (9, 12, 21, 0)) # Base color #090c15
draw_overlay = ImageDraw.Draw(overlay)

# Left-to-right gradient overlay to make it look cohesive
for x in range(2500):
    # Alpha ranges from 120 (47% opacity) at edges to 80 (31% opacity) in the center
    # This creates a natural vignette and darkens the sides for readable text overlay
    dist_from_center = abs(x - 1250) / 1250
    alpha = int(90 + 90 * dist_from_center) # 90 to 180 (35% to 70% opacity)
    draw_overlay.line([(x, 0), (x, 600)], fill=(9, 15, 27, alpha))

final_desktop = Image.alpha_composite(desktop_canvas, overlay)
final_desktop.convert("RGB").save(os.path.join(dest_dir, "erode-famous-banner-desktop.png"), "PNG")
print("Saved Desktop Banner successfully!")


# Create Mobile Banner (vertical collage: 800 x 1200)
# 5 images. Let's make each panel height 320 and overlap by 80 pixels.
# Total height: 5 * 320 - 4 * 80 = 1600 - 320 = 1280!
# Let's adjust heights: each panel 300 height, overlap 50 pixels.
# Total height: 5 * 300 - 4 * 50 = 1500 - 200 = 1300.
# Or: each panel 280 height, overlap 50 pixels.
# Total height: 5 * 280 - 4 * 50 = 1400 - 200 = 1200!
# Perfect math!
m_panel_w = 800
m_panel_h = 280
m_overlap = 50

mobile_canvas = Image.new("RGBA", (800, 1200), (0, 0, 0, 0))

m_panels = [
    crop_and_resize(imgs["periyar"], m_panel_w, m_panel_h),
    crop_and_resize(imgs["clock"], m_panel_w, m_panel_h),
    crop_and_resize(imgs["bull"], m_panel_w, m_panel_h),
    crop_and_resize(imgs["temple"], m_panel_w, m_panel_h),
    crop_and_resize(imgs["turmeric"], m_panel_w, m_panel_h)
]

for i, panel in enumerate(m_panels):
    y_pos = i * (m_panel_h - m_overlap)
    
    mask = Image.new("L", (m_panel_w, m_panel_h), 255)
    draw = ImageDraw.Draw(mask)
    
    # Fade top edge (except for first image)
    if i > 0:
        for y in range(m_overlap):
            alpha = int(255 * (y / m_overlap))
            draw.line([(0, y), (m_panel_w, y)], fill=alpha)
            
    # Fade bottom edge (except for last image)
    if i < len(m_panels) - 1:
        for y in range(m_overlap):
            alpha = int(255 * (1.0 - (y / m_overlap)))
            draw.line([(0, m_panel_h - m_overlap + y), (m_panel_w, m_panel_h - m_overlap + y)], fill=alpha)
            
    mobile_canvas.paste(panel, (0, y_pos), mask)

# Color grade mobile version (similar settings)
converter_m = ImageEnhance.Color(mobile_canvas)
mobile_canvas = converter_m.enhance(0.70)

brightness_m = ImageEnhance.Brightness(mobile_canvas)
mobile_canvas = brightness_m.enhance(0.75)

# Mobile overlay (vertical gradient vignette)
m_overlay = Image.new("RGBA", (800, 1200), (9, 12, 21, 0))
draw_m_overlay = ImageDraw.Draw(m_overlay)

for y in range(1200):
    # Darken top and bottom heavily for header text readability
    dist_from_center = abs(y - 600) / 600
    alpha = int(120 + 80 * dist_from_center) # 120 to 200 (47% to 78% opacity)
    draw_m_overlay.line([(0, y), (800, y)], fill=(9, 15, 27, alpha))

final_mobile = Image.alpha_composite(mobile_canvas, m_overlay)
final_mobile.convert("RGB").save(os.path.join(dest_dir, "erode-famous-banner-mobile.png"), "PNG")
print("Saved Mobile Banner successfully!")
