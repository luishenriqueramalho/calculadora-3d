import "server-only";

import { Db, MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const databaseName = process.env.MONGODB_DB ?? "printlab3d";

declare global {
  var __printLabMongoClient: Promise<MongoClient> | undefined;
}

export function isMongoConfigured() {
  return Boolean(uri);
}

export async function getDatabase(): Promise<Db> {
  if (!uri) {
    throw new Error("MONGODB_URI não configurada.");
  }

  if (!global.__printLabMongoClient) {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });
    global.__printLabMongoClient = client.connect().catch((error) => {
      global.__printLabMongoClient = undefined;
      throw error;
    });
  }

  return (await global.__printLabMongoClient).db(databaseName);
}
