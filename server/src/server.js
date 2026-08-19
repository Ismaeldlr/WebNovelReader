require('dotenv').config();
const app = require('./app');
const scraperWorker = require('./services/scraperWorkerService');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // Recover pending jobs after an API/server restart. Set
  // SCRAPER_AUTOSTART=false when a process manager owns the worker.
  scraperWorker.ensureStarted();
});
