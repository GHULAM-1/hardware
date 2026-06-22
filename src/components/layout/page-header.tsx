/** Shared page header: title, optional subtitle, and an actions slot (e.g. "New" button). */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">
          {title}
        </h1>
        {subtitle && <p className="font-medium text-white/75">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
