import re

with open("/Users/maudeniemann/22boost-site/axeledin-bundle.js", "r") as f:
    js = f.read()

# Find the qe configuration object
# From the context we can see it's near "gradient-canvas"
idx = js.index('gradient-canvas')
# Go back to find the config object
config_region = js[max(0, idx-500):idx+200]
print("=== REGION AROUND gradient-canvas ===")
print(config_region)

# Extract the qe object
qe_match = re.search(r'(?:const|let|var)\s+qe\s*=\s*\{(.*?)\}', config_region, re.DOTALL)
if qe_match:
    print("\n=== qe CONFIG OBJECT ===")
    print(qe_match.group(0))
else:
    # Try broader search
    qe_match = re.search(r'qe\s*=\s*\{([^}]+)\}', js[idx-1000:idx+200])
    if qe_match:
        print("\n=== qe CONFIG OBJECT ===")
        print(qe_match.group(0))

# Find all hex color strings near the config
hex_colors = re.findall(r'"#[0-9a-fA-F]{6}"', js[idx-1000:idx+200])
print(f"\n=== HEX COLORS near config ===")
for c in hex_colors:
    print(f"  {c}")
    # Convert to RGB
    hex_val = c.strip('"#')
    r = int(hex_val[0:2], 16)
    g = int(hex_val[2:4], 16)
    b = int(hex_val[4:6], 16)
    print(f"    RGB: ({r}, {g}, {b})")
    print(f"    Normalized: ({r/255:.3f}, {g/255:.3f}, {b/255:.3f})")

# Find the numeric config values
print("\n=== FULL CONFIG EXTRACTION ===")
config_keys = ['brushSize', 'brushStrength', 'fluidDecay', 'trailLength', 'distortionAmount',
                'stopDecay', 'color1', 'color2', 'color3', 'color4', 'colorIntensity', 'softness']
for key in config_keys:
    pattern = rf'{key}\s*:\s*([^,}}]+)'
    match = re.search(pattern, js[idx-1000:idx+200])
    if match:
        print(f"  {key}: {match.group(1).strip()}")

# Also look for font references
print("\n=== FONT USAGE ===")
font_region = js[idx-2000:idx]
font_refs = re.findall(r'(?:font-family|fontFamily)[^;]*;', font_region)
for f in font_refs:
    print(f"  {f}")

# Check for Alliance No.2 font usage
alliance_indices = [m.start() for m in re.finditer('Alliance', js)]
print(f"\n  'Alliance' found {len(alliance_indices)} times")
for ai in alliance_indices[:5]:
    print(f"    Context: {js[max(0,ai-50):ai+100]}")
