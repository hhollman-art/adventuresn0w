import type { ReactNode } from "react";

type ForgeContentShellProps = {
  children: ReactNode;
  bodyClassName?: string;
};

/** Right workspace column: active workspace on top, preview/output below. */
export default function ForgeContentShell({
  children,
  bodyClassName = "",
}: ForgeContentShellProps) {
  return (
    <div className="forge-content-shell min-w-0">
      <div className={`forge-content-body ${bodyClassName}`.trim()}>{children}</div>
    </div>
  );
}
