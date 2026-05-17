const { MongoClient } = require("mongodb");

let client;
let db;

async function connect() {
  if (db) return db;

  const uri = process.env.MONGO_URI;
  const dbName = process.env.MONGO_DB_NAME || "moviestream";

  if (!uri) {
    throw new Error("MONGO_URI no está definida en web/.env");
  }

  const options = {};
  if (process.env.MONGO_TLS === "true") {
    options.tls = true;
  }

  client = new MongoClient(uri, options);
  await client.connect();
  db = client.db(dbName);
  return db;
}

async function getDb() {
  return connect();
}

async function closeDb() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

module.exports = { getDb, closeDb };
