import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['error', 'warn'] });

try {
  const result = await prisma.$runCommandRaw({ ping: 1 });
  console.log('DB OK:', JSON.stringify(result));
} catch(e) {
  console.error('DB ERROR:', e.message);
  console.error('Full error:', e);
}

await prisma.$disconnect();
