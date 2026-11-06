// Snagit-style annotations drawn in the page, so a normal screenshot captures them.
// Loaded into every page by the playwright-sandbox MCP server (--init-script).
// API: window.__ann.{box, arrow, cursor, blur, blurText, clear, rect}
// A target is a CSS selector, {text: "visible text"}, or an Element.
// shortcut: overlay is position:fixed, so it fits viewport screenshots only; full-page shots misplace it.
(() => {
  if (window.__ann) return;
  const RED = "#e5322d";
  const blurred = [];
  let layer;

  const resolve = (t) => {
    if (t instanceof Element) return t;
    if (typeof t === "string") return document.querySelector(t);
    if (t && t.text) {
      // Deepest element whose own text equals the wanted text.
      const want = t.text.trim().toLowerCase();
      const all = [...document.querySelectorAll("body *")].filter(
        (e) => e.offsetParent !== null && e.textContent.trim().toLowerCase() === want
      );
      return all.sort((a, b) => a.querySelectorAll("*").length - b.querySelectorAll("*").length)[0] || null;
    }
    return null;
  };

  const ensureLayer = () => {
    if (layer && layer.isConnected) return layer.shadowRoot;
    // Custom tag plus inline !important: page rules such as `div{opacity:.5}` must not hit the host.
    layer = document.createElement("ann-layer");
    layer.style.cssText =
      "all:initial!important;display:block!important;position:fixed!important;inset:0!important;" +
      "pointer-events:none!important;z-index:2147483647!important;opacity:1!important;" +
      "font-family:system-ui,sans-serif!important";
    // Shadow root: page CSS such as `svg{opacity:.5}` must not reach the annotations.
    layer.attachShadow({ mode: "open" });
    document.documentElement.appendChild(layer);
    return layer.shadowRoot;
  };

  const el = (t) => {
    const e = resolve(t);
    if (!e) throw new Error("annotate: target not found: " + JSON.stringify(t));
    e.scrollIntoView({ block: "center", inline: "center" });
    return e;
  };

  const svg = (html) => {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("style", "position:absolute;inset:0;width:100%;height:100%;overflow:visible");
    s.innerHTML = html;
    ensureLayer().appendChild(s);
  };

  const rect = (t) => {
    const r = el(t).getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  };

  // Red rounded rectangle, with an optional numbered badge on the top-left corner.
  const box = (t, { n, pad = 4 } = {}) => {
    const r = el(t).getBoundingClientRect();
    const b = document.createElement("div");
    b.style.cssText =
      `position:absolute;left:${r.x - pad}px;top:${r.y - pad}px;width:${r.width + 2 * pad}px;` +
      `height:${r.height + 2 * pad}px;border:3px solid ${RED};border-radius:6px;box-sizing:border-box;` +
      "box-shadow:0 0 0 1px #fff";
    ensureLayer().appendChild(b);
    if (n != null) {
      const c = document.createElement("div");
      c.textContent = n;
      c.style.cssText =
        `position:absolute;left:${r.x - pad - 12}px;top:${r.y - pad - 12}px;width:24px;height:24px;` +
        `border-radius:50%;background:${RED};color:#fff;font:700 14px/24px system-ui;text-align:center;` +
        "box-shadow:0 0 0 2px #fff";
      ensureLayer().appendChild(c);
    }
  };

  // Arrow that ends at the edge of the target. from: direction the tail sits in.
  const arrow = (t, { from = "top-left", len = 90 } = {}) => {
    const r = el(t).getBoundingClientRect();
    const dir = { "top-left": [-1, -1], "top-right": [1, -1], "bottom-left": [-1, 1], "bottom-right": [1, 1],
      left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] }[from];
    const ex = r.x + r.width / 2 + dir[0] * (r.width / 2 + 6);
    const ey = r.y + r.height / 2 + dir[1] * (r.height / 2 + 6);
    const k = dir[0] && dir[1] ? Math.SQRT1_2 : 1;
    const sx = ex + dir[0] * len * k;
    const sy = ey + dir[1] * len * k;
    const id = "__ah" + Math.random().toString(36).slice(2, 7);
    svg(
      `<defs><marker id="${id}" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">` +
        `<path d="M0,0 L8,4 L0,8 z" fill="${RED}"/></marker></defs>` +
        `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="#fff" stroke-width="8" stroke-linecap="round"/>` +
        `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${RED}" stroke-width="4" stroke-linecap="round" marker-end="url(#${id})"/>`
    );
  };

  // Pointer icon on the lower right of the target: "click here".
  const cursor = (t) => {
    const r = el(t).getBoundingClientRect();
    const x = r.x + r.width * 0.7;
    const y = r.y + r.height * 0.7;
    svg(
      `<path transform="translate(${x},${y})" d="M0,0 L0,17 L4.5,13 L7.5,20 L10,19 L7,12 L13,12 z" ` +
        'fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>'
    );
  };

  // Blur whole elements (selector may match many).
  const blur = (sel) => {
    const nodes = sel instanceof Element ? [sel] : [...document.querySelectorAll(sel)];
    nodes.forEach((n) => {
      blurred.push([n, n.style.filter]);
      n.style.filter = "blur(7px)";
    });
    return nodes.length;
  };

  // Blur only the text that matches a regex source, for example an email address.
  const blurText = (pattern, flags = "gi") => {
    const re = new RegExp(pattern, flags);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const hits = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.parentElement && !/^(SCRIPT|STYLE)$/.test(n.parentElement.tagName) && re.test(n.nodeValue)) hits.push(n);
      re.lastIndex = 0;
    }
    hits.forEach((n) => {
      const frag = document.createDocumentFragment();
      let last = 0;
      n.nodeValue.replace(re, (m, ...rest) => {
        const i = rest[rest.length - 2];
        frag.append(n.nodeValue.slice(last, i));
        const s = document.createElement("span");
        s.textContent = m;
        s.style.filter = "blur(7px)";
        s.dataset.annBlur = "1";
        frag.append(s);
        last = i + m.length;
        return m;
      });
      frag.append(n.nodeValue.slice(last));
      n.replaceWith(frag);
    });
    return hits.length;
  };

  const clear = () => {
    if (layer) layer.remove();
    layer = null;
    document.querySelectorAll("[data-ann-blur]").forEach((s) => s.replaceWith(document.createTextNode(s.textContent)));
    blurred.forEach(([n, f]) => {
      n.style.filter = f;
    });
    blurred.length = 0;
  };

  window.__ann = { box, arrow, cursor, blur, blurText, clear, rect };
})();
