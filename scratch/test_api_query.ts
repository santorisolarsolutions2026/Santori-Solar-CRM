import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const { GET } = await import('../src/app/api/v1/leads/route');
  const { signToken } = await import('../src/lib/auth');

  const token = signToken({
    id: 120, // Deepak Pandey
    name: 'Deepak Pandey',
    email: 'support@santorisolarsolutions.com',
    role: 'admin'
  });

  // Query manager_id = 131 (Sarvesh)
  const req1 = new Request('http://localhost/api/v1/leads?manager_id=131&limit=1', {
    headers: { 'Cookie': `token=${token}` }
  });
  const res1 = await GET(req1);
  const data1 = await res1.json();
  console.log("=== Query manager_id=131 (Sarvesh) ===");
  console.log("Total Count returned by API:", data1.data?.pagination?.total);

  // Query manager_id = 120 (Deepak)
  const req2 = new Request('http://localhost/api/v1/leads?manager_id=120&limit=1', {
    headers: { 'Cookie': `token=${token}` }
  });
  const res2 = await GET(req2);
  const data2 = await res2.json();
  console.log("\n=== Query manager_id=120 (Deepak) ===");
  console.log("Total Count returned by API:", data2.data?.pagination?.total);

  // Query manager_id = 130 (Sachin)
  const req3 = new Request('http://localhost/api/v1/leads?manager_id=130&limit=1', {
    headers: { 'Cookie': `token=${token}` }
  });
  const res3 = await GET(req3);
  const data3 = await res3.json();
  console.log("\n=== Query manager_id=130 (Sachin) ===");
  console.log("Total Count returned by API:", data3.data?.pagination?.total);
}

main().catch(console.error);
