import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Printer,
  RefreshCw,
} from 'lucide-react';
import type { CustomerResponse, InsightReport, Venture } from '../types/mindmark';
import {
  buildCsvExport,
  buildMarkdownReport,
  computeInsights,
  formatInr,
  triggerFileDownload,
} from '../utils/insightEngine';

interface InsightReportViewProps {
  venture: Venture;
  responses: CustomerResponse[];
  reports: InsightReport[];
  activeReportId: string | null;
  saving: boolean;
  onSelectReport: (reportId: string) => void;
  onGenerateReport: () => Promise<void>;
  onMarkExported: (report: InsightReport) => Promise<void>;
  onValidateWtp: (report: InsightReport, validated: boolean, note: string) => Promise<void>;
  onBackToIntake: () => void;
}

export function InsightReportView({
  venture,
  responses,
  reports,
  activeReportId,
  saving,
  onSelectReport,
  onGenerateReport,
  onMarkExported,
  onValidateWtp,
  onBackToIntake,
}: InsightReportViewProps) {
  const activeReport = useMemo(() => {
    if (reports.length === 0) return null;
    return reports.find((r) => r.id === activeReportId) ?? reports[0];
  }, [reports, activeReportId]);

  const liveBundle = useMemo(() => {
    if (responses.length === 0) return null;
    try {
      return computeInsights(venture, responses);
    } catch {
      return null;
    }
  }, [venture, responses]);

  const [wtpNote, setWtpNote] = useState(activeReport?.wtpFeedbackNote ?? '');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    setWtpNote(activeReport?.wtpFeedbackNote ?? '');
  }, [activeReport?.id, activeReport?.wtpFeedbackNote]);

  if (!activeReport && !liveBundle) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-4">
        <h1 className="text-xl font-bold text-[#111827]">
          Collect customer responses to generate your Insight Report
        </h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          MindMark calculates choice drivers, friction points, ₹ willingness-to-pay bands, and action recommendations directly from your structured customer feedback.
        </p>
        <button
          type="button"
          onClick={onBackToIntake}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0F5132] rounded-lg hover:bg-[#0B3F26] cursor-pointer"
        >
          Go to Survey Intake
        </button>
      </div>
    );
  }

  if (!activeReport && liveBundle) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-4">
        <p className="text-xs font-mono tabular-nums text-slate-500">
          {liveBundle.sampleCount} verified customer responses ready
        </p>
        <h1 className="text-2xl font-bold text-[#111827]">
          Ready to compile {venture.name} Insight Report
        </h1>
        <p className="text-sm text-slate-600 max-w-lg mx-auto">
          Generate a saved report snapshot to view full distribution charts, prioritized recommendations, and downloadable deliverables.
        </p>
        <button
          type="button"
          onClick={onGenerateReport}
          disabled={saving}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-[#0F5132] rounded-lg hover:bg-[#0B3F26] disabled:opacity-60 cursor-pointer"
        >
          {saving ? 'Generating Report...' : 'Generate Customer Insight Report'}
        </button>
      </div>
    );
  }

  const report = activeReport!;
  const metrics = report.metrics;

  // Ticket Band Positioning Math for SVG Chart
  const minTicketScale = Math.min(
    metrics.sweetSpotMinInr,
    venture.avgTicketInr,
    ...(liveBundle?.ticketValues ?? [venture.avgTicketInr])
  ) * 0.85;
  const maxTicketScale = Math.max(
    metrics.sweetSpotMaxInr,
    venture.avgTicketInr,
    ...(liveBundle?.ticketValues ?? [venture.avgTicketInr])
  ) * 1.15;
  const span = Math.max(50, maxTicketScale - minTicketScale);
  const toPct = (val: number) => Math.min(98, Math.max(2, ((val - minTicketScale) / span) * 100));

  async function handleDownloadMarkdown() {
    const md = buildMarkdownReport(venture, report);
    const safeSlug = venture.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    triggerFileDownload(`${safeSlug}-mindmark-insight-report.md`, md, 'text/markdown;charset=utf-8');
    await onMarkExported(report);
    setExportNotice('Markdown Insight Report downloaded and marked as exported.');
  }

  async function handleDownloadCsv() {
    const csv = buildCsvExport(responses);
    const safeSlug = venture.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    triggerFileDownload(`${safeSlug}-survey-responses.csv`, csv, 'text/csv;charset=utf-8');
    await onMarkExported(report);
    setExportNotice('Structured CSV dataset downloaded and logged.');
  }

  async function handlePrintPdf() {
    await onMarkExported(report);
    window.print();
  }

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 pb-5 no-print">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">
            Step 03 &amp; 04 · Customer Insight Research Report ·{' '}
            <span className="text-[#0F5132] font-semibold capitalize">{report.status}</span>
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] balance-text">
            {report.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1.5">
            <span>{venture.city}</span>
            <span aria-hidden="true">·</span>
            <span>{venture.cityTier}</span>
            <span aria-hidden="true">·</span>
            <span>{venture.format}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-[#111827]">
              n = {report.sampleCount} responses
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {reports.length > 1 && (
            <select
              aria-label="Select saved report snapshot"
              value={report.id}
              onChange={(e) => onSelectReport(e.target.value)}
              className="px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F5132]"
            >
              {reports.map((r, idx) => (
                <option key={r.id} value={r.id}>
                  Snapshot #{reports.length - idx} ({r.sampleCount} responses)
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={onGenerateReport}
            disabled={saving || responses.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-60 cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Recalculate
          </button>
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Download Report
          </button>
          <button
            type="button"
            onClick={handlePrintPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F5132] rounded-lg hover:bg-[#0B3F26] cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Print-only Header */}
      <div className="hidden print-only border-b border-slate-300 pb-4 mb-4">
        <p className="text-xs text-slate-500">MindMark Customer Insight Research Report</p>
        <h1 className="text-2xl font-bold text-[#111827] mt-1">{report.title}</h1>
        <p className="text-xs text-slate-600 mt-1">
          {venture.name} · {venture.city} ({venture.cityTier}) · Decision Goal: {report.decisionGoal} · n = {report.sampleCount}
        </p>
      </div>

      {exportNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2 no-print">
          <CheckCircle2 className="w-4 h-4 text-[#0F5132] shrink-0" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Executive Summary */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 print-break-inside-avoid">
        <p className="text-xs font-medium text-slate-500 mb-2">
          Executive Decision Brief · {report.decisionGoal}
        </p>
        <p className="text-[15px] text-[#111827] leading-relaxed">{report.executiveSummary}</p>
        <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-100">
          Decision Question Framed: “{venture.decisionQuestion}”
        </p>
      </section>

      {/* 4-Column Tabular KPI Strip */}
      <section className="bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 print-break-inside-avoid">
        <div className="p-5">
          <p className="text-xs text-slate-500">Top Choice Driver</p>
          <p className="text-lg font-semibold text-[#111827] mt-1">{metrics.topChoiceDriver}</p>
          <p className="text-sm font-mono tabular-nums font-medium text-[#0F5132] mt-1">
            {metrics.topChoicePct}% of guests
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs text-slate-500">Primary Friction Point</p>
          <p className="text-lg font-semibold text-[#111827] mt-1">{metrics.topFrictionPoint}</p>
          <p className="text-sm font-mono tabular-nums font-medium text-amber-700 mt-1">
            {metrics.topFrictionPct}% cited friction
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs text-slate-500">Sweet-Spot Ticket Band</p>
          <p className="text-lg font-semibold font-mono tabular-nums text-[#111827] mt-1">
            {formatInr(metrics.sweetSpotMinInr)} – {formatInr(metrics.sweetSpotMaxInr)}
          </p>
          <p className="text-xs font-mono tabular-nums text-slate-500 mt-1">
            Median {formatInr(metrics.medianWillingTicketInr)} vs {formatInr(venture.avgTicketInr)} current
          </p>
        </div>

        <div className="p-5">
          <p className="text-xs text-slate-500">Projected Monthly Uplift</p>
          <p className="text-xl font-bold font-mono tabular-nums text-[#0F5132] mt-1">
            +{formatInr(metrics.projectedMonthlyLiftInr)}
          </p>
          <p className="text-xs font-mono tabular-nums text-slate-500 mt-1">
            Switch risk: {metrics.switchRiskPct}% ({metrics.topSwitchTrigger})
          </p>
        </div>
      </section>

      {/* Visual Feedback Charts */}
      {liveBundle && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-break-inside-avoid">
          {/* Choice vs Friction Drivers */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-[#111827]">
                Why Customers Choose vs. Reject
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ranked distribution across {liveBundle.sampleCount} valid responses
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium text-[#0F5132]">Primary Choice Drivers</p>
              {liveBundle.choiceDistribution.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium">{item.label}</span>
                    <span className="font-mono tabular-nums text-slate-600">
                      {item.count} ({item.pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-[#0F5132] rounded-sm"
                      style={{ width: `${Math.max(4, item.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <p className="text-xs font-medium text-amber-800">Reported Friction &amp; Rejection Risks</p>
              {liveBundle.frictionDistribution.map((item) => (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium">{item.label}</span>
                    <span className="font-mono tabular-nums text-slate-600">
                      {item.count} ({item.pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-amber-600 rounded-sm"
                      style={{ width: `${Math.max(4, item.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price Sensitivity Band & Discovery Channels */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-[#111827]">
                Price Tolerance Band &amp; Discovery Mix
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Current average ticket ({formatInr(venture.avgTicketInr)}) plotted against customer P25–P75 tolerance
              </p>
            </div>

            {/* Precision Price Range Visualization */}
            <div className="p-4 bg-[#F8F9FA] border border-slate-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-600">
                <span>P25: {formatInr(metrics.sweetSpotMinInr)}</span>
                <span className="font-semibold text-[#111827]">
                  Median: {formatInr(metrics.medianWillingTicketInr)}
                </span>
                <span>P75: {formatInr(metrics.sweetSpotMaxInr)}</span>
              </div>

              <div className="relative h-8 bg-slate-200/70 rounded-md overflow-hidden">
                {/* P25 - P75 Sweet Spot Range */}
                <div
                  className="absolute top-0 bottom-0 bg-[#0F5132]/20 border-x border-[#0F5132]"
                  style={{
                    left: `${toPct(metrics.sweetSpotMinInr)}%`,
                    width: `${Math.max(4, toPct(metrics.sweetSpotMaxInr) - toPct(metrics.sweetSpotMinInr))}%`,
                  }}
                />
                {/* Median Line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[#0F5132]"
                  style={{ left: `${toPct(metrics.medianWillingTicketInr)}%` }}
                />
                {/* Current Outlet Avg Ticket Marker */}
                <div
                  className="absolute top-1 bottom-1 w-1 bg-[#111827] rounded-xs"
                  style={{ left: `${toPct(venture.avgTicketInr)}%` }}
                  title={`Current Avg Ticket: ${formatInr(venture.avgTicketInr)}`}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                <span>
                  Dark marker: Current Avg Bill ({formatInr(venture.avgTicketInr)})
                </span>
                <span>
                  Shaded zone: P25–P75 Sweet Spot
                </span>
              </div>
            </div>

            {/* Discovery Channels */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-slate-700">Customer Discovery Channels</p>
              {liveBundle.channelDistribution.map((ch) => (
                <div key={ch.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium">{ch.label}</span>
                    <span className="font-mono tabular-nums text-slate-600">
                      {ch.count} ({ch.pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-slate-700 rounded-sm"
                      style={{ width: `${Math.max(4, ch.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Prioritized Decision Recommendations */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-[#111827]">
            Prioritized Action Recommendations
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Evidence-backed decisions across menu, pricing, customer experience, and local acquisition
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {report.recommendations.map((rec, index) => (
            <div
              key={`${rec.category}-${index}`}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4 print-break-inside-avoid"
            >
              <div className="space-y-2">
                <p className="text-xs font-medium text-[#0F5132]">
                  0{index + 1}. {rec.category}
                </p>
                <h3 className="text-base font-semibold text-[#111827] leading-snug">
                  {rec.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-medium text-slate-800">Evidence:</span> {rec.evidence}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-medium text-slate-800">Expected Impact:</span> {rec.impact}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 text-xs text-[#111827] leading-relaxed">
                <span className="font-semibold text-[#0F5132]">Next Action:</span> {rec.action}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Verbatim Guest Evidence */}
      {liveBundle && liveBundle.verbatimHighlights.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 print-break-inside-avoid">
          <h2 className="text-base font-semibold text-[#111827]">
            Direct Customer Verbatim Signals
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveBundle.verbatimHighlights.map((item, idx) => (
              <div key={idx} className="p-4 bg-[#F8F9FA] border border-slate-200 rounded-lg">
                <p className="text-sm text-[#111827] leading-relaxed">“{item.note}”</p>
                <p className="text-xs text-slate-500 mt-2">
                  {item.segment} · Chose for {item.driver} · Friction: {item.friction}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ₹5,000 Validation & Report Sign-off */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-[#111827]">
              Report Value Validation (₹5,000 Benchmark)
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Does this customized customer insight report give enough actionable clarity to justify a ₹5,000 one-time research investment?
            </p>
          </div>
          <span
            className={`text-xs font-medium ${
              report.wtpValidated ? 'text-[#0F5132]' : 'text-slate-500'
            }`}
          >
            {report.wtpValidated ? 'Validated at ₹5,000' : 'Awaiting founder validation'}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            maxLength={300}
            value={wtpNote}
            onChange={(e) => setWtpNote(e.target.value)}
            placeholder="Optional note on which recommendation or metric drove the decision value..."
            className="flex-1 px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F5132]"
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => onValidateWtp(report, true, wtpNote.trim())}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#0F5132] rounded-lg hover:bg-[#0B3F26] disabled:opacity-60 cursor-pointer whitespace-nowrap"
          >
            {report.wtpValidated ? 'Update Validation Note' : 'Confirm ₹5,000 Value'}
          </button>
        </div>
      </section>
    </div>
  );
}
