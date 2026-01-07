import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  connectionString: process.env.DATABASE_URL,
});