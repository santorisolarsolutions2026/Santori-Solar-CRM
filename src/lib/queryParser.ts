export interface QueryRule {
  field?: string;
  operator?: string;
  value?: any;
  logicalOperator?: 'AND' | 'OR' | 'NOT';
  rules?: QueryRule[];
}

const FIELD_TYPES: Record<string, 'string' | 'number' | 'boolean' | 'date'> = {
  customerName: 'string',
  mobile: 'string',
  mobileAlt: 'string',
  leadCode: 'string',
  connectionNumber: 'string',
  discomName: 'string',
  address: 'string',
  pinCode: 'string',
  city: 'string',
  state: 'string',
  leadSource: 'string',
  connectionType: 'string',
  sanctionedLoadKw: 'number',
  status: 'number',
  statusSub: 'string',
  isUnreachable: 'boolean',
  isActive: 'boolean',
  createdAt: 'date',
  updatedAt: 'date',
  followupAt: 'date',
  assignedConsultantId: 'number',
  assignedTlId: 'number',
  assignedManagerId: 'number'
};

export function parseQuery(queryObj: QueryRule | null | undefined): any {
  if (!queryObj) return {};

  if (queryObj.logicalOperator) {
    const operator = queryObj.logicalOperator.toUpperCase();
    const rules = queryObj.rules || [];

    if (operator === 'NOT') {
      return {
        NOT: rules.map((r) => parseQuery(r)).filter((q) => Object.keys(q).length > 0)
      };
    } else if (operator === 'OR') {
      return {
        OR: rules.map((r) => parseQuery(r)).filter((q) => Object.keys(q).length > 0)
      };
    } else {
      // Default to AND
      return {
        AND: rules.map((r) => parseQuery(r)).filter((q) => Object.keys(q).length > 0)
      };
    }
  }

  const { field, operator, value: rawValue } = queryObj;
  if (!field || !operator) return {};

  const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue;

  const NO_VALUE_OPERATORS = [
    'is_empty', 'is_not_empty', 'has_no_value', 'has_any_value', 'is_known', 'is_unknown',
    'is_positive', 'is_negative', 'is_zero', 'is_true', 'is_false',
    'exists', 'does_not_exist', 'today', 'yesterday', 'tomorrow',
    'this_week', 'last_week', 'next_week', 'this_month', 'last_month', 'next_month',
    'this_year', 'last_year', 'next_year', 'is_overdue', 'is_due_today'
  ];

  const NULLABLE_FIELDS = [
    'mobileAlt',
    'leadSource',
    'statusSub',
    'assignedConsultantId',
    'assignedTlId',
    'assignedManagerId',
    'followupAt',
    'updatedById',
    'connectionNumber',
    'discomName'
  ];

  if (!NO_VALUE_OPERATORS.includes(operator)) {
    if (value === undefined || value === null || value === '') {
      return {};
    }
  }

  const fieldType = FIELD_TYPES[field] || 'string';
  const now = new Date();
  const getStartOfToday = () => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const getEndOfToday = () => {
    const d = new Date(now);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  // Intercept virtual 'order_punched' and pure '13' (Sale Done) status filters
  if (field === 'status') {
    const isOrderPunchedVal = value === 'order_punched' || value === '15';
    const isSaleDoneVal = value === 13 || value === '13';
    
    const valArray = Array.isArray(value) 
      ? value 
      : typeof value === 'string' && value.includes(',') 
        ? value.split(',').map(s => s.trim())
        : [value];
    
    const hasOrderPunchedInArray = valArray.includes('order_punched') || valArray.includes('15');
    const hasSaleDoneInArray = valArray.includes(13) || valArray.includes('13');

    const orderPunchedPrismaCondition = {
      status: 13,
      order: {
        is: {
          status: { not: 'draft' }
        }
      }
    };

    const saleDonePrismaCondition = {
      status: 13,
      OR: [
        { order: null },
        { order: { is: { status: 'draft' } } }
      ]
    };

    if (operator === 'equals' || operator === 'Equals' || operator === 'is' || operator === 'IS') {
      if (isOrderPunchedVal) {
        return orderPunchedPrismaCondition;
      }
      if (isSaleDoneVal) {
        return saleDonePrismaCondition;
      }
    } else if (operator === 'not_equals' || operator === 'Not Equals' || operator === 'is_not' || operator === 'IS NOT') {
      if (isOrderPunchedVal) {
        return { NOT: orderPunchedPrismaCondition };
      }
      if (isSaleDoneVal) {
        return { NOT: saleDonePrismaCondition };
      }
    } else if (operator === 'in_list' || operator === 'In List' || operator === 'any' || operator === 'Any') {
      if (hasOrderPunchedInArray && hasSaleDoneInArray) {
        const otherValues = valArray.filter(v => v !== 'order_punched' && v !== '15' && v !== 13 && v !== '13').map(v => parseInt(v)).filter(v => !isNaN(v));
        const allStatuses = [...otherValues, 13];
        return { status: { in: allStatuses } };
      } else if (hasOrderPunchedInArray) {
        const otherValues = valArray.filter(v => v !== 'order_punched' && v !== '15').map(v => parseInt(v)).filter(v => !isNaN(v));
        if (otherValues.length > 0) {
          return {
            OR: [
              { status: { in: otherValues } },
              orderPunchedPrismaCondition
            ]
          };
        } else {
          return orderPunchedPrismaCondition;
        }
      } else if (hasSaleDoneInArray) {
        const otherValues = valArray.filter(v => v !== 13 && v !== '13').map(v => parseInt(v)).filter(v => !isNaN(v));
        if (otherValues.length > 0) {
          return {
            OR: [
              { status: { in: otherValues } },
              saleDonePrismaCondition
            ]
          };
        } else {
          return saleDonePrismaCondition;
        }
      }
    } else if (operator === 'not_in_list' || operator === 'Not In List' || operator === 'none' || operator === 'None') {
      if (hasOrderPunchedInArray && hasSaleDoneInArray) {
        const otherValues = valArray.filter(v => v !== 'order_punched' && v !== '15' && v !== 13 && v !== '13').map(v => parseInt(v)).filter(v => !isNaN(v));
        const allStatuses = [...otherValues, 13];
        return { status: { notIn: allStatuses } };
      } else if (hasOrderPunchedInArray) {
        const otherValues = valArray.filter(v => v !== 'order_punched' && v !== '15').map(v => parseInt(v)).filter(v => !isNaN(v));
        if (otherValues.length > 0) {
          return {
            AND: [
              { status: { notIn: otherValues } },
              { NOT: orderPunchedPrismaCondition }
            ]
          };
        } else {
          return { NOT: orderPunchedPrismaCondition };
        }
      } else if (hasSaleDoneInArray) {
        const otherValues = valArray.filter(v => v !== 13 && v !== '13').map(v => parseInt(v)).filter(v => !isNaN(v));
        if (otherValues.length > 0) {
          return {
            AND: [
              { status: { notIn: otherValues } },
              { NOT: saleDonePrismaCondition }
            ]
          };
        } else {
          return { NOT: saleDonePrismaCondition };
        }
      }
    }
  }

  switch (operator) {
    // --- LOGICAL / TEXT OPERATORS ---
    case 'equals':
    case 'Equals':
    case 'is':
    case 'IS':
      if (fieldType === 'number') {
        const num = parseFloat(value);
        return { [field]: { equals: isNaN(num) ? 0 : num } };
      } else if (fieldType === 'boolean') {
        return { [field]: { equals: value === 'true' || value === true } };
      } else if (fieldType === 'date') {
        const start = new Date(value);
        start.setHours(0, 0, 0, 0);
        const end = new Date(value);
        end.setHours(23, 59, 59, 999);
        return { [field]: { gte: start, lte: end } };
      }
      return { [field]: { equals: value, mode: 'insensitive' } };

    case 'not_equals':
    case 'Not Equals':
    case 'is_not':
    case 'IS NOT':
      if (fieldType === 'number') {
        const num = parseFloat(value);
        return { [field]: { not: isNaN(num) ? 0 : num } };
      } else if (fieldType === 'boolean') {
        return { [field]: { equals: value === 'false' || value === false } };
      }
      return { NOT: { [field]: { equals: value, mode: 'insensitive' } } };

    case 'contains':
    case 'Contains':
      return { [field]: { contains: value, mode: 'insensitive' } };
    case 'does_not_contain':
    case 'Does Not Contain':
      return { NOT: { [field]: { contains: value, mode: 'insensitive' } } };
    case 'starts_with':
    case 'Starts With':
      return { [field]: { startsWith: value, mode: 'insensitive' } };
    case 'does_not_start_with':
    case 'Does Not Start With':
      return { NOT: { [field]: { startsWith: value, mode: 'insensitive' } } };
    case 'ends_with':
    case 'Ends With':
      return { [field]: { endsWith: value, mode: 'insensitive' } };
    case 'does_not_end_with':
    case 'Does Not End With':
      return { NOT: { [field]: { endsWith: value, mode: 'insensitive' } } };

    case 'is_empty':
    case 'Is Empty':
    case 'has_no_value':
    case 'Has No Value':
    case 'is_unknown':
    case 'Is Unknown':
      if (NULLABLE_FIELDS.includes(field)) {
        return {
          OR: [
            { [field]: { equals: '' } },
            { [field]: null }
          ]
        };
      }
      return { [field]: { equals: '' } };
    case 'is_not_empty':
    case 'Is Not Empty':
    case 'has_any_value':
    case 'Has Any Value':
    case 'is_known':
    case 'Is Known':
      if (NULLABLE_FIELDS.includes(field)) {
        return {
          AND: [
            { [field]: { not: '' } },
            { [field]: { not: null } }
          ]
        };
      }
      return { [field]: { not: '' } };

    // --- NUMBER OPERATORS ---
    case 'greater_than':
    case 'Greater Than':
      return { [field]: { gt: parseFloat(value) } };
    case 'less_than':
    case 'Less Than':
      return { [field]: { lt: parseFloat(value) } };
    case 'greater_than_or_equal':
    case 'Greater Than or Equal':
      return { [field]: { gte: parseFloat(value) } };
    case 'less_than_or_equal':
    case 'Less Than or Equal':
      return { [field]: { lte: parseFloat(value) } };
    case 'between':
    case 'Between': {
      if (fieldType === 'date') {
        let date1: Date, date2: Date;
        if (Array.isArray(value)) {
          date1 = new Date(value[0]);
          date2 = new Date(value[1]);
        } else if (typeof value === 'string' && value.includes(',')) {
          const parts = value.split(',');
          date1 = new Date(parts[0]);
          date2 = new Date(parts[1]);
        } else {
          date1 = new Date(value);
          date2 = new Date(value);
        }
        date1.setHours(0, 0, 0, 0);
        date2.setHours(23, 59, 59, 999);
        return { [field]: { gte: date1, lte: date2 } };
      }
      let val1 = 0, val2 = 0;
      if (Array.isArray(value)) {
        val1 = parseFloat(value[0]);
        val2 = parseFloat(value[1]);
      } else if (typeof value === 'string' && value.includes(',')) {
        const parts = value.split(',');
        val1 = parseFloat(parts[0]);
        val2 = parseFloat(parts[1]);
      } else {
        val1 = parseFloat(value);
      }
      return { [field]: { gte: val1, lte: val2 } };
    }
    case 'is_positive':
    case 'Is Positive':
      return { [field]: { gt: 0 } };
    case 'is_negative':
    case 'Is Negative':
      return { [field]: { lt: 0 } };
    case 'is_zero':
    case 'Is Zero':
      return { [field]: { equals: 0 } };

    // --- BOOLEAN OPERATORS ---
    case 'is_true':
    case 'Is True':
      return { [field]: { equals: true } };
    case 'is_false':
    case 'Is False':
      return { [field]: { equals: false } };

    // --- DATE OPERATORS ---
    case 'on':
    case 'On': {
      const start = new Date(value);
      start.setHours(0, 0, 0, 0);
      const end = new Date(value);
      end.setHours(23, 59, 59, 999);
      return { [field]: { gte: start, lte: end } };
    }
    case 'before':
    case 'Before':
    case 'changed_before':
    case 'Changed Before': {
      const d = new Date(value);
      d.setHours(0, 0, 0, 0);
      const targetField = operator.startsWith('changed') ? 'updatedAt' : field;
      return { [targetField]: { lt: d } };
    }
    case 'after':
    case 'After':
    case 'changed_since':
    case 'Changed Since': {
      const d = new Date(value);
      d.setHours(23, 59, 59, 999);
      const targetField = operator.startsWith('changed') ? 'updatedAt' : field;
      return { [targetField]: { gt: d } };
    }
    case 'today':
    case 'Today':
      return { [field]: { gte: getStartOfToday(), lte: getEndOfToday() } };
    case 'yesterday':
    case 'Yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const start = new Date(yesterday);
      start.setHours(0, 0, 0, 0);
      const end = new Date(yesterday);
      end.setHours(23, 59, 59, 999);
      return { [field]: { gte: start, lte: end } };
    }
    case 'tomorrow':
    case 'Tomorrow': {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const start = new Date(tomorrow);
      start.setHours(0, 0, 0, 0);
      const end = new Date(tomorrow);
      end.setHours(23, 59, 59, 999);
      return { [field]: { gte: start, lte: end } };
    }
    case 'in_the_last_x_days':
    case 'In the Last X Days': {
      const days = parseInt(value) || 0;
      const pastDate = new Date(now);
      pastDate.setDate(pastDate.getDate() - days);
      pastDate.setHours(0, 0, 0, 0);
      return { [field]: { gte: pastDate, lte: now } };
    }
    case 'in_the_next_x_days':
    case 'In the Next X Days': {
      const days = parseInt(value) || 0;
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + days);
      futureDate.setHours(23, 59, 59, 999);
      return { [field]: { gte: now, lte: futureDate } };
    }
    case 'this_week':
    case 'This Week': {
      const tempDate = new Date(now);
      const currentDay = tempDate.getDay();
      const diff = tempDate.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
      const start = new Date(tempDate.setDate(diff));
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { [field]: { gte: start, lte: end } };
    }
    case 'last_week':
    case 'Last Week': {
      const tempDate = new Date(now);
      const currentDay = tempDate.getDay();
      const diff = tempDate.getDate() - currentDay + (currentDay === 0 ? -6 : 1) - 7;
      const start = new Date(tempDate.setDate(diff));
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { [field]: { gte: start, lte: end } };
    }
    case 'next_week':
    case 'Next Week': {
      const tempDate = new Date(now);
      const currentDay = tempDate.getDay();
      const diff = tempDate.getDate() - currentDay + (currentDay === 0 ? -6 : 1) + 7;
      const start = new Date(tempDate.setDate(diff));
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { [field]: { gte: start, lte: end } };
    }
    case 'this_month':
    case 'This Month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { [field]: { gte: start, lte: end } };
    }
    case 'last_month':
    case 'Last Month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { [field]: { gte: start, lte: end } };
    }
    case 'next_month':
    case 'Next Month': {
      const start = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);
      return { [field]: { gte: start, lte: end } };
    }
    case 'this_year':
    case 'This Year': {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { [field]: { gte: start, lte: end } };
    }
    case 'last_year':
    case 'Last Year': {
      const start = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      return { [field]: { gte: start, lte: end } };
    }
    case 'next_year':
    case 'Next Year': {
      const start = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear() + 1, 11, 31, 23, 59, 59, 999);
      return { [field]: { gte: start, lte: end } };
    }
    case 'is_overdue':
    case 'Is Overdue':
      return {
        AND: [
          { [field]: { lt: now } },
          { status: { lt: 13 } }
        ]
      };
    case 'is_due_today':
    case 'Is Due Today':
      return { [field]: { gte: getStartOfToday(), lte: getEndOfToday() } };

    // --- RELATION & USER OPERATORS ---
    case 'is_assigned_to':
    case 'Is Assigned To':
      return { [field]: value === 'null' || value === null ? null : parseInt(value) || undefined };
    case 'is_not_assigned_to':
    case 'Is Not Assigned To':
      return {
        OR: [
          { [field]: { not: value === 'null' || value === null ? null : parseInt(value) || undefined } },
          { [field]: null }
        ]
      };
    case 'exists':
    case 'Exists':
      return { [field]: { not: null } };
    case 'does_not_exist':
    case 'Does Not Exist':
      return { [field]: null };

    // --- MULTI-SELECT OPERATORS ---
    case 'in_list':
    case 'In List':
    case 'any':
    case 'Any': {
      const list = Array.isArray(value) ? value : String(value).split(',').map(s => s.trim());
      const mappedList = list.map(item => {
        const num = Number(item);
        return isNaN(num) ? item : num;
      });
      return { [field]: { in: mappedList } };
    }
    case 'not_in_list':
    case 'Not In List':
    case 'none':
    case 'None': {
      const list = Array.isArray(value) ? value : String(value).split(',').map(s => s.trim());
      const mappedList = list.map(item => {
        const num = Number(item);
        return isNaN(num) ? item : num;
      });
      return { [field]: { notIn: mappedList } };
    }
    case 'all':
    case 'All': {
      const list = Array.isArray(value) ? value : String(value).split(',').map(s => s.trim());
      const mappedList = list.map(item => {
        const num = Number(item);
        return isNaN(num) ? item : num;
      });
      return {
        AND: mappedList.map(item => ({ [field]: item }))
      };
    }

    // --- REGEX / PATTERN OPERATORS ---
    case 'matches_pattern':
    case 'Matches Pattern / Regex':
      return { [field]: { contains: value, mode: 'insensitive' } };

    default:
      return {};
  }
}
