import type { Timestamp } from 'firebase/firestore';

export const CITY_TIERS = ['Tier-1 Metro', 'Urban Hub', 'Emerging City'] as const;
export type CityTier = (typeof CITY_TIERS)[number];

export const OUTLET_FORMATS = [
  'Independent Café',
  'Casual Restaurant',
  'Bakery & Roastery',
  'QSR / Dessert Bar',
] as const;
export type OutletFormat = (typeof OUTLET_FORMATS)[number];

export const DECISION_GOALS = [
  'New Menu Launch',
  'Price Optimization',
  'Fix Declining Engagement',
  'Dine-in vs Takeaway Mix',
] as const;
export type DecisionGoal = (typeof DECISION_GOALS)[number];

export const VENTURE_STATUSES = ['onboarding', 'collecting', 'analyzed', 'completed'] as const;
export type VentureStatus = (typeof VENTURE_STATUSES)[number];

export const RESPONDENT_SEGMENTS = [
  'Daily Regular',
  'Weekend Social',
  'Remote Worker',
  'First-Time Visitor',
  'Delivery / Takeaway',
] as const;
export type RespondentSegment = (typeof RESPONDENT_SEGMENTS)[number];

export const VISIT_FREQUENCIES = [
  '3+ times/week',
  'Weekly',
  'Bi-weekly',
  'Monthly',
  'First visit',
] as const;
export type VisitFrequency = (typeof VISIT_FREQUENCIES)[number];

export const DISCOVERY_CHANNELS = [
  'Instagram / Reels',
  'Google Maps',
  'Word of Mouth',
  'Walk-by Foot Traffic',
  'Aggregator App',
] as const;
export type DiscoveryChannel = (typeof DISCOVERY_CHANNELS)[number];

export const CHOICE_DRIVERS = [
  'Taste & Craft',
  'Value for Money',
  'Ambience & Seating',
  'Speed & Convenience',
  'Menu Variety',
] as const;
export type ChoiceDriver = (typeof CHOICE_DRIVERS)[number];

export const FRICTION_POINTS = [
  'Slow Service / Wait Time',
  'Portion-to-Price Ratio',
  'Inconsistent Quality',
  'Limited Seating / Noise',
  'Unclear Menu Options',
  'None Reported',
] as const;
export type FrictionPoint = (typeof FRICTION_POINTS)[number];

export const SWITCH_TRIGGERS = [
  'Price Hike > 15%',
  'Wait > 20 mins',
  'Better Competitor Offer',
  'Quality Drop',
  'Would Not Switch',
] as const;
export type SwitchTrigger = (typeof SWITCH_TRIGGERS)[number];

export const LAUNCH_INTEREST_LEVELS = ['High', 'Moderate', 'Low'] as const;
export type LaunchInterest = (typeof LAUNCH_INTEREST_LEVELS)[number];

export const RESPONSE_STATUSES = ['verified', 'flagged'] as const;
export type ResponseStatus = (typeof RESPONSE_STATUSES)[number];

export const REPORT_STATUSES = ['generated', 'exported', 'archived'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const ACTION_TYPES = [
  'venture_created',
  'venture_updated',
  'responses_logged',
  'report_generated',
  'report_exported',
  'wtp_validated',
] as const;
export type ActivityActionType = (typeof ACTION_TYPES)[number];

export const STATUS_FLAGS = ['completed', 'active', 'exported', 'validated'] as const;
export type ActivityStatusFlag = (typeof STATUS_FLAGS)[number];

/**
 * Validation limits synchronized verbatim with firebase-blueprint.json & firestore.rules
 */
export const FIELD_LIMITS = {
  NAME_MAX: 120,
  CITY_MAX: 80,
  DECISION_QUESTION_MAX: 300,
  VERBATIM_NOTE_MAX: 400,
  REPORT_TITLE_MAX: 140,
  EXECUTIVE_SUMMARY_MAX: 1200,
  WTP_NOTE_MAX: 300,
  LOG_SUMMARY_MAX: 240,
  SEATING_MIN: 0,
  SEATING_MAX: 2000,
  TICKET_MIN: 50,
  TICKET_MAX: 50000,
  FOOTFALL_MIN: 10,
  FOOTFALL_MAX: 500000,
  REPEAT_MIN: 0,
  REPEAT_MAX: 100,
} as const;

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  roleLabel: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Venture {
  id: string;
  ownerId: string;
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
  status: VentureStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CustomerResponse {
  id: string;
  ownerId: string;
  ventureId: string;
  respondentSegment: RespondentSegment;
  visitFrequency: VisitFrequency;
  discoveryChannel: DiscoveryChannel;
  choiceDriver: ChoiceDriver;
  frictionPoint: FrictionPoint;
  switchTrigger: SwitchTrigger;
  maxWillingTicketInr: number;
  newLaunchInterest: LaunchInterest;
  verbatimNote: string;
  status: ResponseStatus;
  createdAt?: Timestamp;
}

export interface ReportMetrics {
  topChoiceDriver: string;
  topChoicePct: number;
  topFrictionPoint: string;
  topFrictionPct: number;
  topSwitchTrigger: string;
  switchRiskPct: number;
  medianWillingTicketInr: number;
  sweetSpotMinInr: number;
  sweetSpotMaxInr: number;
  projectedMonthlyLiftInr: number;
  highLaunchInterestPct: number;
}

export interface ReportRecommendation {
  category: string;
  title: string;
  evidence: string;
  impact: string;
  action: string;
}

export interface InsightReport {
  id: string;
  ownerId: string;
  ventureId: string;
  title: string;
  decisionGoal: string;
  sampleCount: number;
  executiveSummary: string;
  metrics: ReportMetrics;
  recommendations: ReportRecommendation[];
  status: ReportStatus;
  wtpValidated: boolean;
  wtpFeedbackNote: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface ActivityLog {
  id: string;
  ownerId: string;
  ventureId: string;
  actionType: ActivityActionType;
  summary: string;
  statusFlag: ActivityStatusFlag;
  createdAt?: Timestamp;
}

export type WorkspaceTab = 'framing' | 'intake' | 'report' | 'activity';
