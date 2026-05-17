const express = require("express");
const { movieFromBody, parseNumber } = require("../lib/parsers");

const router = express.Router();

function parseMovieId(param) {
  const num = parseNumber(param);
  return num !== null ? num : param;
}

function buildMovieFilter(query) {
  const filter = {};

  if (query.q) {
    filter.title = { $regex: query.q.trim(), $options: "i" };
  }

  if (query.genre) {
    filter["genres.name"] = { $regex: query.genre.trim(), $options: "i" };
  }

  if (query.year) {
    const year = parseNumber(query.year);
    if (year !== null) filter.year = year;
  }

  return filter;
}

router.get("/", async (req, res, next) => {
  try {
    const db = res.locals.db;
    const limit = Math.min(parseNumber(req.query.limit) || 50, 100);
    const skip = parseNumber(req.query.skip) || 0;
    const filter = buildMovieFilter(req.query);

    const collection = db.collection("movies");
    const [movies, total] = await Promise.all([
      collection
        .find(filter)
        .sort({ title: 1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter),
    ]);

    res.render("movies/list", {
      title: "Películas",
      movies,
      total,
      limit,
      skip,
      filters: req.query,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/new", async (req, res) => {
  res.render("movies/form", {
    title: "Nueva película",
    movie: { genres: [{ genreId: "", name: "" }] },
    action: "/movies",
    method: "POST",
  });
});

router.post("/", async (req, res, next) => {
  try {
    const db = res.locals.db;
    const doc = movieFromBody(req.body);

    if (!doc.title) {
      return res.status(400).render("movies/form", {
        title: "Nueva película",
        movie: doc,
        action: "/movies",
        method: "POST",
        error: "El título es obligatorio",
      });
    }

    if (doc._id === undefined || doc._id === null) {
      const max = await db
        .collection("movies")
        .find()
        .sort({ _id: -1 })
        .limit(1)
        .toArray();
      doc._id = (max[0]?._id ?? 0) + 1;
    }

    const existing = await db.collection("movies").findOne({ _id: doc._id });
    if (existing) {
      return res.status(400).render("movies/form", {
        title: "Nueva película",
        movie: doc,
        action: "/movies",
        method: "POST",
        error: `Ya existe una película con _id ${doc._id}`,
      });
    }

    doc.createdAt = doc.createdAt || new Date();
    await db.collection("movies").insertOne(doc);
    res.redirect(`/movies/${doc._id}?ok=created`);
  } catch (err) {
    next(err);
  }
});

router.get("/:id/delete", async (req, res, next) => {
  try {
    const db = res.locals.db;
    const id = parseMovieId(req.params.id);
    const movie = await db.collection("movies").findOne({ _id: id });

    if (!movie) {
      return res.status(404).render("error", {
        title: "No encontrada",
        message: "Película no encontrada",
      });
    }

    const activityCount = await db
      .collection("activities")
      .countDocuments({ movieId: id });

    res.render("movies/delete", {
      title: "Eliminar película",
      movie,
      activityCount,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const db = res.locals.db;
    const id = parseMovieId(req.params.id);
    const movie = await db.collection("movies").findOne({ _id: id });

    if (!movie) {
      return res.status(404).render("error", {
        title: "No encontrada",
        message: "Película no encontrada",
      });
    }

    const activityCount = await db
      .collection("activities")
      .countDocuments({ movieId: id });

    res.render("movies/detail", {
      title: movie.title || `Película ${id}`,
      movie,
      activityCount,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/edit", async (req, res, next) => {
  try {
    const db = res.locals.db;
    const id = parseMovieId(req.params.id);
    const movie = await db.collection("movies").findOne({ _id: id });

    if (!movie) {
      return res.status(404).render("error", {
        title: "No encontrada",
        message: "Película no encontrada",
      });
    }

    if (!movie.genres?.length) {
      movie.genres = [{ genreId: "", name: "" }];
    }

    res.render("movies/form", {
      title: `Editar: ${movie.title}`,
      movie,
      action: `/movies/${id}`,
      method: "PUT",
    });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const db = res.locals.db;
    const id = parseMovieId(req.params.id);
    const doc = movieFromBody(req.body, id);

    if (!doc.title) {
      const movie = await db.collection("movies").findOne({ _id: id });
      return res.status(400).render("movies/form", {
        title: "Editar película",
        movie: { ...movie, ...doc },
        action: `/movies/${id}`,
        method: "PUT",
        error: "El título es obligatorio",
      });
    }

    const { _id, ...update } = doc;
    await db.collection("movies").updateOne({ _id: id }, { $set: update });
    res.redirect(`/movies/${id}?ok=updated`);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const db = res.locals.db;
    const id = parseMovieId(req.params.id);
    const force = req.query.force === "1";

    const activityCount = await db
      .collection("activities")
      .countDocuments({ movieId: id });

    if (activityCount > 0 && !force) {
      return res.redirect(`/movies/${id}/delete?error=has_activities`);
    }

    await db.collection("movies").deleteOne({ _id: id });
    res.redirect(`/movies?ok=deleted&orphaned=${activityCount}`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
