import React from "react";
import { FormHint } from "./FormHint";
import { Label } from "./Label";
import "./FormField.scss";

/**
 * Label + any control + hint/error. Wires native controls and Stepper automatically (id, aria-invalid, aria-describedby, aria-required).
 * @startingPoint section="Forms" subtitle="Label · control · hint" viewport="600x240"
 */
export interface FormFieldProps {
	label?: React.ReactNode;
	id?: string;
	required?: boolean;
	subText?: React.ReactNode;
	helperText?: React.ReactNode;
	/** Replaces helperText, molten */
	error?: React.ReactNode;
	size?: "sm" | "md" | "lg";
	/** The control */
	children: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

type FieldControlProps = {
	id?: string;
	"aria-invalid"?: boolean;
	"aria-describedby"?: string;
	"aria-required"?: boolean;
};

let ofFieldId = 0;
export function FormField({
	label,
	id,
	required,
	subText,
	helperText,
	error,
	size = "md",
	children,
	className,
	style,
}: FormFieldProps) {
	const [auto] = React.useState(() => `of-field-${++ofFieldId}`);
	const fid = id || auto;
	const hintId = `${fid}-hint`;
	const described =
		[
			children && (children as React.ReactElement<FieldControlProps>).props?.["aria-describedby"],
			error || helperText ? hintId : null,
		]
			.filter(Boolean)
			.join(" ") || undefined;
	const child =
		React.isValidElement<FieldControlProps>(children) &&
		(typeof children.type === "string" ||
			(children.type as { fieldControl?: boolean }).fieldControl)
			? React.cloneElement(children, {
					id: fid,
					"aria-invalid": !!error || undefined,
					"aria-describedby": described,
					"aria-required": required || undefined,
				})
			: children;
	return (
		<div className={["q-form-field", className].filter(Boolean).join(" ")} style={style}>
			{label && (
				<Label htmlFor={fid} required={required} subText={subText} size={size}>
					{label}
				</Label>
			)}
			{child}
			<FormHint id={hintId} variant={error ? "error" : "default"}>
				{error || helperText}
			</FormHint>
		</div>
	);
}
