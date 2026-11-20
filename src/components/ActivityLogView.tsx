import { Clock } from 'lucide-react';
import type { ActivityLog, ActivityStatusFlag, Venture } from '../types/mindmark';

interface ActivityLogViewProps {
  venture: Venture;
  logs: ActivityLog[];
  loading: boolean;
}

function formatTimestamp(ts?: { toDate?: () => Date }): string {
  if (!ts || typeof ts.toDate !== 'function') return 'Just now';
  return ts.toDate().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const FLAG_LABELS: Record<ActivityStatusFlag, { label: string; colorClass: string }> = {
  completed: { label: 'Completed', colorClass: 'text-[#0F5132]' },
  active: { label: 'Recorded', colorClass: 'text-slate-700' },
  exported: { label: 'Exported', colorClass: 'text-sky-800' },
  validated: { label: 'Validated ₹5,000', colorClass: 'text-[#0F5132]' },
};

export function ActivityLogView({ venture, logs, loading }: ActivityLogViewProps) {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-5">
        <p className="text-xs font-medium text-slate-500 mb-1">
          Audit Trail · Timestamps &amp; Status Flags
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-[#111827]">
          Research Activity Log — {venture.name}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Chronological record of business input updates, survey batches, generated reports, exports, and validation sign-offs.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-10 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <Clock className="w-6 h-6 text-slate-400 mx-auto" />
            <p className="text-sm font-semibold text-[#111827]">No activity logged yet</p>
            <p className="text-xs text-slate-500">
              Actions taken on {venture.name} will appear here with server timestamps.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F8F9FA] text-xs font-medium text-slate-500">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Event</th>
                  <th className="py-2.5 px-4">Summary</th>
                  <th className="py-2.5 px-4 text-right">Status Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {logs.map((log) => {
                  const flag = FLAG_LABELS[log.statusFlag] ?? {
                    label: log.statusFlag,
                    colorClass: 'text-slate-700',
                  };
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-500 whitespace-nowrap">
                        {formatTimestamp(log.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-700 capitalize whitespace-nowrap">
                        {log.actionType.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 text-sm text-[#111827]">{log.summary}</td>
                      <td className={`py-3 px-4 text-right text-xs font-medium whitespace-nowrap ${flag.colorClass}`}>
                        {flag.label}
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
