import mongoose from "mongoose";
import { models } from "../models";

type PrismaWhere = Record<string, any>;

/**
 * Flatten Prisma-style nested `create` operators into the raw subdocument/array
 * form Mongoose expects. This keeps callers using standard Prisma syntax
 * (e.g. `items: { create: [...] }`) without leaking the proxy implementation.
 */
function isPlainObject(value: unknown): value is Record<string, any> {
  if (value == null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function normalizePrismaData(data: any): any {
  if (data == null || typeof data !== "object") return data;
  if (Array.isArray(data)) return data.map(normalizePrismaData);
  // Preserve Date, ObjectId, Buffer, and other non-plain objects as-is.
  if (!isPlainObject(data)) return data;

  const result: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (isPlainObject(value) && "create" in value) {
      // Prisma nested create: unwrap the payload, recursively normalize it.
      result[key] = normalizePrismaData(value.create);
    } else {
      result[key] = normalizePrismaData(value);
    }
  }
  return result;
}
type PrismaArgs = {
  where?: PrismaWhere;
  data?: any;
  create?: any;
  update?: any;
  orderBy?: any;
  take?: number;
  skip?: number;
  include?: any;
  select?: Record<string, boolean>;
};

const modelNameMap: Record<string, keyof typeof models> = {
  society: "Society",
  user: "User",
  refreshToken: "RefreshToken",
  passwordResetToken: "PasswordResetToken",
  business: "Business",
  product: "Product",
  order: "Order",
  coupon: "Coupon",
  refund: "Refund",
  review: "Review",
  notification: "Notification",
  homeBanner: "HomeBanner",
  chatSession: "ChatSession",
  message: "Message",
  adRewardClaim: "AdRewardClaim",
  suspensionHistory: "SuspensionHistory",
};

function translateOperator(key: string, value: any): any {
  switch (key) {
    case "in":
      return { $in: value };
    case "notIn":
      return { $nin: value };
    case "equals":
      return value;
    case "not":
      if (value && typeof value === "object") return translateWhere({ NOT: value });
      return { $ne: value };
    case "gt":
      return { $gt: value };
    case "gte":
      return { $gte: value };
    case "lt":
      return { $lt: value };
    case "lte":
      return { $lte: value };
    case "contains":
      return { $regex: value, $options: "i" };
    case "startsWith":
      return { $regex: `^${value}`, $options: "i" };
    case "endsWith":
      return { $regex: `${value}$`, $options: "i" };
    default:
      return value;
  }
}

export function translateWhere(where: PrismaWhere | undefined): any {
  if (!where || Object.keys(where).length === 0) return {};

  const result: any = {};
  for (const [key, value] of Object.entries(where)) {
    if (key === "OR") {
      result.$or = value.map((clause: any) => translateWhere(clause));
    } else if (key === "AND") {
      result.$and = value.map((clause: any) => translateWhere(clause));
    } else if (key === "NOT") {
      if (typeof value === "object" && !Array.isArray(value)) {
        const translated = translateWhere(value);
        Object.assign(result, Object.fromEntries(Object.entries(translated).map(([k, v]) => [k, invertOperator(k, v)])));
      } else {
        result.$nor = [value];
      }
    } else if (key === "id") {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const operatorKeys = Object.keys(value);
        if (operatorKeys.some((op) => ["in", "notIn", "equals", "not", "gt", "gte", "lt", "lte"].includes(op))) {
          const op = operatorKeys[0];
          result._id = translateOperator(op, value[op]);
        } else {
          result._id = value;
        }
      } else {
        result._id = value;
      }
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      const operatorKeys = Object.keys(value);
      if (operatorKeys.some((op) => ["in", "notIn", "equals", "not", "gt", "gte", "lt", "lte", "contains", "startsWith", "endsWith"].includes(op))) {
        const op = operatorKeys[0];
        result[key] = translateOperator(op, value[op]);
      } else {
        result[key] = translateWhere(value);
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

function invertOperator(key: string, value: any): any {
  if (key === "$in") return { $nin: value };
  if (key === "$nin") return { $in: value };
  if (key === "$gt") return { $lte: value };
  if (key === "$gte") return { $lt: value };
  if (key === "$lt") return { $gte: value };
  if (key === "$lte") return { $gt: value };
  return { $ne: value };
}

function translateOrder(orderBy: any): any {
  if (!orderBy) return undefined;
  if (Array.isArray(orderBy)) {
    const sort: any = {};
    for (const clause of orderBy) {
      Object.assign(sort, translateOrder(clause));
    }
    return sort;
  }
  const sort: any = {};
  for (const [key, value] of Object.entries(orderBy)) {
    sort[key] = value === "asc" ? 1 : -1;
  }
  return sort;
}

function translateSelect(select: Record<string, boolean>): string {
  return Object.entries(select)
    .filter(([_, include]) => include)
    .map(([key]) => (key === "id" ? "_id" : key))
    .join(" ");
}

function buildBaseQuery(Model: mongoose.Model<any>, args: PrismaArgs, session?: mongoose.ClientSession) {
  let query = Model.find(translateWhere(args.where));
  if (session) query = query.session(session);

  const sort = translateOrder(args.orderBy);
  if (sort) query = query.sort(sort);
  if (args.take) query = query.limit(args.take);
  if (args.skip) query = query.skip(args.skip);
  if (args.select) query = query.select(translateSelect(args.select));

  return query;
}

function addId(doc: any): any {
  if (!doc) return null;
  if (doc._id && !doc.id) {
    doc.id = doc._id.toString();
  }
  return doc;
}

async function leanOne(doc: any): Promise<any> {
  return addId(doc);
}

function createModelProxy(Model: mongoose.Model<any>, session?: mongoose.ClientSession) {
  return {
    async findUnique(args: PrismaArgs): Promise<any | null> {
      const keys = Object.keys(args.where || {});
      let query;
      if (keys.length === 1 && keys[0] === "id") {
        query = Model.findById(args.where!.id);
      } else {
        query = Model.findOne(translateWhere(args.where));
      }
      if (session) query = query.session(session);
      if (args.select) query = query.select(translateSelect(args.select));
      return leanOne(await query.lean().exec());
    },

    async findFirst(args: PrismaArgs): Promise<any | null> {
      const query = buildBaseQuery(Model, { ...args, take: 1 }, session);
      const docs = await query.lean().exec();
      return leanOne(docs?.[0] ?? null);
    },

    async findMany(args: PrismaArgs): Promise<any[]> {
      const query = buildBaseQuery(Model, args, session);
      const docs = await query.lean().exec();
      return (docs || []).map(addId);
    },

    async create(args: PrismaArgs): Promise<any> {
      const normalizedData = normalizePrismaData(args.data);
      const created = new Model(normalizedData);
      if (session) {
        const saved = await created.save({ session });
        return saved.toObject({ virtuals: true });
      }
      const saved = await created.save();
      return saved.toObject({ virtuals: true });
    },

    async update(args: PrismaArgs): Promise<any | null> {
      const normalizedData = normalizePrismaData(args.data);
      const keys = Object.keys(args.where || {});
      let updateQuery;
      if (keys.length === 1 && keys[0] === "id") {
        updateQuery = Model.findByIdAndUpdate(args.where!.id, normalizedData, { new: true, runValidators: true });
      } else {
        updateQuery = Model.findOneAndUpdate(translateWhere(args.where), normalizedData, { new: true, runValidators: true });
      }
      if (session) updateQuery = updateQuery.session(session);
      return leanOne(await updateQuery.lean().exec());
    },

    async upsert(args: PrismaArgs): Promise<any | null> {
      const filter = translateWhere(args.where);
      const doc = { ...(args.update || {}), ...(args.create || {}) };
      let upsertQuery = Model.findOneAndUpdate(filter, doc, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true });
      if (session) upsertQuery = upsertQuery.session(session);
      return leanOne(await upsertQuery.lean().exec());
    },

    async delete(args: PrismaArgs): Promise<any | null> {
      const keys = Object.keys(args.where || {});
      let deleteQuery;
      if (keys.length === 1 && keys[0] === "id") {
        deleteQuery = Model.findByIdAndDelete(args.where!.id);
      } else {
        deleteQuery = Model.findOneAndDelete(translateWhere(args.where));
      }
      if (session) deleteQuery = deleteQuery.session(session);
      return leanOne(await deleteQuery.lean().exec());
    },

    async count(args: PrismaArgs = {}): Promise<number> {
      const query = Model.countDocuments(translateWhere(args.where));
      if (session) return query.session(session).exec();
      return query.exec();
    },

    async updateMany(args: PrismaArgs): Promise<{ count: number }> {
      const res = await Model.updateMany(translateWhere(args.where), args.data, { session });
      return { count: res.modifiedCount };
    },

    async deleteMany(args: PrismaArgs): Promise<{ count: number }> {
      const res = await Model.deleteMany(translateWhere(args.where), { session });
      return { count: res.deletedCount };
    },

    async createMany(args: PrismaArgs): Promise<{ count: number }> {
      const res = await Model.insertMany(args.data, { session });
      return { count: res.length };
    },
  };
}

// ---------------------------------------------------------------------------
// Address subdocument proxy — addresses live as an embedded array on User.
// This proxy provides prisma-style CRUD semantics over User.addresses[].
// ---------------------------------------------------------------------------
function createAddressProxy(session?: mongoose.ClientSession) {
  const User = models.User as mongoose.Model<any>;

  return {
    async findMany(args: PrismaArgs): Promise<any[]> {
      const where = args.where || {};
      const user = await User.findById(where.userId).session(session ?? null).lean().exec();
      if (!user) return [];
      let addresses: any[] = (user.addresses || []).map((a: any) => ({
        ...a,
        id: a._id?.toString(),
        userId: user._id.toString(),
      }));
      // Sort by isDefault desc, createdAt desc by default
      addresses.sort((a: any, b: any) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
      return addresses;
    },

    async findFirst(args: PrismaArgs): Promise<any | null> {
      const where = args.where || {};
      const userId = where.userId;
      const addressId = where.id;
      if (!userId) return null;
      const user = await User.findById(userId).session(session ?? null).lean().exec();
      if (!user) return null;
      const match = (user.addresses || []).find(
        (a: any) => a._id?.toString() === addressId
      );
      if (!match) return null;
      return { ...match, id: match._id?.toString(), userId: user._id.toString() };
    },

    async findUnique(args: PrismaArgs): Promise<any | null> {
      return this.findFirst(args);
    },

    async create(args: PrismaArgs): Promise<any> {
      const data = args.data || {};
      const userId = data.userId;
      const userDoc = await User.findById(userId).session(session ?? null).exec();
      if (!userDoc) throw new Error("User not found");
      const { userId: _u, ...addrData } = data;
      userDoc.addresses.push(addrData);
      await userDoc.save({ session: session ?? undefined });
      const created = userDoc.addresses[userDoc.addresses.length - 1];
      return { ...created.toObject(), id: created._id.toString(), userId };
    },

    async update(args: PrismaArgs): Promise<any | null> {
      const where = args.where || {};
      const addressId = where.id;
      const updateData = args.data || {};
      // Need to find which user owns this address
      const user = await User.findOne({ "addresses._id": addressId }).session(session ?? null).exec();
      if (!user) return null;
      const addr = user.addresses.id(addressId);
      if (!addr) return null;
      Object.assign(addr, updateData);
      await user.save({ session: session ?? undefined });
      return { ...addr.toObject(), id: addr._id.toString(), userId: user._id.toString() };
    },

    async updateMany(args: PrismaArgs): Promise<{ count: number }> {
      const where = args.where || {};
      const userId = where.userId;
      const updateData = args.data || {};
      const excludeId = where.id?.not ?? where.id?.$ne;
      if (!userId) return { count: 0 };
      const user = await User.findById(userId).session(session ?? null).exec();
      if (!user) return { count: 0 };
      let count = 0;
      for (const addr of user.addresses) {
        if (excludeId && addr._id.toString() === excludeId) continue;
        Object.assign(addr, updateData);
        count++;
      }
      if (count > 0) await user.save({ session: session ?? undefined });
      return { count };
    },

    async delete(args: PrismaArgs): Promise<any | null> {
      const where = args.where || {};
      const addressId = where.id;
      const user = await User.findOne({ "addresses._id": addressId }).session(session ?? null).exec();
      if (!user) return null;
      const addr = user.addresses.id(addressId);
      if (!addr) return null;
      const result = { ...addr.toObject(), id: addr._id.toString(), userId: user._id.toString() };
      addr.deleteOne();
      await user.save({ session: session ?? undefined });
      return result;
    },

    async count(args: PrismaArgs = {}): Promise<number> {
      const where = args.where || {};
      const userId = where.userId;
      if (!userId) return 0;
      const user = await User.findById(userId).session(session ?? null).lean().exec();
      return user?.addresses?.length || 0;
    },
  };
}

function createPrismaProxy(session?: mongoose.ClientSession): any {
  return new Proxy({} as any, {
    get(_target, prop: string) {
      if (prop === "$transaction") {
        return async (input: ((tx: any) => Promise<any>) | Promise<any>[]) => {
          const mongooseSession = await mongoose.startSession();
          mongooseSession.startTransaction();
          try {
            if (Array.isArray(input)) {
              const txProxy = createPrismaProxy(mongooseSession);
              const results: any[] = [];
              for (const operation of input) {
                results.push(await operation);
              }
              await mongooseSession.commitTransaction();
              return results;
            }
            const txProxy = createPrismaProxy(mongooseSession);
            const result = await input(txProxy);
            await mongooseSession.commitTransaction();
            return result;
          } catch (err) {
            await mongooseSession.abortTransaction();
            throw err;
          } finally {
            mongooseSession.endSession();
          }
        };
      }

      if (prop === "address") {
        return createAddressProxy(session);
      }

      const modelName = modelNameMap[prop];
      if (modelName) {
        return createModelProxy(models[modelName] as mongoose.Model<any>, session);
      }
      return undefined;
    },
  });
}

export const prisma = createPrismaProxy();
