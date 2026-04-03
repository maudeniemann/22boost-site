from playwright.sync_api import sync_playwright
import re

PROJECTS_URL = "https://www.axeledin.com/projects"
CONTACT_URL = "https://www.axeledin.com/contact"
JS_URL = "https://www.axeledin.com/assets/index-D-GvkwFo.js"

with sync_playwright() as p:
    browser = p.chromium.launch()

    # === Page 1: Projects page (full app state) ===
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    page.goto(PROJECTS_URL, wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(2000)
    page.screenshot(path="/Users/maudeniemann/22boost-site/axeledin-projects.png", full_page=False)
    page.screenshot(path="/Users/maudeniemann/22boost-site/axeledin-projects-full.png", full_page=True)
    print("[OK] Projects screenshots saved")
    print(f"  HTML class: {page.evaluate('document.documentElement.className')}")

    # Get app-root content structure
    structure = page.evaluate("""() => {
        const root = document.getElementById('root');
        if (!root) return 'No #root found';
        return root.innerHTML.substring(0, 3000);
    }""")
    print(f"\n=== APP ROOT HTML (first 3000 chars) ===\n{structure}")

    # === Fetch and analyze JS bundle ===
    print("\n=== FETCHING JS BUNDLE ===")
    js_content = page.evaluate("""async (url) => {
        const res = await fetch(url);
        return await res.text();
    }""", JS_URL)

    # Save full JS
    with open("/Users/maudeniemann/22boost-site/axeledin-bundle.js", "w") as f:
        f.write(js_content)
    print(f"  Bundle size: {len(js_content)} chars")
    print(f"  Saved to axeledin-bundle.js")

    # Search for shader-related content
    shader_keywords = [
        'gl_FragColor', 'gl_Position', 'precision ', '#version',
        'fragmentShader', 'vertexShader', 'createShader', 'shaderSource',
        'FRAGMENT_SHADER', 'VERTEX_SHADER', 'uniform ', 'varying ',
        'attribute ', 'vec2', 'vec3', 'vec4', 'mat4', 'sampler2D',
        'noise', 'grain', 'perlin', 'simplex', 'fbm',
        'gradient', 'THREE', 'three', 'webgl', 'WebGL',
        'createProgram', 'linkProgram', 'useProgram',
    ]

    print("\n=== SHADER/WEBGL KEYWORD SEARCH ===")
    for kw in shader_keywords:
        count = js_content.count(kw)
        if count > 0:
            idx = js_content.index(kw)
            context = js_content[max(0, idx-100):idx+200]
            # Clean for display
            context = context.replace('\n', ' ').strip()
            print(f"\n  '{kw}' found {count} times. First occurrence context:")
            print(f"    ...{context[:300]}...")

    # Extract string literals that look like shader code
    # Look for template literals or strings containing shader keywords
    shader_pattern = r'["`\']((?:precision|#version|void\s+main|gl_Frag|uniform|varying|attribute)[\s\S]*?)["`\']'
    shader_matches = re.findall(shader_pattern, js_content[:50000])  # search first 50k chars
    if shader_matches:
        print(f"\n=== EXTRACTED SHADER CODE ({len(shader_matches)} matches) ===")
        for i, m in enumerate(shader_matches):
            print(f"\n  --- Shader #{i} ---")
            print(f"  {m[:1000]}")
    else:
        # Try a different approach - look for long strings with GL keywords
        print("\n=== Looking for shader code in escaped strings ===")
        # Search for sections with multiple GL keywords close together
        for keyword in ['gl_FragColor', 'gl_Position', 'void main']:
            indices = [m.start() for m in re.finditer(re.escape(keyword), js_content)]
            for idx in indices[:3]:
                # Get surrounding context
                start = max(0, idx - 500)
                end = min(len(js_content), idx + 500)
                chunk = js_content[start:end]
                print(f"\n  --- Context around '{keyword}' at pos {idx} ---")
                print(f"  {chunk}")

    # === Page 2: Contact page ===
    page2 = browser.new_page(viewport={"width": 1920, "height": 1080})
    page2.goto(CONTACT_URL, wait_until="networkidle", timeout=30000)
    page2.wait_for_timeout(2000)
    page2.screenshot(path="/Users/maudeniemann/22boost-site/axeledin-contact.png", full_page=False)
    print("\n[OK] Contact screenshot saved")

    # === Mobile screenshots ===
    mobile = browser.new_page(viewport={"width": 375, "height": 812})
    mobile.goto("https://www.axeledin.com/", wait_until="networkidle", timeout=30000)
    mobile.screenshot(path="/Users/maudeniemann/22boost-site/axeledin-mobile-home.png", full_page=False)
    print("[OK] Mobile home screenshot saved")

    mobile2 = browser.new_page(viewport={"width": 375, "height": 812})
    mobile2.goto(PROJECTS_URL, wait_until="networkidle", timeout=30000)
    mobile2.wait_for_timeout(2000)
    mobile2.screenshot(path="/Users/maudeniemann/22boost-site/axeledin-mobile-projects.png", full_page=False)
    print("[OK] Mobile projects screenshot saved")

    browser.close()
    print("\n[DONE]")
