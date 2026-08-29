import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const { POST } = await import('../src/app/api/v1/leads/advanced-query/route');
  const { signToken } = await import('../src/lib/auth');

  const token = signToken({
    id: 120, // Deepak Pandey
    name: 'Deepak Pandey',
    email: 'support@santorisolarsolutions.com',
    role: 'admin'
  });

  const runQuery = async (managerVal: string) => {
    const queryObj = {
      id: "root",
      logicalOperator: "AND",
      rules: [
        {
          id: "rule_" + managerVal,
          field: "assignedManagerId",
          operator: "is_assigned_to",
          value: managerVal
        }
      ]
    };

    const req = new Request('http://localhost/api/v1/leads/advanced-query', {
      method: 'POST',
      headers: {
        'Cookie': `token=${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ queryObj, page: 1, limit: 1 })
    });

    const response = await POST(req);
    const data = await response.json();
    return data.pagination?.total;
  };

  console.log("=== ADVANCED QUERY COUNTS ===");
  console.log("Deepak Pandey (120) total count:", await runQuery("120"));
  console.log("Sachin Pandey (130) total count:", await runQuery("130"));
  console.log("Sarvesh Chaubey (131) total count:", await runQuery("131"));
}

main().catch(console.error);
