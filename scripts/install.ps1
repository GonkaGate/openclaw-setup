param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$InstallerArgs
)

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
  Write-Error "npx is required. Install Node.js 18+ and retry."
  exit 1
}

& npx @gonkagate/openclaw @InstallerArgs
exit $LASTEXITCODE
