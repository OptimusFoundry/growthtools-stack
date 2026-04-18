import { createFileRoute, Link } from "@tanstack/react-router";
import { GitCommit, Github } from "lucide-react";
import { CommitRow } from "@/components/github/CommitRow";
import { Topbar } from "@/components/Layout/Topbar";
import { useGitHubCommits } from "@/hooks/useGitHubCommits";
import { useGitHubConnection } from "@/hooks/useGitHubConnection";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Pagination } from "@/proto-design-system/components/navigation/Pagination";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import styles from "./github.module.scss";

export const Route = createFileRoute("/github")({
	component: GitHubPage,
});

const PAGE_SIZE = 25;

function GitHubPage() {
	const { connection, loading: connectionLoading } = useGitHubConnection();
	const { commits, total, loading, refetch, page, setPage } = useGitHubCommits(
		!!connection,
		PAGE_SIZE,
	);
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	const topbar = (
		<Topbar
			title="GitHub"
			eyebrow={
				connection
					? `${total} commit${total === 1 ? "" : "s"} tracked`
					: "Not connected"
			}
			actions={
				connection ? (
					<Button variant="ghost" size="sm" onClick={refetch}>
						Refresh
					</Button>
				) : undefined
			}
		/>
	);

	if (connectionLoading) {
		return (
			<>
				{topbar}
				<Stack gap="lg" className={styles.page} animate>
					<Stack align="center" justify="center" className={styles.loading}>
						<Spinner size="lg" />
					</Stack>
				</Stack>
			</>
		);
	}

	return (
		<>
			{topbar}
			<Stack gap="lg" className={styles.page} animate>
				{!connection ? (
					<EmptyState
						icon={<Github size={48} />}
						title="GitHub isn't connected"
						description="Connect your GitHub account in Settings → Platforms to start watching for new commits."
						action={
							<Link to="/account" search={{ tab: "platforms" }}>
								<Button variant="primary">Connect GitHub</Button>
							</Link>
						}
					/>
				) : loading && commits.length === 0 ? (
					<Stack align="center" justify="center" className={styles.loading}>
						<Spinner size="lg" />
					</Stack>
				) : commits.length === 0 ? (
					<EmptyState
						icon={<GitCommit size={48} />}
						title="No commits yet"
						description="Push to a watched repository and it'll show up here within seconds."
					/>
				) : (
					<Stack gap="md">
						<Stack gap="sm">
							{commits.map((commit, index) => (
								<CommitRow key={commit.id} commit={commit} index={index} />
							))}
						</Stack>
						{totalPages > 1 && (
							<Stack direction="row" justify="between" align="center" wrap>
								<Text size="xs" color="muted">
									{total} commit{total === 1 ? "" : "s"} · page {page} of{" "}
									{totalPages}
								</Text>
								<Pagination
									page={page}
									totalPages={totalPages}
									onPageChange={setPage}
									size="sm"
									disabled={loading}
								/>
							</Stack>
						)}
					</Stack>
				)}
			</Stack>
		</>
	);
}
