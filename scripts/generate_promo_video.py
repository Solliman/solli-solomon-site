import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

try:
    from moviepy.editor import ImageSequenceClip
except ImportError:
    print("Error: The 'moviepy' library is not installed.")
    print("Please install it running: pip install moviepy")
    sys.exit(1)

def get_font(font_name, size):
    # Try different standard macOS fonts
    paths = [
        f"/System/Library/Fonts/Supplemental/{font_name}.ttf",
        f"/System/Library/Fonts/{font_name}.ttc",
        f"/Library/Fonts/{font_name}.ttf",
        f"/System/Library/Fonts/Supplemental/{font_name}.ttc"
    ]
    for path in paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except:
                pass
    # Fallback to default
    return ImageFont.load_default()

def draw_text_centered(draw, text, font, y_position, color, width=1080):
    # Get text size
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    x_position = (width - text_width) // 2
    draw.text((x_position, y_position), text, font=font, fill=color)

def main():
    cover_path = "pastor-cover.jpg"
    if not os.path.exists(cover_path):
        print(f"Error: '{cover_path}' not found in the root directory.")
        sys.exit(1)

    print("Loading cover image...")
    cover = Image.open(cover_path)

    # Output specifications
    width, height = 1080, 1920
    fps = 24
    duration = 15  # seconds
    total_frames = duration * fps

    # Setup fonts
    # Georgia for lyrics (elegant serif), Arial for metadata/credits (clean sans-serif)
    font_lyrics = get_font("Georgia", 48)
    font_lyrics_italic = get_font("Georgia Bold Italic", 52)
    font_artist = get_font("Arial Bold", 40)
    font_title = get_font("Georgia Bold", 72)
    font_sub = get_font("Arial", 36)

    # Colors
    gold_color = (212, 135, 74)   # #d4874a (warm accent)
    cyan_color = (0, 200, 180)    # #00c8b4 (cyan accent)
    white_color = (226, 232, 228)  # #e2e8e4 (text color)
    dim_white = (226, 232, 228, 180)

    # Pre-process background (blurred and darkened cover)
    print("Generating blurred background...")
    bg_img = cover.copy()
    # Crop to 1:1 center
    w, h = bg_img.size
    min_dim = min(w, h)
    bg_img = bg_img.crop(((w - min_dim)//2, (h - min_dim)//2, (w + min_dim)//2, (h + min_dim)//2))
    # Resize and blur
    bg_img = bg_img.resize((width, height), Image.Resampling.LANCZOS)
    bg_img = bg_img.filter(ImageFilter.GaussianBlur(30))
    # Darken with a solid overlay
    overlay = Image.new("RGBA", (width, height), (7, 9, 11, 200)) # very dark techno background
    bg_img = Image.alpha_composite(bg_img.convert("RGBA"), overlay)

    # Pre-process center cover image
    print("Resizing cover artwork...")
    cover_size = 720
    center_cover = cover.copy().resize((cover_size, cover_size), Image.Resampling.LANCZOS)
    cover_x = (width - cover_size) // 2
    cover_y = 350

    frames = []
    print("Rendering video frames...")
    
    for f in range(total_frames):
        t = f / fps  # Current time in seconds

        # Start with the base background
        frame = bg_img.copy()
        
        # Paste the cover artwork in the center
        frame.paste(center_cover, (cover_x, cover_y))
        
        # Draw a thin golden/warm border around the cover art
        draw = ImageDraw.Draw(frame, "RGBA")
        border_width = 3
        draw.rectangle(
            [cover_x - border_width, cover_y - border_width, cover_x + cover_size + border_width, cover_y + cover_size + border_width],
            outline=gold_color,
            width=border_width
        )

        # Draw lyrics/metadata with fade-in and fade-out animations
        # Text layer for alpha transparency drawing
        text_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        text_draw = ImageDraw.Draw(text_layer)

        # ----------------------------------------------------
        # Scene 1: 0.0s to 4.0s (First lyrics part)
        # ----------------------------------------------------
        if 0.0 <= t < 4.0:
            # Fade in over 1.0s, fade out over 1.0s
            opacity = 255
            if t < 1.0:
                opacity = int(t * 255)
            elif t > 3.0:
                opacity = int((4.0 - t) * 255)
            
            color = (white_color[0], white_color[1], white_color[2], opacity)
            draw_text_centered(text_draw, "« Il Signore non parla solo", font_lyrics, 1300, color)
            draw_text_centered(text_draw, "per bocca di Mosè... »", font_lyrics, 1380, color)

        # ----------------------------------------------------
        # Scene 2: 4.0s to 8.0s (Second lyrics part)
        # ----------------------------------------------------
        elif 8.0 > t >= 4.0:
            t_rel = t - 4.0
            opacity = 255
            if t_rel < 1.0:
                opacity = int(t_rel * 255)
            elif t_rel > 3.0:
                opacity = int((4.0 - t_rel) * 255)
            
            color = (white_color[0], white_color[1], white_color[2], opacity)
            draw_text_centered(text_draw, "« ...ma anche attraverso", font_lyrics, 1300, color)
            draw_text_centered(text_draw, "i suoi pastori. »", font_lyrics, 1380, color)

        # ----------------------------------------------------
        # Scene 3: 8.0s to 12.0s (Artist & Title Reveal)
        # ----------------------------------------------------
        elif 12.0 > t >= 8.0:
            t_rel = t - 8.0
            opacity = 255
            if t_rel < 1.0:
                opacity = int(t_rel * 255)
            elif t_rel > 3.0:
                opacity = int((4.0 - t_rel) * 255)
            
            color_gold = (gold_color[0], gold_color[1], gold_color[2], opacity)
            color_cyan = (cyan_color[0], cyan_color[1], cyan_color[2], opacity)
            color_white = (white_color[0], white_color[1], white_color[2], opacity)

            draw_text_centered(text_draw, "SOLLI SOLOMON", font_artist, 1260, color_gold)
            draw_text_centered(text_draw, "PASTOR", font_title, 1320, color_white)
            draw_text_centered(text_draw, "New Techno Single", font_sub, 1420, color_cyan)

        # ----------------------------------------------------
        # Scene 4: 12.0s to 15.0s (Call to Action / Out Now)
        # ----------------------------------------------------
        elif 15.0 >= t >= 12.0:
            t_rel = t - 12.0
            opacity = 255
            if t_rel < 1.0:
                opacity = int(t_rel * 255)
            elif t > 14.0:
                opacity = int((15.0 - t) * 255)
            
            color_gold = (gold_color[0], gold_color[1], gold_color[2], opacity)
            color_cyan = (cyan_color[0], cyan_color[1], cyan_color[2], opacity)
            color_white = (white_color[0], white_color[1], white_color[2], opacity)

            draw_text_centered(text_draw, "FUORI ORA · OUT NOW", font_artist, 1260, color_gold)
            draw_text_centered(text_draw, "Ascolta su Bandcamp & Spotify", font_lyrics, 1340, color_white)
            draw_text_centered(text_draw, "Link in Bio ◈", font_sub, 1440, color_cyan)

        # Composite text layer onto frame
        final_frame = Image.alpha_composite(frame, text_layer)
        # Convert back to RGB for numpy
        frames.append(np.array(final_frame.convert("RGB")))

        if (f + 1) % 50 == 0 or (f + 1) == total_frames:
            print(f"  Frame {f+1}/{total_frames} completed...")

    # Write video to file
    print("Compiling video file with MoviePy...")
    output_path = "promo/pastor_promo_reel.mp4"
    clip = ImageSequenceClip(frames, fps=fps)
    clip.write_videofile(
        output_path,
        fps=fps,
        codec='libx264',
        audio=False # user will add music sticker directly on Instagram
    )
    print(f"🎉 Success! Video saved to '{output_path}'")

if __name__ == "__main__":
    main()
