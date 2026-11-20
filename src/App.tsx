import { useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  Activity,
  Building2,
  ClipboardList,
  FileBarChart2,
  LogIn,
  LogOut,
  Menu,
  Plus,
  X,
} from 'lucide-react';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import type {
  ActivityActionType,
  ActivityLog,
  ActivityStatusFlag,
  CustomerResponse,
  InsightReport,
  Venture,
  WorkspaceTab,
} from './types/mindmark';
import {
  computeInsights,
  generateSampleResponses,
} from './utils/insightEngine';
import { OnboardingLanding } from './components/OnboardingLanding';
import { VentureSetupForm, type VentureFormValues } from './components/VentureSetupForm';
import { ResponseIntake, type NewResponseInput } from './components/ResponseIntake';
import { InsightReportView } from './components/InsightReportView';
import { ActivityLogView } from './components/ActivityLogView';

function buildPreviewState(): {
  venture: Venture;
  responses: CustomerResponse[];
  report: InsightReport;
  logs: ActivityLog[];
} {
  const now = Timestamp.now();
  const venture: Venture = {
    id: 'preview-venture',
    ownerId: 'preview-user',
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
    status: 'analyzed',
    createdAt: now,
    updatedAt: now,
  };

  const rawSamples = generateSampleResponses('preview-user', venture.id, venture.avgTicketInr);
  const responses: CustomerResponse[] = rawSamples.map((s, idx) => ({
    ...s,
    id: `preview-resp-${idx + 1}`,
    createdAt: now,
  }));

  const bundle = computeInsights(venture, responses);
  const report: InsightReport = {
    id: 'preview-report-1',
    ownerId: 'preview-user',
    ventureId: venture.id,
    title: `${venture.name} — ${venture.decisionGoal} Insight Report`,
    decisionGoal: venture.decisionGoal,
    sampleCount: bundle.sampleCount,
    executiveSummary: bundle.executiveSummary,
    metrics: bundle.metrics,
    recommendations: bundle.recommendations,
    status: 'generated',
    wtpValidated: false,
    wtpFeedbackNote: '',
    createdAt: now,
    updatedAt: now,
  };

  const logs: ActivityLog[] = [
    {
      id: 'preview-log-3',
      ownerId: 'preview-user',
      ventureId: venture.id,
      actionType: 'report_generated',
      summary: `Generated Customer Insight Report from ${bundle.sampleCount} structured responses.`,
      statusFlag: 'completed',
      createdAt: now,
    },
    {
      id: 'preview-log-2',
      ownerId: 'preview-user',
      ventureId: venture.id,
      actionType: 'responses_logged',
      summary: `Imported ${responses.length} urban café customer survey responses.`,
      statusFlag: 'active',
      createdAt: now,
    },
    {
      id: 'preview-log-1',
      ownerId: 'preview-user',
      ventureId: venture.id,
      actionType: 'venture_created',
      summary: `Framed ${venture.decisionGoal} research for ${venture.name}.`,
      statusFlag: 'active',
      createdAt: now,
    },
  ];

  return { venture, responses, report, logs };
}

function getMillis(ts?: { toMillis?: () => number }): number {
  if (!ts || typeof ts.toMillis !== 'function') return 0;
  return ts.toMillis();
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewData, setPreviewData] = useState(() => buildPreviewState());

  const [ventures, setVentures] = useState<Venture[]>([]);
  const [activeVentureId, setActiveVentureId] = useState<string | null>(null);
  const [isCreatingVenture, setIsCreatingVenture] = useState(false);

  const [responses, setResponses] = useState<CustomerResponse[]>([]);
  const [reports, setReports] = useState<InsightReport[]>([]);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);

  const [loadingSubdata, setLoadingSubdata] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('framing');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [asyncError, setAsyncError] = useState<Error | null>(null);

  // Propagate async Firestore errors cleanly to ErrorBoundary
  if (asyncError) {
    throw asyncError;
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);

      if (nextUser) {
        setIsPreviewMode(false);
        const userRef = doc(db, 'users', nextUser.uid);
        try {
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, {
              uid: nextUser.uid,
              displayName: (nextUser.displayName || 'Founder').slice(0, 120),
              email: (nextUser.email || 'founder@mindmark.app').slice(0, 200),
              roleLabel: 'Outlet Founder',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (err) {
          try {
            handleFirestoreError(err, OperationType.WRITE, `users/${nextUser.uid}`);
          } catch (wrapped) {
            setAsyncError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
          }
        }
      } else {
        setVentures([]);
        setActiveVentureId(null);
        setResponses([]);
        setReports([]);
        setActivityLogs([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to user's ventures
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'ventures'), where('ownerId', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: Venture[] = snapshot.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<Venture, 'id'>) }))
          .sort((a, b) => getMillis(b.updatedAt) - getMillis(a.updatedAt));
        setVentures(list);
        setActiveVentureId((prev) => {
          if (prev && list.some((v) => v.id === prev)) return prev;
          return list[0]?.id ?? null;
        });
        if (list.length === 0) {
          setIsCreatingVenture(true);
          setActiveTab('framing');
        }
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'ventures');
        } catch (wrapped) {
          setAsyncError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );
    return () => unsub();
  }, [user]);

  // Subscribe to active venture subcollections
  useEffect(() => {
    if (!user || !activeVentureId) {
      setResponses([]);
      setReports([]);
      setActivityLogs([]);
      return;
    }

    setLoadingSubdata(true);
    const respPath = `ventures/${activeVentureId}/responses`;
    const repPath = `ventures/${activeVentureId}/reports`;
    const logPath = `ventures/${activeVentureId}/activityLogs`;

    const unsubResp = onSnapshot(
      query(collection(db, respPath), where('ownerId', '==', user.uid)),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<CustomerResponse, 'id'>) }))
          .sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));
        setResponses(list);
        setLoadingSubdata(false);
      },
      (err) => {
        setLoadingSubdata(false);
        try {
          handleFirestoreError(err, OperationType.LIST, respPath);
        } catch (wrapped) {
          setAsyncError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );

    const unsubRep = onSnapshot(
      query(collection(db, repPath), where('ownerId', '==', user.uid)),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<InsightReport, 'id'>) }))
          .sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));
        setReports(list);
        setActiveReportId((prev) => (prev && list.some((r) => r.id === prev) ? prev : list[0]?.id ?? null));
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, repPath);
        } catch (wrapped) {
          setAsyncError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );

    const unsubLogs = onSnapshot(
      query(collection(db, logPath), where('ownerId', '==', user.uid)),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<ActivityLog, 'id'>) }))
          .sort((a, b) => getMillis(b.createdAt) - getMillis(a.createdAt));
        setActivityLogs(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, logPath);
        } catch (wrapped) {
          setAsyncError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
        }
      }
    );

    return () => {
      unsubResp();
      unsubRep();
      unsubLogs();
    };
  }, [user, activeVentureId]);

  const currentVenture = useMemo(() => {
    if (isPreviewMode) return previewData.venture;
    return ventures.find((v) => v.id === activeVentureId) ?? null;
  }, [isPreviewMode, previewData.venture, ventures, activeVentureId]);

  const currentResponses = isPreviewMode ? previewData.responses : responses;
  const currentReports = isPreviewMode ? [previewData.report] : reports;
  const currentLogs = isPreviewMode ? previewData.logs : activityLogs;

  async function handleSignIn() {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to complete Google sign-in.';
      setAuthError(msg);
    } finally {
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    await signOut(auth);
    setIsPreviewMode(false);
    setActiveTab('framing');
  }

  async function logActivity(
    ventureId: string,
    actionType: ActivityActionType,
    summary: string,
    statusFlag: ActivityStatusFlag
  ) {
    if (isPreviewMode || !user) {
      const nextLog: ActivityLog = {
        id: `preview-log-${Date.now()}`,
        ownerId: 'preview-user',
        ventureId,
        actionType,
        summary: summary.slice(0, 240),
        statusFlag,
        createdAt: Timestamp.now(),
      };
      setPreviewData((prev) => ({ ...prev, logs: [nextLog, ...prev.logs] }));
      return;
    }

    const logRef = doc(collection(db, `ventures/${ventureId}/activityLogs`));
    try {
      await setDoc(logRef, {
        ownerId: user.uid,
        ventureId,
        actionType,
        summary: summary.slice(0, 240),
        statusFlag,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `ventures/${ventureId}/activityLogs/${logRef.id}`);
    }
  }

  async function handleSaveVenture(values: VentureFormValues, isNew: boolean) {
    setSaving(true);
    try {
      if (isPreviewMode || !user) {
        setPreviewData((prev) => ({
          ...prev,
          venture: {
            ...prev.venture,
            ...values,
            updatedAt: Timestamp.now(),
          },
        }));
        await logActivity(
          previewData.venture.id,
          isNew ? 'venture_created' : 'venture_updated',
          `Updated ${values.name} variables (${values.decisionGoal}).`,
          'active'
        );
        setIsCreatingVenture(false);
        return;
      }

      if (isNew) {
        const ventureRef = doc(collection(db, 'ventures'));
        await setDoc(ventureRef, {
          ownerId: user.uid,
          ...values,
          status: 'collecting',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setActiveVentureId(ventureRef.id);
        setIsCreatingVenture(false);
        await logActivity(
          ventureRef.id,
          'venture_created',
          `Created ${values.name} (${values.city}) for ${values.decisionGoal}.`,
          'active'
        );
        setActiveTab('intake');
      } else if (currentVenture) {
        const ventureRef = doc(db, 'ventures', currentVenture.id);
        await updateDoc(ventureRef, {
          ...values,
          updatedAt: serverTimestamp(),
        });
        await logActivity(
          currentVenture.id,
          'venture_updated',
          `Updated ${values.name} business variables (₹${values.avgTicketInr} ticket).`,
          'active'
        );
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'ventures');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddResponse(input: NewResponseInput) {
    if (!currentVenture) return;
    setSaving(true);
    try {
      if (isPreviewMode || !user) {
        const nextResp: CustomerResponse = {
          id: `preview-resp-${Date.now()}`,
          ownerId: 'preview-user',
          ventureId: currentVenture.id,
          ...input,
          status: 'verified',
          createdAt: Timestamp.now(),
        };
        setPreviewData((prev) => ({
          ...prev,
          responses: [nextResp, ...prev.responses],
        }));
        await logActivity(
          currentVenture.id,
          'responses_logged',
          `Logged 1 ${input.respondentSegment} response (${input.choiceDriver}).`,
          'active'
        );
        return;
      }

      const path = `ventures/${currentVenture.id}/responses`;
      const respRef = doc(collection(db, path));
      await setDoc(respRef, {
        ownerId: user.uid,
        ventureId: currentVenture.id,
        ...input,
        status: 'verified',
        createdAt: serverTimestamp(),
      });
      await logActivity(
        currentVenture.id,
        'responses_logged',
        `Logged 1 ${input.respondentSegment} customer response.`,
        'active'
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `ventures/${currentVenture.id}/responses`);
    } finally {
      setSaving(false);
    }
  }

  async function handleBatchResponses(rows: Omit<CustomerResponse, 'id' | 'createdAt'>[], summaryText: string) {
    if (!currentVenture) return;
    setSaving(true);
    try {
      if (isPreviewMode || !user) {
        const now = Timestamp.now();
        const additions: CustomerResponse[] = rows.map((r, idx) => ({
          ...r,
          id: `preview-batch-${Date.now()}-${idx}`,
          createdAt: now,
        }));
        setPreviewData((prev) => ({
          ...prev,
          responses: [...additions, ...prev.responses],
        }));
        await logActivity(currentVenture.id, 'responses_logged', summaryText, 'active');
        return;
      }

      const batch = writeBatch(db);
      const colRef = collection(db, `ventures/${currentVenture.id}/responses`);
      for (const row of rows) {
        const docRef = doc(colRef);
        batch.set(docRef, {
          ...row,
          createdAt: serverTimestamp(),
        });
      }
      await batch.commit();
      await logActivity(currentVenture.id, 'responses_logged', summaryText, 'active');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `ventures/${currentVenture.id}/responses`);
    } finally {
      setSaving(false);
    }
  }

  async function handleLoadSampleDataset() {
    if (!currentVenture) return;
    const ownerId = user?.uid ?? 'preview-user';
    const samples = generateSampleResponses(ownerId, currentVenture.id, currentVenture.avgTicketInr);
    await handleBatchResponses(
      samples,
      `Loaded ${samples.length}-response urban Indian café sample dataset.`
    );
  }

  async function handleImportCsvBatch(inputs: NewResponseInput[]) {
    if (!currentVenture) return;
    const ownerId = user?.uid ?? 'preview-user';
    const rows = inputs.map((item) => ({
      ownerId,
      ventureId: currentVenture.id,
      ...item,
      status: 'verified' as const,
    }));
    await handleBatchResponses(rows, `Imported ${rows.length} customer survey rows via CSV.`);
  }

  async function handleToggleResponseStatus(response: CustomerResponse) {
    if (!currentVenture) return;
    const nextStatus = response.status === 'verified' ? 'flagged' : 'verified';
    if (isPreviewMode || !user) {
      setPreviewData((prev) => ({
        ...prev,
        responses: prev.responses.map((r) =>
          r.id === response.id ? { ...r, status: nextStatus } : r
        ),
      }));
      return;
    }

    const ref = doc(db, `ventures/${currentVenture.id}/responses`, response.id);
    try {
      await updateDoc(ref, { status: nextStatus });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, ref.path);
    }
  }

  async function handleDeleteResponse(responseId: string) {
    if (!currentVenture) return;
    if (isPreviewMode || !user) {
      setPreviewData((prev) => ({
        ...prev,
        responses: prev.responses.filter((r) => r.id !== responseId),
      }));
      return;
    }

    const ref = doc(db, `ventures/${currentVenture.id}/responses`, responseId);
    try {
      await deleteDoc(ref);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, ref.path);
    }
  }

  async function handleGenerateReport() {
    if (!currentVenture || currentResponses.length === 0) return;
    setSaving(true);
    try {
      const computed = computeInsights(currentVenture, currentResponses);
      const title = `${currentVenture.name} — ${currentVenture.decisionGoal} Insight Report`.slice(
        0,
        140
      );

      if (isPreviewMode || !user) {
        const nextReport: InsightReport = {
          id: `preview-report-${Date.now()}`,
          ownerId: 'preview-user',
          ventureId: currentVenture.id,
          title,
          decisionGoal: currentVenture.decisionGoal,
          sampleCount: computed.sampleCount,
          executiveSummary: computed.executiveSummary,
          metrics: computed.metrics,
          recommendations: computed.recommendations,
          status: 'generated',
          wtpValidated: false,
          wtpFeedbackNote: '',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };
        setPreviewData((prev) => ({ ...prev, report: nextReport }));
        setActiveReportId(nextReport.id);
        await logActivity(
          currentVenture.id,
          'report_generated',
          `Generated Customer Insight Report from ${computed.sampleCount} responses.`,
          'completed'
        );
        setActiveTab('report');
        return;
      }

      const repRef = doc(collection(db, `ventures/${currentVenture.id}/reports`));
      await setDoc(repRef, {
        ownerId: user.uid,
        ventureId: currentVenture.id,
        title,
        decisionGoal: currentVenture.decisionGoal,
        sampleCount: computed.sampleCount,
        executiveSummary: computed.executiveSummary,
        metrics: computed.metrics,
        recommendations: computed.recommendations,
        status: 'generated',
        wtpValidated: false,
        wtpFeedbackNote: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'ventures', currentVenture.id), {
        status: 'analyzed',
        updatedAt: serverTimestamp(),
      });
      setActiveReportId(repRef.id);
      await logActivity(
        currentVenture.id,
        'report_generated',
        `Generated Customer Insight Report (${computed.sampleCount} responses).`,
        'completed'
      );
      setActiveTab('report');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `ventures/${currentVenture.id}/reports`);
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkReportExported(report: InsightReport) {
    if (!currentVenture) return;
    if (isPreviewMode || !user) {
      setPreviewData((prev) => ({
        ...prev,
        report: { ...prev.report, status: 'exported', updatedAt: Timestamp.now() },
      }));
      await logActivity(
        currentVenture.id,
        'report_exported',
        `Exported deliverable for ${currentVenture.name}.`,
        'exported'
      );
      return;
    }

    const repRef = doc(db, `ventures/${currentVenture.id}/reports`, report.id);
    try {
      if (report.status !== 'archived') {
        await updateDoc(repRef, {
          status: 'exported',
          updatedAt: serverTimestamp(),
        });
      }
      await logActivity(
        currentVenture.id,
        'report_exported',
        `Exported Customer Insight Report deliverable.`,
        'exported'
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, repRef.path);
    }
  }

  async function handleValidateWtp(report: InsightReport, validated: boolean, note: string) {
    if (!currentVenture) return;
    setSaving(true);
    try {
      if (isPreviewMode || !user) {
        setPreviewData((prev) => ({
          ...prev,
          report: {
            ...prev.report,
            wtpValidated: validated,
            wtpFeedbackNote: note,
            updatedAt: Timestamp.now(),
          },
        }));
        await logActivity(
          currentVenture.id,
          'wtp_validated',
          `Confirmed ₹5,000 report value validation.`,
          'validated'
        );
        return;
      }

      const repRef = doc(db, `ventures/${currentVenture.id}/reports`, report.id);
      await updateDoc(repRef, {
        wtpValidated: validated,
        wtpFeedbackNote: note.slice(0, 300),
        updatedAt: serverTimestamp(),
      });
      await updateDoc(doc(db, 'ventures', currentVenture.id), {
        status: 'completed',
        updatedAt: serverTimestamp(),
      });
      await logActivity(
        currentVenture.id,
        'wtp_validated',
        `Validated ₹5,000 Customer Insight Report value.`,
        'validated'
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `ventures/${currentVenture.id}/reports/${report.id}`);
    } finally {
      setSaving(false);
    }
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-sm font-medium text-slate-600">Loading MindMark workspace...</div>
      </div>
    );
  }

  if (!user && !isPreviewMode) {
    return (
      <OnboardingLanding
        onSignIn={handleSignIn}
        onPreviewSample={() => {
          setIsPreviewMode(true);
          setActiveTab('report');
        }}
        signingIn={signingIn}
        authError={authError}
      />
    );
  }

  const navItems: { id: WorkspaceTab; label: string; icon: typeof Building2; disabled?: boolean }[] = [
    { id: 'framing', label: '01. Outlet Framing', icon: Building2 },
    {
      id: 'intake',
      label: '02. Survey Intake',
      icon: ClipboardList,
      disabled: !currentVenture || isCreatingVenture,
    },
    {
      id: 'report',
      label: '03. Insight Report',
      icon: FileBarChart2,
      disabled: !currentVenture || isCreatingVenture,
    },
    {
      id: 'activity',
      label: '04. Activity Log',
      icon: Activity,
      disabled: !currentVenture || isCreatingVenture,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#111827] flex flex-col">
      {/* Top Bar Contract: Brand — 4 concise workflow links — 1 primary CTA */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 no-print">
        <div className="px-4 lg:px-6 h-14 flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle workspace sidebar"
              className="lg:hidden p-1.5 text-slate-600 hover:text-[#111827] cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="text-lg font-bold tracking-tight text-[#111827] font-display whitespace-nowrap shrink-0">
              MindMark
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.disabled}
                  onClick={() => setActiveTab(item.id)}
                  className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    active
                      ? 'border-[#0F5132] text-[#111827] font-semibold'
                      : 'border-transparent hover:text-[#111827]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center shrink-0">
            {isPreviewMode ? (
              <button
                type="button"
                onClick={handleSignIn}
                disabled={signingIn}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#0F5132] rounded-lg hover:bg-[#0B3F26] disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                {signingIn ? 'Signing in...' : 'Sign In to Save'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsCreatingVenture(true);
                  setActiveTab('framing');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-[#0F5132] rounded-lg hover:bg-[#0B3F26] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                New Outlet
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex relative">
        {/* Sidebar Navigation */}
        <aside
          className={`${
            mobileMenuOpen ? 'fixed inset-y-14 left-0 z-20 flex' : 'hidden'
          } lg:flex flex-col justify-between w-[256px] shrink-0 bg-white border-r border-slate-200 p-4 no-print`}
        >
          <div className="space-y-6">
            {/* Active Outlet Switcher */}
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-xs font-medium text-slate-500">Outlets</span>
                {!isPreviewMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingVenture(true);
                      setActiveTab('framing');
                      setMobileMenuOpen(false);
                    }}
                    className="text-xs font-medium text-[#0F5132] hover:underline cursor-pointer"
                  >
                    + Add
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {isPreviewMode ? (
                  <div className="px-3 py-2 rounded-lg bg-[#F8F9FA] border border-slate-200">
                    <p className="text-sm font-semibold text-[#111827] truncate">
                      {previewData.venture.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {previewData.venture.city} · Sample
                    </p>
                  </div>
                ) : ventures.length === 0 ? (
                  <p className="px-2 text-xs text-slate-500">No outlets created yet.</p>
                ) : (
                  ventures.map((v) => {
                    const selected = v.id === activeVentureId && !isCreatingVenture;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setActiveVentureId(v.id);
                          setIsCreatingVenture(false);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[#0F5132]/8 border border-[#0F5132]/30'
                            : 'hover:bg-slate-50 border border-transparent'
                        }`}
                      >
                        <p className="text-sm font-semibold text-[#111827] truncate">{v.name}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {v.city} · {v.decisionGoal}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Workflow Steps */}
            <div>
              <p className="px-2 mb-2 text-xs font-medium text-slate-500">Research Workflow</p>
              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={item.disabled}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                        active
                          ? 'bg-[#111827] text-white font-medium'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.id === 'intake' && currentResponses.length > 0 && (
                        <span
                          className={`text-xs font-mono tabular-nums ${
                            active ? 'text-slate-200' : 'text-slate-500'
                          }`}
                        >
                          {currentResponses.length}
                        </span>
                      )}
                      {item.id === 'report' && currentReports.length > 0 && (
                        <span
                          className={`text-xs font-mono tabular-nums ${
                            active ? 'text-slate-200' : 'text-slate-500'
                          }`}
                        >
                          {currentReports.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Account Footer */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            {isPreviewMode ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">
                  Interactive Preview · Sample Bengaluru Café
                </p>
                <button
                  type="button"
                  onClick={() => setIsPreviewMode(false)}
                  className="text-xs font-medium text-slate-700 hover:text-[#111827] underline cursor-pointer"
                >
                  Return to Overview
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#111827] truncate">
                    {user?.displayName || 'Founder'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Sign out"
                  aria-label="Sign out"
                  className="p-2 text-slate-500 hover:text-red-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main Workspace Canvas */}
        <main className="flex-1 min-w-0 p-5 sm:p-8 lg:p-10 max-w-[1140px]">
          {(activeTab === 'framing' || isCreatingVenture || !currentVenture) && (
            <VentureSetupForm
              activeVenture={currentVenture}
              isCreatingNew={isCreatingVenture || !currentVenture}
              isPreviewMode={isPreviewMode}
              saving={saving}
              onSave={handleSaveVenture}
              onCancelCreate={
                ventures.length > 0 ? () => setIsCreatingVenture(false) : undefined
              }
              onProceedToIntake={() => setActiveTab('intake')}
            />
          )}

          {activeTab === 'intake' && currentVenture && !isCreatingVenture && (
            <ResponseIntake
              venture={currentVenture}
              responses={currentResponses}
              loading={loadingSubdata && !isPreviewMode}
              saving={saving}
              onAddResponse={handleAddResponse}
              onLoadSampleDataset={handleLoadSampleDataset}
              onImportCsvBatch={handleImportCsvBatch}
              onToggleStatus={handleToggleResponseStatus}
              onDeleteResponse={handleDeleteResponse}
              onGenerateReport={handleGenerateReport}
            />
          )}

          {activeTab === 'report' && currentVenture && !isCreatingVenture && (
            <InsightReportView
              venture={currentVenture}
              responses={currentResponses}
              reports={currentReports}
              activeReportId={activeReportId}
              saving={saving}
              onSelectReport={setActiveReportId}
              onGenerateReport={handleGenerateReport}
              onMarkExported={handleMarkReportExported}
              onValidateWtp={handleValidateWtp}
              onBackToIntake={() => setActiveTab('intake')}
            />
          )}

          {activeTab === 'activity' && currentVenture && !isCreatingVenture && (
            <ActivityLogView
              venture={currentVenture}
              logs={currentLogs}
              loading={loadingSubdata && !isPreviewMode}
            />
          )}
        </main>
      </div>
    </div>
  );
}
