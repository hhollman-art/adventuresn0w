import WorkshopWelcomeLanding from "@/features/home/WorkshopWelcomeLanding";
import type { QuickCreateAction } from "@/lib/workshop/dmDashboard";
import type { WorkshopCreationId } from "@/lib/workplace/workshopNav";

export type HearthPageProps = {
  onStartWorkflow: (workflowId: string) => void;
  onQuickCreate: (action: QuickCreateAction) => void;
  workspace?: "welcome" | WorkshopCreationId;
  onSelectWelcome?: () => void;
  onSelectCreation?: (mode: WorkshopCreationId) => void;
};

/**
 * The Hearth — Fantasy Forge welcome landing and workspace launcher.
 * Re-exported as {@link HearthPage} for navigation and documentation clarity.
 */
export default function HearthPage(props: HearthPageProps) {
  return <WorkshopWelcomeLanding {...props} />;
}
