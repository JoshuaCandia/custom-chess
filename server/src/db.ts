import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prisma = new (PrismaClient as any)({ adapter }) as InstanceType<typeof PrismaClient>;
