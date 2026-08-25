import { connectDB, models } from "../models";
import { prisma as prismaProxy } from "./prismaProxy";

/**
 * Backwards-compatible entrypoint: previously exported the Prisma client.
 * Now exports the Mongoose connection helper + a Prisma-compatible proxy over
 * Mongoose so that existing route/service code continues to work with minimal
 * changes while we migrated the database layer from Postgres to MongoDB Atlas.
 */
export { connectDB, models };
export const prisma = prismaProxy;
