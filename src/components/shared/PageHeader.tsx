import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-lg font-bold tracking-tight leading-tight sm:text-xl">{title}</h1>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 sm:justify-end">{actions}</div>}
    </div>
  );
}
