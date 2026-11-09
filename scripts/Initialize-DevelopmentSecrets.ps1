[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectPath = Join-Path $PSScriptRoot '..\BE-SWD\BE-SWD.csproj'
[xml]$project = Get-Content -LiteralPath $projectPath -Raw
$secretId = [string]($project.Project.PropertyGroup.UserSecretsId | Where-Object { $_ } | Select-Object -First 1)
if ([string]::IsNullOrWhiteSpace($secretId)) { throw 'The API project is missing UserSecretsId.' }

$secret = [Environment]::GetEnvironmentVariable('Jwt__Secret', 'Process')
if ([string]::IsNullOrWhiteSpace($secret)) { $secret = [Environment]::GetEnvironmentVariable('Jwt:Secret', 'Process') }
$secretsPath = Join-Path ([Environment]::GetFolderPath('ApplicationData')) "Microsoft\UserSecrets\$secretId\secrets.json"
if ([string]::IsNullOrWhiteSpace($secret) -and (Test-Path -LiteralPath $secretsPath)) {
    $stored = Get-Content -LiteralPath $secretsPath -Raw | ConvertFrom-Json
    $secret = [string]$stored.'Jwt:Secret'
    if ([string]::IsNullOrWhiteSpace($secret) -and $null -ne $stored.Jwt) { $secret = [string]$stored.Jwt.Secret }
}
if (![string]::IsNullOrWhiteSpace($secret)) {
    if ([Text.Encoding]::UTF8.GetByteCount($secret) -lt 32) { throw 'Existing Jwt:Secret is shorter than 32 bytes. Replace it deliberately; this script will not rotate an existing secret.' }
    Write-Output 'A valid-length JWT secret is already configured. No secret was changed.'
    return
}

$randomBytes = New-Object byte[] 48
$generator = [Security.Cryptography.RandomNumberGenerator]::Create()
try { $generator.GetBytes($randomBytes) } finally { $generator.Dispose() }
$payload = @{ 'Jwt:Secret' = [Convert]::ToBase64String($randomBytes) } | ConvertTo-Json -Compress
try {
    # Use stdin so the secret never appears in process arguments, console output or repository files.
    $payload | & dotnet user-secrets set --id $secretId
    if ($LASTEXITCODE -ne 0) { throw 'dotnet user-secrets set failed.' }
} finally {
    [Array]::Clear($randomBytes, 0, $randomBytes.Length)
    $payload = $null
    $secret = $null
}
Write-Output 'Initialized Jwt:Secret in the Development User Secrets store. The key was not printed or added to Git.'
