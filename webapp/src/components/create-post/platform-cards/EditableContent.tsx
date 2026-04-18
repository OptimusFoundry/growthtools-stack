import { useCallback, useEffect, useRef } from "react";
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

	const handleInput = useCallback(() => {
		const el = ref.current;
		if (el) {
			onChange(el.textContent ?? "");
		}
	}, [onChange]);

	const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
		e.preventDefault();
		const text = e.clipboardData.getData("text/plain");
		document.execCommand("insertText", false, text);
	}, []);

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
