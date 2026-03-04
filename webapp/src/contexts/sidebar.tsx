import React, { createContext, useContext, useEffect, useState } from "react";

type SidebarContextType = {
	isOpen: boolean;
	toggleSidebar: () => void;
	isMobile: boolean;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [isOpen, setIsOpen] = useState(true);
	const [isMobile, setIsMobile] = useState(false);

	const toggleSidebar = () => {
		setIsOpen(!isOpen);
	};

	// Check if screen is mobile on mount and when window resizes
	useEffect(() => {
		const checkIfMobile = () => {
			setIsMobile(window.innerWidth < 768);
			if (window.innerWidth < 768) {
				setIsOpen(false);
			} else {
				setIsOpen(true);
			}
		};

		// Initial check
		checkIfMobile();

		// Set up event listener
		window.addEventListener("resize", checkIfMobile);

		// Clean up
		return () => window.removeEventListener("resize", checkIfMobile);
	}, []);

	return (
		<SidebarContext.Provider value={{ isOpen, toggleSidebar, isMobile }}>
			{children}
		</SidebarContext.Provider>
	);
};

export const useSidebar = (): SidebarContextType => {
	const context = useContext(SidebarContext);
	if (context === undefined) {
		throw new Error("useSidebar must be used within a SidebarProvider");
	}
	return context;
};
