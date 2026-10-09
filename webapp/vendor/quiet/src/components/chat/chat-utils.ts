import React from "react";

// Shared helpers for the chat set: file kinds, sizes, accept matching and copy-to-clipboard.

const DOC_KINDS: Record<string, string> = {
	pdf: "PDF",
	doc: "DOC",
	docx: "DOCX",
	txt: "TXT",
	md: "MD",
	rtf: "RTF",
	csv: "CSV",
	tsv: "TSV",
	xls: "XLS",
	xlsx: "XLSX",
	ppt: "PPT",
	pptx: "PPTX",
	json: "JSON",
	html: "HTML",
	xml: "XML",
	zip: "ZIP",
	js: "JS",
	jsx: "JSX",
	ts: "TS",
	tsx: "TSX",
	py: "PY",
	go: "GO",
	rs: "RS",
	sql: "SQL",
	png: "PNG",
	jpg: "JPG",
	jpeg: "JPG",
	gif: "GIF",
	webp: "WEBP",
	svg: "SVG",
	heic: "HEIC",
};

export function extension(name = "") {
	const m = String(name)
		.toLowerCase()
		.match(/\.([a-z0-9]+)$/);
	return m ? m[1]! : "";
}

/** Short type label for a file: "PDF", "DOCX", "PNG" … falls back to the MIME subtype or "FILE". */
export function fileKind(name: string, type = "") {
	const ext = extension(name);
	if (DOC_KINDS[ext]) return DOC_KINDS[ext];
	const sub = String(type).split("/")[1];
	return sub ? sub.replace(/^x-/, "").slice(0, 4).toUpperCase() : "FILE";
}

export function isImage(type = "", name = "") {
	return (
		String(type).startsWith("image/") ||
		/^(png|jpe?g|gif|webp|svg|heic|avif)$/.test(extension(name))
	);
}

export function formatBytes(bytes: number | null | undefined) {
	if (bytes == null || Number.isNaN(bytes)) return "";
	if (bytes < 1024) return `${bytes} B`;
	const units = ["KB", "MB", "GB"];
	let v = bytes / 1024;
	let i = 0;
	while (v >= 1024 && i < units.length - 1) {
		v /= 1024;
		i++;
	}
	return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

/** Does a file match an `accept` string like "image/*,.pdf,text/csv"? */
export function accepts(file: Pick<File, "name" | "type">, accept?: string) {
	if (!accept) return true;
	const name = (file.name || "").toLowerCase();
	const type = (file.type || "").toLowerCase();
	return accept
		.split(",")
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean)
		.some((rule) => {
			if (rule.startsWith(".")) return name.endsWith(rule);
			if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1));
			return type === rule;
		});
}

let seq = 0;
/** Wraps a File as a chat attachment: { id, file, name, size, type }. */
export function toAttachment(file: File) {
	seq += 1;
	return {
		id: `att-${Date.now().toString(36)}-${seq}`,
		file,
		name: file.name || "Pasted image",
		size: file.size,
		type: file.type,
	};
}

/** Copies text; resolves true on success. Falls back to a hidden textarea where the API is missing. */
export async function copyText(text: string) {
	try {
		if (navigator.clipboard && window.isSecureContext) {
			await navigator.clipboard.writeText(text);
			return true;
		}
	} catch {
		// fall through to the legacy path
	}
	try {
		const ta = document.createElement("textarea");
		ta.value = text;
		ta.setAttribute("readonly", "");
		ta.style.position = "fixed";
		ta.style.opacity = "0";
		document.body.appendChild(ta);
		ta.select();
		const ok = document.execCommand("copy");
		ta.remove();
		return ok;
	} catch {
		return false;
	}
}

/** A copy button's state: call `copy(text)`; `state` is idle | copied | failed for ~1.6s. */
export function useCopy(resetMs = 1600) {
	const [state, setState] = React.useState<"idle" | "copied" | "failed">("idle");
	const timer = React.useRef<number | ReturnType<typeof setTimeout>>(0);
	React.useEffect(() => () => clearTimeout(timer.current), []);
	const copy = async (text: string) => {
		const ok = await copyText(text);
		setState(ok ? "copied" : "failed");
		clearTimeout(timer.current);
		timer.current = setTimeout(() => setState("idle"), resetMs);
		return ok;
	};
	return [state, copy] as const;
}
