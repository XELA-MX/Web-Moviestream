const express = require("express");
const { parseNumber } = require("../lib/parsers");
const { buildActivitySnapshots } = require("../lib/snapshots");

const router = express.Router();

function buildActivityFilter(query) {
  const filter = {};

  if (query.customerId) {
    const cid = parseNumber(query.customerId);
    filter.customerId = cid !== null ? cid : query.customerId;
  }

  if (query.movieId) {
    const mid = parseNumber(query.movieId);
    filter.movieId = mid !== null ? mid : query.movieId;
  }

  if (query.activity) {
    filter.activity = { $regex: query.activity.trim(), $options: "i" };
  }

  if (query.from || query.to) {
    filter.activityTime = {};
    if (query.from) filter.activityTime.$gte = new Date(query.from);
    if (query.to) filter.activityTime.$lte = new Date(query.to);
  }

  return filter;
}

async function loadFormOptions(db) {
  const [customers, movies] = await Promise.all([
    db
      .collection("customers")
      .find({}, { projection: { _id: 1, firstName: 1, lastName: 1, email: 1 } })
      .sort({ lastName: 1, firstName: 1 })
      .limit(500)
      .toArray(),
    db
      .collection("movies")
      .find({}, { projection: { _id: 1, title: 1, year: 1, genres: 1 } })
      .sort({ title: 1 })
      .limit(500)
      .toArray(),
  ]);
  return { customers, movies };
}

function activityFromBody(body) {
  const customerId = parseNumber(body.customerId);
  const movieId = parseNumber(body.movieId);

  return {
    customerId,
    movieId,
    genreId: parseNumber(body.genreId),
    activity: body.activity?.trim() || null,
    activityTime: body.activityTime
      ? new Date(body.activityTime)
      : new Date(),
    device: {
      name: body.deviceName?.trim() || null,
      type: body.deviceType?.trim() || null,
    },
    app: body.app?.trim() || null,
    os: body.os?.trim() || null,
  };
}

router.get("/", async (req, res, next) => {
  try {
    const db = res.locals.db;
    const limit = Math.min(parseNumber(req.query.limit) || 50, 100);
    const skip = parseNumber(req.query.skip) || 0;
    const filter = buildActivityFilter(req.query);

    const collection = db.collection("activities");
    const [activities, total] = await Promise.all([
      collection
        .find(filter)
        .sort({ activityTime: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter),
    ]);

    res.render("activities/list", {
      title: "Actividades",
      activities,
      total,
      limit,
      skip,
      filters: req.query,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/new", async (req, res, next) => {
  try {
    const { customers, movies } = await loadFormOptions(res.locals.db);
    res.render("activities/form", {
      title: "Nueva actividad",
      activity: {},
      customers,
      movies,
      action: "/activities",
      method: "POST",
    });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const db = res.locals.db;
    const base = activityFromBody(req.body);

    if (base.customerId === null || base.movieId === null) {
      const { customers, movies } = await loadFormOptions(db);
      return res.status(400).render("activities/form", {
        title: "Nueva actividad",
        activity: base,
        customers,
        movies,
        action: "/activities",
        method: "POST",
        error: "Cliente y película son obligatorios",
      });
    }

    const [customer, { movieSnapshot, genreSnapshot }] = await Promise.all([
      db.collection("customers").findOne({ _id: base.customerId }),
      buildActivitySnapshots(db, base.movieId, base.genreId),
    ]);

    if (!customer) {
      const { customers, movies } = await loadFormOptions(db);
      return res.status(400).render("activities/form", {
        title: "Nueva actividad",
        activity: base,
        customers,
        movies,
        action: "/activities",
        method: "POST",
        error: "Cliente no encontrado",
      });
    }

    if (!movieSnapshot) {
      const { customers, movies } = await loadFormOptions(db);
      return res.status(400).render("activities/form", {
        title: "Nueva actividad",
        activity: base,
        customers,
        movies,
        action: "/activities",
        method: "POST",
        error: "Película no encontrada",
      });
    }

    const doc = {
      _id: `activity_${Date.now()}`,
      ...base,
      movieSnapshot,
      genreSnapshot,
    };

    await db.collection("activities").insertOne(doc);
    res.redirect(`/activities/${encodeURIComponent(doc._id)}?ok=created`);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const db = res.locals.db;
    const id = req.params.id;
    const activity = await db.collection("activities").findOne({ _id: id });

    if (!activity) {
      return res.status(404).render("error", {
        title: "No encontrada",
        message: "Actividad no encontrada",
      });
    }

    const [customer, movie] = await Promise.all([
      activity.customerId != null
        ? db.collection("customers").findOne({ _id: activity.customerId })
        : null,
      activity.movieId != null
        ? db.collection("movies").findOne({ _id: activity.movieId })
        : null,
    ]);

    res.render("activities/detail", {
      title: `Actividad ${id}`,
      activity,
      customer,
      movie,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/edit", async (req, res, next) => {
  try {
    const db = res.locals.db;
    const id = req.params.id;
    const activity = await db.collection("activities").findOne({ _id: id });

    if (!activity) {
      return res.status(404).render("error", {
        title: "No encontrada",
        message: "Actividad no encontrada",
      });
    }

    const { customers, movies } = await loadFormOptions(db);
    res.render("activities/form", {
      title: `Editar actividad`,
      activity,
      customers,
      movies,
      action: `/activities/${encodeURIComponent(id)}`,
      method: "PUT",
    });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const db = res.locals.db;
    const id = req.params.id;
    const existing = await db.collection("activities").findOne({ _id: id });

    if (!existing) {
      return res.status(404).render("error", {
        title: "No encontrada",
        message: "Actividad no encontrada",
      });
    }

    const base = activityFromBody(req.body);

    if (base.customerId === null || base.movieId === null) {
      const { customers, movies } = await loadFormOptions(db);
      return res.status(400).render("activities/form", {
        title: "Editar actividad",
        activity: { ...existing, ...base },
        customers,
        movies,
        action: `/activities/${encodeURIComponent(id)}`,
        method: "PUT",
        error: "Cliente y película son obligatorios",
      });
    }

    const { movieSnapshot, genreSnapshot } = await buildActivitySnapshots(
      db,
      base.movieId,
      base.genreId
    );

    const update = {
      ...base,
      movieSnapshot,
      genreSnapshot,
    };

    await db.collection("activities").updateOne({ _id: id }, { $set: update });
    res.redirect(`/activities/${encodeURIComponent(id)}?ok=updated`);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const db = res.locals.db;
    await db.collection("activities").deleteOne({ _id: req.params.id });
    res.redirect("/activities?ok=deleted");
  } catch (err) {
    next(err);
  }
});

module.exports = router;
