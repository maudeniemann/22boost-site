from playwright.sync_api import sync_playwright
import json

URL = "https://www.axeledin.com/"
SCREENSHOT_PATH = "/Users/maudeniemann/22boost-site/axeledin-screenshot.png"
FULLPAGE_PATH = "/Users/maudeniemann/22boost-site/axeledin-fullpage.png"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    page.goto(URL, wait_until="networkidle", timeout=30000)

    # Above-the-fold screenshot
    page.screenshot(path=SCREENSHOT_PATH, full_page=False)
    print(f"[OK] Above-the-fold screenshot saved to {SCREENSHOT_PATH}")

    # Full-page screenshot
    page.screenshot(path=FULLPAGE_PATH, full_page=True)
    print(f"[OK] Full-page screenshot saved to {FULLPAGE_PATH}")

    # ---------- Extract computed styles on body ----------
    body_styles = page.evaluate("""() => {
        const cs = window.getComputedStyle(document.body);
        return {
            backgroundColor: cs.backgroundColor,
            backgroundImage: cs.backgroundImage,
            backgroundSize: cs.backgroundSize,
            backgroundRepeat: cs.backgroundRepeat,
            color: cs.color,
            fontFamily: cs.fontFamily,
            fontSize: cs.fontSize,
        };
    }""")
    print("\n=== BODY COMPUTED STYLES ===")
    for k, v in body_styles.items():
        print(f"  {k}: {v}")

    # ---------- Extract computed styles on html ----------
    html_styles = page.evaluate("""() => {
        const cs = window.getComputedStyle(document.documentElement);
        return {
            backgroundColor: cs.backgroundColor,
            backgroundImage: cs.backgroundImage,
            color: cs.color,
        };
    }""")
    print("\n=== HTML COMPUTED STYLES ===")
    for k, v in html_styles.items():
        print(f"  {k}: {v}")

    # ---------- Check for canvas / WebGL ----------
    canvas_info = page.evaluate("""() => {
        const canvases = document.querySelectorAll('canvas');
        const results = [];
        canvases.forEach((c, i) => {
            let contextType = 'none';
            try {
                if (c.getContext('webgl2')) contextType = 'webgl2';
                else if (c.getContext('webgl')) contextType = 'webgl';
                else if (c.getContext('2d')) contextType = '2d';
            } catch(e) {}
            results.push({
                index: i,
                width: c.width,
                height: c.height,
                className: c.className,
                id: c.id,
                style: c.getAttribute('style') || '',
                contextType: contextType,
            });
        });
        return results;
    }""")
    print(f"\n=== CANVAS ELEMENTS ({len(canvas_info)}) ===")
    for c in canvas_info:
        print(f"  Canvas #{c['index']}: {c['width']}x{c['height']}, context={c['contextType']}, class=\"{c['className']}\", id=\"{c['id']}\", style=\"{c['style']}\"")

    # ---------- Look for overlay / grain / noise elements ----------
    overlay_info = page.evaluate("""() => {
        const all = document.querySelectorAll('*');
        const results = [];
        for (const el of all) {
            const cs = window.getComputedStyle(el);
            const opacity = parseFloat(cs.opacity);
            const mixBlendMode = cs.mixBlendMode;
            const bgImage = cs.backgroundImage;
            const position = cs.position;
            const pointerEvents = cs.pointerEvents;
            const zIndex = cs.zIndex;

            const isOverlay = (
                (opacity < 1 && opacity > 0) ||
                (mixBlendMode && mixBlendMode !== 'normal') ||
                (bgImage && bgImage !== 'none' && (bgImage.includes('noise') || bgImage.includes('grain') || bgImage.includes('data:'))) ||
                (position === 'fixed' && pointerEvents === 'none')
            );

            if (isOverlay) {
                results.push({
                    tag: el.tagName,
                    className: el.className ? (typeof el.className === 'string' ? el.className.substring(0, 120) : '') : '',
                    id: el.id || '',
                    opacity: opacity,
                    mixBlendMode: mixBlendMode,
                    backgroundImage: bgImage.substring(0, 300),
                    backgroundColor: cs.backgroundColor,
                    position: position,
                    pointerEvents: pointerEvents,
                    zIndex: zIndex,
                    width: cs.width,
                    height: cs.height,
                    inlineStyle: (el.getAttribute('style') || '').substring(0, 300),
                });
            }
        }
        return results;
    }""")
    print(f"\n=== OVERLAY / GRAIN / NOISE ELEMENTS ({len(overlay_info)}) ===")
    for o in overlay_info:
        print(f"  <{o['tag']}> class=\"{o['className']}\" id=\"{o['id']}\"")
        print(f"    opacity={o['opacity']}, mix-blend-mode={o['mixBlendMode']}, position={o['position']}, pointer-events={o['pointerEvents']}, z-index={o['zIndex']}")
        print(f"    background-color={o['backgroundColor']}")
        print(f"    background-image={o['backgroundImage']}")
        print(f"    size={o['width']} x {o['height']}")
        if o['inlineStyle']:
            print(f"    inline style: {o['inlineStyle']}")
        print()

    # ---------- Extract all unique colors used on the page ----------
    color_scheme = page.evaluate("""() => {
        const all = document.querySelectorAll('*');
        const bgColors = new Set();
        const textColors = new Set();
        const borderColors = new Set();
        for (const el of all) {
            const cs = window.getComputedStyle(el);
            if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') bgColors.add(cs.backgroundColor);
            if (cs.color) textColors.add(cs.color);
            if (cs.borderColor && cs.borderColor !== 'rgb(0, 0, 0)') borderColors.add(cs.borderColor);
        }
        return {
            backgroundColors: [...bgColors].slice(0, 30),
            textColors: [...textColors].slice(0, 30),
            borderColors: [...borderColors].slice(0, 20),
        };
    }""")
    print("\n=== COLOR SCHEME ===")
    print("  Background colors:", color_scheme['backgroundColors'])
    print("  Text colors:", color_scheme['textColors'])
    print("  Border colors:", color_scheme['borderColors'])

    # ---------- Gradient detection ----------
    gradient_info = page.evaluate("""() => {
        const all = document.querySelectorAll('*');
        const gradients = [];
        for (const el of all) {
            const cs = window.getComputedStyle(el);
            const bgImage = cs.backgroundImage;
            if (bgImage && bgImage.includes('gradient')) {
                gradients.push({
                    tag: el.tagName,
                    className: (typeof el.className === 'string') ? el.className.substring(0, 100) : '',
                    gradient: bgImage.substring(0, 500),
                });
            }
        }
        return gradients;
    }""")
    print(f"\n=== GRADIENT ELEMENTS ({len(gradient_info)}) ===")
    for g in gradient_info:
        print(f"  <{g['tag']}> class=\"{g['className']}\"")
        print(f"    {g['gradient']}")
        print()

    # ---------- Extract CSS custom properties (CSS variables) ----------
    css_vars = page.evaluate("""() => {
        const cs = window.getComputedStyle(document.documentElement);
        const sheets = document.styleSheets;
        const vars = {};
        for (const sheet of sheets) {
            try {
                for (const rule of sheet.cssRules) {
                    if (rule.selectorText === ':root' || rule.selectorText === 'html' || rule.selectorText === ':root, :host') {
                        const style = rule.style;
                        for (let i = 0; i < style.length; i++) {
                            const prop = style[i];
                            if (prop.startsWith('--')) {
                                vars[prop] = style.getPropertyValue(prop).trim();
                            }
                        }
                    }
                }
            } catch(e) { /* cross-origin */ }
        }
        return vars;
    }""")
    print(f"\n=== CSS CUSTOM PROPERTIES ({len(css_vars)}) ===")
    for k, v in css_vars.items():
        print(f"  {k}: {v}")

    # ---------- Extract all stylesheet rules (abbreviated) ----------
    all_css = page.evaluate("""() => {
        const sheets = document.styleSheets;
        const rules = [];
        for (const sheet of sheets) {
            try {
                const href = sheet.href || 'inline';
                for (const rule of sheet.cssRules) {
                    rules.push({
                        source: href.substring(href.lastIndexOf('/') + 1).substring(0, 60),
                        text: rule.cssText.substring(0, 500),
                    });
                }
            } catch(e) { /* cross-origin */ }
        }
        return rules;
    }""")
    print(f"\n=== ALL CSS RULES ({len(all_css)} total) ===")
    # Save full CSS to file
    with open("/Users/maudeniemann/22boost-site/axeledin-css-rules.txt", "w") as f:
        for r in all_css:
            f.write(f"/* source: {r['source']} */\n{r['text']}\n\n")
    print(f"  Full CSS rules saved to /Users/maudeniemann/22boost-site/axeledin-css-rules.txt")

    # Print first 50 rules for quick review
    for r in all_css[:50]:
        print(f"  [{r['source']}] {r['text'][:200]}")

    # ---------- Main structural elements ----------
    structure = page.evaluate("""() => {
        const els = document.querySelectorAll('body > *, main, header, footer, nav, section, [class*="hero"], [class*="overlay"], [class*="grain"], [class*="noise"], [class*="texture"], [class*="background"]');
        const results = [];
        for (const el of els) {
            const cs = window.getComputedStyle(el);
            results.push({
                tag: el.tagName,
                className: (typeof el.className === 'string') ? el.className.substring(0, 150) : '',
                id: el.id || '',
                backgroundColor: cs.backgroundColor,
                backgroundImage: cs.backgroundImage.substring(0, 300),
                position: cs.position,
                zIndex: cs.zIndex,
            });
        }
        return results;
    }""")
    print(f"\n=== MAIN STRUCTURAL ELEMENTS ({len(structure)}) ===")
    for s in structure:
        print(f"  <{s['tag']}> class=\"{s['className']}\" id=\"{s['id']}\"")
        print(f"    bg-color={s['backgroundColor']}, bg-image={s['backgroundImage']}, position={s['position']}, z-index={s['zIndex']}")

    browser.close()
    print("\n[DONE]")
