'use client';

interface PipelineOverviewCopy {
  breadcrumb: string;
  candidateBase: string;
  pageTitle: string;
  pageSubtitle: string;
}

interface PipelineMetric {
  label: string;
  value: number;
  color: string;
}

export default function PipelineOverview({
  copy,
  metrics,
}: {
  copy: PipelineOverviewCopy;
  metrics: PipelineMetric[];
}) {
  return (
    <section className="mb-5 flex flex-col gap-4 min-[900px]:flex-row min-[900px]:items-end min-[900px]:justify-between">
      <div>
        <p className="mb-2 text-[11px] font-medium text-slate-500">
          {copy.breadcrumb}<span className="px-1 text-slate-300">/</span><span className="font-medium text-indigo-600">{copy.candidateBase}</span>
        </p>
        <h1 className="text-2xl font-bold tracking-normal text-slate-900">{copy.pageTitle}</h1>
        <p className="w-full max-w-2xl flex flex-col gap-6">{copy.pageSubtitle}</p>
      </div>

      <div id="analytics" className="flex flex-wrap items-center gap-0 overflow-hidden rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-sm divide-x divide-slate-100">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0 px-3 py-3 sm:px-4">
            <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">{metric.label}</p>
            <p className={`mt-1 text-xl font-bold ${metric.color}`}>{metric.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}