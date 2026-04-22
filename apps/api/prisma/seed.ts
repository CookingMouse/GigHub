import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const adminEmail = process.env.ADMIN_EMAIL ?? "admin@gighub.local";
const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin123!";
const demoFreelancerPassword = process.env.DEMO_FREELANCER_PASSWORD ?? "Freelancer123!";

const main = async () => {
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const freelancerPasswordHash = await bcrypt.hash(demoFreelancerPassword, 12);

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

  const demoFreelancers = [
    {
      email: "aina@example.com",
      name: "Aina Musa",
      profile: {
        displayName: "Aina Musa",
        portfolioUrl: "https://portfolio.example.com/aina",
        skills: ["UI Design", "Brand Systems", "Landing Pages"],
        hourlyRate: "120.00",
        ratingAverage: "4.80"
      }
    },
    {
      email: "hakim@example.com",
      name: "Hakim Salleh",
      profile: {
        displayName: "Hakim Salleh",
        portfolioUrl: "https://portfolio.example.com/hakim",
        skills: ["Frontend Development", "Next.js", "TypeScript"],
        hourlyRate: "150.00",
        ratingAverage: "4.90"
      }
    },
    {
      email: "sofia@example.com",
      name: "Sofia Karim",
      profile: {
        displayName: "Sofia Karim",
        portfolioUrl: "https://portfolio.example.com/sofia",
        skills: ["Copywriting", "Content Strategy", "Campaign Messaging"],
        hourlyRate: "95.00",
        ratingAverage: "4.70"
      }
    }
  ];

  for (const freelancer of demoFreelancers) {
    await prisma.user.upsert({
      where: {
        email: freelancer.email
      },
      update: {
        name: freelancer.name,
        passwordHash: freelancerPasswordHash,
        role: "freelancer",
        freelancerProfile: {
          upsert: {
            update: {
              displayName: freelancer.profile.displayName,
              portfolioUrl: freelancer.profile.portfolioUrl,
              skills: freelancer.profile.skills,
              hourlyRate: freelancer.profile.hourlyRate,
              ratingAverage: freelancer.profile.ratingAverage
            },
            create: {
              displayName: freelancer.profile.displayName,
              portfolioUrl: freelancer.profile.portfolioUrl,
              skills: freelancer.profile.skills,
              hourlyRate: freelancer.profile.hourlyRate,
              ratingAverage: freelancer.profile.ratingAverage
            }
          }
        }
      },
      create: {
        email: freelancer.email,
        name: freelancer.name,
        passwordHash: freelancerPasswordHash,
        role: "freelancer",
        freelancerProfile: {
          create: {
            displayName: freelancer.profile.displayName,
            portfolioUrl: freelancer.profile.portfolioUrl,
            skills: freelancer.profile.skills,
            hourlyRate: freelancer.profile.hourlyRate,
            ratingAverage: freelancer.profile.ratingAverage
          }
        }
      }
    });
  }
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
