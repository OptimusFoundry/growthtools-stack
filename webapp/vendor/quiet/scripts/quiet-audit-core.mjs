// quiet-audit core: measures a rendered page against quiet's tokens. Shared by the
// `quiet-audit` bin and tests/audit.spec.ts. `auditInPage` runs inside the browser via
// page.evaluate, so it must stay self-contained (no references to this module's scope).

export const RULES = ["spacing", "type", "radius", "colour", "derived", "structure", "overflow"];

/** @param {{ requireH1?: boolean }} opts */
export function auditInPage(opts) {
	const findings = [];
	const add = (rule, owner, value, el) => findings.push({ rule, owner, value, example: sel(el) });
	function sel(el) {
		if (el?.nodeType !== 1) return "";
		const cls = [...el.classList]
			.slice(0, 2)
			.map((c) => `.${c}`)
			.join("");
		const tag = el.tagName.toLowerCase();
		const parent = el.parentElement?.closest("[class*='q-']");
		const pc = parent ? `.${[...parent.classList].find((c) => c.startsWith("q-")) ?? ""} ` : "";
		return `${pc}${tag}${cls}`.trim();
	}
	// Nearest quiet BEM block owning the element; "page" for app/story markup.
	function owner(el) {
		for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
			const c = [...n.classList].find((x) => /^q-[a-z0-9-]+$/.test(x) && !x.startsWith("q-anim"));
			if (c) return n === el ? c : `${c} (inside)`;
			if (n.hasAttribute("data-quiet")) break;
		}
		return "page";
	}

	// --- token sets, resolved through probes so values compare as computed values ---
	const names = new Set();
	const scan = (rules) => {
		for (const r of rules) {
			if (r.style) for (const p of r.style) if (p.startsWith("--q-")) names.add(p);
			if (r.cssRules) scan(r.cssRules);
		}
	};
	for (const s of document.styleSheets) {
		try {
			scan(s.cssRules);
		} catch {
			// cross-origin sheet (fonts): no tokens there
		}
	}
	const roots = [...document.querySelectorAll("[data-quiet]")].filter(
		(r) => !r.parentElement?.closest("[data-quiet]"),
	);
	if (!roots.length)
		return {
			findings: [{ rule: "structure", owner: "page", value: "no [data-quiet] root", example: "" }],
			tokens: 0,
		};
	const host = document.querySelector("[data-quiet][data-theme]:not(html)") ?? roots[0];
	const wrap = document.createElement("div");
	wrap.style.cssText = "position:absolute;visibility:hidden;color:rgb(1, 2, 3)";
	const probe = document.createElement("div");
	wrap.append(probe);
	host.append(wrap);
	const space = new Set(["0px", "1px"]);
	const text = new Set();
	const leading = [];
	const radius = new Set(["0px"]);
	const colours = new Set();
	const read = (prop, value) => {
		probe.style.cssText = "";
		probe.style.setProperty(prop, value);
		return getComputedStyle(probe).getPropertyValue(prop);
	};
	for (const n of names) {
		const v = `var(${n})`;
		if (n.startsWith("--q-space-")) space.add(read("width", v));
		// --q-text-* also prefixes the Text component's own tokens; keep only the scale steps
		else if (/^--q-text-(\d?x?s|sm|md|lg|\d?xl|display)$/.test(n)) text.add(read("font-size", v));
		else if (n.startsWith("--q-leading-")) {
			// unitless ratios; compared against line-height / font-size below
			const raw = getComputedStyle(host).getPropertyValue(n).trim();
			if (/^[\d.]+$/.test(raw)) leading.push(Number(raw));
		} else if (n.startsWith("--q-radius-")) radius.add(read("border-top-left-radius", v));
		const c = read("color", v);
		if (c && c !== "rgb(1, 2, 3)") colours.add(c);
	}
	wrap.remove();
	const rgb = (c) =>
		c
			.match(/[\d.]+/g)
			?.slice(0, 3)
			.join(",") ?? "";
	const tokenRgb = new Set([...colours].map(rgb));
	const alpha = (c) => {
		const m = c.match(/rgba?\(([^)]+)\)/);
		const parts = m ? m[1].split(/[,\s/]+/).filter(Boolean) : [];
		return parts.length > 3 ? Number(parts[3]) : 1;
	};
	const checkColour = (el, prop, value) => {
		if (!value || value === "rgba(0, 0, 0, 0)" || value === "transparent" || alpha(value) === 0)
			return;
		if (colours.has(value)) return;
		// An authored literal (hex, rgb, named) always computes to rgb()/rgba(). Other notations
		// (oklch(), color(srgb …)) come from color-mix()/relative colour over tokens: "derived".
		// So does a token's rgb at another alpha.
		if (!value.startsWith("rgb") || tokenRgb.has(rgb(value)))
			return add("derived", owner(el), `${prop} ${value}`, el);
		add("colour", owner(el), `${prop} ${value}`, el);
	};
	const okSpace = (v) => space.has(v.replace(/^-/, ""));

	// --- walk ---
	const hasText = (el) =>
		[...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) ||
		el.matches("input, textarea, select, button");
	const reported = new Set();
	const reportedColour = new Set();
	const introducer = (el, same) => {
		let n = el;
		while (
			n.parentElement &&
			n.parentElement !== document.documentElement &&
			same(getComputedStyle(n.parentElement))
		)
			n = n.parentElement;
		return n;
	};
	const skip = (el) =>
		el.closest("svg, [aria-hidden='true'], [data-audit='ignore'], .q-sr-only") ||
		!el.getClientRects().length;
	for (const root of roots) {
		for (const el of [root, ...root.querySelectorAll("*")]) {
			if (skip(el)) continue;
			const cs = getComputedStyle(el);
			const map = el.computedStyleMap();
			const o = owner(el);
			// spacing: only plain px lengths; auto, %, calc-with-% and normal are layout, not rhythm
			const seen = new Set();
			for (const p of [
				"row-gap",
				"column-gap",
				"padding-top",
				"padding-right",
				"padding-bottom",
				"padding-left",
				"margin-top",
				"margin-right",
				"margin-bottom",
				"margin-left",
			]) {
				const v = map.get(p);
				if (v?.unit !== "px" || v.value === 0) continue;
				if (p.endsWith("gap") && !/flex|grid/.test(cs.display)) continue;
				const px = `${+v.value.toFixed(2)}px`;
				const key = `${p.replace(/-(top|right|bottom|left)$/, "")} ${px}`;
				if (!okSpace(px) && !seen.has(key)) {
					seen.add(key);
					add("spacing", o, key, el);
				}
			}
			if (hasText(el)) {
				const fs = cs.fontSize;
				const lh = cs.lineHeight;
				// report inherited values once, at the element that introduced them
				const src = introducer(el, (c) => c.fontSize === fs && c.lineHeight === lh);
				if (!reported.has(src)) {
					reported.add(src);
					const so = owner(src);
					if (!text.has(fs)) add("type", so, `font-size ${fs}`, src);
					else if (lh !== "normal") {
						const f = Number.parseFloat(fs);
						const ratio = Number.parseFloat(lh) / f;
						const okLh =
							leading.some((l) => Math.abs(l - ratio) * f < 0.6) || Number.parseFloat(lh) % 4 === 0;
						if (!okLh) add("type", so, `${fs}/${lh}`, src);
					}
				}
				const csrc = introducer(el, (c) => c.color === cs.color);
				if (!reportedColour.has(csrc)) {
					reportedColour.add(csrc);
					checkColour(csrc, "color", cs.color);
				}
			}
			checkColour(el, "background", cs.backgroundColor);
			for (const side of ["top", "right", "bottom", "left"]) {
				if (
					Number.parseFloat(cs[`border-${side}-width`]) > 0 &&
					cs[`border-${side}-style`] !== "none"
				) {
					checkColour(el, "border", cs[`border-${side}-color`]);
					break;
				}
			}
			const r = map.get("border-top-left-radius");
			if (r && r.unit === "px" && r.value > 0) {
				const px = `${+r.value.toFixed(2)}px`;
				if (!radius.has(px)) add("radius", o, `radius ${px}`, el);
			}
		}
	}

	// --- structure ---
	const visible = (el) =>
		!el.closest("[aria-hidden='true'], [hidden]") && el.getClientRects().length;
	const hs = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6,[role='heading']")].filter(
		(h) => visible(h) || h.closest(".q-sr-only"),
	);
	const level = (h) => Number(h.getAttribute("aria-level") || h.tagName[1] || 2);
	const h1s = hs.filter((h) => level(h) === 1).length;
	if (opts?.requireH1 && h1s !== 1)
		add("structure", "page", `${h1s} h1 elements (want 1)`, document.body);
	let prev = 0;
	for (const h of hs) {
		const l = level(h);
		if (prev && l > prev + 1) add("structure", owner(h), `heading h${prev} → h${l}`, h);
		prev = l;
	}
	const landmark = (el) => {
		const r = el.getAttribute("role");
		if (r) return r;
		const t = el.tagName.toLowerCase();
		const inSection = el.parentElement?.closest("article, aside, main, nav, section");
		return (
			{
				nav: "navigation",
				main: "main",
				aside: "complementary",
				header: inSection ? null : "banner",
				footer: inSection ? null : "contentinfo",
			}[t] ?? null
		);
	};
	const byRole = {};
	for (const el of document.querySelectorAll("nav, main, aside, header, footer, [role]")) {
		const r = landmark(el);
		if (
			!r ||
			![
				"navigation",
				"main",
				"complementary",
				"banner",
				"contentinfo",
				"region",
				"search",
				"form",
			].includes(r) ||
			!visible(el)
		)
			continue;
		byRole[r] = [...(byRole[r] ?? []), el];
	}
	for (const [r, els] of Object.entries(byRole)) {
		if (els.length < 2) continue;
		for (const el of els)
			if (!el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby"))
				add("structure", owner(el), `unnamed ${r} (${els.length} on page)`, el);
	}
	for (const c of document.querySelectorAll(
		".q-card .q-card, .q-card .q-stat-card, .q-stat-card .q-card",
	)) {
		if (visible(c)) add("structure", owner(c), "card inside a card", c);
	}
	const de = document.documentElement;
	if (de.scrollWidth > de.clientWidth + 1)
		add(
			"overflow",
			"page",
			`page scrolls sideways: ${de.scrollWidth}px in ${de.clientWidth}px`,
			de,
		);
	return { findings, tokens: names.size };
}

/** Group raw findings into { rule: [{ owner, value, count, example }] }, most frequent first. */
export function group(findings) {
	const out = {};
	const idx = new Map();
	for (const f of findings) {
		const k = `${f.rule}|${f.owner}|${f.value}`;
		const hit = idx.get(k);
		if (hit) hit.count++;
		else {
			const g = { owner: f.owner, value: f.value, count: 1, example: f.example };
			idx.set(k, g);
			out[f.rule] = [...(out[f.rule] ?? []), g];
		}
	}
	for (const r of Object.keys(out)) out[r].sort((a, b) => b.count - a.count);
	return out;
}

/** Counts per rule, for baselines. */
export function counts(findings) {
	const c = Object.fromEntries(RULES.map((r) => [r, 0]));
	for (const f of findings) c[f.rule]++;
	return c;
}

/**
 * Load `url` at `width` (and Storybook `theme`), settle it, and audit it.
 * @param {import("@playwright/test").Page} page
 */
export async function auditUrl(page, url, { width = 1280, theme, requireH1 } = {}) {
	await page.setViewportSize({ width, height: 900 });
	let target = url;
	if (theme && /iframe\.html/.test(url))
		target += `${url.includes("?") ? "&" : "?"}globals=theme:${theme}`;
	await page.goto(target, { waitUntil: "networkidle" });
	if (theme && !/iframe\.html/.test(url)) {
		await page.evaluate((t) => {
			for (const el of document.querySelectorAll("html, [data-quiet][data-theme]"))
				el.setAttribute("data-theme", t);
		}, theme);
	}
	await page.addStyleTag({
		content: "*,*::before,*::after{transition:none!important;animation:none!important}",
	});
	await page.evaluate(() => document.fonts.ready);
	await page.waitForTimeout(300);
	return page.evaluate(auditInPage, { requireH1: requireH1 ?? /patterns-/.test(url) });
}

/** Baseline helpers for tests/audit.spec.ts (kept here so the spec needs no Node typings). */
export const updatingBaseline = () => !!process.env.UPDATE_AUDIT_BASELINE;
export async function writeBaseline(path, data) {
	const { writeFileSync } = await import("node:fs");
	writeFileSync(path, `${JSON.stringify(data, null, "\t")}\n`);
}
