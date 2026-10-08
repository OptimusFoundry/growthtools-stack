// Native form participation for quiet's ARIA widgets (checkbox, switch, slider, radiogroup,
// combobox, date button), which a <form> would otherwise skip.
import type { ReactNode } from "react";

interface FormValueProps {
	name?: string;
	/** Submitted value; for a checkbox, the value sent while checked */
	value?: string | null;
	/** Set for checkbox semantics: nothing is submitted while false */
	checked?: boolean;
	required?: boolean;
	disabled?: boolean;
	form?: string;
	/** The visible control, focused when the browser focuses an invalid proxy */
	focusTarget?: () => HTMLElement | null;
}

const noop = () => {};

export function FormValue({
	name,
	value,
	checked,
	required,
	disabled,
	form,
	focusTarget,
}: FormValueProps): ReactNode {
	const isCheck = checked !== undefined;
	if (!required) {
		// type="hidden" is not labelable, so it never becomes the control of a wrapping <label>.
		if (!name || (isCheck && !checked)) return null;
		return <input type="hidden" name={name} value={value ?? ""} disabled={disabled} form={form} />;
	}
	// Hidden inputs are barred from constraint validation, so `required` needs a real (visually
	// hidden, unfocusable) input; the browser focuses it on an invalid submit and we hand that on.
	return (
		<input
			type={isCheck ? "checkbox" : "text"}
			name={name}
			value={value ?? (isCheck ? "on" : "")}
			checked={isCheck ? checked : undefined}
			required
			disabled={disabled}
			form={form}
			aria-hidden="true"
			tabIndex={-1}
			autoComplete="off"
			className="q-sr-only"
			onChange={noop}
			onFocus={() => focusTarget?.()?.focus()}
		/>
	);
}

/** Multi-value variant: one hidden input per value, plus a validity proxy while empty and required. */
export function FormValues({
	name,
	values,
	required,
	disabled,
	form,
	focusTarget,
}: Omit<FormValueProps, "value" | "checked"> & { values: string[] }): ReactNode {
	return (
		<>
			{name &&
				values.map((v) => (
					<input key={v} type="hidden" name={name} value={v} disabled={disabled} form={form} />
				))}
			{required && values.length === 0 && (
				<FormValue required disabled={disabled} form={form} focusTarget={focusTarget} />
			)}
		</>
	);
}
