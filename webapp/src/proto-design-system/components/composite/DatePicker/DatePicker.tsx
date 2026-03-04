import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
	type KeyboardEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { cn } from "../../../utils/cn";
import styles from "./DatePicker.module.scss";

export type DatePickerSize = "sm" | "md" | "lg";

export interface DatePickerProps {
	/** Selected date */
	value?: Date | null;
	/** Date change handler */
	onChange?: (date: Date | null) => void;
	/** Placeholder text */
	placeholder?: string;
	/** Date picker size */
	size?: DatePickerSize;
	/** Disabled state */
	disabled?: boolean;
	/** Minimum selectable date */
	minDate?: Date;
	/** Maximum selectable date */
	maxDate?: Date;
	/** Format function for display */
	formatDate?: (date: Date) => string;
	/** First day of week (0 = Sunday, 1 = Monday) */
	firstDayOfWeek?: 0 | 1;
	/** Additional className */
	className?: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

function defaultFormatDate(date: Date): string {
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function isSameDay(a: Date, b: Date): boolean {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

function isDateDisabled(date: Date, minDate?: Date, maxDate?: Date): boolean {
	if (minDate && date < minDate) return true;
	if (maxDate && date > maxDate) return true;
	return false;
}

/**
 * DatePicker component for selecting dates.
 *
 * @example
 * ```tsx
 * <DatePicker
 *   value={selectedDate}
 *   onChange={setSelectedDate}
 *   placeholder="Select date..."
 * />
 * ```
 */
export function DatePicker({
	value,
	onChange,
	placeholder = "Select date...",
	size = "md",
	disabled = false,
	minDate,
	maxDate,
	formatDate = defaultFormatDate,
	firstDayOfWeek = 0,
	className,
}: DatePickerProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [viewDate, setViewDate] = useState(() => value || new Date());
	const [focusedDate, setFocusedDate] = useState<Date | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const calendarRef = useRef<HTMLDivElement>(null);
	const prefersReducedMotion = useReducedMotion();

	// Animation variants
	const calendarVariants = {
		hidden: { opacity: 0, scale: 0.95, y: -4 },
		visible: { opacity: 1, scale: 1, y: 0 },
	};

	const transition = prefersReducedMotion
		? { duration: 0 }
		: { duration: 0.15, ease: [0, 0, 0.2, 1] };

	// Handle click outside
	useEffect(() => {
		if (!isOpen) return;

		const handleClickOutside = (e: MouseEvent | TouchEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("touchstart", handleClickOutside);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("touchstart", handleClickOutside);
		};
	}, [isOpen]);

	// Update view date when value changes
	useEffect(() => {
		if (value) {
			setViewDate(value);
		}
	}, [value]);

	// Reset focused date when calendar opens
	useEffect(() => {
		if (isOpen) {
			setFocusedDate(value || new Date());
		} else {
			setFocusedDate(null);
		}
	}, [isOpen, value]);

	// Handle focus leaving the container
	const handleContainerBlur = useCallback((e: React.FocusEvent) => {
		// Check if the new focus target is outside the container
		if (
			containerRef.current &&
			!containerRef.current.contains(e.relatedTarget as Node)
		) {
			setIsOpen(false);
		}
	}, []);

	// Get days in month
	const calendarDays = useMemo(() => {
		const year = viewDate.getFullYear();
		const month = viewDate.getMonth();

		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);

		const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

		// Adjust for first day of week
		let startOffset = firstDay.getDay() - firstDayOfWeek;
		if (startOffset < 0) startOffset += 7;

		// Previous month days
		for (let i = startOffset - 1; i >= 0; i--) {
			const date = new Date(year, month, -i);
			days.push({ date, isCurrentMonth: false });
		}

		// Current month days
		for (let i = 1; i <= lastDay.getDate(); i++) {
			const date = new Date(year, month, i);
			days.push({ date, isCurrentMonth: true });
		}

		// Next month days (fill to 42 for 6 rows)
		const remaining = 42 - days.length;
		for (let i = 1; i <= remaining; i++) {
			const date = new Date(year, month + 1, i);
			days.push({ date, isCurrentMonth: false });
		}

		return days;
	}, [viewDate, firstDayOfWeek]);

	// Get day headers
	const dayHeaders = useMemo(() => {
		const headers = [...DAYS];
		if (firstDayOfWeek === 1) {
			const first = headers.shift();
			if (first) headers.push(first);
		}
		return headers;
	}, [firstDayOfWeek]);

	const handleToggle = useCallback(() => {
		if (!disabled) {
			setIsOpen((prev) => !prev);
		}
	}, [disabled]);

	const handleSelectDate = useCallback(
		(date: Date) => {
			if (isDateDisabled(date, minDate, maxDate)) return;
			onChange?.(date);
			setIsOpen(false);
		},
		[onChange, minDate, maxDate],
	);

	const handlePrevMonth = useCallback(() => {
		setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
	}, []);

	const handleNextMonth = useCallback(() => {
		setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
	}, []);

	const handleMonthChange = useCallback(
		(month: number) => {
			setViewDate((prev) => new Date(prev.getFullYear(), month, 1));
			if (focusedDate) {
				const newFocused = new Date(focusedDate);
				newFocused.setMonth(month);
				setFocusedDate(newFocused);
			}
		},
		[focusedDate],
	);

	const handleYearChange = useCallback(
		(year: number) => {
			setViewDate((prev) => new Date(year, prev.getMonth(), 1));
			if (focusedDate) {
				const newFocused = new Date(focusedDate);
				newFocused.setFullYear(year);
				setFocusedDate(newFocused);
			}
		},
		[focusedDate],
	);

	// Generate year options (100 years back, 10 years forward)
	const yearOptions = useMemo(() => {
		const currentYear = new Date().getFullYear();
		const years: number[] = [];
		for (let y = currentYear - 100; y <= currentYear + 10; y++) {
			years.push(y);
		}
		return years;
	}, []);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (disabled) return;

			// Don't interfere with select dropdowns
			const isOnSelect = (e.target as HTMLElement).tagName === "SELECT";

			switch (e.key) {
				case "Enter":
				case " ":
					// Don't prevent space on selects (they need it to open)
					if (isOnSelect) return;
					e.preventDefault();
					if (!isOpen) {
						setIsOpen(true);
					} else if (focusedDate) {
						handleSelectDate(focusedDate);
					}
					break;
				case "Escape":
					e.preventDefault();
					setIsOpen(false);
					break;
				case "ArrowLeft":
					// Let select handle its own arrow keys
					if (isOnSelect) return;
					e.preventDefault();
					if (isOpen && focusedDate) {
						const newDate = new Date(focusedDate);
						newDate.setDate(newDate.getDate() - 1);
						setFocusedDate(newDate);
						setViewDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
					}
					break;
				case "ArrowRight":
					if (isOnSelect) return;
					e.preventDefault();
					if (isOpen && focusedDate) {
						const newDate = new Date(focusedDate);
						newDate.setDate(newDate.getDate() + 1);
						setFocusedDate(newDate);
						setViewDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
					}
					break;
				case "ArrowUp":
					if (isOnSelect) return;
					e.preventDefault();
					if (isOpen && focusedDate) {
						const newDate = new Date(focusedDate);
						newDate.setDate(newDate.getDate() - 7);
						setFocusedDate(newDate);
						setViewDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
					}
					break;
				case "ArrowDown":
					if (isOnSelect) return;
					e.preventDefault();
					if (isOpen && focusedDate) {
						const newDate = new Date(focusedDate);
						newDate.setDate(newDate.getDate() + 7);
						setFocusedDate(newDate);
						setViewDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
					}
					break;
				case "PageUp":
					if (isOnSelect) return;
					e.preventDefault();
					if (isOpen && focusedDate) {
						const newDate = new Date(focusedDate);
						if (e.shiftKey) {
							// Shift+PageUp: Previous year
							newDate.setFullYear(newDate.getFullYear() - 1);
						} else {
							// PageUp: Previous month
							newDate.setMonth(newDate.getMonth() - 1);
						}
						setFocusedDate(newDate);
						setViewDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
					}
					break;
				case "PageDown":
					if (isOnSelect) return;
					e.preventDefault();
					if (isOpen && focusedDate) {
						const newDate = new Date(focusedDate);
						if (e.shiftKey) {
							// Shift+PageDown: Next year
							newDate.setFullYear(newDate.getFullYear() + 1);
						} else {
							// PageDown: Next month
							newDate.setMonth(newDate.getMonth() + 1);
						}
						setFocusedDate(newDate);
						setViewDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
					}
					break;
				case "Home":
					if (isOnSelect) return;
					e.preventDefault();
					if (isOpen && focusedDate) {
						// Go to first day of month
						const newDate = new Date(
							focusedDate.getFullYear(),
							focusedDate.getMonth(),
							1,
						);
						setFocusedDate(newDate);
					}
					break;
				case "End":
					if (isOnSelect) return;
					e.preventDefault();
					if (isOpen && focusedDate) {
						// Go to last day of month
						const newDate = new Date(
							focusedDate.getFullYear(),
							focusedDate.getMonth() + 1,
							0,
						);
						setFocusedDate(newDate);
					}
					break;
			}
		},
		[disabled, isOpen, focusedDate, handleSelectDate],
	);

	const today = new Date();

	return (
		<div
			ref={containerRef}
			className={cn(styles.datePicker, styles[`size-${size}`], className)}
			onBlur={handleContainerBlur}
		>
			<button
				type="button"
				className={cn(
					styles.trigger,
					isOpen && styles.open,
					disabled && styles.disabled,
				)}
				onClick={handleToggle}
				onKeyDown={handleKeyDown}
				disabled={disabled}
				aria-haspopup="dialog"
				aria-expanded={isOpen}
			>
				<Calendar className={styles.icon} />
				<span className={cn(styles.value, !value && styles.placeholder)}>
					{value ? formatDate(value) : placeholder}
				</span>
			</button>

			<AnimatePresence>
				{isOpen && (
					<motion.div
						ref={calendarRef}
						className={styles.calendar}
						role="dialog"
						aria-modal="true"
						aria-label="Choose date"
						onKeyDown={handleKeyDown}
						variants={calendarVariants}
						initial="hidden"
						animate="visible"
						exit="hidden"
						transition={transition}
					>
						<div className={styles.header}>
							<button
								type="button"
								className={styles.navButton}
								onClick={handlePrevMonth}
								aria-label="Previous month"
							>
								<ChevronLeft />
							</button>
							<div className={styles.selectors}>
								<select
									className={styles.monthSelect}
									value={viewDate.getMonth()}
									onChange={(e) => handleMonthChange(Number(e.target.value))}
									aria-label="Select month"
								>
									{MONTHS.map((month, index) => (
										<option key={month} value={index}>
											{month}
										</option>
									))}
								</select>
								<select
									className={styles.yearSelect}
									value={viewDate.getFullYear()}
									onChange={(e) => handleYearChange(Number(e.target.value))}
									aria-label="Select year"
								>
									{yearOptions.map((year) => (
										<option key={year} value={year}>
											{year}
										</option>
									))}
								</select>
							</div>
							<button
								type="button"
								className={styles.navButton}
								onClick={handleNextMonth}
								aria-label="Next month"
							>
								<ChevronRight />
							</button>
						</div>

						<div className={styles.dayHeaders}>
							{dayHeaders.map((day) => (
								<div key={day} className={styles.dayHeader}>
									{day}
								</div>
							))}
						</div>

						<div className={styles.days} role="grid">
							{calendarDays.map(({ date, isCurrentMonth }) => {
								const isSelected = value ? isSameDay(date, value) : false;
								const isToday = isSameDay(date, today);
								const isFocused = focusedDate
									? isSameDay(date, focusedDate)
									: false;
								const isDisabled = isDateDisabled(date, minDate, maxDate);

								return (
									<button
										key={date.toISOString()}
										type="button"
										className={cn(
											styles.day,
											!isCurrentMonth && styles.otherMonth,
											isSelected && styles.selected,
											isToday && styles.today,
											isFocused && styles.focused,
											isDisabled && styles.disabled,
										)}
										onClick={() => handleSelectDate(date)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												handleSelectDate(date);
											}
										}}
										disabled={isDisabled}
										tabIndex={isFocused ? 0 : -1}
										aria-selected={isSelected}
										aria-disabled={isDisabled}
										role="gridcell"
									>
										{date.getDate()}
									</button>
								);
							})}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

DatePicker.displayName = "DatePicker";
