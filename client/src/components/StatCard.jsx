export default function StatCard({
  title,
  value,
  subtitle,
  positive,
  icon: Icon,
  iconClassName = "text-brand-800",
  topBorderClassName = "border-t-brand-800"
}) {
  return (
    <article className={`relative rounded-xl border border-slate-200 border-t-4 ${topBorderClassName} bg-white p-5 shadow-soft animate-fade-up`}>
      {Icon && (
        <div className={`absolute right-4 top-4 ${iconClassName}`}>
          <Icon size={30} strokeWidth={2.2} />
        </div>
      )}
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-4xl font-extrabold text-brand-950">{value}</p>
      <p className={`mt-2 text-sm font-medium ${positive ? "text-positive" : "text-slate-500"}`}>
        {subtitle}
      </p>
    </article>
  );
}
