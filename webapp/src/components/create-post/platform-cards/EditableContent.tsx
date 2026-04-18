import { useEffect, useRef } from "react";
import { PLATFORM_DISPLAY_NAMES, type PlatformType } from "@/types/platform";
import styles from "../PlatformPostCard.module.scss";

interface EditableContentProps {
	content: string;
	onChange: (content: string) => void;
	platform: PlatformType;
	className?: string;
	readOnly?: boolean;
}

export function EditableContent({
	content,
	onChange,
	platform,
	className,
	readOnly,
}: EditableContentProps) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (el && el.textContent !== content) {
			el.textContent = content;
		}
	}, [content]);

	const handleInput = () => {
		const el = ref.current;
		if (el) {
			onChange(el.textContent ?? "");
		}
	};

	// Modern replacement for deprecated document.execCommand("insertText").
	// Inserts plain text at the current cursor position using Selection/Range API,
	// preserving cursor position and browser undo stack.
	const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
		e.preventDefault();
		const text = e.clipboardData.getData("text/plain");
		const selection = window.getSelection();
		if (!selection || !selection.rangeCount) return;
		selection.deleteFromDocument();
		const range = selection.getRangeAt(0);
		range.insertNode(document.createTextNode(text));
		range.collapse(false);
		selection.removeAllRanges();
		selection.addRange(range);
		// Sync the new text value back into controlled state
		if (ref.current) {
			onChange(ref.current.textContent ?? "");
		}
	};

	return (
		<div
			ref={ref}
			className={className ?? styles.editableContent}
			contentEditable={!readOnly}
			suppressContentEditableWarning
			onInput={handleInput}
			onPaste={handlePaste}
			role="textbox"
			aria-label={`Edit ${PLATFORM_DISPLAY_NAMES[platform]} content`}
			data-placeholder="Write your post..."
		/>
	);
}
