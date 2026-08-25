/// <reference types="node" />
import "dotenv/config";
import { connectDB, disconnectDB } from "../src/models";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set");
    process.exit(1);
  }

  try {
    await connectDB(uri);
    console.log("MongoDB connection successful");
    await disconnectDB();
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }
}

main();
