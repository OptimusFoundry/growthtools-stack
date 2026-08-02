/**
 * Incrementally extracts one string field's value out of a JSON object that
 * is still being streamed in (e.g. token-by-token from an LLM). Used so a
 * live preview can show clean text instead of raw, half-formed JSON syntax
 * while generation is in progress.
 *
 * Stops at the first unescaped closing quote, or at the end of the buffer if
 * the value isn't closed yet — including stopping just before an escape
 * sequence that hasn't fully arrived (e.g. a lone trailing `\` or a `\u`
 * short on hex digits), so a chunk boundary never renders a garbled
 * character.
 */
export function extractJSONStringField(raw: string, field: string): string {
	const marker = new RegExp(`"${field}"\\s*:\\s*"`);
	const match = marker.exec(raw);
	if (!match) return "";

	let out = "";
	let i = match.index + match[0].length;

	while (i < raw.length) {
		const ch = raw[i];

		if (ch === '"') return out;

		if (ch !== "\\") {
			out += ch;
			i += 1;
			continue;
		}

		const next = raw[i + 1];
		if (next === undefined) return out;

		switch (next) {
			case '"':
				out += '"';
				i += 2;
				break;
			case "\\":
				out += "\\";
				i += 2;
				break;
			case "/":
				out += "/";
				i += 2;
				break;
			case "n":
				out += "\n";
				i += 2;
				break;
			case "t":
				out += "\t";
				i += 2;
				break;
			case "r":
				out += "\r";
				i += 2;
				break;
			case "b":
				out += "\b";
				i += 2;
				break;
			case "f":
				out += "\f";
				i += 2;
				break;
			case "u": {
				const hex = raw.slice(i + 2, i + 6);
				if (hex.length < 4) return out;
				out += String.fromCharCode(Number.parseInt(hex, 16));
				i += 6;
				break;
			}
			default:
				out += next;
				i += 2;
		}
	}

	return out;
}
