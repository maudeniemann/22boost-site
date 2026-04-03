import re

with open("/Users/maudeniemann/22boost-site/axeledin-bundle.js", "r") as f:
    js = f.read()

# The shader strings appear to be stored as template literals (backtick strings)
# Find the custom shader strings (not Three.js built-in shaders)
# From the output, we can see the shader code starts at specific locations

# Find the vertex shader (bS variable)
# It starts with: const bS=`
bs_match = re.search(r'const bS=`(.*?)`', js, re.DOTALL)
if bs_match:
    print("=== VERTEX SHADER (bS) ===")
    print(bs_match.group(1))
    print()

# Find the fluid simulation shader (oA variable)
oa_match = re.search(r'`,oA=`(.*?)`', js, re.DOTALL)
if oa_match:
    print("=== FLUID SIMULATION SHADER (oA) ===")
    print(oa_match.group(1))
    print()

# Find the color/display shader (lA variable)
la_match = re.search(r'`,lA=`(.*?)`', js, re.DOTALL)
if la_match:
    print("=== COLOR/DISPLAY SHADER (lA) ===")
    print(la_match.group(1))
    print()

# Also search for the configuration/uniform values
# Look for color uniform setup
color_patterns = [
    r'uColor1.*?value.*?(?:Color|vec3|new)',
    r'uColor2.*?value.*?(?:Color|vec3|new)',
    r'uColor3.*?value.*?(?:Color|vec3|new)',
    r'uColor4.*?value.*?(?:Color|vec3|new)',
    r'uColorIntensity.*?value',
    r'uSoftness.*?value',
    r'uDistortionAmount.*?value',
    r'uBrushSize.*?value',
    r'uBrushStrength.*?value',
    r'uFluidDecay.*?value',
]

print("=== UNIFORM CONFIGURATIONS ===")
for pattern in color_patterns:
    matches = re.findall(pattern + r'.{0,100}', js)
    for m in matches[:2]:
        print(f"  {m[:200]}")

# Search for the class or function that sets up the gradient canvas
# Look for "gradient-canvas" references in the code
gc_indices = [m.start() for m in re.finditer('gradient-canvas', js)]
print(f"\n=== 'gradient-canvas' occurrences: {len(gc_indices)} ===")
for idx in gc_indices:
    context = js[max(0, idx-300):idx+300]
    print(f"\n  --- at pos {idx} ---")
    print(f"  {context}")

# Look for the Color constructor calls near the shader setup
print("\n=== COLOR VALUES (hex colors near shader setup) ===")
# Search for hex color values
hex_colors = re.findall(r'(?:0x[0-9a-fA-F]{6}|#[0-9a-fA-F]{6})', js[:10000])
print(f"  Hex colors in first 10k chars: {hex_colors}")

# Search more broadly
hex_colors_all = re.findall(r'0x[0-9a-fA-F]{6}', js[:20000])
print(f"  All hex values in first 20k chars: {hex_colors_all}")

# Look for Color() constructor with specific values
color_constructors = re.findall(r'new\s+\w*Color\s*\(\s*(?:0x[0-9a-fA-F]+|"#[^"]+"|[0-9.]+)\s*(?:,\s*[0-9.]+\s*,\s*[0-9.]+\s*)?\)', js[:20000])
print(f"\n  Color constructors in first 20k: {color_constructors}")

# Look for the scene/renderer setup
scene_setup = re.findall(r'(?:uniforms|material|shader).*?(?:color|Color).*?\{.*?\}', js[:15000])
for s in scene_setup[:5]:
    print(f"\n  Scene setup: {s[:300]}")
