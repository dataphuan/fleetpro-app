import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-bold tracking-tight leading-tight sm:text-2xl">{title}</h1>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 sm:justify-end">{actions}</div>}
    </div>
  );
}
