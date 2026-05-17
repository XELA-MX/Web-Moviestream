function parseOptionalJson(value, fallback = null) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "object") {
    return value;
  }

  const trimmed = String(value).trim();
  if (trimmed === "") {
    return fallback;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return fallback;
  }
}

function parseNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function parseGenres(body) {
  const raw = body.genres;
  if (!raw) return [];

  const items = Array.isArray(raw) ? raw : Object.values(raw);
  return items
    .map((item) => ({
      genreId: parseNumber(item?.genreId),
      name: item?.name?.trim() || null,
    }))
    .filter((g) => g.name || g.genreId !== null);
}

function movieFromBody(body, existingId = null) {
  const doc = {
    sku: body.sku?.trim() || null,
    title: body.title?.trim() || null,
    year: parseNumber(body.year),
    runtime: body.runtime?.trim() || null,
    summary: body.summary?.trim() || null,
    mainSubject: body.mainSubject?.trim() || null,
    openingDate: body.openingDate?.trim() || null,
    imageUrl: body.imageUrl?.trim() || null,
    wikiArticle: body.wikiArticle?.trim() || null,
    listPrice: parseNumber(body.listPrice),
    views: parseNumber(body.views),
    budget: body.budget?.trim() || null,
    gross: body.gross?.trim() || null,
    genres: parseGenres(body),
    cast: parseOptionalJson(body.cast, []),
    crew: parseOptionalJson(body.crew, null),
    studio: parseOptionalJson(body.studio, null),
    awards: parseOptionalJson(body.awards, []),
    nominations: parseOptionalJson(body.nominations, []),
  };

  if (existingId !== null) {
    doc._id = existingId;
  } else if (body._id !== undefined && body._id !== "") {
    doc._id = parseNumber(body._id);
  }

  return doc;
}

module.exports = {
  parseOptionalJson,
  parseNumber,
  parseGenres,
  movieFromBody,
};
