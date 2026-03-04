import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Pagination } from "./Pagination";

const meta: Meta<typeof Pagination> = {
	title: "Navigation/Pagination",
	component: Pagination,
	parameters: {
		layout: "padded",
	},
	argTypes: {
		size: {
			control: "select",
			options: ["sm", "md", "lg"],
		},
		variant: {
			control: "select",
			options: ["default", "outline", "ghost"],
		},
	},
};

export default meta;
type Story = StoryObj<typeof Pagination>;

function PaginationDemo(
	props: Partial<React.ComponentProps<typeof Pagination>>,
) {
	const [page, setPage] = useState(1);
	return (
		<Pagination page={page} totalPages={10} onPageChange={setPage} {...props} />
	);
}

export const Default: Story = {
	render: () => <PaginationDemo />,
};

export const Outline: Story = {
	render: () => <PaginationDemo variant="outline" />,
};

export const Ghost: Story = {
	render: () => <PaginationDemo variant="ghost" />,
};

export const ManyPages: Story = {
	render: () => {
		const [page, setPage] = useState(5);
		return <Pagination page={page} totalPages={20} onPageChange={setPage} />;
	},
};

export const FewPages: Story = {
	render: () => {
		const [page, setPage] = useState(1);
		return <Pagination page={page} totalPages={3} onPageChange={setPage} />;
	},
};

export const WithMoreSiblings: Story = {
	render: () => {
		const [page, setPage] = useState(5);
		return (
			<Pagination
				page={page}
				totalPages={20}
				onPageChange={setPage}
				siblings={2}
			/>
		);
	},
};

export const NoFirstLast: Story = {
	render: () => <PaginationDemo showFirstLast={false} />,
};

export const Disabled: Story = {
	render: () => <PaginationDemo disabled />,
};

export const Sizes: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
			<PaginationDemo size="sm" />
			<PaginationDemo size="md" />
			<PaginationDemo size="lg" />
		</div>
	),
};

export const Variants: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
			<PaginationDemo variant="default" />
			<PaginationDemo variant="outline" />
			<PaginationDemo variant="ghost" />
		</div>
	),
};
