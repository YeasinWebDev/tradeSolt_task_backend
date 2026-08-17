import "dotenv/config";
import app from "./app";
import { prisma } from "./lib/prisma";

const PORT = Number(process.env.PORT) || 3000;

const startServer = async (): Promise<void> => {
  try {
    // Verify database connection before starting
    await prisma.$connect();
    console.log("✅ Database connected successfully");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV ?? "development"}`);
      console.log(`🔍 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal: string): Promise<void> => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  await prisma.$disconnect();
  console.log("🔌 Database disconnected");
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled Promise Rejection:", reason);
  process.exit(1);
});

startServer();
