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

// Feature flags endpoint (replaces Firebase Remote Config)
app.get("/feature-flags", (_req, res) => {
  res.json({
    success: true,
    data: {
      adsEnabled: process.env.FF_ADS_ENABLED === "true",
      adsNativeFeedEnabled: process.env.FF_ADS_NATIVE_FEED_ENABLED === "true",
      adsNativeListingEnabled: process.env.FF_ADS_NATIVE_LISTING_ENABLED === "true",
      adsRewardedEnabled: process.env.FF_ADS_REWARDED_ENABLED === "true",
      adsRewardedMinRs: Number(process.env.FF_ADS_REWARDED_MIN_RS) || 2,
      adsRewardedMaxRs: Number(process.env.FF_ADS_REWARDED_MAX_RS) || 5,
      adsDensityEveryNthCard: Number(process.env.FF_ADS_DENSITY_EVERY_NTH_CARD) || 4,
      adsRewardedMaxClaimsPerDay: Number(process.env.FF_ADS_REWARDED_MAX_CLAIMS_PER_DAY) || 1,
    },
  });
});

const PORT = Number(process.env.PORT) || 5001;

async function main() {
  await connectDB();
  createSocketServer(server);
  server.listen(PORT, () => {
    console.log(`mohallaMitr backend listening on port ${PORT}`);
    startAutoRejectOrdersJob();
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
