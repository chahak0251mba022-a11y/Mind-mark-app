import { useEffect, useState } from 'react';
import { ArrowRight, Check, Save } from 'lucide-react';
import {
  CITY_TIERS,
  DECISION_GOALS,
  FIELD_LIMITS,
  OUTLET_FORMATS,
  type CityTier,
  type DecisionGoal,
  type OutletFormat,
  type Venture,
} from '../types/mindmark';
import { formatInr, formatNumberIn } from '../utils/insightEngine';

export interface VentureFormValues {
  name: string;
  city: string;
  cityTier: CityTier;
  format: OutletFormat;
  seatingCapacity: number;
  avgTicketInr: number;
  monthlyFootfall: number;
  repeatRatePct: number;
  decisionGoal: DecisionGoal;
  decisionQuestion: string;
}

interface VentureSetupFormProps {
  activeVenture: Venture | null;
  isCreatingNew: boolean;
  isPreviewMode: boolean;
  saving: boolean;
  onSave: (values: VentureFormValues, isNew: boolean) => Promise<void>;
  onCancelCreate?: () => void;
  onProceedToIntake: () => void;
}

const DEFAULT_VALUES: VentureFormValues = {
  name: 'Kapi & Crumb Roasters',
  city: 'Indiranagar, Bengaluru',
  cityTier: 'Tier-1 Metro',
  format: 'Independent Café',
  seatingCapacity: 38,
  avgTicketInr: 380,
  monthlyFootfall: 2400,
  repeatRatePct: 34,
  decisionGoal: 'New Menu Launch',
  decisionQuestion:
    'Should we launch a ₹420–₹480 savory brunch & seasonal cold-brew tier, and what stops first-timers from returning?',
};

export function VentureSetupForm({
  activeVenture,
  isCreatingNew,
  isPreviewMode,
  saving,
  onSave,
  onCancelCreate,
  onProceedToIntake,
}: VentureSetupFormProps) {
  const [values, setValues] = useState<VentureFormValues>(DEFAULT_VALUES);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (isCreatingNew) {
      setValues({
        name: '',
        city: '',
        cityTier: 'Tier-1 Metro',
        format: 'Independent Café',
        seatingCapacity: 30,
        avgTicketInr: 350,
        monthlyFootfall: 1800,
        repeatRatePct: 30,
        decisionGoal: 'New Menu Launch',
        decisionQuestion: '',
      });
    } else if (activeVenture) {
      setValues({
        name: activeVenture.name,
        city: activeVenture.city,
        cityTier: activeVenture.cityTier,
        format: activeVenture.format,
        seatingCapacity: activeVenture.seatingCapacity,
        avgTicketInr: activeVenture.avgTicketInr,
        monthlyFootfall: activeVenture.monthlyFootfall,
        repeatRatePct: activeVenture.repeatRatePct,
        decisionGoal: activeVenture.decisionGoal,
        decisionQuestion: activeVenture.decisionQuestion,
      });
    } else {
      setValues(DEFAULT_VALUES);
    }
    setErrorMsg(null);
    setSavedNotice(false);
  }, [activeVenture, isCreatingNew]);

  const baselineMonthlyRevenue = values.monthlyFootfall * values.avgTicketInr;
  const repeatVisitorsMonthly = Math.round(
    (values.monthlyFootfall * values.repeatRatePct) / 100
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSavedNotice(false);

    const trimmedName = values.name.trim();
    const trimmedCity = values.city.trim();
    const trimmedQuestion = values.decisionQuestion.trim();

    if (trimmedName.length < 2 || trimmedName.length > FIELD_LIMITS.NAME_MAX) {
      setErrorMsg(`Outlet name must be between 2 and ${FIELD_LIMITS.NAME_MAX} characters.`);
      return;
    }
    if (trimmedCity.length < 2 || trimmedCity.length > FIELD_LIMITS.CITY_MAX) {
      setErrorMsg(`City / neighbourhood must be between 2 and ${FIELD_LIMITS.CITY_MAX} characters.`);
      return;
    }
    if (
      values.avgTicketInr < FIELD_LIMITS.TICKET_MIN ||
      values.avgTicketInr > FIELD_LIMITS.TICKET_MAX
    ) {
      setErrorMsg(
        `Average ticket must be between ₹${FIELD_LIMITS.TICKET_MIN} and ₹${FIELD_LIMITS.TICKET_MAX}.`
      );
      return;
    }
    if (
      values.monthlyFootfall < FIELD_LIMITS.FOOTFALL_MIN ||
      values.monthlyFootfall > FIELD_LIMITS.FOOTFALL_MAX
    ) {
      setErrorMsg(
        `Monthly footfall must be between ${FIELD_LIMITS.FOOTFALL_MIN} and ${FIELD_LIMITS.FOOTFALL_MAX}.`
      );
      return;
    }
    if (
      trimmedQuestion.length < 5 ||
      trimmedQuestion.length > FIELD_LIMITS.DECISION_QUESTION_MAX
    ) {
      setErrorMsg(
        `Decision question must be between 5 and ${FIELD_LIMITS.DECISION_QUESTION_MAX} characters.`
      );
      return;
    }

    await onSave(
      {
        ...values,
        name: trimmedName,
        city: trimmedCity,
        decisionQuestion: trimmedQuestion,
      },
      isCreatingNew || !activeVenture
    );
    setSavedNotice(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1">
            Step 01 · Onboarding &amp; Problem Framing
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-[#111827] balance-text">
            {isCreatingNew || !activeVenture
              ? 'Register your café or restaurant profile'
              : `${activeVenture.name} — Business Variables & Decision Framing`}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Anchor customer feedback against real outlet economics and the exact marketing decision you need to make.
          </p>
        </div>

        {activeVenture && !isCreatingNew && (
          <button
            type="button"
            onClick={onProceedToIntake}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#0F5132] bg-white border border-[#0F5132] rounded-lg hover:bg-[#0F5132]/5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Continue to Survey Intake
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Baseline Economic Snapshot Strip */}
      <div className="bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-5">
          <p className="text-xs text-slate-500">Estimated Monthly Gross Revenue</p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-[#111827] mt-1">
            {formatInr(baselineMonthlyRevenue)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {formatNumberIn(values.monthlyFootfall)} covers × {formatInr(values.avgTicketInr)} avg bill
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs text-slate-500">Returning Guest Volume</p>
          <p className="text-2xl font-semibold font-mono tabular-nums text-[#111827] mt-1">
            {formatNumberIn(repeatVisitorsMonthly)} / mo
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {values.repeatRatePct}% current repeat-visit baseline
          </p>
        </div>
        <div className="p-5">
          <p className="text-xs text-slate-500">Target Decision Scope</p>
          <p className="text-lg font-semibold text-[#0F5132] mt-1.5 truncate">
            {values.decisionGoal}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {values.cityTier} · {values.format}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        {isPreviewMode && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
            Preview Mode: Edits update the interactive session locally. Sign in with Google to persist outlets and reports to your account.
          </div>
        )}

        {errorMsg && (
          <div role="alert" className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
            {errorMsg}
          </div>
        )}

        {savedNotice && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-900 flex items-center gap-2">
            <Check className="w-4 h-4 text-[#0F5132] shrink-0" />
            <span>Outlet profile and decision variables saved.</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="venture-name" className="block text-sm font-medium text-[#111827] mb-1.5">
              Café or Restaurant Name
            </label>
            <input
              id="venture-name"
              type="text"
              required
              maxLength={FIELD_LIMITS.NAME_MAX}
              placeholder="e.g. Third Wave Corner, Indiranagar"
              value={values.name}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F5132]/25 focus:border-[#0F5132]"
            />
          </div>

          <div>
            <label htmlFor="venture-city" className="block text-sm font-medium text-[#111827] mb-1.5">
              Neighbourhood &amp; City
            </label>
            <input
              id="venture-city"
              type="text"
              required
              maxLength={FIELD_LIMITS.CITY_MAX}
              placeholder="e.g. Bandra West, Mumbai"
              value={values.city}
              onChange={(e) => setValues({ ...values, city: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F5132]/25 focus:border-[#0F5132]"
            />
          </div>

          <div>
            <label htmlFor="venture-tier" className="block text-sm font-medium text-[#111827] mb-1.5">
              City Tier
            </label>
            <select
              id="venture-tier"
              value={values.cityTier}
              onChange={(e) => setValues({ ...values, cityTier: e.target.value as CityTier })}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F5132]/25 focus:border-[#0F5132]"
            >
              {CITY_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="venture-format" className="block text-sm font-medium text-[#111827] mb-1.5">
              Outlet Format
            </label>
            <select
              id="venture-format"
              value={values.format}
              onChange={(e) => setValues({ ...values, format: e.target.value as OutletFormat })}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F5132]/25 focus:border-[#0F5132]"
            >
              {OUTLET_FORMATS.map((fmt) => (
                <option key={fmt} value={fmt}>
                  {fmt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div>
            <label htmlFor="venture-ticket" className="block text-sm font-medium text-[#111827] mb-1.5">
              Current Avg Ticket (₹)
            </label>
            <input
              id="venture-ticket"
              type="number"
              required
              min={FIELD_LIMITS.TICKET_MIN}
              max={FIELD_LIMITS.TICKET_MAX}
              value={values.avgTicketInr}
              onChange={(e) =>
                setValues({ ...values, avgTicketInr: Math.max(0, Number(e.target.value) || 0) })
              }
              className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F5132]/25 focus:border-[#0F5132]"
            />
          </div>

          <div>
            <label htmlFor="venture-footfall" className="block text-sm font-medium text-[#111827] mb-1.5">
              Monthly Footfall (Orders)
            </label>
            <input
              id="venture-footfall"
              type="number"
              required
              min={FIELD_LIMITS.FOOTFALL_MIN}
              max={FIELD_LIMITS.FOOTFALL_MAX}
              value={values.monthlyFootfall}
              onChange={(e) =>
                setValues({ ...values, monthlyFootfall: Math.max(0, Number(e.target.value) || 0) })
              }
              className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F5132]/25 focus:border-[#0F5132]"
            />
          </div>

          <div>
            <label htmlFor="venture-repeat" className="block text-sm font-medium text-[#111827] mb-1.5">
              Repeat-Visit Rate (%)
            </label>
            <input
              id="venture-repeat"
              type="number"
              required
              min={FIELD_LIMITS.REPEAT_MIN}
              max={FIELD_LIMITS.REPEAT_MAX}
              value={values.repeatRatePct}
              onChange={(e) =>
                setValues({
                  ...values,
                  repeatRatePct: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                })
              }
              className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F5132]/25 focus:border-[#0F5132]"
            />
          </div>

          <div>
            <label htmlFor="venture-seating" className="block text-sm font-medium text-[#111827] mb-1.5">
              Seating Capacity
            </label>
            <input
              id="venture-seating"
              type="number"
              required
              min={FIELD_LIMITS.SEATING_MIN}
              max={FIELD_LIMITS.SEATING_MAX}
              value={values.seatingCapacity}
              onChange={(e) =>
                setValues({ ...values, seatingCapacity: Math.max(0, Number(e.target.value) || 0) })
              }
              className="w-full px-3.5 py-2.5 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F5132]/25 focus:border-[#0F5132]"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-200 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#111827] mb-2">
              Primary Marketing Decision Goal
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {DECISION_GOALS.map((goal) => {
                const active = values.decisionGoal === goal;
                return (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => setValues({ ...values, decisionGoal: goal })}
                    className={`px-3.5 py-2.5 text-xs font-medium rounded-lg border text-left transition-colors cursor-pointer whitespace-nowrap truncate ${
                      active
                        ? 'bg-[#0F5132] text-white border-[#0F5132]'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {goal}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="venture-question" className="block text-sm font-medium text-[#111827]">
                Specific Business Question to Answer
              </label>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {values.decisionQuestion.length}/{FIELD_LIMITS.DECISION_QUESTION_MAX}
              </span>
            </div>
            <textarea
              id="venture-question"
              rows={3}
              required
              maxLength={FIELD_LIMITS.DECISION_QUESTION_MAX}
              placeholder="e.g. Why are weekday afternoon visits dropping, and can we raise specialty coffee prices by ₹40 without losing regulars?"
              value={values.decisionQuestion}
              onChange={(e) => setValues({ ...values, decisionQuestion: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F5132]/25 focus:border-[#0F5132]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          {isCreatingNew && onCancelCreate && (
            <button
              type="button"
              onClick={onCancelCreate}
              className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0F5132] rounded-lg hover:bg-[#0B3F26] disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Save className="w-4 h-4" />
            {saving
              ? 'Saving...'
              : isCreatingNew || !activeVenture
                ? 'Save Outlet & Continue'
                : 'Update Business Variables'}
          </button>
        </div>
      </form>
    </div>
  );
}
