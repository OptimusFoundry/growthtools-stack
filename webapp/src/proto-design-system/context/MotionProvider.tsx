import { createContext, type ReactNode, useContext } from "react";
import { useReducedMotion } from "../hooks/useReducedMotion";

export interface MotionContextValue {
	reducedMotion: boolean;
}

const MotionContext = createContext<MotionContextValue | null>(null);

export interface MotionProviderProps {
	children: ReactNode;
}

export function MotionProvider({ children }: MotionProviderProps) {
	const reducedMotion = useReducedMotion();

	return (
		<MotionContext.Provider value={{ reducedMotion }}>
			{children}
		</MotionContext.Provider>
	);
}

export function useMotionContext(): MotionContextValue {
	const context = useContext(MotionContext);

	if (!context) {
		throw new Error("useMotionContext must be used within a MotionProvider");
	}

	return context;
}
