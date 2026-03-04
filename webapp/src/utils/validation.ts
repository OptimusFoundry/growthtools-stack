/**
 * Form validation utilities
 * Manual validation functions without external dependencies
 */

/**
 * Validate email format
 * @param email Email string to validate
 * @returns Error message or null if valid
 */
export function validateEmail(email: string): string | null {
	if (!email) {
		return "Email is required";
	}

	if (typeof email !== "string") {
		return "Email must be a string";
	}

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email.trim())) {
		return "Invalid email format";
	}

	return null;
}

/**
 * Validate required field
 * @param value Value to validate
 * @param fieldName Name of the field for error message
 * @returns Error message or null if valid
 */
export function validateRequired(
	value: unknown,
	fieldName: string,
): string | null {
	if (value === null || value === undefined || value === "") {
		return `${fieldName} is required`;
	}

	if (typeof value === "string" && value.trim() === "") {
		return `${fieldName} is required`;
	}

	return null;
}

/**
 * Validate string length
 * @param value String to validate
 * @param min Minimum length (optional)
 * @param max Maximum length (optional)
 * @param fieldName Name of the field for error message
 * @returns Error message or null if valid
 */
export function validateLength(
	value: string,
	options: {
		min?: number;
		max?: number;
		fieldName?: string;
	},
): string | null {
	const { min, max, fieldName = "Field" } = options;

	if (!value) {
		return null; // Use validateRequired separately for required checks
	}

	const length = value.length;

	if (min !== undefined && length < min) {
		return `${fieldName} must be at least ${min} characters`;
	}

	if (max !== undefined && length > max) {
		return `${fieldName} must be less than ${max} characters`;
	}

	return null;
}

/**
 * Validate URL format
 * @param url URL string to validate
 * @returns Error message or null if valid
 */
export function validateUrl(url: string): string | null {
	if (!url) {
		return null; // Use validateRequired separately for required checks
	}

	try {
		new URL(url);
		return null;
	} catch {
		return "Invalid URL format";
	}
}

/**
 * Validate number range
 * @param value Number to validate
 * @param options Min and max options
 * @returns Error message or null if valid
 */
export function validateNumber(
	value: number,
	options: {
		min?: number;
		max?: number;
		fieldName?: string;
	},
): string | null {
	const { min, max, fieldName = "Value" } = options;

	if (value === null || value === undefined) {
		return null; // Use validateRequired separately for required checks
	}

	if (typeof value !== "number" || isNaN(value)) {
		return `${fieldName} must be a valid number`;
	}

	if (min !== undefined && value < min) {
		return `${fieldName} must be at least ${min}`;
	}

	if (max !== undefined && value > max) {
		return `${fieldName} must be less than ${max}`;
	}

	return null;
}

/**
 * Validate phone number (basic validation)
 * @param phone Phone number string
 * @returns Error message or null if valid
 */
export function validatePhone(phone: string): string | null {
	if (!phone) {
		return null; // Use validateRequired separately for required checks
	}

	// Basic phone validation - at least 10 digits
	const digitsOnly = phone.replace(/\D/g, "");
	if (digitsOnly.length < 10) {
		return "Phone number must contain at least 10 digits";
	}

	return null;
}

/**
 * Validate custom pattern
 * @param value Value to validate
 * @param pattern RegExp pattern
 * @param errorMessage Custom error message
 * @returns Error message or null if valid
 */
export function validatePattern(
	value: string,
	pattern: RegExp,
	errorMessage: string,
): string | null {
	if (!value) {
		return null; // Use validateRequired separately for required checks
	}

	if (!pattern.test(value)) {
		return errorMessage;
	}

	return null;
}

/**
 * Validate date
 * @param date Date to validate
 * @param options Validation options
 * @returns Error message or null if valid
 */
export function validateDate(
	date: Date | string,
	options?: {
		minDate?: Date;
		maxDate?: Date;
		fieldName?: string;
	},
): string | null {
	const { minDate, maxDate, fieldName = "Date" } = options || {};

	if (!date) {
		return null; // Use validateRequired separately for required checks
	}

	const dateObj = typeof date === "string" ? new Date(date) : date;

	if (isNaN(dateObj.getTime())) {
		return `${fieldName} must be a valid date`;
	}

	if (minDate && dateObj < minDate) {
		return `${fieldName} must be after ${minDate.toLocaleDateString()}`;
	}

	if (maxDate && dateObj > maxDate) {
		return `${fieldName} must be before ${maxDate.toLocaleDateString()}`;
	}

	return null;
}

/**
 * Compose multiple validators
 * @param validators Array of validator functions
 * @returns First error message or null if all valid
 */
export function composeValidators(
	...validators: Array<() => string | null>
): string | null {
	for (const validator of validators) {
		const error = validator();
		if (error) {
			return error;
		}
	}
	return null;
}
