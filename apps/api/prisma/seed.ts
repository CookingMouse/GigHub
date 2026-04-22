import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const adminEmail = process.env.ADMIN_EMAIL ?? "admin@gighub.local";
const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin123!";

const main = async () => {
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: {
      name: "GigHub Admin",
      passwordHash,
      role: "admin"
    },
    create: {
      email: adminEmail.toLowerCase(),
      name: "GigHub Admin",
      passwordHash,
      role: "admin"
    }
  });
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
