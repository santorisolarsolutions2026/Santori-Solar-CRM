import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const { GET } = await import('../src/app/api/v1/users/route');
  const { signToken } = await import('../src/lib/auth');

  const token = signToken({
    id: 120, // Deepak Pandey
    name: 'Deepak Pandey',
    email: 'support@santorisolarsolutions.com',
    role: 'admin'
  });

  const req = new Request('http://localhost/api/v1/users', {
    headers: {
      'Cookie': `token=${token}`
    }
  });

  const response = await GET(req);
  const data = await response.json();
  
  console.log("=== API USERS LIST ===");
  if (data.success && Array.isArray(data.data)) {
    for (const u of data.data) {
      console.log(`ID: ${u.id} | Name: ${u.name} | Role: ${u.role} | Designation: ${u.designation?.name} (Level: ${u.designation?.level})`);
    }
  } else {
    console.log("API Error:", data);
  }
}

main().catch(console.error);
