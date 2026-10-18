export default function PlaceholderPage({ title, description }) {
  return (
    <section className="rounded-xl border border-dashed border-slate-300 bg-white p-8">
      <h2 className="text-2xl font-bold text-brand-950">{title}</h2>
      <p className="mt-2 text-slate-600">{description}</p>
    </section>
  );
}
