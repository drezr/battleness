<#
.SYNOPSIS
Deploys the current CI-validated main commit to BattleNess staging.

.DESCRIPTION
This script orchestrates the documented staging deployment from a Windows
operator workstation. It verifies the Git revision and GitHub Actions jobs,
creates and verifies a PostgreSQL backup, builds an immutable release on bnapp,
applies PostgreSQL migrations, atomically activates the release, and runs
local/public health checks.

Authenticated browser smoke testing remains manual.

.PARAMETER SshKeyPath
Path to the deploy user's private SSH key.

.PARAMETER CredentialsPath
Path to the ignored UTF-8 vpspw.txt file. When omitted, the script checks the
known Desktop and Desktop\bn locations.

.PARAMETER GitHubRepository
GitHub owner/repository used to verify the CI workflow.

.PARAMETER RunLocalValidation
Runs the complete local validation gate before deployment. The CI gate is
always checked even when this switch is omitted.

.PARAMETER AllowMigrations
Allows activation when the release contains migration directories that are not
present in the currently deployed release. Review those migrations before using
this switch.

.EXAMPLE
.\ops\deploy-staging.ps1

.EXAMPLE
.\ops\deploy-staging.ps1 -RunLocalValidation

.EXAMPLE
.\ops\deploy-staging.ps1 -AllowMigrations
#>

[CmdletBinding()]
param(
  [string]$SshKeyPath = (Join-Path $HOME ".ssh\battleness_deploy_ed25519"),
  [string]$CredentialsPath,
  [string]$GitHubRepository = "drezr/battleness",
  [switch]$RunLocalValidation,
  [switch]$AllowMigrations
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$AppHostAddress = "145.239.72.77"
$DatabaseHostAddress = "51.91.159.196"
$RemoteUser = "deploy"
$AppRoot = "/opt/battleness"
$EnvironmentFile = "/etc/battleness/staging.env"
$ServiceName = "battleness-staging.service"
$PublicOrigin = "https://staging.battleness.com"
$RequiredCiJobs = @("checks", "postgresql")
$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$ArchivePath = $null
$PreviousRelease = $null
$ReleaseId = $null

function Write-Step {
  param([string]$Message)

  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Command {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found in PATH."
  }
}

function Invoke-CheckedNative {
  param(
    [string]$Command,
    [string[]]$Arguments,
    [string]$FailureMessage
  )

  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$FailureMessage (exit code $LASTEXITCODE)."
  }
}

function Invoke-GitCapture {
  param([string[]]$Arguments)

  $output = @(& git -C $RepositoryRoot @Arguments)
  if ($LASTEXITCODE -ne 0) {
    throw "Git command failed: git $($Arguments -join ' ')"
  }

  return ($output -join "`n").Trim()
}

function Get-RolePassword {
  param([string]$Role)

  if (-not (Test-Path -LiteralPath $CredentialsPath -PathType Leaf)) {
    throw "Credential file was not found: $CredentialsPath"
  }

  # Explicit UTF-8 decoding is required because the passwords contain
  # characters that Windows PowerShell's legacy default can corrupt.
  $content = [System.IO.File]::ReadAllText($CredentialsPath, $Utf8NoBom)
  $blocks = @(
    ($content -split "(?m)(?=^Role:)") |
      Where-Object { $_ -match "(?m)^Role:\s*$([regex]::Escape($Role))\s*$" }
  )

  if ($blocks.Count -ne 1) {
    throw "Expected exactly one '$Role' credential block in $CredentialsPath."
  }

  $match = [regex]::Match(
    ($blocks -join ""),
    "(?m)^Password:\s*([^\r\n]+)$"
  )
  if (-not $match.Success) {
    throw "Password was not found in the '$Role' credential block."
  }

  return $match.Groups[1].Value
}

function Get-SshArguments {
  return @(
    "-o", "BatchMode=yes",
    "-o", "IdentitiesOnly=yes",
    "-o", "StrictHostKeyChecking=accept-new",
    "-i", $SshKeyPath
  )
}

function Invoke-RemoteScript {
  param(
    [string]$HostAddress,
    [string]$Script,
    [AllowNull()][string]$SudoPassword = $null
  )

  $scriptBase64 = [Convert]::ToBase64String(
    [System.Text.Encoding]::UTF8.GetBytes($Script)
  )

  if ([string]::IsNullOrEmpty($SudoPassword)) {
    $wrapper = @'
SCRIPT_BASE64='__SCRIPT_BASE64__'
printf '%s' "$SCRIPT_BASE64" | base64 -d | bash
'@
    $wrapper = $wrapper.Replace("__SCRIPT_BASE64__", $scriptBase64)
  }
  else {
    $passwordBase64 = [Convert]::ToBase64String(
      [System.Text.Encoding]::UTF8.GetBytes($SudoPassword + "`n")
    )
    $wrapper = @'
PASSWORD_BASE64='__PASSWORD_BASE64__'
SCRIPT_BASE64='__SCRIPT_BASE64__'
printf '%s' "$PASSWORD_BASE64" | base64 -d | sudo -S -p '' bash -c "$(printf '%s' "$SCRIPT_BASE64" | base64 -d)"
'@
    $wrapper = $wrapper.Replace(
      "__PASSWORD_BASE64__",
      $passwordBase64
    ).Replace(
      "__SCRIPT_BASE64__",
      $scriptBase64
    )
  }

  $previousOutputEncoding = $OutputEncoding
  try {
    $OutputEncoding = $Utf8NoBom
    $output = @(
      $wrapper |
        & ssh @(Get-SshArguments) "$RemoteUser@$HostAddress" "tr -d '\r' | bash -s"
    )
    $exitCode = $LASTEXITCODE
  }
  finally {
    $OutputEncoding = $previousOutputEncoding
  }

  if ($exitCode -ne 0) {
    throw "Remote command failed on $HostAddress (exit code $exitCode)."
  }

  return $output
}

function Show-RemoteOutput {
  param([object[]]$Lines)

  foreach ($line in $Lines) {
    Write-Host $line
  }
}

function Assert-CiPassed {
  param([string]$CommitSha)

  $headers = @{
    Accept = "application/vnd.github+json"
    "User-Agent" = "BattleNess-Staging-Deploy"
    "X-GitHub-Api-Version" = "2022-11-28"
  }
  if ($env:GITHUB_TOKEN) {
    $headers.Authorization = "Bearer $($env:GITHUB_TOKEN)"
  }

  $runsUri = "https://api.github.com/repos/$GitHubRepository/actions/runs?head_sha=$CommitSha&per_page=20"
  try {
    $response = Invoke-RestMethod -Headers $headers -Uri $runsUri -Method Get
  }
  catch {
    throw "Unable to query GitHub Actions for $CommitSha. $($_.Exception.Message)"
  }

  $run = @($response.workflow_runs) |
    Where-Object { $_.name -eq "CI" -and $_.head_sha -eq $CommitSha } |
    Sort-Object { [datetime]$_.created_at } -Descending |
    Select-Object -First 1

  if ($null -eq $run) {
    throw "No CI workflow run was found for commit $CommitSha."
  }
  if ($run.status -ne "completed" -or $run.conclusion -ne "success") {
    throw "CI is not successful for $CommitSha (status=$($run.status), conclusion=$($run.conclusion))."
  }

  $jobsUri = "https://api.github.com/repos/$GitHubRepository/actions/runs/$($run.id)/jobs?per_page=100"
  $jobsResponse = Invoke-RestMethod -Headers $headers -Uri $jobsUri -Method Get
  foreach ($requiredJob in $RequiredCiJobs) {
    $job = @($jobsResponse.jobs) |
      Where-Object { $_.name -eq $requiredJob } |
      Select-Object -First 1
    if ($null -eq $job -or $job.status -ne "completed" -or $job.conclusion -ne "success") {
      throw "Required CI job '$requiredJob' did not complete successfully."
    }
  }

  Write-Host "CI run: $($run.html_url)"
}

function Invoke-LocalValidation {
  Write-Step "Running the complete local validation gate"

  $commands = @(
    [pscustomobject]@{ Command = "pnpm"; Arguments = @("install", "--frozen-lockfile") }
    [pscustomobject]@{ Command = "pnpm"; Arguments = @("format:check") }
    [pscustomobject]@{ Command = "pnpm"; Arguments = @("typecheck") }
    [pscustomobject]@{ Command = "pnpm"; Arguments = @("lint") }
    [pscustomobject]@{ Command = "pnpm"; Arguments = @("test") }
    [pscustomobject]@{ Command = "pnpm"; Arguments = @("--filter", "@battleness/web", "build") }
  )

  foreach ($entry in $commands) {
    Invoke-CheckedNative `
      -Command $entry.Command `
      -Arguments $entry.Arguments `
      -FailureMessage "Local validation command failed: $($entry.Command) $($entry.Arguments -join ' ')"
  }
}

try {
  Write-Step "Checking local prerequisites and the exact Git revision"

  foreach ($command in @("git", "ssh", "scp")) {
    Assert-Command $command
  }
  if ($RunLocalValidation) {
    Assert-Command "pnpm"
  }
  if (-not (Test-Path -LiteralPath $SshKeyPath -PathType Leaf)) {
    throw "SSH private key was not found: $SshKeyPath"
  }

  $worktreeStatus = Invoke-GitCapture @("status", "--porcelain=v1")
  if ($worktreeStatus) {
    throw "The worktree is not clean. Commit and push every intended change before deployment."
  }

  Invoke-CheckedNative `
    -Command "git" `
    -Arguments @("-C", $RepositoryRoot, "fetch", "--quiet", "origin", "main") `
    -FailureMessage "Unable to update origin/main"

  $branch = Invoke-GitCapture @("branch", "--show-current")
  if ($branch -ne "main") {
    throw "The current branch is '$branch'. Staging deployments must run from main."
  }

  $commitSha = Invoke-GitCapture @("rev-parse", "HEAD")
  $originMainSha = Invoke-GitCapture @("rev-parse", "origin/main")
  if ($commitSha -ne $originMainSha) {
    throw "HEAD ($commitSha) does not match origin/main ($originMainSha)."
  }

  Assert-CiPassed -CommitSha $commitSha
  if ($RunLocalValidation) {
    Invoke-LocalValidation
  }

  if (-not $CredentialsPath) {
    $credentialCandidates = @(
      (Join-Path $HOME "Desktop\vpspw.txt"),
      (Join-Path $HOME "Desktop\bn\vpspw.txt")
    )
    $existingCredentialFiles = @(
      $credentialCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf }
    )
    if ($existingCredentialFiles.Count -ne 1) {
      throw "Unable to select vpspw.txt automatically. Use -CredentialsPath with its exact path."
    }
    $CredentialsPath = $existingCredentialFiles[0]
  }

  $appSudoPassword = Get-RolePassword -Role "app"
  $databaseSudoPassword = Get-RolePassword -Role "postgres"
  $ReleaseId = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ") +
    "-" + $commitSha.Substring(0, 8)
  $releasePath = "$AppRoot/releases/$ReleaseId"
  $ArchivePath = Join-Path $env:TEMP "$ReleaseId.tar"

  Write-Host "Commit:  $commitSha"
  Write-Host "Release: $ReleaseId"

  Write-Step "Checking the currently active staging service"
  $preflightScript = @"
set -euo pipefail
echo "ACTIVE_RELEASE=`$(readlink -f $AppRoot/current)"
echo "SERVICE=`$(systemctl is-active $ServiceName)"
echo "LOCAL_READY=`$(curl --fail --silent --show-error http://127.0.0.1:3000/api/health/ready)"
echo "PUBLIC_READY=`$(curl --fail --silent --show-error $PublicOrigin/api/health/ready)"
echo "DISK_USAGE"
df -h $AppRoot
echo "RELEASE_USAGE"
du -sh $AppRoot/releases/* 2>/dev/null || true
"@
  Show-RemoteOutput @(Invoke-RemoteScript -HostAddress $AppHostAddress -Script $preflightScript)

  Write-Step "Creating and verifying the pre-release PostgreSQL backup"
  $backupScript = @'
set -euo pipefail
systemctl start battleness-postgresql-backup.service
result=$(systemctl show battleness-postgresql-backup.service --property=Result --value)
status=$(systemctl show battleness-postgresql-backup.service --property=ExecMainStatus --value)
active=$(systemctl show battleness-postgresql-backup.service --property=ActiveState --value)
echo "BACKUP_RESULT=$result"
echo "BACKUP_EXEC_STATUS=$status"
echo "BACKUP_ACTIVE_STATE=$active"
test "$result" = "success"
test "$status" = "0"
test "$active" = "inactive"
cd /var/backups/battleness/postgresql/latest
sha256sum -c SHA256SUMS
backup_path=$(readlink -f /var/backups/battleness/postgresql/latest)
case "$backup_path" in
  /var/backups/battleness/postgresql/*) ;;
  *) echo "Unexpected backup path: $backup_path" >&2; exit 1 ;;
esac
echo "BACKUP_PATH=$backup_path"
'@
  $backupOutput = @(
    Invoke-RemoteScript `
      -HostAddress $DatabaseHostAddress `
      -Script $backupScript `
      -SudoPassword $databaseSudoPassword
  )
  Show-RemoteOutput $backupOutput
  $backupPathLine = $backupOutput | Where-Object { $_ -like "BACKUP_PATH=*" } | Select-Object -Last 1
  if (-not $backupPathLine) {
    throw "The verified backup path was not returned by bndb."
  }
  $verifiedBackupPath = $backupPathLine.Substring("BACKUP_PATH=".Length)

  Write-Step "Creating and uploading the exact Git archive"
  Invoke-CheckedNative `
    -Command "git" `
    -Arguments @("-C", $RepositoryRoot, "archive", "--format=tar", "--output=$ArchivePath", $commitSha) `
    -FailureMessage "Unable to create the release archive"
  Invoke-CheckedNative `
    -Command "scp" `
    -Arguments (@(Get-SshArguments) + @($ArchivePath, "$RemoteUser@$AppHostAddress`:/tmp/$ReleaseId.tar")) `
    -FailureMessage "Unable to upload the release archive"

  Write-Step "Building the immutable release on bnapp"
  $buildScript = @"
set -euo pipefail
release_path='$releasePath'
archive_path='/tmp/$ReleaseId.tar'
test ! -e "`$release_path"
mkdir -m 0755 "`$release_path"
tar -xf "`$archive_path" -C "`$release_path"
rm "`$archive_path"
cd "`$release_path"
pnpm install --frozen-lockfile
set -a
. '$EnvironmentFile'
set +a
pnpm --filter @battleness/web prisma:postgres:check
pnpm --filter @battleness/web prisma:postgres:validate
pnpm --filter @battleness/web build:postgres
test -f apps/web/.output/server/index.mjs
echo "BUILT_RELEASE=`$release_path"
"@
  Show-RemoteOutput @(Invoke-RemoteScript -HostAddress $AppHostAddress -Script $buildScript)

  Write-Step "Checking for new PostgreSQL migrations"
  $migrationDiffScript = @"
set -euo pipefail
current_path=`$(readlink -f '$AppRoot/current')
new_path='$releasePath'
current_migrations="`$current_path/apps/web/prisma/postgresql/migrations"
new_migrations="`$new_path/apps/web/prisma/postgresql/migrations"
if [ ! -d "`$current_migrations" ] || [ ! -d "`$new_migrations" ]; then
  echo "Migration directory missing." >&2
  exit 1
fi
comm -23 \
  <(find "`$current_migrations" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort) \
  <(find "`$new_migrations" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort) |
  while read -r migration; do echo "REMOVED_MIGRATION=`$migration"; done
comm -12 \
  <(find "`$current_migrations" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort) \
  <(find "`$new_migrations" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort) |
  while read -r migration; do
    if ! diff -qr "`$current_migrations/`$migration" "`$new_migrations/`$migration" >/dev/null; then
      echo "CHANGED_MIGRATION=`$migration"
    fi
  done
comm -13 \
  <(find "`$current_migrations" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort) \
  <(find "`$new_migrations" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort) |
  while read -r migration; do echo "NEW_MIGRATION=`$migration"; done
"@
  $migrationDiff = @(
    Invoke-RemoteScript -HostAddress $AppHostAddress -Script $migrationDiffScript
  )
  $removedMigrations = @(
    $migrationDiff |
      Where-Object { $_ -like "REMOVED_MIGRATION=*" } |
      ForEach-Object { $_.Substring("REMOVED_MIGRATION=".Length) }
  )
  $changedMigrations = @(
    $migrationDiff |
      Where-Object { $_ -like "CHANGED_MIGRATION=*" } |
      ForEach-Object { $_.Substring("CHANGED_MIGRATION=".Length) }
  )
  $newMigrations = @(
    $migrationDiff |
      Where-Object { $_ -like "NEW_MIGRATION=*" } |
      ForEach-Object { $_.Substring("NEW_MIGRATION=".Length) }
  )
  if ($removedMigrations.Count -gt 0 -or $changedMigrations.Count -gt 0) {
    if ($removedMigrations.Count -gt 0) {
      Write-Host "Removed migrations: $($removedMigrations -join ', ')" -ForegroundColor Red
    }
    if ($changedMigrations.Count -gt 0) {
      Write-Host "Changed migrations: $($changedMigrations -join ', ')" -ForegroundColor Red
    }
    throw "Applied migration history must never be changed or removed."
  }
  if ($newMigrations.Count -gt 0) {
    Write-Host "New migrations:" -ForegroundColor Yellow
    $newMigrations | ForEach-Object { Write-Host "  $_" -ForegroundColor Yellow }
    if (-not $AllowMigrations) {
      throw "New migrations require review. Re-run with -AllowMigrations after classifying them."
    }
  }
  else {
    Write-Host "No new migration directories."
  }

  Write-Step "Applying and verifying PostgreSQL migrations"
  $migrationScript = @"
set -euo pipefail
cd '$releasePath'
set -a
. '$EnvironmentFile'
set +a
echo "MIGRATION_STATUS_BEFORE"
pnpm --filter @battleness/web prisma:postgres:migrate:status || true
echo "MIGRATION_DEPLOY"
pnpm --filter @battleness/web prisma:postgres:migrate:deploy
echo "MIGRATION_STATUS_AFTER"
pnpm --filter @battleness/web prisma:postgres:migrate:status
"@
  Show-RemoteOutput @(Invoke-RemoteScript -HostAddress $AppHostAddress -Script $migrationScript)

  $PreviousRelease = (
    @(Invoke-RemoteScript -HostAddress $AppHostAddress -Script "readlink -f '$AppRoot/current'") |
      Select-Object -Last 1
  )
  if (-not $PreviousRelease) {
    throw "Unable to determine the previous release path."
  }

  Write-Step "Atomically activating the new release"
  $activationScript = @"
set -euo pipefail
test -f '$releasePath/apps/web/.output/server/index.mjs'
test ! -e '$AppRoot/current.next'
test ! -L '$AppRoot/current.next'
ln -s '$releasePath' '$AppRoot/current.next'
mv -Tf '$AppRoot/current.next' '$AppRoot/current'
systemctl restart '$ServiceName'
systemctl is-active --quiet '$ServiceName'
echo "PREVIOUS_RELEASE=$PreviousRelease"
echo "CURRENT_RELEASE=`$(readlink -f '$AppRoot/current')"
"@
  Show-RemoteOutput @(
    Invoke-RemoteScript `
      -HostAddress $AppHostAddress `
      -Script $activationScript `
      -SudoPassword $appSudoPassword
  )

  Write-Step "Running post-deployment service and health checks"
  $postDeploymentScript = @"
set -euo pipefail
sleep 3
test "`$(readlink -f '$AppRoot/current')" = '$releasePath'
systemctl is-active '$ServiceName'
systemctl show '$ServiceName' --property=NRestarts --property=MainPID --property=ActiveEnterTimestamp
echo "LOCAL_LIVE=`$(curl --fail --silent --show-error http://127.0.0.1:3000/api/health/live)"
echo "LOCAL_READY=`$(curl --fail --silent --show-error http://127.0.0.1:3000/api/health/ready)"
echo "PUBLIC_LIVE=`$(curl --fail --silent --show-error '$PublicOrigin/api/health/live')"
echo "PUBLIC_READY=`$(curl --fail --silent --show-error '$PublicOrigin/api/health/ready')"
echo "RECENT_SERVICE_LOGS"
journalctl -u '$ServiceName' --since '-5 minutes' --no-pager | tail -n 100
"@
  Show-RemoteOutput @(
    Invoke-RemoteScript `
      -HostAddress $AppHostAddress `
      -Script $postDeploymentScript `
      -SudoPassword $appSudoPassword
  )

  $publicReady = Invoke-RestMethod -Uri "$PublicOrigin/api/health/ready" -Method Get
  if ($publicReady.status -ne "ready" -or -not $publicReady.checks.environment -or -not $publicReady.checks.database) {
    throw "The public readiness response is not healthy."
  }

  Write-Step "Deployment completed"
  Write-Host "Commit:           $commitSha"
  Write-Host "Release:          $releasePath"
  Write-Host "Previous release: $PreviousRelease"
  Write-Host "Verified backup:  $verifiedBackupPath"
  Write-Host "Public origin:    $PublicOrigin"
  Write-Host ""
  Write-Host "Manual authenticated smoke test still required:" -ForegroundColor Yellow
  Write-Host "  1. Sign in with Google."
  Write-Host "  2. Open Home, Battle, Inventory, Forge, and Market."
  Write-Host "  3. Exercise the workflow changed by this release."
  Write-Host "  4. Confirm that the browser console has no new errors."
}
catch {
  Write-Host ""
  Write-Host "DEPLOYMENT FAILED: $($_.Exception.Message)" -ForegroundColor Red
  if ($ReleaseId) {
    Write-Host "Candidate release: $AppRoot/releases/$ReleaseId"
  }
  if ($PreviousRelease) {
    Write-Host "Recorded previous release: $PreviousRelease"
    Write-Host "Do not roll back automatically if incompatible migrations were applied."
  }
  exit 1
}
finally {
  if ($ArchivePath -and (Test-Path -LiteralPath $ArchivePath)) {
    Remove-Item -LiteralPath $ArchivePath -Force
  }
}
