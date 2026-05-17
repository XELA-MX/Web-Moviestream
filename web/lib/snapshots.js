const { parseNumber } = require("./parsers");

async function buildActivitySnapshots(db, movieId, genreId = null) {
  const id = parseNumber(movieId) ?? movieId;
  const movie = await db.collection("movies").findOne({ _id: id });

  if (!movie) {
    return { movieSnapshot: null, genreSnapshot: null, movie: null };
  }

  const movieSnapshot = {
    title: movie.title ?? null,
    year: movie.year ?? null,
  };

  let genreSnapshot = null;
  const genres = Array.isArray(movie.genres) ? movie.genres : [];

  if (genreId !== null && genreId !== undefined && genreId !== "") {
    const gid = parseNumber(genreId);
    const match = genres.find((g) => g.genreId === gid);
    if (match) {
      genreSnapshot = { genreId: match.genreId, name: match.name };
    }
  }

  if (!genreSnapshot && genres.length > 0) {
    const first = genres[0];
    genreSnapshot = {
      genreId: first.genreId ?? null,
      name: first.name ?? null,
    };
  }

  return { movieSnapshot, genreSnapshot, movie };
}

module.exports = { buildActivitySnapshots };
