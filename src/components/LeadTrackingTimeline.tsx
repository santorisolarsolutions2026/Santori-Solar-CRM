'use client';

import React from 'react';
import {
  Check,
  Clock,
  Truck,
  FileCheck,
  Calendar,
  UserCheck,
  Zap,
  AlertCircle,
  Sparkles,
  UserPlus,
  ShieldCheck,
  DollarSign,
  Hammer,
  Gauge,
  Power,
  Gift,
} from 'lucide-react';

interface ActivityLog {
  id: number;
  remark: string | null;
  fromStatus: number | null;
  toStatus: number;
  createdAt: string;
  user: { name: string; role: string };
}

interface Meeting {
  id: number;
  meetingDate: string;
  meetingTime: string;
  notes: string | null;
  meetingDurationSec?: number | null;
  executive?: { id: number; name: string; role: string } | null;
}

interface Order {
  id: number;
  orderCode: string;
  status: string;
  systemSizeKw: number;
  totalValue: number;
  createdAt?: string;
  submittedBy?: { id: number; name: string; role: string } | null;
  financeProcessedBy?: { id: number; name: string; role: string } | null;
}

interface LeadTrackingProps {
  lead: {
    id: number;
    leadCode: string;
    customerName: string;
    status: number;
    createdAt: string;
    consultant?: { id: number; name: string } | null;
    tl?: { id: number; name: string } | null;
    manager?: { id: number; name: string } | null;
    creator?: { id: number; name: string; role: string } | null;
    activityLogs?: ActivityLog[];
    auditLogs?: any[];
    meetings?: Meeting[];
    order?: Order | null;
  };
}

const STAGE_NAMES: Record<number, string> = {
  0: 'Uninitiated Pool',
  1: 'Fresh Lead',
  2: 'DNP (No Answer)',
  3: 'Follow Up Scheduled',
  4: 'Not Interested',
  5: 'Call Later Requested',
  6: 'Already Installed',
  7: 'Decision Pending',
  8: 'Meeting Booked',
  9: 'Meeting Done',
  10: 'Disconnected',
  11: 'Switch Off',
  12: 'Can\'t Fit Solar',
  13: 'Sale Done (Order Punched)',
};

const STAGE_BADGES: Record<number, { name: string; class: string }> = {
  0: { name: 'Uninitiated', class: 'bg-[#3b3a37] text-[#c9c5ba] border-[#4f4d45]' },
  1: { name: 'Fresh Lead', class: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  2: { name: 'DNP (No Answer)', class: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  3: { name: 'Follow Up', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  4: { name: 'Not Interested', class: 'bg-red-800/10 text-red-400 border-red-800/20' },
  5: { name: 'Call Later', class: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  6: { name: 'Already Installed', class: 'bg-slate-800/20 text-slate-500 border-slate-800/30' },
  7: { name: 'Decision Pending', class: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  8: { name: 'Meeting Booked', class: 'bg-teal-500/10 text-teal-400 border-teal-500/20' },
  9: { name: 'Meeting Done', class: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  10: { name: 'Disconnected', class: 'bg-slate-600/15 text-slate-400 border-slate-600/20' },
  11: { name: 'Switch Off', class: 'bg-slate-700/20 text-slate-400 border-slate-700/30' },
  12: { name: 'Can\'t Fit Solar', class: 'bg-stone-900 text-stone-400 border-stone-800/40' },
  13: { name: 'Sale Done', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold' },
};

export function LeadTrackingTimeline({ lead }: LeadTrackingProps) {
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  // Helper to map event titles to beautiful Lucide icons
  const getEventIcon = (title: string, toStatus: number | null) => {
    const t = title.toLowerCase();
    if (t.includes('registered') || t.includes('opportunity')) return <UserPlus className="w-4 h-4 stroke-[2]" />;
    if (t.includes('allocated') || t.includes('assign')) return <UserCheck className="w-4 h-4 stroke-[2]" />;
    if (t.includes('meeting') || t.includes('site visit')) return <Calendar className="w-4 h-4 stroke-[2]" />;
    if (t.includes('order punched') || t.includes('order submitted')) return <FileCheck className="w-4 h-4 stroke-[2]" />;
    if (t.includes('verified') || t.includes('approve')) return <ShieldCheck className="w-4 h-4 stroke-[2]" />;
    if (t.includes('payment') || t.includes('recorded')) return <DollarSign className="w-4 h-4 stroke-[2]" />;
    if (t.includes('delivery') || t.includes('delivered') || t.includes('materials')) return <Truck className="w-4 h-4 stroke-[2]" />;
    if (t.includes('install')) return <Hammer className="w-4 h-4 stroke-[2]" />;
    if (t.includes('meter')) return <Gauge className="w-4 h-4 stroke-[2]" />;
    if (t.includes('commission')) return <Power className="w-4 h-4 stroke-[2]" />;
    if (t.includes('subsidy')) return <Gift className="w-4 h-4 stroke-[2]" />;
    if (t.includes('field changed') || t.includes('audit') || t.includes('task update')) return <ShieldCheck className="w-4 h-4 stroke-[2]" />;
    
    // Status-based fallback
    if (toStatus === 8) return <Calendar className="w-4 h-4 stroke-[2]" />;
    if (toStatus === 13) return <FileCheck className="w-4 h-4 stroke-[2]" />;
    
    return <Check className="w-4 h-4 stroke-[2]" />;
  };

  // Build DYNAMIC real timeline events list (only actual occurrences)
  interface RealEvent {
    id: string;
    title: string;
    date: string;
    fullDate: string;
    timestamp: number;
    description: string;
    badge?: string;
    user?: string;
    toStatus?: number | null;
    fromStatusName?: string | null;
    toStatusName?: string | null;
    fromStatusClass?: string | null;
    toStatusClass?: string | null;
  }

  const events: RealEvent[] = [];
  let hasCreationLog = false;

  // 1. Activity Logs (Real Status Transitions, Payments & Operations)
  if (lead.activityLogs && lead.activityLogs.length > 0) {
    lead.activityLogs.forEach((log) => {
      const logTime = new Date(log.createdAt).getTime() || 0;
      const toStageName = STAGE_NAMES[log.toStatus] || `Stage ${log.toStatus}`;
      const fromStageName = log.fromStatus !== null ? STAGE_NAMES[log.fromStatus] || `Stage ${log.fromStatus}` : null;

      const fromBadge = log.fromStatus !== null ? STAGE_BADGES[log.fromStatus] : null;
      const toBadge = STAGE_BADGES[log.toStatus] || { name: `Stage ${log.toStatus}`, class: 'bg-slate-500' };

      const isCreation = log.fromStatus === null;
      if (isCreation) {
        hasCreationLog = true;
      }

      let eventTitle = toStageName;
      let eventDescription = log.remark || `Pipeline stage updated to ${toStageName}.`;

      if (log.remark) {
        const match = log.remark.match(/^\[([^\]]+)\]\s*(.*)$/);
        if (match) {
          const prefix = match[1].trim();
          const rest = match[2].trim();
          
          // Convert prefix to Title Case (e.g. PLANT COMMISSIONED -> Plant Commissioned)
          const titleCase = prefix
            .toLowerCase()
            .split('_')
            .join(' ')
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          eventTitle = titleCase;
          eventDescription = rest || `Action completed: ${titleCase}`;
        } else if (log.remark.startsWith('Payment of ₹')) {
          eventTitle = 'Payment Recorded';
          eventDescription = log.remark;
        } else if (log.remark.includes('Order punched and submitted')) {
          eventTitle = 'Order Submitted to Finance';
          eventDescription = log.remark;
        } else if (log.remark.includes('Order verified by Finance')) {
          eventTitle = 'Order Verified by Finance';
          eventDescription = log.remark;
        } else if (log.remark.includes('Order rejected by Finance')) {
          eventTitle = 'Order Rejected by Finance';
          eventDescription = log.remark;
        } else if (log.remark.startsWith('Meeting completed.')) {
          eventTitle = 'Meeting Completed';
          eventDescription = log.remark;
        } else if (log.remark.startsWith('Lead imported')) {
          eventTitle = 'Lead Registered (CSV)';
          eventDescription = log.remark;
        } else if (log.remark.startsWith('Lead added to the system')) {
          eventTitle = 'Lead Registered';
          eventDescription = log.remark;
        } else if (log.remark.includes('promoted to Fresh Lead')) {
          eventTitle = 'Lead Promoted to Fresh';
          eventDescription = log.remark;
        } else if (log.remark.startsWith('Lead reactivated')) {
          eventTitle = 'Lead Reactivated';
          eventDescription = log.remark;
        } else if (log.remark.includes('updated team assignments')) {
          eventTitle = 'Team Assignment Updated';
          eventDescription = log.remark;
        } else if (log.remark === 'Lead details updated by management.') {
          eventTitle = 'Lead Details Updated';
          eventDescription = log.remark;
        }
      }

      if (isCreation) {
        eventTitle = 'Lead Opportunity Registered';
        eventDescription = log.remark || `Lead #${lead.leadCode} created in system for customer ${lead.customerName}.`;
      }

      events.push({
        id: `log-${log.id}`,
        title: eventTitle,
        date: formatDate(log.createdAt),
        fullDate: formatDateTime(log.createdAt),
        timestamp: logTime,
        description: eventDescription,
        user: `${log.user.name} (${log.user.role.toUpperCase()})`,
        badge: isCreation ? 'Registered' : 'Activity',
        toStatus: log.toStatus,
        fromStatusName: fromBadge ? fromBadge.name : null,
        toStatusName: toBadge.name,
        fromStatusClass: fromBadge ? fromBadge.class : null,
        toStatusClass: toBadge.class,
      });
    });
  }

  // 2. Base Fallback Creation Event (if no activity log for creation is present)
  if (!hasCreationLog) {
    const createdTimestamp = new Date(lead.createdAt).getTime() || 0;
    events.push({
      id: 'create',
      title: 'Lead Opportunity Registered',
      date: formatDate(lead.createdAt),
      fullDate: formatDateTime(lead.createdAt),
      timestamp: createdTimestamp,
      description: `Lead #${lead.leadCode} created in system for customer ${lead.customerName}.`,
      badge: 'Registered',
      user: lead.creator ? `${lead.creator.name} (${lead.creator.role.toUpperCase()})` : undefined,
    });
  }

  // 3. Fallback Team Allocation Event
  if (lead.consultant || lead.tl || lead.manager) {
    const teamParts = [];
    if (lead.consultant) teamParts.push(`Consultant: ${lead.consultant.name}`);
    if (lead.tl) teamParts.push(`TL: ${lead.tl.name}`);
    if (lead.manager) teamParts.push(`Manager: ${lead.manager.name}`);

    // Only add if there is no explicit assignment activity log to avoid duplicates
    const hasAssignmentLog = lead.activityLogs?.some(
      (log) =>
        log.remark?.includes('updated team assignments') ||
        log.remark?.includes('promoted to Fresh Lead')
    );

    if (!hasAssignmentLog) {
      events.push({
        id: 'assign',
        title: 'Team Allocated',
        date: formatDate(lead.createdAt),
        fullDate: formatDateTime(lead.createdAt),
        timestamp: (new Date(lead.createdAt).getTime() || 0) + 100, // slightly after creation for sorting
        description: `Assigned to ${teamParts.join(', ')}.`,
        badge: 'Assigned',
      });
    }
  }

  // 4. Actual Meetings Booked / Conducted
  if (lead.meetings && lead.meetings.length > 0) {
    lead.meetings.forEach((m) => {
      const mTime = new Date(m.meetingDate).getTime() || 0;
      events.push({
        id: `meeting-${m.id}`,
        title: `Site Visit / Meeting Scheduled`,
        date: formatDate(m.meetingDate),
        fullDate: `${m.meetingDate} at ${m.meetingTime}`,
        timestamp: mTime,
        description: m.notes ? `Meeting Notes: "${m.notes}"` : 'Site inspection & solar estimation meeting scheduled with customer.',
        badge: 'Meeting',
        user: m.executive ? `${m.executive.name} (${m.executive.role.toUpperCase()})` : undefined,
      });
    });
  }

  // 5. Order Punched
  if (lead.order) {
    const orderTime = lead.order.createdAt ? new Date(lead.order.createdAt).getTime() : Date.now();
    events.push({
      id: `order-${lead.order.id}`,
      title: `Order Punched (#${lead.order.orderCode})`,
      date: formatDate(lead.order.createdAt || new Date().toISOString()),
      fullDate: formatDateTime(lead.order.createdAt || new Date().toISOString()),
      timestamp: orderTime,
      description: `System Size: ${lead.order.systemSizeKw} kW | Total Value: ₹${lead.order.totalValue?.toLocaleString('en-IN') || '-'} | Status: ${lead.order.status.toUpperCase()}`,
      badge: 'Order Punched',
      user: lead.order.submittedBy ? `${lead.order.submittedBy.name} (${lead.order.submittedBy.role.toUpperCase()})` : undefined,
    });
  }

  // 6. Audit Logs
  if (lead.auditLogs && lead.auditLogs.length > 0) {
    lead.auditLogs.forEach((audit: any) => {
      const auditTime = new Date(audit.createdAt).getTime() || 0;
      events.push({
        id: `audit-${audit.id}`,
        title: `Audit Change: ${audit.fieldName}`,
        date: formatDate(audit.createdAt),
        fullDate: formatDateTime(audit.createdAt),
        timestamp: auditTime,
        description: `Field "${audit.fieldName}" updated from "${audit.oldValue || 'None'}" to "${audit.newValue || 'None'}".`,
        badge: 'Audit Log',
        user: audit.user ? `${audit.user.name} (${audit.user.role?.toUpperCase() || 'USER'})` : 'System',
      });
    });
  }

  // Sort events chronologically (Newest first on top)
  events.sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-inner">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <span>Track Lead Journey</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
                #{lead.leadCode}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Live progress tracking showing all completed actions and pipeline activity for this lead.</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-slate-500 block">Current Stage</span>
          <span className="text-xs font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg inline-block mt-0.5">
            {STAGE_NAMES[lead.status] || `Stage ${lead.status}`}
          </span>
        </div>
      </div>

      {/* Dynamic Delivery Tracking Timeline UI (Only Real Completed Events) */}
      <div className="py-2 px-2 sm:px-4">
        <div className="space-y-0 relative">
          {events.map((event, idx) => {
            const isLatest = idx === 0;
            const isVisualLast = idx === events.length - 1;

            return (
              <div key={event.id} className="flex items-start gap-4 sm:gap-6 relative group pb-8 last:pb-0">
                {/* Left Column: Date */}
                <div className="w-16 sm:w-20 shrink-0 pt-0.5 text-right">
                  <span className="text-xs font-bold font-mono text-amber-400">
                    {event.date}
                  </span>
                </div>

                {/* Center Axis: Checkbox Icon + Vertical Line */}
                <div className="flex flex-col items-center shrink-0 relative z-10">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-md transition-all duration-300 ${
                      isLatest
                        ? 'bg-gradient-to-br from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-amber-500/30 ring-4 ring-amber-500/20'
                        : 'bg-gradient-to-br from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-amber-500/10'
                    }`}
                  >
                    {getEventIcon(event.title, event.toStatus || null)}
                  </div>

                  {!isVisualLast && (
                    <div className="w-1 absolute top-7 bottom-0 bg-amber-500 transition-all duration-500" />
                  )}
                </div>

                {/* Right Column: Title & Detailed Subtext */}
                <div className="flex-1 pt-0.5 space-y-2 bg-slate-955/40 border border-slate-900 hover:border-slate-800 p-3.5 rounded-xl transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{event.title}</span>
                    </h4>
                    {isLatest && (
                      <span className="text-[9px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full animate-pulse">
                        Latest Action
                      </span>
                    )}
                  </div>
                  
                  {/* Transition badge overlay if this is a pipeline transition event (hide if redundant transitions like SALE DONE -> SALE DONE) */}
                  {event.toStatusName && event.fromStatusName !== event.toStatusName && (
                    <div className="flex items-center gap-1.5 py-0.5">
                      {event.fromStatusName && (
                        <>
                          <span className={`text-[9px] px-1.5 py-0.5 border rounded uppercase tracking-wider font-semibold ${event.fromStatusClass}`}>
                            {event.fromStatusName}
                          </span>
                          <span className="text-slate-500 text-xs font-bold">&rarr;</span>
                        </>
                      )}
                      <span className={`text-[9px] px-1.5 py-0.5 border rounded uppercase tracking-wider font-semibold ${event.toStatusClass}`}>
                        {event.toStatusName}
                      </span>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {event.description}
                  </p>
                  
                  <div className="flex items-center justify-between pt-1 border-t border-slate-900/60 text-[10px] text-slate-500 font-mono">
                    <span>{event.fullDate}</span>
                    {event.user && <span className="text-slate-400 font-sans">By: {event.user}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
