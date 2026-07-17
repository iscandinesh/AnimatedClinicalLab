import os
from PIL import Image, ImageEnhance, ImageDraw

artifacts_dir = r"C:\Users\D E L L\.gemini\antigravity-ide\brain\0708e2ce-085c-4e74-9802-af0d14577b03"
dest_dir = r"d:\My project\AnimatedClinicalLab-main\AnimatedClinicalLab-main\wwwroot\images"

src_desktop = os.path.join(artifacts_dir, "erode_famous_banner_desktop_collage_1784202842956.png")
src_mobile = os.path.join(artifacts_dir, "erode_famous_banner_mobile_collage_1784202859445.png")

def process_image(src_path, target_w, target_h, is_mobile=False):
    img = Image.open(src_path).convert("RGBA")
    
    # Resize and crop to fill target dimensions
    img_w, img_h = img.size
    aspect_target = target_w / target_h
    aspect_img = img_w / img_h
    
    if aspect_img > aspect_target:
        new_w = int(img_h * aspect_target)
        offset_x = (img_w - new_w) // 2
        img = img.crop((offset_x, 0, offset_x + new_w, img_h))
    else:
        new_h = int(img_w / aspect_target)
        offset_y = (img_h - new_h) // 2
        img = img.crop((0, offset_y, img_w, offset_y + new_h))
        
    img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    # Apply desaturation (0.65 saturation) for cohesive blend
    converter = ImageEnhance.Color(img)
    img = converter.enhance(0.65)
    
    # Darken slightly (0.75 brightness)
    brightness = ImageEnhance.Brightness(img)
    img = brightness.enhance(0.70)
    
    # Apply dark blue gradient overlay
    overlay = Image.new("RGBA", (target_w, target_h), (9, 12, 21, 0))
    draw = ImageDraw.Draw(overlay)
    
    if not is_mobile:
        # Desktop vignette/gradient: darker at the edges, slightly lighter in the center
        for x in range(target_w):
            dist_from_center = abs(x - target_w // 2) / (target_w // 2)
            alpha = int(100 + 100 * dist_from_center) # 100 to 200 opacity
            draw.line([(x, 0), (x, target_h)], fill=(9, 15, 27, alpha))
    else:
        # Mobile vertical gradient: darker at the top and bottom for text readability
        for y in range(target_h):
            dist_from_center = abs(y - target_h // 2) / (target_h // 2)
            alpha = int(120 + 80 * dist_from_center) # 120 to 200 opacity
            draw.line([(0, y), (target_w, y)], fill=(9, 15, 27, alpha))
            
    final_img = Image.alpha_composite(img, overlay).convert("RGB")
    return final_img

# Process & save desktop
final_desk = process_image(src_desktop, 2048, 600, is_mobile=False)
final_desk.save(os.path.join(dest_dir, "erode-famous-banner-desktop.png"), "PNG")
print("Saved custom processed desktop banner!")

# Process & save mobile
final_mob = process_image(src_mobile, 800, 1200, is_mobile=True)
final_mob.save(os.path.join(dest_dir, "erode-famous-banner-mobile.png"), "PNG")
print("Saved custom processed mobile banner!")
