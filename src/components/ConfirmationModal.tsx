'use client';

import React from 'react';
import { AlertTriangle, UserCheck, ShieldAlert, CheckCircle2, X } from 'lucide-react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  step?: 1 | 2;
  totalSteps?: number;
  title: string;
  message: string;
  subMessage?: string;
  assigneeName?: string;
  leadCode?: string;
  customerName?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'info' | 'danger';
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  step = 1,
  totalSteps = 2,
  title,
  message,
  subMessage,
  assigneeName,
  leadCode,
  customerName,
  confirmText,
  cancelText,
  type = 'info',
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const isWarning = type === 'warning' || step === 2;
  const isDanger = type === 'danger';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in font-sans">
      <div className="w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden transition-all transform animate-fade-in-up">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-main)]/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {isDanger ? (
              <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
            ) : isWarning ? (
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
              </div>
            ) : (
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Step {step} of {totalSteps}
                </span>
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-wide mt-0.5">{title}</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg hover:bg-[var(--bg-main)] transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Target Lead & Assignee Pill if available */}
          {(leadCode || assigneeName || customerName) && (
            <div className="p-3.5 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
              {leadCode && (
                <div>
                  <span className="text-[var(--text-secondary)] text-[10px] font-semibold uppercase block">Lead</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{leadCode}</span>
                  {customerName && <span className="text-[var(--text-primary)] ml-1.5 font-medium">({customerName})</span>}
                </div>
              )}
              {assigneeName && (
                <div>
                  <span className="text-[var(--text-secondary)] text-[10px] font-semibold uppercase block">Assignee</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{assigneeName}</span>
                </div>
              )}
            </div>
          )}

          {/* Main Message */}
          <div className="space-y-2">
            <p className="text-xs text-[var(--text-primary)] leading-relaxed font-medium">{message}</p>
            {subMessage && (
              <p className={`text-xs font-semibold leading-relaxed ${isWarning ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--text-secondary)]'}`}>
                {subMessage}
              </p>
            )}
          </div>

          {/* Warning Banner Callout if step 2 */}
          {isWarning && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-xs">
              <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-amber-600 dark:text-amber-400 block">Hierarchy Visibility Rule</span>
                <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
                  Leads assigned to members outside your direct subordinate hierarchy will disappear from your personal pipeline view immediately upon assignment.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-main)]/30 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            {cancelText || (step === 2 ? 'Go Back' : 'Cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`py-2 px-5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{confirmText || (step === 1 ? 'Proceed to Step 2 →' : 'Yes, Confirm Assignment')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
