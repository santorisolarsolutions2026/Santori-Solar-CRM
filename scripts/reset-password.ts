import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Error: Please provide both the email and the new password.');
    console.log('Usage: npx tsx scripts/reset-password.ts <email> <new_password>');
    process.exit(1);
  }

  const [email, newPassword] = args;
  const targetEmail = email.trim().toLowerCase();
  const pwdTrim = newPassword.trim();

  if (pwdTrim.length < 6) {
    console.error('Error: Password must be at least 6 characters long.');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const user = await prisma.user.findUnique({
      where: { email: targetEmail },
    });

    if (!user) {
      console.error(`Error: User with email "${targetEmail}" not found.`);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(pwdTrim, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    console.log(`\nSuccessfully reset password for user: ${user.name} (${user.email})`);
    console.log(`Role: ${user.role}`);
  } catch (error: any) {
    console.error('An error occurred during password reset:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
