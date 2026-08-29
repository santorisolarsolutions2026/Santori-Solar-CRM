import 'dotenv/config';
import { prisma } from '../src/lib/db';
import { parseQuery } from '../src/lib/queryParser';

async function testAllOperators() {
  const testCases = [
    // 1. Text Operators
    { field: 'customerName', operator: 'equals', value: 'pandey' },
    { field: 'customerName', operator: 'not_equals', value: 'pandey' },
    { field: 'customerName', operator: 'contains', value: 'pandey' },
    { field: 'customerName', operator: 'does_not_contain', value: 'pandey' },
    { field: 'customerName', operator: 'starts_with', value: 'pandey' },
    { field: 'customerName', operator: 'does_not_start_with', value: 'pandey' },
    { field: 'customerName', operator: 'ends_with', value: 'pandey' },
    { field: 'customerName', operator: 'does_not_end_with', value: 'pandey' },
    { field: 'city', operator: 'is_empty', value: '' },
    { field: 'city', operator: 'is_not_empty', value: '' },

    // 2. Number Operators
    { field: 'sanctionedLoadKw', operator: 'equals', value: '5' },
    { field: 'sanctionedLoadKw', operator: 'not_equals', value: '5' },
    { field: 'sanctionedLoadKw', operator: 'greater_than', value: '3' },
    { field: 'sanctionedLoadKw', operator: 'less_than', value: '10' },
    { field: 'sanctionedLoadKw', operator: 'greater_than_or_equal', value: '5' },
    { field: 'sanctionedLoadKw', operator: 'less_than_or_equal', value: '5' },
    { field: 'sanctionedLoadKw', operator: 'between', value: '2,6' },
    { field: 'sanctionedLoadKw', operator: 'is_positive', value: '' },
    { field: 'sanctionedLoadKw', operator: 'is_negative', value: '' },
    { field: 'sanctionedLoadKw', operator: 'is_zero', value: '' },

    // 3. Date Operators
    { field: 'createdAt', operator: 'on', value: '2026-08-25' },
    { field: 'createdAt', operator: 'before', value: '2026-08-25' },
    { field: 'createdAt', operator: 'after', value: '2026-08-25' },
    { field: 'createdAt', operator: 'between', value: '2026-08-20,2026-08-25' },
    { field: 'createdAt', operator: 'today', value: '' },
    { field: 'createdAt', operator: 'yesterday', value: '' },
    { field: 'createdAt', operator: 'tomorrow', value: '' },
    { field: 'createdAt', operator: 'in_the_last_x_days', value: '7' },
    { field: 'createdAt', operator: 'in_the_next_x_days', value: '7' },
    { field: 'createdAt', operator: 'this_week', value: '' },
    { field: 'createdAt', operator: 'last_week', value: '' },
    { field: 'createdAt', operator: 'next_week', value: '' },
    { field: 'createdAt', operator: 'this_month', value: '' },
    { field: 'createdAt', operator: 'last_month', value: '' },
    { field: 'createdAt', operator: 'next_month', value: '' },
    { field: 'createdAt', operator: 'this_year', value: '' },
    { field: 'createdAt', operator: 'last_year', value: '' },
    { field: 'createdAt', operator: 'next_year', value: '' },
    { field: 'followupAt', operator: 'is_overdue', value: '' },
    { field: 'followupAt', operator: 'is_due_today', value: '' },

    // 4. Dropdown Operators
    { field: 'connectionType', operator: 'equals', value: 'residential' },
    { field: 'connectionType', operator: 'not_equals', value: 'residential' },
    { field: 'connectionType', operator: 'in_list', value: 'residential,commercial' },
    { field: 'connectionType', operator: 'not_in_list', value: 'residential,commercial' },

    // 5. Status Operators
    { field: 'status', operator: 'equals', value: '1' },
    { field: 'status', operator: 'not_equals', value: '1' },
    { field: 'status', operator: 'in_list', value: '1,2,3' },
    { field: 'status', operator: 'not_in_list', value: '1,2,3' },

    // 6. Boolean Operators
    { field: 'isUnreachable', operator: 'is_true', value: '' },
    { field: 'isUnreachable', operator: 'is_false', value: '' },

    // 7. User / Assignee Operators
    { field: 'assignedConsultantId', operator: 'is_assigned_to', value: '134' },
    { field: 'assignedConsultantId', operator: 'is_assigned_to', value: 'null' },
    { field: 'assignedConsultantId', operator: 'is_not_assigned_to', value: '134' },
    { field: 'assignedConsultantId', operator: 'is_not_assigned_to', value: 'null' },
    { field: 'assignedConsultantId', operator: 'exists', value: '' },
    { field: 'assignedConsultantId', operator: 'does_not_exist', value: '' }
  ];

  console.log("STARTING TEST OF ALL OPERATORS...");
  let passedCount = 0;
  let failedCount = 0;

  for (const tc of testCases) {
    try {
      const queryObj = {
        id: 'test-rule',
        field: tc.field,
        operator: tc.operator,
        value: tc.value
      };

      const parsed = parseQuery(queryObj);
      
      // Execute on database
      const count = await prisma.lead.count({
        where: {
          isActive: true,
          ...parsed
        }
      });

      console.log(`✅ Passed: [${tc.field}] [${tc.operator}] with value [${tc.value}] -> Match Count: ${count}`);
      passedCount++;
    } catch (err: any) {
      console.error(`❌ Failed: [${tc.field}] [${tc.operator}] with value [${tc.value}]`);
      console.error("Prisma error message:", err.message);
      failedCount++;
    }
  }

  console.log(`\nTEST COMPLETION SUMMARY:`);
  console.log(`Total Passed: ${passedCount}`);
  console.log(`Total Failed: ${failedCount}`);
}

testAllOperators().catch(console.error).finally(() => prisma.$disconnect());
