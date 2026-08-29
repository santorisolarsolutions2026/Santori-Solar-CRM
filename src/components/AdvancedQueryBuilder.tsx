import React, { useState, useEffect } from 'react';
import CustomDropdown from './CustomDropdown';
import { Plus, Trash2, Settings } from 'lucide-react';

export interface Rule {
  id: string;
  field: string;
  operator: string;
  value: any;
}

export interface Group {
  id: string;
  logicalOperator: 'AND' | 'OR' | 'NOT';
  rules: (Rule | Group)[];
}

interface AdvancedQueryBuilderProps {
  onChange: (query: Group) => void;
  onClear: () => void;
  initialQuery?: Group;
}

const FIELD_OPTIONS = [
  { value: 'customerName', label: 'Customer Name', type: 'text' },
  { value: 'mobile', label: 'Mobile Number', type: 'text' },
  { value: 'leadCode', label: 'Lead Code', type: 'text' },
  { value: 'connectionNumber', label: 'CA Connection Number', type: 'text' },
  { value: 'discomName', label: 'DISCOM / Electricity Board', type: 'text' },
  { value: 'connectionType', label: 'Connection Type', type: 'dropdown', options: [
      { value: 'residential', label: 'Residential' },
      { value: 'commercial', label: 'Commercial' },
      { value: 'industrial', label: 'Industrial' }
    ]
  },
  { value: 'sanctionedLoadKw', label: 'Sanctioned Load (kW)', type: 'number' },
  { value: 'address', label: 'Address', type: 'text' },
  { value: 'pinCode', label: 'PIN Code', type: 'text' },
  { value: 'city', label: 'City', type: 'text' },
  { value: 'state', label: 'State', type: 'text' },
  { value: 'leadSource', label: 'Lead Source', type: 'dropdown', options: [
      { value: 'meta', label: 'Meta' },
      { value: 'discom', label: 'Discom' },
      { value: 'offline_campaign', label: 'Offline Campaign' },
      { value: 'inbound', label: 'Inbound' },
      { value: 'whatsapp', label: 'WhatsApp' },
      { value: 'cold_call', label: 'Cold Call' }
    ]
  },
  { value: 'status', label: 'Pipeline Stage', type: 'status_dropdown' },
  { value: 'statusSub', label: 'Sub Stage / Reason', type: 'text' },
  { value: 'createdAt', label: 'Created At', type: 'date' },
  { value: 'updatedAt', label: 'Updated At', type: 'date' },
  { value: 'followupAt', label: 'Followup At', type: 'date' },
  { value: 'isUnreachable', label: 'Is Unreachable', type: 'boolean' },
  { value: 'isActive', label: 'Is Active', type: 'boolean' },
  { value: 'assignedConsultantId', label: 'Assigned Consultant', type: 'user_dropdown', role: 'consultant' },
  { value: 'assignedTlId', label: 'Assigned Team Leader', type: 'user_dropdown', role: 'tl' },
  { value: 'assignedManagerId', label: 'Assigned Manager', type: 'user_dropdown', role: 'manager' }
];

const STAGE_OPTIONS = [
  { value: '0', label: 'Uninitiated' },
  { value: '1', label: 'Fresh Lead' },
  { value: '2', label: 'DNP' },
  { value: '3', label: 'Follow Up' },
  { value: '4', label: 'Not Interested' },
  { value: '5', label: 'Call Later' },
  { value: '6', label: 'Already Installed' },
  { value: '7', label: 'Decision Pending' },
  { value: '8', label: 'Meeting Booked' },
  { value: '9', label: 'Meeting Done' },
  { value: '10', label: 'Disconnected' },
  { value: '11', label: 'Switch Off' },
  { value: '12', label: "Can't Fit Solar" },
  { value: '13', label: 'Sale Done' },
  { value: '14', label: 'Meeting Cancelled' },
  { value: 'order_punched', label: 'Order Punched' }
];

const OPERATORS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  text: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'does_not_contain', label: 'Does Not Contain' },
    { value: 'starts_with', label: 'Starts With' },
    { value: 'does_not_start_with', label: 'Does Not Start With' },
    { value: 'ends_with', label: 'Ends With' },
    { value: 'does_not_end_with', label: 'Does Not End With' },
    { value: 'is_empty', label: 'Is Empty' },
    { value: 'is_not_empty', label: 'Is Not Empty' }
  ],
  number: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'greater_than_or_equal', label: 'Greater Than or Equal' },
    { value: 'less_than_or_equal', label: 'Less Than or Equal' },
    { value: 'between', label: 'Between' },
    { value: 'is_positive', label: 'Is Positive' },
    { value: 'is_negative', label: 'Is Negative' },
    { value: 'is_zero', label: 'Is Zero' }
  ],
  date: [
    { value: 'on', label: 'On' },
    { value: 'before', label: 'Before' },
    { value: 'after', label: 'After' },
    { value: 'between', label: 'Between' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'in_the_last_x_days', label: 'In the Last X Days' },
    { value: 'in_the_next_x_days', label: 'In the Next X Days' },
    { value: 'this_week', label: 'This Week' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'next_week', label: 'Next Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'next_month', label: 'Next Month' },
    { value: 'this_year', label: 'This Year' },
    { value: 'last_year', label: 'Last Year' },
    { value: 'next_year', label: 'Next Year' },
    { value: 'is_overdue', label: 'Is Overdue' },
    { value: 'is_due_today', label: 'Is Due Today' },
    { value: 'changed_since', label: 'Changed Since' },
    { value: 'changed_before', label: 'Changed Before' }
  ],
  dropdown: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'in_list', label: 'In List' },
    { value: 'not_in_list', label: 'Not In List' }
  ],
  status_dropdown: [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'in_list', label: 'In List' },
    { value: 'not_in_list', label: 'Not In List' }
  ],
  boolean: [
    { value: 'is_true', label: 'Is True' },
    { value: 'is_false', label: 'Is False' }
  ],
  user_dropdown: [
    { value: 'is_assigned_to', label: 'Is Assigned To' },
    { value: 'is_not_assigned_to', label: 'Is Not Assigned To' },
    { value: 'exists', label: 'Exists' },
    { value: 'does_not_exist', label: 'Does Not Exist' }
  ]
};

const NO_VALUE_OPERATORS = [
  'is_empty', 'is_not_empty', 'has_no_value', 'has_any_value', 'is_known', 'is_unknown',
  'is_positive', 'is_negative', 'is_zero', 'is_true', 'is_false',
  'exists', 'does_not_exist', 'today', 'yesterday', 'tomorrow',
  'this_week', 'last_week', 'next_week', 'this_month', 'last_month', 'next_month',
  'this_year', 'last_year', 'next_year', 'is_overdue', 'is_due_today'
];

export default function AdvancedQueryBuilder({ onChange, onClear, initialQuery }: AdvancedQueryBuilderProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [rootGroup, setRootGroup] = useState<Group>(
    initialQuery || {
      id: 'root',
      logicalOperator: 'AND',
      rules: []
    }
  );

  useEffect(() => {
    if (initialQuery) {
      setRootGroup(initialQuery);
    } else {
      setRootGroup({
        id: 'root',
        logicalOperator: 'AND',
        rules: []
      });
    }
  }, [initialQuery]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/v1/users');
        const data = await res.json();
        if (data.success) {
          const cleanData = data.data.map((u: any) => ({
            ...u,
            designation: u.designation || undefined
          }));
          setUsers(cleanData);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchUsers();
  }, []);

  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  const triggerChange = (updated: Group, delay: number = 0) => {
    setRootGroup(updated);
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
    if (delay > 0) {
      const handler = setTimeout(() => {
        onChange(updated);
      }, delay);
      setDebounceTimeout(handler);
    } else {
      onChange(updated);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
    };
  }, [debounceTimeout]);

  const handleClear = () => {
    const cleared: Group = {
      id: 'root',
      logicalOperator: 'AND',
      rules: []
    };
    setRootGroup(cleared);
    onClear();
  };

  const uuid = () => Math.random().toString(36).substring(2, 9);

  const updateTree = (current: Group, targetId: string, callback: (node: any) => any): Group => {
    if (current.id === targetId) {
      return callback(current);
    }
    return {
      ...current,
      rules: current.rules.map((child) => {
        if (child.id === targetId) {
          return callback(child);
        }
        if ('rules' in child) {
          return updateTree(child, targetId, callback);
        }
        return child;
      })
    };
  };

  const removeNodeFromTree = (current: Group, targetId: string): Group => {
    return {
      ...current,
      rules: current.rules
        .filter((child) => child.id !== targetId)
        .map((child) => {
          if ('rules' in child) {
            return removeNodeFromTree(child, targetId);
          }
          return child;
        })
    };
  };

  const addRule = (groupId: string) => {
    const defaultField = FIELD_OPTIONS[0];
    const newRule: Rule = {
      id: uuid(),
      field: defaultField.value,
      operator: OPERATORS_BY_TYPE[defaultField.type][0].value,
      value: ''
    };
    const updated = updateTree(rootGroup, groupId, (group: Group) => ({
      ...group,
      rules: [...group.rules, newRule]
    }));
    triggerChange(updated);
  };

  const addSubGroup = (groupId: string) => {
    const newGroup: Group = {
      id: uuid(),
      logicalOperator: 'AND',
      rules: []
    };
    const updated = updateTree(rootGroup, groupId, (group: Group) => ({
      ...group,
      rules: [...group.rules, newGroup]
    }));
    triggerChange(updated);
  };

  const removeNode = (nodeId: string) => {
    const updated = removeNodeFromTree(rootGroup, nodeId);
    triggerChange(updated);
  };

  const updateRuleField = (ruleId: string, fieldName: string) => {
    const fieldDef = FIELD_OPTIONS.find(f => f.value === fieldName) || FIELD_OPTIONS[0];
    const defaultOperator = OPERATORS_BY_TYPE[fieldDef.type][0].value;
    const updated = updateTree(rootGroup, ruleId, (rule: Rule) => ({
      ...rule,
      field: fieldName,
      operator: defaultOperator,
      value: fieldDef.type === 'boolean' ? 'true' : ''
    }));
    triggerChange(updated);
  };

  const updateRuleOperator = (ruleId: string, operatorVal: string) => {
    const updated = updateTree(rootGroup, ruleId, (rule: Rule) => ({
      ...rule,
      operator: operatorVal,
      value: NO_VALUE_OPERATORS.includes(operatorVal) ? '' : rule.value
    }));
    triggerChange(updated);
  };

  const updateRuleValue = (ruleId: string, valueVal: any) => {
    const updated = updateTree(rootGroup, ruleId, (rule: Rule) => ({
      ...rule,
      value: valueVal
    }));
    triggerChange(updated, 400);
  };

  const toggleGroupOperator = (groupId: string, operatorVal: 'AND' | 'OR' | 'NOT') => {
    const updated = updateTree(rootGroup, groupId, (group: Group) => ({
      ...group,
      logicalOperator: operatorVal
    }));
    triggerChange(updated);
  };

  const renderGroup = (group: Group, parentId?: string) => {
    return (
      <div key={group.id} className="relative border border-[var(--border-color)]/70 bg-slate-950/20 rounded-xl p-4 sm:p-5 mt-2 space-y-4">
        {/* Group Controls header */}
        <div className="flex flex-wrap justify-between items-center gap-3 pb-2 border-b border-[var(--border-color)]/50">
          <div className="flex items-center gap-1 bg-slate-900/60 p-0.5 rounded-lg border border-[var(--border-color)]/85">
            {(['AND', 'OR', 'NOT'] as const).map((op) => (
              <button
                key={op}
                type="button"
                onClick={() => toggleGroupOperator(group.id, op)}
                className={`px-3 py-1 text-[10px] font-extrabold rounded-md uppercase tracking-wider transition-all cursor-pointer ${
                  group.logicalOperator === op
                    ? op === 'AND'
                      ? 'bg-emerald-600/90 text-white shadow-md'
                      : op === 'OR'
                      ? 'bg-blue-600/90 text-white shadow-md'
                      : 'bg-red-600/90 text-white shadow-md'
                    : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                {op}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => addRule(group.id)}
              className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-[var(--border-color)] rounded-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Filter</span>
            </button>
            <button
              type="button"
              onClick={() => addSubGroup(group.id)}
              className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-[var(--border-color)] rounded-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Group</span>
            </button>
            {parentId && (
              <button
                type="button"
                onClick={() => removeNode(group.id)}
                className="p-1 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded border border-red-500/20 cursor-pointer"
                title="Remove Group"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Child items list */}
        <div className="space-y-3.5 pl-1 sm:pl-3 border-l border-[var(--border-color)]/60">
          {group.rules.length === 0 ? (
            <p className="text-[10px] text-slate-550 italic pl-1 py-1">No filter rules configured in this group.</p>
          ) : (
            group.rules.map((node, index) => {
              const isGroup = 'rules' in node;
              return (
                <div key={node.id} className="relative" style={{ zIndex: 50 - index }}>
                  {index > 0 && (
                    <div className="flex items-center gap-2 my-2 select-none">
                      <div className="h-[1px] bg-[var(--border-color)]/30 flex-1"></div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        group.logicalOperator === 'AND'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : group.logicalOperator === 'OR'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-red-500/10 text-red-450 border border-red-500/20'
                      }`}>
                        {group.logicalOperator}
                      </span>
                      <div className="h-[1px] bg-[var(--border-color)]/30 flex-1"></div>
                    </div>
                  )}
                  {isGroup ? renderGroup(node as Group, group.id) : renderRuleRow(node as Rule)}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderRuleRow = (rule: Rule) => {
    const fieldDef = FIELD_OPTIONS.find((f) => f.value === rule.field) || FIELD_OPTIONS[0];
    const operators = OPERATORS_BY_TYPE[fieldDef.type] || [];
    const showValue = !NO_VALUE_OPERATORS.includes(rule.operator);

    return (
      <div key={rule.id} className="flex flex-wrap items-center gap-3 bg-[var(--bg-main)]/20 border border-[var(--border-color)]/40 p-3 rounded-xl animate-fade-in-up">
        {/* 1. Field Dropdown */}
        <div className="min-w-[150px]">
          <CustomDropdown
            options={FIELD_OPTIONS.map((f) => ({ value: f.value, label: f.label }))}
            value={rule.field}
            onChange={(val) => updateRuleField(rule.id, val)}
            className="w-full"
          />
        </div>

        {/* 2. Operator Dropdown */}
        <div className="min-w-[140px]">
          <CustomDropdown
            options={operators}
            value={rule.operator}
            onChange={(val) => updateRuleOperator(rule.id, val)}
            className="w-full"
          />
        </div>

        {/* 3. Dynamic Value Input */}
        {showValue && (
          <div className="flex-1 min-w-[180px]">
            {rule.operator === 'between' ? (
              <div className="flex items-center gap-2">
                <input
                  type={fieldDef.type === 'number' ? 'number' : fieldDef.type === 'date' ? 'date' : 'text'}
                  placeholder="Min"
                  value={Array.isArray(rule.value) ? rule.value[0] || '' : rule.value?.split(',')[0] || ''}
                  onChange={(e) => {
                    const currentVal = Array.isArray(rule.value) ? [...rule.value] : (rule.value?.split(',') || ['', '']);
                    currentVal[0] = e.target.value;
                    updateRuleValue(rule.id, currentVal);
                  }}
                  className="w-full px-3 py-1.5 bg-slate-900/60 border border-[var(--border-color)] rounded-lg text-xs text-white focus:outline-none focus:border-[var(--border-color)]"
                />
                <span className="text-[10px] text-slate-500 font-bold">to</span>
                <input
                  type={fieldDef.type === 'number' ? 'number' : fieldDef.type === 'date' ? 'date' : 'text'}
                  placeholder="Max"
                  value={Array.isArray(rule.value) ? rule.value[1] || '' : rule.value?.split(',')[1] || ''}
                  onChange={(e) => {
                    const currentVal = Array.isArray(rule.value) ? [...rule.value] : (rule.value?.split(',') || ['', '']);
                    currentVal[1] = e.target.value;
                    updateRuleValue(rule.id, currentVal);
                  }}
                  className="w-full px-3 py-1.5 bg-slate-900/60 border border-[var(--border-color)] rounded-lg text-xs text-white focus:outline-none focus:border-[var(--border-color)]"
                />
              </div>
            ) : fieldDef.type === 'dropdown' ? (
              <CustomDropdown
                options={fieldDef.options || []}
                value={rule.value}
                onChange={(val) => updateRuleValue(rule.id, val)}
                className="w-full"
              />
            ) : fieldDef.type === 'status_dropdown' ? (
              <CustomDropdown
                options={STAGE_OPTIONS}
                value={rule.value}
                onChange={(val) => updateRuleValue(rule.id, val)}
                className="w-full"
              />
            ) : fieldDef.type === 'user_dropdown' ? (
              <CustomDropdown
                options={[
                  { value: 'null', label: 'Unassigned' },
                  ...users
                    .filter((u) => {
                      const uRole = u.role?.toLowerCase() || '';
                      if (fieldDef.role === 'consultant') {
                        return ['consultant', 'psa'].includes(uRole);
                      }
                      if (fieldDef.role === 'tl') {
                        return ['tl', 'psa_tl'].includes(uRole);
                      }
                      if (fieldDef.role === 'manager') {
                        return ['manager', 'sales_head', 'admin', 'director'].includes(uRole) || (u.designation?.level && u.designation.level <= 3);
                      }
                      return false;
                    })
                    .map((u) => ({ value: String(u.id), label: u.name }))
                ]}
                value={rule.value}
                onChange={(val) => updateRuleValue(rule.id, val)}
                className="w-full"
              />
            ) : fieldDef.type === 'date' ? (
              ['in_the_last_x_days', 'in_the_next_x_days'].includes(rule.operator) ? (
                <input
                  type="number"
                  placeholder="Enter number of days..."
                  value={rule.value || ''}
                  onChange={(e) => updateRuleValue(rule.id, e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900/60 border border-[var(--border-color)] rounded-lg text-xs text-white focus:outline-none focus:border-[var(--border-color)] font-mono"
                  min="0"
                />
              ) : (
                <input
                  type="date"
                  value={rule.value || ''}
                  onChange={(e) => updateRuleValue(rule.id, e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900/60 border border-[var(--border-color)] rounded-lg text-xs text-white focus:outline-none focus:border-[var(--border-color)]"
                />
              )
            ) : fieldDef.type === 'number' ? (
              <input
                type="number"
                value={rule.value || ''}
                onChange={(e) => updateRuleValue(rule.id, e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900/60 border border-[var(--border-color)] rounded-lg text-xs text-white focus:outline-none focus:border-[var(--border-color)] font-mono"
              />
            ) : (
              <input
                type="text"
                placeholder="Enter value..."
                value={rule.value || ''}
                onChange={(e) => updateRuleValue(rule.id, e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-900/60 border border-[var(--border-color)] rounded-lg text-xs text-white focus:outline-none focus:border-[var(--border-color)]"
              />
            )}
          </div>
        )}

        {/* 4. Delete Row Trigger */}
        <button
          type="button"
          onClick={() => removeNode(rule.id)}
          className="p-1.5 hover:bg-red-500/10 text-red-400 hover:text-red-300 rounded border border-red-500/20 cursor-pointer shrink-0"
          title="Remove Filter"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Dynamic Filter builder panel container */}
      {renderGroup(rootGroup)}

      <div className="flex justify-between items-center pt-2">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <Settings className="w-3.5 h-3.5 text-slate-500 animate-spin-slow" />
          <span>Smart Filter Compiler active. Brackets matching nested constraints.</span>
        </div>
        
        {rootGroup.rules.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] font-semibold text-red-400 hover:text-red-300 cursor-pointer border-b border-dashed border-red-400/30 hover:border-red-300 pb-0.5"
          >
            Clear Advanced Filters
          </button>
        )}
      </div>
    </div>
  );
}
