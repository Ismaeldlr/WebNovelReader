$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $scriptDir ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $python)) {
  Write-Error "Missing scraper virtualenv. Run: cd scraper; python -m venv .venv; .\.venv\Scripts\python.exe -m pip install -r requirements.txt"
}

& $python -c "import playwright, psycopg2, PIL, dotenv" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Error "Scraper dependencies are missing. Run: .\.venv\Scripts\python.exe -m pip install -r requirements.txt"
}

Set-Location $scriptDir
& $python "$scriptDir\main.py"
