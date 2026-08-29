import 'dotenv/config';
import { prisma } from '../src/lib/db';
import { parseQuery } from '../src/lib/queryParser';

async function testCombinations() {
  const testCases = [
    {
      name: "Combination 1: AND with Text + Dropdown (City = Prayagraj AND Connection = residential)",
      query: {
        id: "root",
        logicalOperator: "AND" as const,
        rules: [
          { id: "r1", field: "city", operator: "equals", value: "Prayagraj" },
          { id: "r2", field: "connectionType", operator: "equals", value: "residential" }
        ]
      }
    },
    {
      name: "Combination 2: OR with Dropdown + Number (Connection = commercial OR Load >= 10)",
      query: {
        id: "root",
        logicalOperator: "OR" as const,
        rules: [
          { id: "r1", field: "connectionType", operator: "equals", value: "commercial" },
          { id: "r2", field: "sanctionedLoadKw", operator: "greater_than_or_equal", value: "10" }
        ]
      }
    },
    {
      name: "Combination 3: Nested OR inside AND (City = Prayagraj AND (Stage in [1, 2, 3] OR Load >= 5))",
      query: {
        id: "root",
        logicalOperator: "AND" as const,
        rules: [
          { id: "r1", field: "city", operator: "equals", value: "Prayagraj" },
          {
            id: "sub-g1",
            logicalOperator: "OR" as const,
            rules: [
              { id: "r2", field: "status", operator: "in_list", value: "1,2,3" },
              { id: "r3", field: "sanctionedLoadKw", operator: "greater_than_or_equal", value: "5" }
            ]
          }
        ]
      }
    },
    {
      name: "Combination 4: NOT group (NOT (City = Varanasi AND Connection = industrial))",
      query: {
        id: "root",
        logicalOperator: "NOT" as const,
        rules: [
          { id: "r1", field: "city", operator: "equals", value: "Varanasi" },
          { id: "r2", field: "connectionType", operator: "equals", value: "industrial" }
        ]
      }
    },
    {
      name: "Combination 5: OR of two nested AND groups ((Varanasi AND residential) OR (Prayagraj AND commercial))",
      query: {
        id: "root",
        logicalOperator: "OR" as const,
        rules: [
          {
            id: "and-g1",
            logicalOperator: "AND" as const,
            rules: [
              { id: "r1", field: "city", operator: "equals", value: "Varanasi" },
              { id: "r2", field: "connectionType", operator: "equals", value: "residential" }
            ]
          },
          {
            id: "and-g2",
            logicalOperator: "AND" as const,
            rules: [
              { id: "r3", field: "city", operator: "equals", value: "Prayagraj" },
              { id: "r4", field: "connectionType", operator: "equals", value: "commercial" }
            ]
          }
        ]
      }
    },
    {
      name: "Combination 6: Date Range AND Text Matches (Created this year AND Name contains Kumar)",
      query: {
        id: "root",
        logicalOperator: "AND" as const,
        rules: [
          { id: "r1", field: "createdAt", operator: "this_year", value: "" },
          { id: "r2", field: "customerName", operator: "contains", value: "Kumar" }
        ]
      }
    },
    {
      name: "Combination 7: Multiple negative conditions (City != Prayagraj AND Connection != commercial)",
      query: {
        id: "root",
        logicalOperator: "AND" as const,
        rules: [
          { id: "r1", field: "city", operator: "not_equals", value: "Prayagraj" },
          { id: "r2", field: "connectionType", operator: "not_equals", value: "commercial" }
        ]
      }
    }
  ];

  console.log("STARTING TEST RUN OF DYNAMIC COMBINATION CASES...");
  let passedCount = 0;
  let failedCount = 0;

  for (const tc of testCases) {
    try {
      const parsed = parseQuery(tc.query);
      const count = await prisma.lead.count({
        where: {
          isActive: true,
          ...parsed
        }
      });
      console.log(`✅ SUCCESS [${tc.name}] -> Match Count: ${count}`);
      passedCount++;
    } catch (err: any) {
      console.error(`❌ FAILED [${tc.name}]`);
      console.error("Prisma query parse/execution crash message:", err.message);
      failedCount++;
    }
  }

  console.log(`\n=============================================`);
  console.log(`COMBINATIONS TEST SUMMARY:`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`=============================================`);
}

testCombinations().catch(console.error).finally(() => prisma.$disconnect());
