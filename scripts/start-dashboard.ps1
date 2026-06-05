$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$dashboard = Join-Path $root "dashboard"
Set-Location $dashboard
npm install
npm start

