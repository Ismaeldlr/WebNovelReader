# Webnovel Hub Scraper

Standalone Python worker for URL imports. It runs beside the Node server and communicates only through the shared PostgreSQL `scrape_jobs` table.

## Setup

```powershell
cd scraper
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
playwright install chromium
```

Copy `.env.example` to `.env` or reuse the server `.env`. The worker loads the project root `.env`, `server/.env`, and then `scraper/.env`. By default it builds the connection URL from `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`, matching the Node server.

Use `SCRAPER_DATABASE_URL` only when the scraper needs a different database connection string.

Set `COVERS_DIR` to the absolute path of `server/public/covers` if your layout differs from the default.

## Run

```powershell
cd scraper
.\.venv\Scripts\python.exe main.py
```

On Windows, you can also run the helper from the project root:

```powershell
.\scraper\run.ps1
```

The worker claims pending `novel_ingestion` jobs, scrapes metadata and chapter lists, inserts the novel and chapter metadata, and marks the job completed or failed.

The Node API starts this worker automatically when the server starts or when the
first URL import is submitted. Set `SCRAPER_AUTOSTART=false` when the worker is
managed separately by a service supervisor. `SCRAPER_PYTHON` can be set to an
explicit Python executable when the virtualenv is not at `scraper/.venv`.

## Notes

- The Node server never calls this worker. URL imports are queued in `scrape_jobs`.
- Initial ingestion stores chapter metadata only. Chapter content fetching is left for a later `chapter_fetch` job type.
- `HEADLESS=false` is useful for local selector debugging; keep it headless for normal runs.
- Site selectors live in each site's `selectors.py` file so redesign fixes stay localized.
