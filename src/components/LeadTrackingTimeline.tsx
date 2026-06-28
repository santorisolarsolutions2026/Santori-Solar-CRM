'use client';

import React from 'react';
import { Check, Clock, Truck, FileCheck, Calendar, UserCheck, Zap, AlertCircle, Sparkles } from 'lucide-react';

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
}

interface Order {
  id: number;
  orderCode: string;
  status: string;
  systemSizeKw: number;
  totalValue: number;
  createdAt?: string;
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
    activityLogs?: ActivityLog[];
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
  8: 'Meeting Booked 📅',
  9: 'Meeting Done',
  10: 'Disconnected',
  11: 'Switch Off',
  12: 'Can\'t Fit Solar',
  13: '✅ SALE DONE (Order Punched)',
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
  }

  const events: RealEvent[] = [];

  // 1. Base Event: Lead Creation
  const createdTimestamp = new Date(lead.createdAt).getTime() || 0;
  events.push({
    id: 'create',
    title: 'Lead Opportunity Registered',
    date: formatDate(lead.createdAt),
    fullDate: formatDateTime(lead.createdAt),
    timestamp: createdTimestamp,
    description: `Lead #${lead.leadCode} created in system for customer ${lead.customerName}.`,
    badge: 'Registered',
  });

  // 2. Team Allocation Event (if assigned)
  if (lead.consultant || lead.tl || lead.manager) {
    const teamParts = [];
    if (lead.consultant) teamParts.push(`Consultant: ${lead.consultant.name}`);
    if (lead.tl) teamParts.push(`TL: ${lead.tl.name}`);
    if (lead.manager) teamParts.push(`Manager: ${lead.manager.name}`);

    events.push({
      id: 'assign',
      title: 'Team Allocated',
      date: formatDate(lead.createdAt),
      fullDate: formatDateTime(lead.createdAt),
      timestamp: createdTimestamp + 100, // slightly after creation for sorting
      description: `Assigned to ${teamParts.join(', ')}.`,
      badge: 'Assigned',
    });
  }

  // 3. Activity Logs (Real Status Transitions & Calls)
  if (lead.activityLogs && lead.activityLogs.length > 0) {
    lead.activityLogs.forEach((log) => {
      const logTime = new Date(log.createdAt).getTime() || 0;
      const toStageName = STAGE_NAMES[log.toStatus] || `Stage ${log.toStatus}`;
      const fromStageName = log.fromStatus !== null ? STAGE_NAMES[log.fromStatus] || `Stage ${log.fromStatus}` : null;

      let desc = log.remark || `Pipeline stage updated to ${toStageName}.`;
      if (fromStageName && !log.remark) {
        desc = `Stage changed from ${fromStageName} to ${toStageName}.`;
      }

      events.push({
        id: `log-${log.id}`,
        title: toStageName,
        date: formatDate(log.createdAt),
        fullDate: formatDateTime(log.createdAt),
        timestamp: logTime,
        description: desc,
        user: `${log.user.name} (${log.user.role.toUpperCase()})`,
        badge: 'Activity',
      });
    });
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
    });
  }

  // Sort events chronologically (Oldest first for standard delivery progress timeline, or newest at top)
  // Standard delivery timelines (like Amazon screenshot) show progress from top to bottom (Chronological)
  events.sort((a, b) => a.timestamp - b.timestamp);

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
            <p className="text-[11px] text-slate-400">Live progress tracking showing only completed events for this lead.</p>
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
            const isLast = idx === events.length - 1;

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
                  {/* Square Checkmark Box matching Amazon tracking screenshot */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-md transition-all duration-300 ${
                      isLast
                        ? 'bg-gradient-to-br from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-amber-500/30 ring-4 ring-amber-500/20 animate-pulse'
                        : 'bg-gradient-to-br from-amber-500 to-yellow-500 text-slate-950 font-bold shadow-amber-500/10'
                    }`}
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>

                  {/* Solid Amber Vertical Connecting Line */}
                  {!isLast && (
                    <div className="w-1 absolute top-7 bottom-0 bg-amber-500 transition-all duration-500" />
                  )}
                </div>

                {/* Right Column: Title & Detailed Subtext */}
                <div className="flex-1 pt-0.5 space-y-1 bg-slate-950/40 border border-slate-900 hover:border-slate-800 p-3.5 rounded-xl transition-all">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{event.title}</span>
                    </h4>
                    {isLast && (
                      <span className="text-[9px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                        Latest Action
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{event.description}</p>
                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 font-mono">
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
