import { app } from "./app";
import { env } from "./lib/env";
import { prisma } from "./lib/prisma";
import { redis } from "./lib/redis";

const bootstrap = async () => {
  await prisma.$connect();

  if (!redis.isOpen) {
    await redis.connect();
  }

  const server = app.listen(env.API_PORT, () => {
    console.log(`API listening on ${env.API_URL}`);
  });

  const shutdown = async () => {
    server.close();
    await prisma.$disconnect();

    if (redis.isOpen) {
      await redis.quit();
    }
  };

  process.on("SIGINT", () => {
    void shutdown().finally(() => process.exit(0));
  });

  process.on("SIGTERM", () => {
    void shutdown().finally(() => process.exit(0));
  });
};

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});

