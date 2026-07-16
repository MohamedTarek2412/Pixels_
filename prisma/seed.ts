import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const branch = await prisma.branch.upsert({
    where: { id: "branch-main" },
    update: {},
    create: {
      id: "branch-main",
      name: "الفرع الرئيسي - المعادي",
      address: "زهراء المعادي",
    },
  });

  const hashedPassword = await bcrypt.hash("Admin@123456", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@center.com" },
    update: {},
    create: {
      name: "المدير العام",
      email: "admin@center.com",
      password: hashedPassword,
      role: "ADMIN",
      branchId: branch.id,
    },
  });

  console.log("✅ Seed تم بنجاح");
  console.log("Admin login:", admin.email, "/ Admin@123456");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
