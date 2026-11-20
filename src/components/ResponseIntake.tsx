import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Database,
  FileUp,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  CHOICE_DRIVERS,
  DISCOVERY_CHANNELS,
  FIELD_LIMITS,
  FRICTION_POINTS,
  LAUNCH_INTEREST_LEVELS,
  RESPONDENT_SEGMENTS,
  SWITCH_TRIGGERS,
  VISIT_FREQUENCIES,
  type ChoiceDriver,
  type CustomerResponse,
  type DiscoveryChannel,
  type FrictionPoint,
  type LaunchInterest,
  type RespondentSegment,
  type ResponseStatus,
  type SwitchTrigger,
  type Venture,
  type VisitFrequency,
} from '../types/mindmark';
import { formatInr } from '../utils/insightEngine';

export interface NewResponseInput {
  respondentSegment: RespondentSegment;
  visitFrequency: VisitFrequency;
  discoveryChannel: DiscoveryChannel;
  choiceDriver: ChoiceDriver;
  frictionPoint: FrictionPoint;
  switchTrigger: SwitchTrigger;
  maxWillingTicketInr: number;
  newLaunchInterest: LaunchInterest;
  verbatimNote: string;
}

interface ResponseIntakeProps {
  venture: Venture;
  responses: CustomerResponse[];
  loading: boolean;
  saving: boolean;
  onAddResponse: (input: NewResponseInput) => Promise<void>;
  onLoadSampleDataset: () => Promise<void>;
  onImportCsvBatch: (rows: NewResponseInput[]) => Promise<void>;
  onToggleStatus: (response: CustomerResponse) => Promise<void>;
  onDeleteResponse: (responseId: string) => Promise<void>;
  onGenerateReport: () => Promise<void>;
}

export function ResponseIntake({
  venture,
  responses,
  loading,
  saving,
  onAddResponse,
  onLoadSampleDataset,
  onImportCsvBatch,
  onToggleStatus,
  onDeleteResponse,
  onGenerateReport,
}: ResponseIntakeProps) {
  const [form, setForm] = useState<NewResponseInput>({
    respondentSegment: 'Daily Regular',
    visitFrequency: 'Weekly',
    discoveryChannel: 'Word of Mouth',
    choiceDriver: 'Taste & Craft',
    frictionPoint: 'Slow Service / Wait Time',
    switchTrigger: 'Wait > 20 mins',
    maxWillingTicketInr: Math.max(150, venture.avgTicketInr),
    newLaunchInterest: 'High',
    verbatimNote: '',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [showCsvPanel, setShowCsvPanel] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [intakeError, setIntakeError] = useState<string | null>(null);

  const verifiedCount = useMemo(
    () => responses.filter((r) => r.status === 'verified').length,
    [responses]
  );

  const filteredResponses = useMemo(() => {
    return responses.filter((r) => {
      if (segmentFilter !== 'all' && r.respondentSegment !== segmentFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.choiceDriver.toLowerCase().includes(q) ||
        r.frictionPoint.toLowerCase().includes(q) ||
        r.switchTrigger.toLowerCase().includes(q) ||
        r.verbatimNote.toLowerCase().includes(q) ||
        r.respondentSegment.toLowerCase().includes(q)
      );
    });
  }, [responses, segmentFilter, searchQuery]);

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIntakeError(null);
    if (
      form.maxWillingTicketInr < FIELD_LIMITS.TICKET_MIN ||
      form.maxWillingTicketInr > FIELD_LIMITS.TICKET_MAX
    ) {
      setIntakeError(
        `Max willing ticket must be between ₹${FIELD_LIMITS.TICKET_MIN} and ₹${FIELD_LIMITS.TICKET_MAX}.`
      );
      return;
    }
    if (form.verbatimNote.length > FIELD_LIMITS.VERBATIM_NOTE_MAX) {
      setIntakeError(`Customer note must be <= ${FIELD_LIMITS.VERBATIM_NOTE_MAX} characters.`);
      return;
    }
    await onAddResponse({
      ...form,
      verbatimNote: form.verbatimNote.trim(),
    });
    setForm((prev) => ({ ...prev, verbatimNote: '' }));
  }

  function matchEnum<T extends readonly string[]>(
    val: string | undefined,
    allowed: T,
    fallback: T[number]
  ): T[number] {
    if (!val) return fallback;
    const cleaned = val.trim().toLowerCase();
    const exact = allowed.find((item) => item.toLowerCase() === cleaned);
    if (exact) return exact;
    const partial = allowed.find((item) => item.toLowerCase().includes(cleaned));
    return partial ?? fallback;
  }

  async function handleCsvImport() {
    setIntakeError(null);
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setIntakeError('Paste at least one CSV row before importing.');
      return;
    }

    const dataLines = lines[0].toLowerCase().includes('segment') ? lines.slice(1) : lines;
    const parsed: NewResponseInput[] = [];

    for (const line of dataLines.slice(0, 50)) {
      const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
      if (cols.length < 4) continue;
      const ticketRaw = Number(cols[6]?.replace(/[^\d.]/g, '')) || venture.avgTicketInr;
      parsed.push({
        respondentSegment: matchEnum(cols[0], RESPONDENT_SEGMENTS, 'Daily Regular'),
        visitFrequency: matchEnum(cols[1], VISIT_FREQUENCIES, 'Weekly'),
        discoveryChannel: matchEnum(cols[2], DISCOVERY_CHANNELS, 'Word of Mouth'),
        choiceDriver: matchEnum(cols[3], CHOICE_DRIVERS, 'Taste & Craft'),
        frictionPoint: matchEnum(cols[4], FRICTION_POINTS, 'Slow Service / Wait Time'),
        switchTrigger: matchEnum(cols[5], SWITCH_TRIGGERS, 'Price Hike > 15%'),
        maxWillingTicketInr: Math.min(
          FIELD_LIMITS.TICKET_MAX,
          Math.max(FIELD_LIMITS.TICKET_MIN, Math.round(ticketRaw))
        ),
        newLaunchInterest: matchEnum(cols[7], LAUNCH_INTEREST_LEVELS, 'Moderate'),
        verbatimNote: (cols[8] ?? '').slice(0, FIELD_LIMITS.VERBATIM_NOTE_MAX),
      });
    }

    if (parsed.length === 0) {
      setIntakeError(
        'Could not parse valid rows. Expected comma-separated columns: Segment, Frequency, Channel, Choice Driver, Friction, Switch Trigger, Max Ticket INR, Launch Interest, Note.'
      );
      return;
    }

    await onImportCsvBatch(parsed);
    setCsvText('');
    setShowCsvPanel(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">
            Step 02 · Customer Preferences &amp; Survey Intake
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] balance-text">
            Collect &amp; structure customer responses for {venture.name}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Log table-card surveys, QR feedback, or import CSV responses. Minimum 1 verified entry required; 15+ recommended.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowCsvPanel((v) => !v)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <FileUp className="w-3.5 h-3.5" />
            Import CSV
          </button>
          <button
            type="button"
            onClick={onLoadSampleDataset}
            disabled={saving}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Database className="w-3.5 h-3.5" />
            Load 24-Response Café Sample
          </button>
          <button
            type="button"
            onClick={onGenerateReport}
            disabled={saving || responses.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0F5132] rounded-lg hover:bg-[#0B3F26] disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            Generate Insight Report
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CSV Import Drawer */}
      {showCsvPanel && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-[#111827]">
                Batch Import Survey CSV
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Columns: Segment, Frequency, Channel, Choice Driver, Friction Point, Switch Trigger, Max Ticket ₹, Launch Interest, Note
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCsvPanel(false)}
              aria-label="Close CSV importer"
              className="p-1.5 text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <textarea
            rows={4}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={`Daily Regular,3+ times/week,Word of Mouth,Taste & Craft,Slow Service / Wait Time,Wait > 20 mins,420,High,Morning espresso queue is slow`}
            className="w-full px-3.5 py-2.5 text-xs font-mono bg-[#F8F9FA] border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F5132]/25 focus:border-[#0F5132]"
          />
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCsvPanel(false)}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCsvImport}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0F5132] rounded-lg hover:bg-[#0B3F26] disabled:opacity-60 cursor-pointer"
            >
              {saving ? 'Importing...' : 'Parse & Save Rows'}
            </button>
          </div>
        </div>
      )}

      {intakeError && (
        <div role="alert" className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {intakeError}
        </div>
      )}

      {/* Structured Single Response Intake Form */}
      <form
        onSubmit={handleAddSubmit}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-semibold text-[#111827]">
            Log Individual Customer Response
          </h2>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {verifiedCount} verified · {responses.length} total logged
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="resp-segment" className="block text-xs font-medium text-slate-700 mb-1">
              Customer Segment
            </label>
            <select
              id="resp-segment"
              value={form.respondentSegment}
              onChange={(e) =>
                setForm({ ...form, respondentSegment: e.target.value as RespondentSegment })
              }
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F5132]"
            >
              {RESPONDENT_SEGMENTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="resp-freq" className="block text-xs font-medium text-slate-700 mb-1">
              Visit Frequency
            </label>
            <select
              id="resp-freq"
              value={form.visitFrequency}
              onChange={(e) =>
                setForm({ ...form, visitFrequency: e.target.value as VisitFrequency })
              }
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F5132]"
            >
              {VISIT_FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="resp-channel" className="block text-xs font-medium text-slate-700 mb-1">
              Discovery Channel
            </label>
            <select
              id="resp-channel"
              value={form.discoveryChannel}
              onChange={(e) =>
                setForm({ ...form, discoveryChannel: e.target.value as DiscoveryChannel })
              }
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F5132]"
            >
              {DISCOVERY_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="resp-choice" className="block text-xs font-medium text-slate-700 mb-1">
              Why They Chose You
            </label>
            <select
              id="resp-choice"
              value={form.choiceDriver}
              onChange={(e) =>
                setForm({ ...form, choiceDriver: e.target.value as ChoiceDriver })
              }
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F5132]"
            >
              {CHOICE_DRIVERS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="resp-friction" className="block text-xs font-medium text-slate-700 mb-1">
              Top Friction / Rejection Point
            </label>
            <select
              id="resp-friction"
              value={form.frictionPoint}
              onChange={(e) =>
                setForm({ ...form, frictionPoint: e.target.value as FrictionPoint })
              }
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F5132]"
            >
              {FRICTION_POINTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="resp-switch" className="block text-xs font-medium text-slate-700 mb-1">
              Brand-Switch Trigger
            </label>
            <select
              id="resp-switch"
              value={form.switchTrigger}
              onChange={(e) =>
                setForm({ ...form, switchTrigger: e.target.value as SwitchTrigger })
              }
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F5132]"
            >
              {SWITCH_TRIGGERS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="resp-ticket" className="block text-xs font-medium text-slate-700 mb-1">
              Max Willing Ticket (₹)
            </label>
            <input
              id="resp-ticket"
              type="number"
              min={FIELD_LIMITS.TICKET_MIN}
              max={FIELD_LIMITS.TICKET_MAX}
              value={form.maxWillingTicketInr}
              onChange={(e) =>
                setForm({
                  ...form,
                  maxWillingTicketInr: Math.max(0, Number(e.target.value) || 0),
                })
              }
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F5132]"
            />
          </div>

          <div>
            <label htmlFor="resp-launch" className="block text-xs font-medium text-slate-700 mb-1">
              New Launch Interest
            </label>
            <select
              id="resp-launch"
              value={form.newLaunchInterest}
              onChange={(e) =>
                setForm({ ...form, newLaunchInterest: e.target.value as LaunchInterest })
              }
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F5132]"
            >
              {LAUNCH_INTEREST_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div className="flex-1">
            <label htmlFor="resp-note" className="block text-xs font-medium text-slate-700 mb-1">
              Customer Verbatim Feedback (Optional)
            </label>
            <input
              id="resp-note"
              type="text"
              maxLength={FIELD_LIMITS.VERBATIM_NOTE_MAX}
              placeholder="Direct guest quote on menu, pricing, seating, or service..."
              value={form.verbatimNote}
              onChange={(e) => setForm({ ...form, verbatimNote: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F5132]"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#111827] rounded-lg hover:bg-slate-800 disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Entry
          </button>
        </div>
      </form>

      {/* Response Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search drivers, friction, or quotes..."
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-[#F8F9FA] border border-slate-200 rounded-lg focus:outline-none focus:border-[#0F5132]"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
            {['all', ...RESPONDENT_SEGMENTS].map((seg) => (
              <button
                key={seg}
                type="button"
                onClick={() => setSegmentFilter(seg)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  segmentFilter === seg
                    ? 'bg-white text-[#111827] shadow-xs'
                    : 'text-slate-600 hover:text-[#111827]'
                }`}
              >
                {seg === 'all' ? 'All Segments' : seg}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((row) => (
              <div key={row} className="h-10 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : filteredResponses.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-base font-semibold text-[#111827]">
              {responses.length === 0
                ? 'No customer survey responses logged yet'
                : 'No responses match the active filter'}
            </p>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              {responses.length === 0
                ? 'Log responses above, import a CSV sheet, or load the 24-response urban café sample dataset to generate your report.'
                : 'Clear the search box or select All Segments to view logged entries.'}
            </p>
            {responses.length === 0 && (
              <button
                type="button"
                onClick={onLoadSampleDataset}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0F5132] rounded-lg hover:bg-[#0B3F26] cursor-pointer"
              >
                <Database className="w-4 h-4" />
                Load 24-Response Café Sample
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F8F9FA] text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">Segment &amp; Frequency</th>
                  <th className="py-2.5 px-4">Choice Driver</th>
                  <th className="py-2.5 px-4">Friction Point</th>
                  <th className="py-2.5 px-4">Switch Trigger</th>
                  <th className="py-2.5 px-4 text-right">Max Ticket</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredResponses.map((row) => {
                  const statusLabel: Record<ResponseStatus, string> = {
                    verified: 'Verified',
                    flagged: 'Excluded',
                  };
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 align-top">
                        <div className="font-medium text-[#111827]">{row.respondentSegment}</div>
                        <div className="text-xs text-slate-500">
                          {row.visitFrequency} · {row.discoveryChannel}
                        </div>
                        {row.verbatimNote && (
                          <p className="text-xs text-slate-600 mt-1 max-w-xs line-clamp-2">
                            “{row.verbatimNote}”
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 align-top text-slate-700">{row.choiceDriver}</td>
                      <td className="py-3 px-4 align-top text-slate-700">{row.frictionPoint}</td>
                      <td className="py-3 px-4 align-top text-slate-700">{row.switchTrigger}</td>
                      <td className="py-3 px-4 align-top text-right font-mono tabular-nums font-medium text-[#111827]">
                        {formatInr(row.maxWillingTicketInr)}
                      </td>
                      <td className="py-3 px-4 align-top">
                        <button
                          type="button"
                          onClick={() => onToggleStatus(row)}
                          className={`text-xs font-medium underline-offset-2 hover:underline cursor-pointer ${
                            row.status === 'verified' ? 'text-[#0F5132]' : 'text-amber-700'
                          }`}
                        >
                          {statusLabel[row.status]}
                        </button>
                      </td>
                      <td className="py-3 px-4 align-top text-right">
                        <button
                          type="button"
                          onClick={() => onDeleteResponse(row.id)}
                          aria-label="Delete response"
                          className="p-1.5 text-slate-400 hover:text-red-700 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
