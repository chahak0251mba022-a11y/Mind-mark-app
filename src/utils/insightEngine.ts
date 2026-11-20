import type {
  ChoiceDriver,
  CustomerResponse,
  DiscoveryChannel,
  FrictionPoint,
  InsightReport,
  LaunchInterest,
  ReportMetrics,
  ReportRecommendation,
  RespondentSegment,
  SwitchTrigger,
  Venture,
  VisitFrequency,
} from '../types/mindmark';

export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatNumberIn(value: number): string {
  return new Intl.NumberFormat('en-IN').format(Math.round(value));
}

export interface DistributionItem {
  label: string;
  count: number;
  pct: number;
}

export interface ComputedInsightBundle {
  sampleCount: number;
  metrics: ReportMetrics;
  executiveSummary: string;
  recommendations: ReportRecommendation[];
  choiceDistribution: DistributionItem[];
  frictionDistribution: DistributionItem[];
  switchDistribution: DistributionItem[];
  channelDistribution: DistributionItem[];
  segmentDistribution: DistributionItem[];
  ticketValues: number[];
  verbatimHighlights: { segment: string; driver: string; friction: string; note: string }[];
}

function tally(values: string[], total: number): DistributionItem[] {
  const map = new Map<string, number>();
  for (const val of values) {
    map.set(val, (map.get(val) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([label, count]) => ({
      label,
      count,
      pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return Math.round(sorted[lower]);
  return Math.round(sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower));
}

function clampStr(value: string, maxLen: number): string {
  return value.length <= maxLen ? value : `${value.slice(0, maxLen - 1)}…`;
}

export function computeInsights(
  venture: Venture,
  rawResponses: CustomerResponse[]
): ComputedInsightBundle {
  const verified = rawResponses.filter((r) => r.status === 'verified');
  const pool = verified.length > 0 ? verified : rawResponses;
  const n = pool.length;

  if (n === 0) {
    throw new Error('At least one customer response is required to compute an insight report.');
  }

  const choiceDistribution = tally(
    pool.map((r) => r.choiceDriver),
    n
  );
  const allFriction = tally(
    pool.map((r) => r.frictionPoint),
    n
  );
  const actionableFriction = allFriction.filter((f) => f.label !== 'None Reported');
  const frictionDistribution = actionableFriction.length > 0 ? actionableFriction : allFriction;

  const allSwitch = tally(
    pool.map((r) => r.switchTrigger),
    n
  );
  const actionableSwitch = allSwitch.filter((s) => s.label !== 'Would Not Switch');
  const switchDistribution = allSwitch;

  const channelDistribution = tally(
    pool.map((r) => r.discoveryChannel),
    n
  );
  const segmentDistribution = tally(
    pool.map((r) => r.respondentSegment),
    n
  );

  const ticketValues = pool.map((r) => r.maxWillingTicketInr).sort((a, b) => a - b);
  const sweetSpotMinInr = percentile(ticketValues, 0.25);
  const medianWillingTicketInr = percentile(ticketValues, 0.5);
  const sweetSpotMaxInr = percentile(ticketValues, 0.75);

  const topChoice = choiceDistribution[0];
  const topFriction = frictionDistribution[0];
  const topSwitch = actionableSwitch[0] ?? allSwitch[0];

  const switchersCount = pool.filter((r) => r.switchTrigger !== 'Would Not Switch').length;
  const switchRiskPct = Math.round((switchersCount / n) * 1000) / 10;

  const highLaunchCount = pool.filter((r) => r.newLaunchInterest === 'High').length;
  const highLaunchInterestPct = Math.round((highLaunchCount / n) * 1000) / 10;

  const ticketGap = medianWillingTicketInr - venture.avgTicketInr;
  const ticketLiftMonthly =
    ticketGap > 15
      ? Math.round(venture.monthlyFootfall * 0.35 * (ticketGap * 0.55))
      : Math.round(venture.monthlyFootfall * 0.12 * Math.max(25, venture.avgTicketInr * 0.08));

  const retentionRecoveryRate = Math.min(0.14, (topFriction.pct / 100) * 0.28);
  const retentionLiftMonthly = Math.round(
    venture.monthlyFootfall * retentionRecoveryRate * venture.avgTicketInr
  );
  const projectedMonthlyLiftInr = Math.max(5000, ticketLiftMonthly + retentionLiftMonthly);

  const metrics: ReportMetrics = {
    topChoiceDriver: clampStr(topChoice.label, 60),
    topChoicePct: topChoice.pct,
    topFrictionPoint: clampStr(topFriction.label, 60),
    topFrictionPct: topFriction.pct,
    topSwitchTrigger: clampStr(topSwitch.label, 60),
    switchRiskPct,
    medianWillingTicketInr,
    sweetSpotMinInr,
    sweetSpotMaxInr,
    projectedMonthlyLiftInr,
    highLaunchInterestPct,
  };

  const pricingRelation =
    venture.avgTicketInr < sweetSpotMinInr
      ? `currently under-priced by ${formatInr(sweetSpotMinInr - venture.avgTicketInr)} below the lower tolerance band`
      : venture.avgTicketInr > sweetSpotMaxInr
        ? `currently priced ${formatInr(venture.avgTicketInr - sweetSpotMaxInr)} above the upper comfort band, amplifying perceived value friction`
        : `positioned inside the ${formatInr(sweetSpotMinInr)}–${formatInr(sweetSpotMaxInr)} customer tolerance window`;

  const topChannel = channelDistribution[0];
  const topSegment = segmentDistribution[0];

  const executiveSummary = clampStr(
    `Based on ${n} structured customer responses for ${venture.name} (${venture.city}), ${topChoice.pct}% of guests choose the outlet primarily for ${topChoice.label}, led by ${topSegment.label} guests (${topSegment.pct}%). However, ${topFriction.pct}% flag "${topFriction.label}" as the primary operational friction, and ${switchRiskPct}% report a concrete brand-switching trigger led by "${topSwitch.label}". Your current average ticket of ${formatInr(venture.avgTicketInr)} is ${pricingRelation}. Executing the priority ${venture.decisionGoal.toLowerCase()} actions below yields an estimated ${formatInr(projectedMonthlyLiftInr)} in monthly revenue uplift.`,
    1200
  );

  const recommendations: ReportRecommendation[] = buildRecommendations(
    venture,
    n,
    metrics,
    topChannel,
    topSegment
  );

  const verbatimHighlights = pool
    .filter((r) => r.verbatimNote.trim().length > 8)
    .slice(0, 6)
    .map((r) => ({
      segment: r.respondentSegment,
      driver: r.choiceDriver,
      friction: r.frictionPoint,
      note: r.verbatimNote.trim(),
    }));

  return {
    sampleCount: n,
    metrics,
    executiveSummary,
    recommendations,
    choiceDistribution,
    frictionDistribution,
    switchDistribution,
    channelDistribution,
    segmentDistribution,
    ticketValues,
    verbatimHighlights,
  };
}

function buildRecommendations(
  venture: Venture,
  n: number,
  metrics: ReportMetrics,
  topChannel: DistributionItem,
  topSegment: DistributionItem
): ReportRecommendation[] {
  const recs: ReportRecommendation[] = [];

  // 1. Decision-goal tailored recommendation
  if (venture.decisionGoal === 'New Menu Launch') {
    recs.push({
      category: 'Menu Launch',
      title: clampStr(
        `Anchor new launch around ${metrics.topChoiceDriver} at ${formatInr(metrics.sweetSpotMinInr)}–${formatInr(metrics.medianWillingTicketInr)}`,
        140
      ),
      evidence: clampStr(
        `${metrics.highLaunchInterestPct}% of ${n} surveyed guests show High launch interest, and ${metrics.topChoicePct}% prioritize ${metrics.topChoiceDriver}.`,
        260
      ),
      impact: clampStr(
        `Captures early trial without triggering price-switch risk (${metrics.switchRiskPct}%).`,
        160
      ),
      action: clampStr(
        `Introduce 2–3 signature items priced inside ${formatInr(metrics.sweetSpotMinInr)}–${formatInr(metrics.medianWillingTicketInr)} and test pairing bundles with ${topSegment.label} guests for 14 days.`,
        360
      ),
    });
  } else if (venture.decisionGoal === 'Price Optimization') {
    const headroom = metrics.medianWillingTicketInr - venture.avgTicketInr;
    recs.push({
      category: 'Pricing',
      title: clampStr(
        headroom >= 20
          ? `Capture ${formatInr(headroom)} ticket headroom via value-anchored combos`
          : `Hold base beverage prices and re-bundle high-margin add-ons`,
        140
      ),
      evidence: clampStr(
        `Median willingness to pay is ${formatInr(metrics.medianWillingTicketInr)} (sweet spot ${formatInr(metrics.sweetSpotMinInr)}–${formatInr(metrics.sweetSpotMaxInr)}) vs current ${formatInr(venture.avgTicketInr)}.`,
        260
      ),
      impact: clampStr(
        `Protects repeat frequency (${venture.repeatRatePct}%) while lifting average order value.`,
        160
      ),
      action: clampStr(
        headroom >= 20
          ? `Keep entry hero items unchanged and introduce combo tiers at ${formatInr(metrics.medianWillingTicketInr)}–${formatInr(metrics.sweetSpotMaxInr)} to lift basket size cleanly.`
          : `Avoid flat menu hikes above 10%; highlight portion clarity and launch curated pairing add-ons to lift ticket safely.`,
        360
      ),
    });
  } else if (venture.decisionGoal === 'Fix Declining Engagement') {
    recs.push({
      category: 'Retention',
      title: clampStr(`Eliminate "${metrics.topFrictionPoint}" to stop repeat-visit erosion`, 140),
      evidence: clampStr(
        `${metrics.topFrictionPct}% cite "${metrics.topFrictionPoint}" as their top frustration; ${metrics.switchRiskPct}% flag active switching triggers.`,
        260
      ),
      impact: clampStr(
        `Recovering churned visits adds ~${formatInr(Math.round(metrics.projectedMonthlyLiftInr * 0.6))}/mo.`,
        160
      ),
      action: clampStr(
        `Audit peak-hour workflow around "${metrics.topFrictionPoint}" and run a 2-week feedback check-in card for returning ${topSegment.label} guests.`,
        360
      ),
    });
  } else {
    recs.push({
      category: 'Channel Mix',
      title: clampStr(`Differentiate Dine-in experience from ${topChannel.label} takeaway orders`, 140),
      evidence: clampStr(
        `${topSegment.label} (${topSegment.pct}%) and ${metrics.topChoiceDriver} (${metrics.topChoicePct}%) drive core dine-in value.`,
        260
      ),
      impact: clampStr(`Increases direct dine-in margin over aggregator commissions.`, 160),
      action: clampStr(
        `Keep dine-in exclusives centered on ${metrics.topChoiceDriver} while streamlining fast-turnaround SKUs for pickup guests.`,
        360
      ),
    });
  }

  // 2. Pricing & Ticket Band recommendation (always relevant if not already Pricing)
  if (venture.decisionGoal !== 'Price Optimization') {
    recs.push({
      category: 'Pricing',
      title: clampStr(
        `Align hero menu pricing inside ${formatInr(metrics.sweetSpotMinInr)}–${formatInr(metrics.sweetSpotMaxInr)}`,
        140
      ),
      evidence: clampStr(
        `P25–P75 customer tolerance spans ${formatInr(metrics.sweetSpotMinInr)}–${formatInr(metrics.sweetSpotMaxInr)} (median ${formatInr(metrics.medianWillingTicketInr)}).`,
        260
      ),
      impact: clampStr(
        `Prevents "${metrics.topSwitchTrigger}" churn while maximizing per-cover spend.`,
        160
      ),
      action: clampStr(
        `Audit top 5 bestsellers against ${formatInr(metrics.medianWillingTicketInr)} median willingness; bundle slower-moving pairings into a fixed-price combo.`,
        360
      ),
    });
  }

  // 3. Customer Experience / Friction Fix
  recs.push({
    category: 'Experience',
    title: clampStr(`Resolve "${metrics.topFrictionPoint}" during peak hours`, 140),
    evidence: clampStr(
      `Reported by ${metrics.topFrictionPct}% of respondents across ${n} valid entries; "${metrics.topSwitchTrigger}" is the #1 switch trigger.`,
      260
    ),
    impact: clampStr(
      `Directly lowers ${metrics.switchRiskPct}% switch risk across repeat customers.`,
      160
    ),
    action: clampStr(
      metrics.topFrictionPoint.includes('Wait')
        ? `Pre-batch cold brew/base prep before rush windows and set an explicit 10-minute counter expectation cue.`
        : metrics.topFrictionPoint.includes('Portion')
          ? `Standardize plating weights and add clear serving-size cues on menu boards to fix value perception.`
          : metrics.topFrictionPoint.includes('Seating')
            ? `Designate quiet laptop-friendly zones during weekday hours and add acoustic softening for weekend tables.`
            : `Create a shift-opening quality checklist and simplify top-row menu descriptions for faster ordering.`,
      360
    ),
  });

  // 4. Local Marketing & Discovery Channel Shift
  recs.push({
    category: 'Marketing',
    title: clampStr(`Double down on ${topChannel.label} featuring ${metrics.topChoiceDriver}`, 140),
    evidence: clampStr(
      `${topChannel.pct}% of surveyed customers discovered ${venture.name} via ${topChannel.label}.`,
      260
    ),
    impact: clampStr(
      `Lowers customer acquisition cost in ${venture.city} vs paid aggregator promos.`,
      160
    ),
    action: clampStr(
      `Shift 60% of local creative budget toward ${topChannel.label} spotlighting "${metrics.topChoiceDriver}" and authentic stories from ${topSegment.label} patrons.`,
      360
    ),
  });

  return recs;
}

export function generateSampleResponses(
  ownerId: string,
  ventureId: string,
  baseTicketInr: number
): Omit<CustomerResponse, 'id' | 'createdAt'>[] {
  const base = Math.max(150, baseTicketInr || 380);
  const templates: {
    segment: RespondentSegment;
    freq: VisitFrequency;
    channel: DiscoveryChannel;
    choice: ChoiceDriver;
    friction: FrictionPoint;
    trigger: SwitchTrigger;
    ticketMult: number;
    launch: LaunchInterest;
    note: string;
  }[] = [
    {
      segment: 'Daily Regular',
      freq: '3+ times/week',
      channel: 'Word of Mouth',
      choice: 'Taste & Craft',
      friction: 'Slow Service / Wait Time',
      trigger: 'Wait > 20 mins',
      ticketMult: 1.05,
      launch: 'High',
      note: 'Morning pour-over consistency is great, but billing takes too long between 9:30 and 10:30 AM.',
    },
    {
      segment: 'Remote Worker',
      freq: 'Weekly',
      channel: 'Google Maps',
      choice: 'Ambience & Seating',
      friction: 'Limited Seating / Noise',
      trigger: 'Wait > 20 mins',
      ticketMult: 1.25,
      launch: 'High',
      note: 'Would happily order lunch bowls too if plug points near the window tables were reliable.',
    },
    {
      segment: 'Weekend Social',
      freq: 'Bi-weekly',
      channel: 'Instagram / Reels',
      choice: 'Taste & Craft',
      friction: 'Slow Service / Wait Time',
      trigger: 'Quality Drop',
      ticketMult: 1.35,
      launch: 'High',
      note: 'Saw the pistachio croissant reel on Instagram. Worth the visit, weekend seating wait was ~22 mins.',
    },
    {
      segment: 'First-Time Visitor',
      freq: 'First visit',
      channel: 'Walk-by Foot Traffic',
      choice: 'Ambience & Seating',
      friction: 'Unclear Menu Options',
      trigger: 'Better Competitor Offer',
      ticketMult: 0.95,
      launch: 'Moderate',
      note: 'Loved the vibe from outside, though the specialty roast menu needed staff explanation.',
    },
    {
      segment: 'Daily Regular',
      freq: '3+ times/week',
      channel: 'Word of Mouth',
      choice: 'Taste & Craft',
      friction: 'None Reported',
      trigger: 'Would Not Switch',
      ticketMult: 1.15,
      launch: 'High',
      note: 'Best iced latte in this neighbourhood. Always recommend to colleagues.',
    },
    {
      segment: 'Delivery / Takeaway',
      freq: 'Weekly',
      channel: 'Aggregator App',
      choice: 'Speed & Convenience',
      friction: 'Portion-to-Price Ratio',
      trigger: 'Price Hike > 15%',
      ticketMult: 0.9,
      launch: 'Moderate',
      note: 'Packaging is neat, but sandwich portion feels slightly small at delivery price.',
    },
    {
      segment: 'Weekend Social',
      freq: 'Monthly',
      channel: 'Instagram / Reels',
      choice: 'Menu Variety',
      friction: 'Slow Service / Wait Time',
      trigger: 'Wait > 20 mins',
      ticketMult: 1.3,
      launch: 'High',
      note: 'Great dessert pairing options. Brunch plates took 28 minutes on Sunday.',
    },
    {
      segment: 'Remote Worker',
      freq: '3+ times/week',
      channel: 'Google Maps',
      choice: 'Value for Money',
      friction: 'None Reported',
      trigger: 'Price Hike > 15%',
      ticketMult: 1.0,
      launch: 'Moderate',
      note: 'Coffee + toast combo is fair value for a 3-hour work session.',
    },
    {
      segment: 'Daily Regular',
      freq: 'Weekly',
      channel: 'Word of Mouth',
      choice: 'Taste & Craft',
      friction: 'Inconsistent Quality',
      trigger: 'Quality Drop',
      ticketMult: 1.1,
      launch: 'High',
      note: 'Weekday barista nails the texture; weekend evening shots sometimes taste over-extracted.',
    },
    {
      segment: 'First-Time Visitor',
      freq: 'First visit',
      channel: 'Instagram / Reels',
      choice: 'Ambience & Seating',
      friction: 'Portion-to-Price Ratio',
      trigger: 'Better Competitor Offer',
      ticketMult: 1.05,
      launch: 'Moderate',
      note: 'Aesthetic space for photos. Would love a tasting flight option for two.',
    },
    {
      segment: 'Weekend Social',
      freq: 'Bi-weekly',
      channel: 'Word of Mouth',
      choice: 'Taste & Craft',
      friction: 'Slow Service / Wait Time',
      trigger: 'Wait > 20 mins',
      ticketMult: 1.25,
      launch: 'High',
      note: 'Friends come here for the cold brew tonic. Counter queue slows down after 5 PM.',
    },
    {
      segment: 'Delivery / Takeaway',
      freq: 'Bi-weekly',
      channel: 'Walk-by Foot Traffic',
      choice: 'Speed & Convenience',
      friction: 'Unclear Menu Options',
      trigger: 'Price Hike > 15%',
      ticketMult: 0.85,
      launch: 'Low',
      note: 'Pick up on the way to metro; wish grab-and-go boxes were clearly displayed.',
    },
    {
      segment: 'Remote Worker',
      freq: 'Weekly',
      channel: 'Google Maps',
      choice: 'Ambience & Seating',
      friction: 'Limited Seating / Noise',
      trigger: 'Better Competitor Offer',
      ticketMult: 1.15,
      launch: 'High',
      note: 'Playlist volume spikes around 4 PM, making client calls harder.',
    },
    {
      segment: 'Daily Regular',
      freq: '3+ times/week',
      channel: 'Walk-by Foot Traffic',
      choice: 'Taste & Craft',
      friction: 'None Reported',
      trigger: 'Would Not Switch',
      ticketMult: 1.2,
      launch: 'High',
      note: 'Staff remembers my oat-milk preference every morning.',
    },
    {
      segment: 'Weekend Social',
      freq: 'Weekly',
      channel: 'Instagram / Reels',
      choice: 'Menu Variety',
      friction: 'Portion-to-Price Ratio',
      trigger: 'Price Hike > 15%',
      ticketMult: 1.1,
      launch: 'High',
      note: 'Savory menu needs 2 more protein-rich options under ₹450.',
    },
    {
      segment: 'First-Time Visitor',
      freq: 'First visit',
      channel: 'Google Maps',
      choice: 'Value for Money',
      friction: 'Slow Service / Wait Time',
      trigger: 'Wait > 20 mins',
      ticketMult: 0.95,
      launch: 'Moderate',
      note: 'Found via 4.6 rating on Maps; food arrived warm but coffee came 12 mins later.',
    },
    {
      segment: 'Remote Worker',
      freq: 'Bi-weekly',
      channel: 'Word of Mouth',
      choice: 'Taste & Craft',
      friction: 'Slow Service / Wait Time',
      trigger: 'Quality Drop',
      ticketMult: 1.2,
      launch: 'High',
      note: 'Single-origin seasonal menu is why I travel across two sectors to come here.',
    },
    {
      segment: 'Delivery / Takeaway',
      freq: 'Monthly',
      channel: 'Aggregator App',
      choice: 'Taste & Craft',
      friction: 'Portion-to-Price Ratio',
      trigger: 'Better Competitor Offer',
      ticketMult: 0.95,
      launch: 'Low',
      note: 'Good brownies, though delivery fees push total bill too high vs dine-in.',
    },
    {
      segment: 'Daily Regular',
      freq: '3+ times/week',
      channel: 'Word of Mouth',
      choice: 'Value for Money',
      friction: 'None Reported',
      trigger: 'Would Not Switch',
      ticketMult: 1.05,
      launch: 'High',
      note: 'Consistent quality at fair neighbourhood pricing.',
    },
    {
      segment: 'Weekend Social',
      freq: 'Bi-weekly',
      channel: 'Instagram / Reels',
      choice: 'Taste & Craft',
      friction: 'Limited Seating / Noise',
      trigger: 'Wait > 20 mins',
      ticketMult: 1.3,
      launch: 'High',
      note: 'Outdoor courtyard is lovely on Saturday evenings; indoor tables fill fast.',
    },
    {
      segment: 'Remote Worker',
      freq: 'Weekly',
      channel: 'Google Maps',
      choice: 'Speed & Convenience',
      friction: 'Inconsistent Quality',
      trigger: 'Quality Drop',
      ticketMult: 1.1,
      launch: 'Moderate',
      note: 'Wi-Fi speed is great; matcha temperature varied across last two visits.',
    },
    {
      segment: 'First-Time Visitor',
      freq: 'First visit',
      channel: 'Walk-by Foot Traffic',
      choice: 'Menu Variety',
      friction: 'Unclear Menu Options',
      trigger: 'Better Competitor Offer',
      ticketMult: 1.0,
      launch: 'Moderate',
      note: 'Signboard outside drew us in; allergen/vegan markers on menu would help.',
    },
    {
      segment: 'Weekend Social',
      freq: 'Monthly',
      channel: 'Word of Mouth',
      choice: 'Ambience & Seating',
      friction: 'Slow Service / Wait Time',
      trigger: 'Wait > 20 mins',
      ticketMult: 1.25,
      launch: 'High',
      note: 'Great place to catch up with friends; table clearing took a bit long.',
    },
    {
      segment: 'Daily Regular',
      freq: '3+ times/week',
      channel: 'Google Maps',
      choice: 'Taste & Craft',
      friction: 'None Reported',
      trigger: 'Would Not Switch',
      ticketMult: 1.15,
      launch: 'High',
      note: 'Would definitely pre-order seasonal specialty beans and signature drinks.',
    },
  ];

  return templates.map((t) => ({
    ownerId,
    ventureId,
    respondentSegment: t.segment,
    visitFrequency: t.freq,
    discoveryChannel: t.channel,
    choiceDriver: t.choice,
    frictionPoint: t.friction,
    switchTrigger: t.trigger,
    maxWillingTicketInr: Math.round((base * t.ticketMult) / 10) * 10,
    newLaunchInterest: t.launch,
    verbatimNote: t.note,
    status: 'verified',
  }));
}

export function buildMarkdownReport(venture: Venture, report: InsightReport): string {
  const lines: string[] = [
    `# ${report.title}`,
    `Generated by MindMark · ${venture.name} (${venture.city}, ${venture.cityTier}) · ${venture.format}`,
    `Decision Goal: ${report.decisionGoal} · Sample Size: n = ${report.sampleCount} responses`,
    '',
    `## Executive Summary`,
    report.executiveSummary,
    '',
    `## Key Calculated Metrics`,
    `- **Primary Choice Driver:** ${report.metrics.topChoiceDriver} (${report.metrics.topChoicePct}%)`,
    `- **Top Friction Point:** ${report.metrics.topFrictionPoint} (${report.metrics.topFrictionPct}%)`,
    `- **Primary Switch Trigger:** ${report.metrics.topSwitchTrigger} (Overall Switch Risk: ${report.metrics.switchRiskPct}%)`,
    `- **Median Willing Ticket:** ${formatInr(report.metrics.medianWillingTicketInr)} (Sweet Spot: ${formatInr(report.metrics.sweetSpotMinInr)} – ${formatInr(report.metrics.sweetSpotMaxInr)})`,
    `- **Current Average Ticket:** ${formatInr(venture.avgTicketInr)} · **Monthly Footfall:** ${formatNumberIn(venture.monthlyFootfall)}`,
    `- **New Launch High Interest:** ${report.metrics.highLaunchInterestPct}%`,
    `- **Projected Monthly Revenue Uplift:** ${formatInr(report.metrics.projectedMonthlyLiftInr)}`,
    '',
    `## Prioritized Action Recommendations`,
  ];

  report.recommendations.forEach((rec, i) => {
    lines.push(`### 0${i + 1}. [${rec.category}] ${rec.title}`);
    lines.push(`- **Evidence:** ${rec.evidence}`);
    lines.push(`- **Expected Impact:** ${rec.impact}`);
    lines.push(`- **Immediate Action:** ${rec.action}`);
    lines.push('');
  });

  lines.push(`---`);
  lines.push(
    `Report Status: ${report.status.toUpperCase()} · ₹5,000 Value Validation: ${
      report.wtpValidated ? 'Validated' : 'Pending'
    }`
  );
  return lines.join('\n');
}

export function buildCsvExport(responses: CustomerResponse[]): string {
  const header = [
    'Segment',
    'Visit Frequency',
    'Discovery Channel',
    'Choice Driver',
    'Friction Point',
    'Switch Trigger',
    'Max Willing Ticket (INR)',
    'New Launch Interest',
    'Status',
    'Verbatim Note',
  ];
  const escape = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;
  const rows = responses.map((r) =>
    [
      r.respondentSegment,
      r.visitFrequency,
      r.discoveryChannel,
      r.choiceDriver,
      r.frictionPoint,
      r.switchTrigger,
      r.maxWillingTicketInr,
      r.newLaunchInterest,
      r.status,
      r.verbatimNote,
    ]
      .map(escape)
      .join(',')
  );
  return [header.join(','), ...rows].join('\n');
}

export function triggerFileDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
