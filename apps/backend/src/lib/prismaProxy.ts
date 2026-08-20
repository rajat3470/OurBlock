import mongoose from "mongoose";
import { models } from "../models";

type PrismaWhere = Record<string, any>;
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
      result._id = value;
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
      const created = new Model(args.data);
      if (session) {
        const saved = await created.save({ session });
        return saved.toObject({ virtuals: true });
      }
      const saved = await created.save();
      return saved.toObject({ virtuals: true });
    },

    async update(args: PrismaArgs): Promise<any | null> {
      const keys = Object.keys(args.where || {});
      let updateQuery;
      if (keys.length === 1 && keys[0] === "id") {
        updateQuery = Model.findByIdAndUpdate(args.where!.id, args.data, { new: true, runValidators: true });
      } else {
        updateQuery = Model.findOneAndUpdate(translateWhere(args.where), args.data, { new: true, runValidators: true });
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

      const modelName = modelNameMap[prop];
      if (modelName) {
        return createModelProxy(models[modelName] as mongoose.Model<any>, session);
      }
      return undefined;
    },
  });
}

export const prisma = createPrismaProxy();
