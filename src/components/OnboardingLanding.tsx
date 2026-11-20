import { useState } from 'react';
import { ArrowRight, CheckCircle2, FileSpreadsheet, FileText, LogIn, ShieldCheck } from 'lucide-react';

interface OnboardingLandingProps {
  onSignIn: () => Promise<void>;
  onPreviewSample: () => void;
  signingIn: boolean;
  authError: string | null;
}

export function OnboardingLanding({
  onSignIn,
  onPreviewSample,
  signingIn,
  authError,
}: OnboardingLandingProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#111827]">
      {/* Top Bar Contract: Brand wordmark — 4 concise links — 1 primary CTA */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="text-xl font-bold tracking-tight text-[#111827] font-display whitespace-nowrap shrink-0"
          >
            MindMark
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#problem" className="hover:text-[#111827] transition-colors whitespace-nowrap shrink-0">
              Problem Framing
            </a>
            <a href="#workflow" className="hover:text-[#111827] transition-colors whitespace-nowrap shrink-0">
              Workflow
            </a>
            <a href="#deliverable" className="hover:text-[#111827] transition-colors whitespace-nowrap shrink-0">
              Insight Report
            </a>
            <a href="#pricing" className="hover:text-[#111827] transition-colors whitespace-nowrap shrink-0">
              Pricing
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onSignIn}
              disabled={signingIn}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0F5132] rounded-lg hover:bg-[#0B3F26] disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <LogIn className="w-4 h-4" />
              {signingIn ? 'Signing in...' : 'Sign In with Google'}
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="max-w-[1200px] mx-auto px-6 py-12 lg:py-16 space-y-16">
        {/* Hero 2-Column Split */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between py-2">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-4">
                Independent Cafés &amp; Casual Restaurants · Urban &amp; Tier-1 India
              </p>
              <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight text-[#111827] leading-[1.15] balance-text mb-5">
                Replace marketing guesswork with evidence-backed customer insight reports.
              </h1>
              <p className="text-base text-slate-600 leading-relaxed max-w-xl mb-8">
                Convert structured customer survey responses and outlet economics into clear menu,
                pricing, experience, and local marketing decisions—without complex analytics
                platforms or agency retainers.
              </p>

              {authError && (
                <div
                  role="alert"
                  className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800"
                >
                  {authError}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={onSignIn}
                  disabled={signingIn}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#0F5132] rounded-lg hover:bg-[#0B3F26] disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Start Your Outlet Research
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onPreviewSample}
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-[#111827] bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                >
                  Inspect Sample Report
                </button>
              </div>
            </div>

            <div className="pt-8 mt-8 border-t border-slate-200 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
              <span>Single-report deliverable</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums text-[#111827] font-medium">₹5,000 benchmark</span>
              <span aria-hidden="true">·</span>
              <span>Markdown, CSV &amp; Print-PDF export</span>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="h-full min-h-[340px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
              {!imgFailed ? (
                <img
                  src="/src/assets/images/cafe_onboarding_hero_1795180402306.jpg"
                  alt="Independent specialty coffee bar and casual restaurant in Bengaluru"
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-slate-100 text-slate-600">
                  <FileText className="w-10 h-10 mb-3 text-[#0F5132]" />
                  <p className="font-display font-semibold text-[#111827]">
                    MindMark Research Dossier
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Structured customer insight for urban Indian cafés
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Full-Width 4-Column Proof / Specification Strip */}
        <section
          id="problem"
          className="bg-white border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200"
        >
          <div className="p-6">
            <p className="text-xs font-medium text-slate-500 mb-1.5">Core Problem</p>
            <p className="text-base font-semibold text-[#111827] font-display mb-1">
              Assumption-Led Decisions
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              POS receipts tell you what sold, never why guests chose, rejected, or switched.
            </p>
          </div>
          <div className="p-6">
            <p className="text-xs font-medium text-slate-500 mb-1.5">Jobs To Be Done</p>
            <p className="text-base font-semibold text-[#111827] font-display mb-1">
              Confident Menu &amp; Pricing
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Validate new launches, ₹ ticket tolerance, and service bottlenecks before spending.
            </p>
          </div>
          <div className="p-6">
            <p className="text-xs font-medium text-slate-500 mb-1.5">Research Scope</p>
            <p className="text-base font-semibold text-[#111827] font-display mb-1">
              Focused Version 1 MVP
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              No bloated dashboards or subscriptions—just structured intake and a concise report.
            </p>
          </div>
          <div className="p-6">
            <p className="text-xs font-medium text-slate-500 mb-1.5">Validation Benchmark</p>
            <p className="text-base font-semibold text-[#111827] font-display font-mono tabular-nums mb-1">
              ₹5,000 / Report
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Customized consumer-insight deliverable built for single-outlet economics.
            </p>
          </div>
        </section>

        {/* 4-Step Mechanism-to-Outcome Workflow */}
        <section id="workflow" className="space-y-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-[#111827]">
              Four-stage customer insight workflow
            </h2>
            <p className="text-sm text-slate-600 mt-1.5">
              Every outlet moves from problem framing to downloadable evidence in one structured session.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <p className="text-xs font-mono tabular-nums text-[#0F5132] font-semibold mb-2">01</p>
              <h3 className="text-base font-semibold text-[#111827] mb-2">
                Onboarding &amp; Framing
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Define city tier, average ticket in ₹, monthly footfall, and the marketing decision at stake.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <p className="text-xs font-mono tabular-nums text-[#0F5132] font-semibold mb-2">02</p>
              <h3 className="text-base font-semibold text-[#111827] mb-2">
                Structured Intake
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Log or import CSV survey responses capturing choice drivers, friction points, and ₹ limits.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <p className="text-xs font-mono tabular-nums text-[#0F5132] font-semibold mb-2">03</p>
              <h3 className="text-base font-semibold text-[#111827] mb-2">
                Insight Calculation
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Compute sweet-spot pricing bands, churn triggers, and prioritized actions from live data.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <p className="text-xs font-mono tabular-nums text-[#0F5132] font-semibold mb-2">04</p>
              <h3 className="text-base font-semibold text-[#111827] mb-2">
                Export &amp; Validate
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Download print-ready PDF, Markdown, or CSV deliverables and record validation outcomes.
              </p>
            </div>
          </div>
        </section>

        {/* Deliverable & Validation Summary */}
        <section
          id="deliverable"
          className="bg-white border border-slate-200 rounded-xl p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
        >
          <div className="lg:col-span-8 space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-[#111827]">
              What the Customer Insight Research Report delivers
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
              Built for busy hospitality founders who need answers they can act on this week—not
              another dashboard to monitor every morning.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-sm text-slate-700">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#0F5132] mt-0.5 shrink-0" />
                <span>Choice vs. rejection driver percentages with verbatim evidence</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#0F5132] mt-0.5 shrink-0" />
                <span>₹ price tolerance band (P25–P75) vs. current average ticket</span>
              </div>
              <div className="flex items-start gap-2.5">
                <FileSpreadsheet className="w-4 h-4 text-[#0F5132] mt-0.5 shrink-0" />
                <span>Prioritized Menu, Pricing, CX, and Local Marketing actions</span>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#0F5132] mt-0.5 shrink-0" />
                <span>Saved cloud workspace with full timestamped activity trail</span>
              </div>
            </div>
          </div>

          <div
            id="pricing"
            className="lg:col-span-4 border border-slate-200 rounded-xl p-6 bg-[#F8F9FA]"
          >
            <p className="text-xs font-medium text-slate-500">Single-Outlet Report Standard</p>
            <p className="text-3xl font-bold font-mono tabular-nums text-[#111827] mt-1">
              ₹5,000
            </p>
            <p className="text-xs text-slate-600 mt-1 mb-5">
              One-time customized research deliverable · Zero recurring subscription lock-in
            </p>
            <button
              type="button"
              onClick={onSignIn}
              disabled={signingIn}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0F5132] rounded-lg hover:bg-[#0B3F26] disabled:opacity-60 transition-colors cursor-pointer"
            >
              Create Outlet Report
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1200px] mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>MindMark · Customer Insight Research for Independent Cafés &amp; Restaurants</span>
          <span>DGU Venture Quest Prototype</span>
        </div>
      </footer>
    </div>
  );
}
