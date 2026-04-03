from playwright.sync_api import sync_playwright

URL = "https://www.axeledin.com/"
SCREENSHOT_APP = "/Users/maudeniemann/22boost-site/axeledin-app-state.png"
SCREENSHOT_HERO_ONLY = "/Users/maudeniemann/22boost-site/axeledin-hero-canvas.png"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    page.goto(URL, wait_until="networkidle", timeout=30000)

    # Try clicking on the logo or navigating to trigger the "show-app" state
    # First, let's check if there's a route that triggers it
    print("=== Current URL:", page.url)
    print("=== HTML class:", page.evaluate("document.documentElement.className"))

    # Try navigating to /projects to trigger the app state
    page.evaluate("document.documentElement.classList.add('show-app')")
    page.wait_for_timeout(1000)
    print("=== After adding show-app class:", page.evaluate("document.documentElement.className"))

    page.screenshot(path=SCREENSHOT_APP, full_page=False)
    print(f"[OK] App-state screenshot saved to {SCREENSHOT_APP}")

    # Now try to extract canvas/WebGL shader info
    canvas_details = page.evaluate("""() => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return { found: false };

        // Try to get the WebGL context and inspect it
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) return { found: true, hasGL: false };

        // Get all shader programs
        const ext = gl.getExtension('WEBGL_debug_shaders');

        return {
            found: true,
            hasGL: true,
            vendor: gl.getParameter(gl.VENDOR),
            renderer: gl.getParameter(gl.RENDERER),
            canvasWidth: canvas.width,
            canvasHeight: canvas.height,
            canvasClass: canvas.className,
            parentClass: canvas.parentElement ? canvas.parentElement.className : '',
            hasDebugExt: !!ext,
        };
    }""")
    print("\n=== CANVAS/WEBGL DETAILS ===")
    for k, v in canvas_details.items():
        print(f"  {k}: {v}")

    # Look for any JS files that reference gradient, noise, shader, etc.
    script_urls = page.evaluate("""() => {
        return Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
    }""")
    print("\n=== SCRIPT SOURCES ===")
    for s in script_urls:
        print(f"  {s}")

    # Try to find the WebGL shader source in the page's JS
    # Look for any inline scripts or module content
    inline_scripts = page.evaluate("""() => {
        return Array.from(document.querySelectorAll('script:not([src])')).map(s => s.textContent.substring(0, 500));
    }""")
    print("\n=== INLINE SCRIPTS (first 500 chars each) ===")
    for i, s in enumerate(inline_scripts):
        print(f"  Script #{i}: {s}")

    # Try to navigate to Projects page to see the full app state
    links = page.evaluate("""() => {
        return Array.from(document.querySelectorAll('a')).map(a => ({href: a.href, text: a.textContent.trim()}));
    }""")
    print("\n=== ALL LINKS ===")
    for l in links:
        print(f"  {l['text']}: {l['href']}")

    # Navigate to Projects
    try:
        page.click('text=Projects')
        page.wait_for_timeout(2000)
        page.screenshot(path="/Users/maudeniemann/22boost-site/axeledin-projects.png", full_page=False)
        print(f"\n[OK] Projects page screenshot saved")
        print(f"=== URL after click: {page.url}")
        print(f"=== HTML class: {page.evaluate('document.documentElement.className')}")

        # Full page of projects
        page.screenshot(path="/Users/maudeniemann/22boost-site/axeledin-projects-full.png", full_page=True)
        print(f"[OK] Projects full-page screenshot saved")
    except Exception as e:
        print(f"Could not navigate to Projects: {e}")

    # Now fetch the main JS bundle to look for shader code
    for url in script_urls:
        if 'index' in url or 'main' in url or 'app' in url:
            print(f"\n=== Fetching JS bundle: {url} ===")
            try:
                response = page.evaluate(f"""async () => {{
                    const res = await fetch("{url}");
                    const text = await res.text();
                    // Search for shader-related keywords
                    const keywords = ['fragment', 'vertex', 'gl_FragColor', 'gl_Position', 'uniform', 'varying', 'noise', 'grain', 'gradient', 'color', 'vec3', 'vec4'];
                    const results = {{}};
                    for (const kw of keywords) {{
                        const idx = text.indexOf(kw);
                        if (idx !== -1) {{
                            results[kw] = text.substring(Math.max(0, idx - 50), idx + 200);
                        }}
                    }}
                    // Also look for the gradient canvas setup
                    const gcIdx = text.indexOf('gradient-canvas');
                    if (gcIdx !== -1) {{
                        results['gradient-canvas-context'] = text.substring(Math.max(0, gcIdx - 200), gcIdx + 500);
                    }}
                    // Look for shader source strings (usually in template literals or strings)
                    const shaderPatterns = ['precision ', '#version '];
                    for (const sp of shaderPatterns) {{
                        const spIdx = text.indexOf(sp);
                        if (spIdx !== -1) {{
                            results['shader-' + sp.trim()] = text.substring(Math.max(0, spIdx - 50), spIdx + 800);
                        }}
                    }}
                    return results;
                }})""")
                for k, v in response.items():
                    print(f"\n  --- {k} ---")
                    print(f"  {v[:400]}")
            except Exception as e:
                print(f"  Error: {e}")

    browser.close()
    print("\n[DONE]")
