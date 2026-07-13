$ErrorActionPreference = "Stop"

$env:DOCUMENT_STORAGE = "C:\VAGACIONES-DATA"
& pnpm.cmd dev:local
exit $LASTEXITCODE
