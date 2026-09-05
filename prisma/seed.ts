import "dotenv/config";
import bcrypt from "bcryptjs";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { PrismaClient } from "../src/generated/prisma";

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set. See .env.example.");

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });

const EMAIL = "demo@budgetwise.app";
const PASSWORD = "demo1234";

function monthsBack(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

const PLAN: Record<string, [string, number][]> = {
  Housing: [["Rent", 24000], ["Maintenance", 1800]],
  Food: [["Groceries", 9500], ["Food delivery", 6200], ["Office lunches", 2800]],
  Transport: [["Fuel", 3400], ["Cab rides", 1900]],
  Entertainment: [["Weekend outings", 4200], ["Concert tickets", 2500]],
  Health: [["Gym membership", 1800], ["Pharmacy", 900]],
  Subscriptions: [
    ["Streaming bundle", 1300],
    ["Music", 199],
    ["Cloud storage", 650],
    ["News", 500],
  ],
  Other: [["Gifts", 2200]],
};

async function main() {
  await prisma.user.deleteMany({ where: { email: EMAIL } });

  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      name: "Demo User",
      passwordHash: await bcrypt.hash(PASSWORD, 12),
    },
  });

  const months = monthsBack(4);

  for (const [index, month] of months.entries()) {
    const drift = 1 + index * 0.04;

    await prisma.income.createMany({
      data: [
        { userId: user.id, source: "Salary", amount: 68000, month },
        ...(index % 2 === 1
          ? [{ userId: user.id, source: "Freelance project", amount: 8500, month }]
          : []),
      ],
    });

    await prisma.expense.createMany({
      data: Object.entries(PLAN).flatMap(([category, items]) =>
        items.map(([note, amount]) => ({
          userId: user.id,
          category,
          note,
          amount: Math.round(amount * drift),
          month,
        })),
      ),
    });
  }

  await prisma.budgetLimit.createMany({
    data: [
      { userId: user.id, category: "Food", amount: 15000 },
      { userId: user.id, category: "Transport", amount: 8000 },
      { userId: user.id, category: "Entertainment", amount: 5000 },
      { userId: user.id, category: "Health", amount: 4000 },
    ],
  });

  console.log(`Seeded ${EMAIL} (password: ${PASSWORD}) with ${months.length} months of data.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
