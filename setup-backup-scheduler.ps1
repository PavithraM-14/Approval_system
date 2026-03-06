# Setup Backup Scheduler for Windows Task Scheduler
# This script creates a scheduled task to run backups daily at 2:00 AM

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Backup Scheduler Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the current directory (project root)
$projectPath = Get-Location
Write-Host "Project Path: $projectPath" -ForegroundColor Yellow
Write-Host ""

# Task configuration
$taskName = "SEAD-Daily-Backup"
$taskDescription = "Creates daily backups of S.E.A.D. database and files"
$taskTime = "02:00"  # 2:00 AM

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "Task '$taskName' already exists!" -ForegroundColor Yellow
    $response = Read-Host "Do you want to remove and recreate it? (Y/N)"
    if ($response -eq "Y" -or $response -eq "y") {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        Write-Host "Existing task removed." -ForegroundColor Green
    } else {
        Write-Host "Setup cancelled." -ForegroundColor Red
        exit
    }
}

# Create backups directory if it doesn't exist
$backupsDir = Join-Path $projectPath "backups"
if (-not (Test-Path $backupsDir)) {
    New-Item -ItemType Directory -Path $backupsDir | Out-Null
    Write-Host "Created backups directory: $backupsDir" -ForegroundColor Green
}

# Create the action (what to run)
$cmdArgument = "/c cd /d `"$projectPath`" && npm run backup >> `"$projectPath\logs\backup.log`" 2>&1"
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument $cmdArgument -WorkingDirectory $projectPath

# Create the trigger (when to run - daily at 2:00 AM)
$trigger = New-ScheduledTaskTrigger -Daily -At $taskTime

# Create task settings
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 2)

# Create the principal (run as current user)
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

# Register the scheduled task
try {
    Register-ScheduledTask -TaskName $taskName -Description $taskDescription -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
    
    Write-Host ""
    Write-Host "SUCCESS: Scheduled task created!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Task Details:" -ForegroundColor Cyan
    Write-Host "  Name: $taskName" -ForegroundColor White
    Write-Host "  Schedule: Daily at $taskTime" -ForegroundColor White
    Write-Host "  Command: npm run backup" -ForegroundColor White
    Write-Host "  Log File: $projectPath\logs\backup.log" -ForegroundColor White
    Write-Host "  Backups: $projectPath\backups\" -ForegroundColor White
    Write-Host ""
    Write-Host "You can view/manage this task in Task Scheduler" -ForegroundColor Yellow
    Write-Host ""
    
    # Test the task
    Write-Host ""
    $testResponse = Read-Host "Do you want to test the backup now? (Y/N)"
    if ($testResponse -eq "Y" -or $testResponse -eq "y") {
        Write-Host ""
        Write-Host "Running test backup..." -ForegroundColor Yellow
        Write-Host "This may take a few minutes..." -ForegroundColor Yellow
        Start-ScheduledTask -TaskName $taskName
        Start-Sleep -Seconds 5
        Write-Host "Test started. Check the log file for results." -ForegroundColor Green
        Write-Host "Log: $projectPath\logs\backup.log" -ForegroundColor White
    }
    
} catch {
    Write-Host ""
    Write-Host "ERROR creating scheduled task:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "You may need to run this script as Administrator." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT: Install MongoDB Database Tools" -ForegroundColor Yellow
Write-Host "The backup system requires mongodump and mongorestore." -ForegroundColor White
Write-Host ""
Write-Host "Download from: https://www.mongodb.com/try/download/database-tools" -ForegroundColor Cyan
Write-Host "Or install via: choco install mongodb-database-tools" -ForegroundColor Cyan
Write-Host ""
