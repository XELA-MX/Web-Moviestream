require("dotenv").config();

const path = require("path");
const express = require("express");
const methodOverride = require("method-override");
const { getDb, closeDb } = require("./db");
const moviesRouter = require("./routes/movies");
const activitiesRouter = require("./routes/activities");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

app.use(async (req, res, next) => {
  try {
    res.locals.db = await getDb();
    res.locals.query = req.query;
    res.locals.filters = req.query;
    next();
  } catch (err) {
    next(err);
  }
});

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/", async (req, res, next) => {
  try {
    const db = res.locals.db;
    const [moviesCount, activitiesCount, customersCount] = await Promise.all([
      db.collection("movies").countDocuments(),
      db.collection("activities").countDocuments(),
      db.collection("customers").countDocuments(),
    ]);
    res.render("index", { moviesCount, activitiesCount, customersCount });
  } catch (err) {
    next(err);
  }
});

app.use("/movies", moviesRouter);
app.use("/activities", activitiesRouter);

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).render("error", {
    title: "Error",
    message: err.message || "Error interno del servidor",
  });
});

const HOST = process.env.HOST || "0.0.0.0";

const server = app.listen(PORT, HOST, () => {
  console.log(`MovieStream web en http://${HOST}:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `Puerto ${PORT} en uso. Cierra el otro proceso (p. ej. lsof -ti :${PORT} | xargs kill) o usa PORT=3001 en web/.env`
    );
    process.exit(1);
  }
  throw err;
});

process.on("SIGINT", async () => {
  await closeDb();
  server.close(() => process.exit(0));
});
