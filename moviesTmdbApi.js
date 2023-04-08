/*
 * Inspiration - https://github.com/chhoumann/quickadd/blob/master/docs/docs/Examples/Attachments/movies.js
 * The link above is for fetching the data from OMDB, but since I had a TMDb account, I created this version for TMDb
 * Original walkthrough here - https://minimal.guide/Guides/Create+a+movie+database
 * Source: https://github.com/merqrial/obsidian-scripts/blob/master/tmdb-movie-import-obsidian.js
 * Updated & Improved by Gregor Zobjak (Gregor-zbjk on GitHub)
 */

/*
 *
 */

const notice = (msg) => new Notice(msg, 5000);
const log = (msg) => console.log(msg);

const LANGUAGE = "de";

const API_KEY_OPTION = "TMDb API Key";
const TMDB_SEARCH_URL = "https://api.themoviedb.org/3/search/movie";
const TMDB_MOVIE_BASICS_URL = "https://api.themoviedb.org/3/movie/";
const TMDB_MOVIE_URL = "https://www.themoviedb.org/movie/";

const IMDB_BY_ID_URL = "https://www.imdb.com/title/"

const NUMBER_OF_ACTORS_TO_POPULATE = 15;

const POSTER_PATH = "https://image.tmdb.org/t/p/original";

// CommonJS export
module.exports = {
  entry: start,
  settings: {
    name: "TMDB Movie Import",
    original_author: "Christian B. B. Houmann",
    author: "gregor-zbjk",
    options: {
      [API_KEY_OPTION]: {
        type: "text",
        defaultValue: "",
        placeholder: "TMDb API Key",
      },
    },
  },
};

let QuickAdd;
let Settings;

async function start(params, settings) {
  QuickAdd = params;
  Settings = settings;

  // prompt for query
  const query = await QuickAdd.quickAddApi.inputPrompt(
    "Enter movie title: "
  );

  if (!query) {
    notice("No query entered.");
    throw new Error("No query entered.");
  }

  let movie;

// const for results via query
  const results = await getByQuery(query);

  // movie selection menu
  const choice = await QuickAdd.quickAddApi.suggester(
    results.map(formatTitleForSuggestion),
    results
  );

  if (!choice) {
    notice("No choice selected.");
    throw new Error("No choice selected.");
  }

  movie = await getMovieDetailsByTMDBId(choice.id);

// QuickAdd variables
  QuickAdd.variables = {
    ...movie,
    TMDBLink: `${TMDB_MOVIE_URL}${movie.id}`,
    IMDBLink: `${IMDB_BY_ID_URL}${movie.imdb_id}`,
    poster: `${POSTER_PATH}${movie.poster_path}`,
    actors: linkifyList(populateActors(movie.credits.cast)),
    characters: linkifyList(populateCharacters(movie.credits.cast)),
    genres: movie.genres.map((g) => g.name).join(", "),
    director: linkifyList(getListDirectors(movie.credits.crew)),
    cinemato: movie.credits.crew
      .filter((d) => d.job === "Director of Photography")
      .map((d) => d.name)
      .join(", "),
    fileName: `${replaceIllegalFileNameCharactersInString(
      movie.title
    )} (${new Date(movie.release_date).getFullYear()})`,
  };
}

function formatTitleForSuggestion(resultItem) {
  return `${resultItem.title} (${new Date(
    resultItem.release_date
  ).getFullYear()})`;
}

// API METHOD search movie
async function getByQuery(query) {
  const searchResults = await apiGet(TMDB_SEARCH_URL, {
    query,
  });

  console.log(searchResults);

  if (!searchResults.results || !searchResults.results.length) {
    notice("No results found.");
    throw new Error("No results found.");
  }

  return searchResults.results;
}

// API METHOD get details with TMDB ID
async function getMovieDetailsByTMDBId(id) {
  const res = await apiGet(`${TMDB_MOVIE_BASICS_URL}/${id}`, {
    append_to_response: "credits",
  });

  console.log(res)

  if (!res) {
    notice("No results found.");
    throw new Error("No results found.");
  }

  return res;
}

// -NUMBER TO POPULATE
function populateActors(actors) {
  return [...actors]
    .splice(0, Math.min(actors.length, NUMBER_OF_ACTORS_TO_POPULATE))
    .map((a) => a.name);
}

function populateCharacters(actors) {
  return [...actors]
    .splice(0, Math.min(actors.length, NUMBER_OF_ACTORS_TO_POPULATE))
    .map((a) => a.character);
}

// preprogress List
function getListDirectors(directors) {
  return [...directors]
    .filter((d) => d.job === "Director")
    .map((d) => d.name);
}

// Add [[Link]] to argument
function linkifyList(list) {
  if (list.length === 0) return "";
  if (list.length === 1) return `[[${list[0]}]]`;

  return list.map((item) => `[[${item.trim()}]]`).join(", ");
}

function replaceIllegalFileNameCharactersInString(string) {
  return string.replace(/[\\,#%&\{\}\/*<>?$\'\":@]*/g, "");
}

async function apiGet(url, data) {
  let finalURL = new URL(url);
  if (data)
    Object.keys(data).forEach((key) =>
      finalURL.searchParams.append(key, data[key])
    );

  finalURL.searchParams.append("api_key", Settings[API_KEY_OPTION]);

  const res = await request({
    url: finalURL.href,
    method: "GET",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
    },
  });

  return JSON.parse(res);
}
