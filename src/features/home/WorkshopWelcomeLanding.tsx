import { FORGE_PRINCIPLES } from "@/lib/workshop/forgePrinciples";
import { FANTASY_FORGE, THE_LIBRARY } from "@/lib/workplace/forgeLexicon";
import { APP_ICONS } from "@/lib/ui/appIcons";
import WorkflowGuideList from "@/features/workshop/WorkflowGuideList";
import WorkshopWorkspaceDock from "@/features/workshop/WorkshopWorkspaceDock";
import DmDashboardPanel from "@/features/home/DmDashboardPanel";
import type { QuickCreateAction } from "@/lib/workshop/dmDashboard";
import type { WorkshopCreationId } from "@/lib/workplace/workshopNav";

type WorkshopWelcomeLandingProps = {
  onStartWorkflow: (workflowId: string) => void;
  onQuickCreate: (action: QuickCreateAction) => void;
  workspace?: "welcome" | WorkshopCreationId;
  onSelectWelcome?: () => void;
  onSelectCreation?: (mode: WorkshopCreationId) => void;
};

export default function WorkshopWelcomeLanding({
  onStartWorkflow,
  onQuickCreate,
  workspace = "welcome",
  onSelectWelcome,
  onSelectCreation,
}: WorkshopWelcomeLandingProps) {
  return (
    <div className="workshop-welcome">
      <header className="forge-forest-card workshop-welcome-intro">
        <p className="zone-badge mb-3">The {FANTASY_FORGE}</p>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">
          <span aria-hidden="true">{APP_ICONS.welcome} </span>
          Welcome to your DM Management System
        </h1>
        <div className="fantasy-divider mt-3" aria-hidden="true">
          <span className="text-sm leading-none">{APP_ICONS.star}</span>
        </div>
        <p className="workshop-welcome-lede mt-4 max-w-2xl text-sm leading-relaxed sm:text-base">
          D&amp;D Easy exists to lighten your load at the prep table and at play — so you can spend
          less energy wrangling tools and more energy weaving stories with your players. The{" "}
          {FANTASY_FORGE} helps you create and shape original material; {THE_LIBRARY} keeps every
          save organized; the Virtual Table runs the session when dice hit the map.
        </p>
        <p className="workshop-welcome-muted mt-3 max-w-2xl text-sm leading-relaxed">
          This hearth is your home base in the {FANTASY_FORGE} — application announcements and
          status updates will appear here. Pick a workspace from the icons below when you know
          what you need. Not sure where to begin? Choose a workflow path below — each guide walks
          you step by step, with or without AI.
        </p>
      </header>

      <DmDashboardPanel onQuickCreate={onQuickCreate} />

      <WorkshopWorkspaceDock
        workspace={workspace}
        onSelectWelcome={onSelectWelcome}
        onSelectCreation={onSelectCreation}
      />

      <section
        className="forge-forest-card workshop-welcome-principles"
        aria-labelledby="forge-principles-heading"
      >
        <h2 id="forge-principles-heading" className="workshop-welcome-section-title font-display">
          How this app was built
        </h2>
        <p className="workshop-welcome-muted mb-3 text-xs">
          These principles guide every feature — they grow as the app does.
        </p>
        <ul className="workshop-principles-grid">
          {FORGE_PRINCIPLES.map((principle) => (
            <li key={principle.id} className="workshop-principle-card">
              <span className="workshop-principle-icon" aria-hidden="true">
                {principle.icon}
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-sm font-bold">{principle.title}</h3>
                <p className="workshop-welcome-muted mt-1 text-xs leading-relaxed">
                  {principle.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section
        className="forge-forest-card workshop-welcome-workflows"
        aria-labelledby="forge-workflows-heading"
      >
        <h2 id="forge-workflows-heading" className="workshop-welcome-section-title font-display">
          Choose a workflow
        </h2>
        <p className="workshop-welcome-muted mb-3 text-xs leading-relaxed">
          Guided prep paths for common DM goals — manual options in every step.
        </p>
        <WorkflowGuideList onSelect={onStartWorkflow} compact />
      </section>
    </div>
  );
}
