import { Monitor, Smartphone, Square } from "lucide-react";
import { EmptyState } from "@/proto-design-system/components/data/EmptyState";
import { Card } from "@/proto-design-system/components/layout/Card";
import { Stack } from "@/proto-design-system/components/layout/Stack";
import { Badge } from "@/proto-design-system/components/primitives/Badge";
import { Button } from "@/proto-design-system/components/primitives/Button";
import { Spinner } from "@/proto-design-system/components/primitives/Spinner";
import { Text } from "@/proto-design-system/components/primitives/Text";
import type { VideoAspectRatio, VideoConfig, VideoJob } from "@/types/video";
import styles from "./CreateVideoWizard.module.scss";

const ASPECT_RATIOS: {
  value: VideoAspectRatio;
  label: string;
  description: string;
  icon: typeof Smartphone;
}[] = [
  {
    value: "9:16",
    label: "9:16",
    description: "Reels / TikTok",
    icon: Smartphone,
  },
  { value: "1:1", label: "1:1", description: "Feed Post", icon: Square },
  { value: "16:9", label: "16:9", description: "YouTube / Web", icon: Monitor },
];

function extractScenes(
  config: VideoConfig,
): { id: string; text: string; subtext?: string; duration_frames: number }[] {
  const data = config.config as Record<string, unknown>;
  return (
    (data.scenes as {
      id: string;
      text: string;
      subtext?: string;
      duration_frames: number;
    }[]) ?? []
  );
}

function extractTheme(config: VideoConfig):
  | {
      background_colors?: string[];
      text_color?: string;
      accent_color?: string;
    }
  | undefined {
  const data = config.config as Record<string, unknown>;
  return data.theme as
    | {
        background_colors?: string[];
        text_color?: string;
        accent_color?: string;
      }
    | undefined;
}

function isJobActive(job: VideoJob): boolean {
  return (
    job.status === "pending" ||
    job.status === "rendering" ||
    job.status === "uploading"
  );
}

// --- Config Panel (right side of top row) ---

interface ConfigPanelProps {
  config: VideoConfig | null;
  generating: boolean;
}

export function ConfigPanel({ config, generating }: ConfigPanelProps) {
  if (!config && !generating) {
    return (
      <EmptyState
        title="Preview"
        description="Fill in your title and prompt, then generate a config to see a preview"
      />
    );
  }

  if (generating) {
    return (
      <EmptyState
        title="Generating configuration..."
        description="AI is creating your video scenes and theme"
        icon={<Spinner size="lg" />}
      />
    );
  }

  if (!config) return null;

  const scenes = extractScenes(config);
  const theme = extractTheme(config);

  return (
    <Card padding="sm">
      <Stack gap="xs">
        <Stack direction="row" gap="sm" align="center">
          <Badge variant="primary" size="sm">
            {config.template}
          </Badge>
          <Text size="xs" color="secondary">
            {scenes.length} scene{scenes.length !== 1 ? "s" : ""}
          </Text>
          {theme?.background_colors && theme.background_colors.length > 0 && (
            <Stack direction="row" gap="xs" align="center">
              {theme.background_colors.map((color) => (
                <div
                  key={color}
                  className={styles.colorSwatch}
                  style={{ backgroundColor: color }}
                />
              ))}
            </Stack>
          )}
        </Stack>

        {scenes.map((scene, index) => (
          <div key={scene.id} className={styles.sceneRow}>
            <Text size="xs" color="secondary">
              {index + 1}.
            </Text>
            <Text size="sm">{scene.text}</Text>
            <Text size="xs" color="secondary">
              {Math.round(scene.duration_frames / 30)}s
            </Text>
          </div>
        ))}
      </Stack>
    </Card>
  );
}

// --- Renders Panel (bottom row, full width) ---

const THUMB_CLASS: Record<VideoAspectRatio, string> = {
  "9:16": styles["videoThumb--portrait"],
  "1:1": styles["videoThumb--square"],
  "16:9": styles["videoThumb--landscape"],
};

function RatioCard({
  ratio,
  jobs,
  rendering,
  onRender,
}: {
  ratio: (typeof ASPECT_RATIOS)[number];
  jobs: VideoJob[];
  rendering: boolean;
  onRender: (r: VideoAspectRatio) => void;
}) {
  const ratioJobs = jobs.filter((j) => j.aspectRatio === ratio.value);
  const activeJob = ratioJobs.find(isJobActive);
  const completedJob = ratioJobs.find((j) => j.status === "completed");
  const failedJob =
    !activeJob && !completedJob
      ? ratioJobs.find((j) => j.status === "failed")
      : null;
  const thumbClass = `${styles.videoThumb} ${THUMB_CLASS[ratio.value]}`;
  const Icon = ratio.icon;
  const hasVideo = completedJob && !activeJob;

  return (
    <div className={styles.ratioCard}>
      <Stack gap="md">
        <Stack direction="row" gap="xs" align="center" justify="between">
          <Stack gap="sm">
            <Text size="sm" weight="medium">
              Aspect Ratio: {ratio.label}
            </Text>
            <Text size="xs" color="secondary">
              {ratio.description}
            </Text>
          </Stack>
          {activeJob && (
            <Badge variant="warning" size="md">
              {activeJob.status}
            </Badge>
          )}
          {hasVideo && (
            <Badge variant="success" size="md">
              done
            </Badge>
          )}
          {failedJob && (
            <Badge variant="error" size="md">
              failed
            </Badge>
          )}
        </Stack>

        {hasVideo ? (
          <video
            className={thumbClass}
            src={`${import.meta.env.VITE_API_URL}/api/protected/video/jobs/${completedJob.id}/file`}
            controls
            preload="metadata"
            crossOrigin="use-credentials"
          />
        ) : (
          <div className={thumbClass}>
            {activeJob ? (
              <Spinner size="sm" />
            ) : (
              <Stack gap="xs" align="center">
                <Icon size={28} className={styles.placeholderIcon} />
                <Text size="xs" color="secondary">
                  {ratio.description}
                </Text>
                {failedJob && (
                  <Text color="error" size="xs">
                    {failedJob.errorMessage || "Render failed"}
                  </Text>
                )}
              </Stack>
            )}
          </div>
        )}

        {!activeJob && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onRender(ratio.value)}
            disabled={rendering}
          >
            {completedJob || failedJob ? "Re-render" : "Render"}
          </Button>
        )}
      </Stack>
    </div>
  );
}

interface RendersPanelProps {
  config: VideoConfig | null;
  jobs: VideoJob[];
  rendering: boolean;
  renderError: string | null;
  onRender: (ratio: VideoAspectRatio) => void;
}

export function RendersPanel({
  config,
  jobs,
  rendering,
  renderError,
  onRender,
}: RendersPanelProps) {
  if (!config) return null;

  const visibleJobs = jobs.filter((j) => j.videoConfigId === config.id);

  return (
    <div className={styles.section}>
      <Text size="sm" weight="medium" color="secondary">
        Renders
      </Text>

      {renderError && (
        <Text color="error" size="sm">
          {renderError}
        </Text>
      )}

      <div className={styles.ratioGrid}>
        {ASPECT_RATIOS.map((ratio) => (
          <RatioCard
            key={ratio.value}
            ratio={ratio}
            jobs={visibleJobs}
            rendering={rendering}
            onRender={onRender}
          />
        ))}
      </div>
    </div>
  );
}
