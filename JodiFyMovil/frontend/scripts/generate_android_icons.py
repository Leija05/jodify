import os
from PIL import Image, ImageDraw

def generate_icons():
    src_path = os.path.join("assets", "images", "icon.png")
    if not os.path.exists(src_path):
        print(f"Source not found: {src_path}")
        return

    src_img = Image.open(src_path).convert("RGBA")

    # Mipmap densities and sizes
    densities = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }

    base_res_dir = os.path.join("android", "app", "src", "main", "res")

    for folder, size in densities.items():
        folder_path = os.path.join(base_res_dir, folder)
        os.makedirs(folder_path, exist_ok=True)

        # 1. Standard square launcher icon with dark background & soft rounded corners
        square_img = Image.new("RGBA", (size, size), (7, 7, 13, 255))
        
        # Fit logo inside with ~12% padding
        logo_size = int(size * 0.82)
        offset = (size - logo_size) // 2
        resized_logo = src_img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
        square_img.paste(resized_logo, (offset, offset), resized_logo)

        # 2. Round launcher icon
        round_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        # Draw circular background
        draw = ImageDraw.Draw(round_img)
        draw.ellipse([(0, 0), (size - 1, size - 1)], fill=(7, 7, 13, 255))
        round_img.paste(resized_logo, (offset, offset), resized_logo)

        # Apply circular alpha mask to round image
        mask = Image.new("L", (size, size), 0)
        draw_mask = ImageDraw.Draw(mask)
        draw_mask.ellipse([(0, 0), (size - 1, size - 1)], fill=255)
        round_img.putalpha(mask)

        # Save as both .webp and .png
        square_webp = os.path.join(folder_path, "ic_launcher.webp")
        square_png = os.path.join(folder_path, "ic_launcher.png")
        round_webp = os.path.join(folder_path, "ic_launcher_round.webp")
        round_png = os.path.join(folder_path, "ic_launcher_round.png")

        square_img.save(square_webp, "WEBP", quality=100)
        square_img.save(square_png, "PNG")
        round_img.save(round_webp, "WEBP", quality=100)
        round_img.save(round_png, "PNG")

        print(f"Generated icons for {folder}: {size}x{size}")

    print("All Android launcher icons successfully updated with JodiFy logo!")

if __name__ == "__main__":
    generate_icons()
