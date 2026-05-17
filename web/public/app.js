function addGenreRow() {
  const container = document.getElementById("genres-container");
  if (!container) return;

  const index = container.querySelectorAll(".genre-row").length;
  const row = document.createElement("div");
  row.className = "genre-row";
  row.innerHTML = `
    <input type="number" name="genres[${index}][genreId]" placeholder="ID">
    <input type="text" name="genres[${index}][name]" placeholder="Nombre del género">
    <button type="button" class="btn secondary" onclick="this.parentElement.remove()">Quitar</button>
  `;
  container.appendChild(row);
}

document.addEventListener("DOMContentLoaded", () => {
  const addBtn = document.getElementById("add-genre");
  if (addBtn) addBtn.addEventListener("click", addGenreRow);

  const movieSelect = document.getElementById("movieId");
  const genreSelect = document.getElementById("genreId");
  if (movieSelect && genreSelect) {
    const moviesData = document.getElementById("movies-json");
    if (moviesData) {
      const movies = JSON.parse(moviesData.textContent || "[]");
      function fillGenres() {
        const mid = Number(movieSelect.value);
        const movie = movies.find((m) => m._id === mid);
        const current = genreSelect.dataset.selected || "";
        genreSelect.innerHTML =
          '<option value="">— automático (primer género) —</option>';
        if (movie?.genres) {
          movie.genres.forEach((g) => {
            const opt = document.createElement("option");
            opt.value = g.genreId ?? "";
            opt.textContent = g.name || `Género ${g.genreId}`;
            if (String(opt.value) === String(current)) opt.selected = true;
            genreSelect.appendChild(opt);
          });
        }
      }

      movieSelect.addEventListener("change", () => {
        genreSelect.dataset.selected = "";
        fillGenres();
      });

      if (movieSelect.value) fillGenres();
    }
  }
});
