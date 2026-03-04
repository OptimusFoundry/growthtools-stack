import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { cn } from "../../../utils/cn";
import styles from "./Modal.module.scss";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

export interface ModalProps {
	/** Whether the modal is open */
	isOpen: boolean;
	/** Close callback */
	onClose: () => void;
	/** Modal title */
	title?: string;
	/** Modal description/subtitle */
	description?: string;
	/** Header icon */
	icon?: ReactNode;
	/** Icon variant for styling */
	iconVariant?: "default" | "success" | "warning" | "error" | "info";
	/** Modal size */
	size?: ModalSize;
	/** Show close button */
	showCloseButton?: boolean;
	/** Whether the modal can be dismissed by clicking overlay or pressing Escape */
	dismissible?: boolean;
	/** Modal content */
	children: ReactNode;
	/** Footer content */
	footer?: ReactNode;
	/** Additional className */
	className?: string;
}

/**
 * Modal component using native HTML dialog element.
 *
 * @example
 * ```tsx
 * <Modal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Confirm Action"
 *   description="This action cannot be undone."
 *   icon={<AlertTriangle />}
 *   iconVariant="warning"
 * >
 *   <p>Are you sure you want to proceed?</p>
 * </Modal>
 * ```
 */
export function Modal({
	isOpen,
	onClose,
	title,
	description,
	icon,
	iconVariant = "default",
	size = "md",
	showCloseButton = true,
	dismissible = true,
	children,
	footer,
	className,
}: ModalProps) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const prefersReducedMotion = useReducedMotion();
	const [showContent, setShowContent] = useState(false);

	// Handle dialog open/close
	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		if (isOpen) {
			dialog.showModal();
			setShowContent(true);
		} else {
			setShowContent(false);
			// Close immediately if reduced motion is preferred
			if (prefersReducedMotion) {
				dialog.close();
			}
		}
	}, [isOpen, prefersReducedMotion]);

	// Close dialog after exit animation completes (only when animations enabled)
	const handleExitComplete = useCallback(() => {
		const dialog = dialogRef.current;
		if (dialog && !isOpen && !prefersReducedMotion) {
			dialog.close();
		}
	}, [isOpen, prefersReducedMotion]);

	// Handle native cancel event (escape key)
	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;

		const handleCancel = (e: Event) => {
			e.preventDefault();
			if (dismissible) {
				onClose();
			}
		};

		dialog.addEventListener("cancel", handleCancel);
		return () => {
			dialog.removeEventListener("cancel", handleCancel);
		};
	}, [dismissible, onClose]);

	// Handle backdrop click
	const handleBackdropClick = useCallback(
		(event: React.MouseEvent<HTMLDialogElement>) => {
			if (dismissible && event.target === dialogRef.current) {
				onClose();
			}
		},
		[dismissible, onClose],
	);

	const hasHeader = title || description || icon || showCloseButton;

	// Animation variants
	const backdropVariants = {
		hidden: { opacity: 0 },
		visible: { opacity: 1 },
	};

	const modalVariants = {
		hidden: { opacity: 0, scale: 0.95, y: 8 },
		visible: { opacity: 1, scale: 1, y: 0 },
	};

	const transition = prefersReducedMotion
		? { duration: 0 }
		: { duration: 0.2, ease: [0, 0, 0.2, 1] };

	return (
		<dialog
			ref={dialogRef}
			className={cn(styles.dialog, styles[`size-${size}`], className)}
			onClick={handleBackdropClick}
			aria-labelledby={title ? "modal-title" : undefined}
			aria-describedby={description ? "modal-description" : undefined}
		>
			<AnimatePresence onExitComplete={handleExitComplete}>
				{showContent && (
					<>
						<motion.div
							className={styles.backdrop}
							variants={backdropVariants}
							initial="hidden"
							animate="visible"
							exit="hidden"
							transition={transition}
						/>
						<motion.div
							className={styles.modal}
							variants={modalVariants}
							initial="hidden"
							animate="visible"
							exit="hidden"
							transition={transition}
						>
							{hasHeader && (
								<div
									className={cn(styles.header, icon && styles.headerWithIcon)}
								>
									{icon && (
										<div
											className={cn(
												styles.iconWrapper,
												styles[`icon-${iconVariant}`],
											)}
										>
											{icon}
										</div>
									)}
									<div className={styles.headerContent}>
										{title && (
											<h2 id="modal-title" className={styles.title}>
												{title}
											</h2>
										)}
										{description && (
											<p id="modal-description" className={styles.description}>
												{description}
											</p>
										)}
									</div>
									{showCloseButton && dismissible && (
										<button
											type="button"
											className={styles.closeButton}
											onClick={onClose}
											aria-label="Close modal"
										>
											<X />
										</button>
									)}
								</div>
							)}
							<div className={styles.body}>{children}</div>
							{footer && <div className={styles.footer}>{footer}</div>}
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</dialog>
	);
}

Modal.displayName = "Modal";
