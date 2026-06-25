import dotenv from 'dotenv';
dotenv.config();

import { GET } from '../src/app/api/v1/users/route';
import { signToken } from '../src/lib/auth';

async function main() {
  // Sign token for Admin (ID: 1)
  const token = signToken({
    id: 1,
    name: 'Deepak Pandey',
    email: 'admin@example.com',
    role: 'admin'
  });

  // Mock Next.js Request object
  const req = new Request('http://localhost/api/v1/users', {
    headers: {
      'Cookie': `token=${token}`
    }
  });

  console.log("Calling GET /api/v1/users handler...");
  const response = await GET(req);
  console.log("Response status:", response.status);
  
  const data = await response.json();
  console.log("Response JSON:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
