// Live contrast scoring for the type-audit specimen: WCAG 2.2 ratio + APCA-W3
// (0.0.98G-4g) Lc. Validated against the official apca-w3 test vectors
// (#888/#fff -> 63.056, #fff/#888 -> -68.54, #000/#aaa -> 58.146).
// Showcase-only — imported by TypeAudit, tree-shaken from the app.

export type Rgb = [number, number, number];

let ctx: CanvasRenderingContext2D | null = null;

// Normalizes any CSS color the browser can paint (oklch(), rgb(), hex, ...)
// to 8-bit sRGB by round-tripping it through a 1px canvas — robust against
// how each engine serializes computed color values.
export function cssColorToRgb(css: string): Rgb | null {
	if (!ctx) {
		const canvas = document.createElement("canvas");
		canvas.width = 1;
		canvas.height = 1;
		ctx = canvas.getContext("2d", { willReadFrequently: true });
	}
	if (!ctx) return null;
	ctx.fillStyle = "#000";
	ctx.fillStyle = css;
	ctx.clearRect(0, 0, 1, 1);
	ctx.fillRect(0, 0, 1, 1);
	const d = ctx.getImageData(0, 0, 1, 1).data;
	return [d[0], d[1], d[2]];
}

function wcagLum([r, g, b]: Rgb): number {
	const f = (channel: number) => {
		const c = channel / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function wcagRatio(fg: Rgb, bg: Rgb): number {
	const [hi, lo] = [wcagLum(fg), wcagLum(bg)].sort((a, b) => b - a);
	return (hi + 0.05) / (lo + 0.05);
}

function apcaY([r, g, b]: Rgb): number {
	const f = (channel: number) => (channel / 255) ** 2.4;
	return 0.2126729 * f(r) + 0.7151522 * f(g) + 0.072175 * f(b);
}

// Signed Lc: positive = dark text on light bg, negative = light on dark.
export function apcaLc(txt: Rgb, bg: Rgb): number {
	const blkThrs = 0.022;
	const blkClmp = 1.414;
	const clamp = (y: number) => (y > blkThrs ? y : y + (blkThrs - y) ** blkClmp);
	const yTx = clamp(apcaY(txt));
	const yBg = clamp(apcaY(bg));
	if (Math.abs(yBg - yTx) < 0.0005) return 0;
	if (yBg > yTx) {
		const sapc = (yBg ** 0.56 - yTx ** 0.57) * 1.14;
		return sapc < 0.1 ? 0 : (sapc - 0.027) * 100;
	}
	const sapc = (yBg ** 0.65 - yTx ** 0.62) * 1.14;
	return sapc > -0.1 ? 0 : (sapc + 0.027) * 100;
}
