import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import { connectDB } from "./lib/prisma";
import { createSocketServer } from "./lib/socket";
import { startAutoRejectOrdersJob } from "./jobs/autoRejectOrders";

import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";
import societyRoutes from "./routes/societies";
import businessRoutes from "./routes/businesses";
import productRoutes from "./routes/products";
import orderRoutes from "./routes/orders";
import userRoutes from "./routes/users";
import ownerRoutes from "./routes/owner";
import deliveryRoutes from "./routes/delivery";
import reviewRoutes from "./routes/reviews";
import couponRoutes from "./routes/coupons";
import refundRoutes from "./routes/refunds";
import adsRoutes from "./routes/ads";
import chatRoutes from "./routes/chat";
import otpRoutes from "./routes/otp";
import uploadRoutes from "./routes/upload";

const app = express();
const server = http.createServer(app);

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json({ limit: "10mb" }));

app.use("/auth", authRoutes);
app.use("/chat", chatRoutes);
app.use("/admin", adminRoutes);
app.use("/societies", societyRoutes);
app.use("/businesses", businessRoutes);
app.use("/products", productRoutes);
app.use("/orders", orderRoutes);
app.use("/users", userRoutes);
app.use("/owner", ownerRoutes);
app.use("/delivery", deliveryRoutes);
app.use("/reviews", reviewRoutes);
app.use("/coupons", couponRoutes);
app.use("/refunds", refundRoutes);
app.use("/ads", adsRoutes);
app.use("/otp", otpRoutes);
app.use("/upload", uploadRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Feature flags + platform config endpoint (reads from DB, managed via admin portal)
app.get("/feature-flags", async (_req, res) => {
  try {
    const { getPlatformConfig } = await import("./models/index");
    const config = await getPlatformConfig();
    res.json({
      success: true,
      data: {
        adsEnabled: config.adsEnabled,
        adsNativeFeedEnabled: config.adsNativeFeedEnabled,
        adsNativeListingEnabled: config.adsNativeListingEnabled,
        adsRewardedEnabled: config.adsRewardedEnabled,
        adsRewardedMinRs: config.adsRewardedMinRs,
        adsRewardedMaxRs: config.adsRewardedMaxRs,
        adsDensityEveryNthCard: config.adsDensityEveryNthCard,
        adsRewardedMaxClaimsPerDay: config.adsRewardedMaxClaimsPerDay,
        platformFeeAmount: config.platformFeeAmount,
        minimumOrderAmount: config.minimumOrderAmount,
        homeBannersEnabled: config.homeBannersEnabled,
      },
    });
  } catch (err) {
    console.error("feature-flags error:", err);
    res.json({
      success: true,
      data: {
        adsEnabled: false,
        adsNativeFeedEnabled: false,
        adsNativeListingEnabled: false,
        adsRewardedEnabled: false,
        homeBannersEnabled: true,
        adsRewardedMinRs: 2,
        adsRewardedMaxRs: 5,
        adsDensityEveryNthCard: 4,
        adsRewardedMaxClaimsPerDay: 1,
        platformFeeAmount: 2,
        minimumOrderAmount: 50,
      },
    });
  }
});

const PORT = Number(process.env.PORT) || 5001;

async function main() {
  await connectDB();
  createSocketServer(server);
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`mohallaMitr backend listening on 0.0.0.0:${PORT}`);
    startAutoRejectOrdersJob();
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
