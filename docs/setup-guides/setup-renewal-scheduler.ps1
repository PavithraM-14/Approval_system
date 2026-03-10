# PowerShell Script to Setup Automatic Renewal Task Scheduler
# This script creates a Windows Task Scheduler task to run the renewal process daily

Write-Host "🔄 Setting up Automatic Renewal Scheduler..." -ForegroundColor Cyan
Write-Host ""

# Get the current directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectPath = $scriptPath

# Task details
$taskName = "SEAD-AutomaticRenewals"
$taskDescription = "Automatically processes renewal requests for SEAD Approval System"

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "⚠️  Task '$taskName' already exists!" -ForegroundColor Yellow
    $response = Read-Host "Do you want to replace it? (y/n)"
    
    if ($response -eq 'y' -or $response -eq 'Y') {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        Write-Host "✅ Removed existing task" -ForegroundColor Green
    } else {
        Write-Host "❌ Setup cancelled" -ForegroundColor Red
        exit
    }
}

# Create the action (what to run)
$action = New-ScheduledTaskAction `
    -Execute "npm" `
    -Argument "run renewals" `
    -WorkingDirectory $projectPath

# Create the trigger (when to run) - Daily at 2:00 AM
$trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM

# Create the settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

# Register the task
try {
    Register-ScheduledTask `
        -TaskName $taskName `
        -Description $taskDescription `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -User $env:USERNAME `
        -RunLevel Highest
    
    Write-Host ""
    Write-Host "✅ Automatic Renewal Scheduler setup complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Task Details:" -ForegroundColor Cyan
    Write-Host "   Name: $taskName"
    Write-Host "   Schedule: Daily at 2:00 AM"
    Write-Host "   Working Directory: $projectPath"
    Write-Host "   Command: npm run renewals"
    Write-Host ""
    Write-Host "📝 To manage this task:" -ForegroundColor Yellow
    Write-Host "   - Open Task Scheduler (taskschd.msc)"
    Write-Host "   - Look for '$taskName' in Task Scheduler Library"
    Write-Host "   - Or run: Get-ScheduledTask -TaskName '$taskName'"
    Write-Host ""
    Write-Host "🧪 To test manually:" -ForegroundColor Yellow
    Write-Host "   npm run renewals"
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "❌ Failed to create scheduled task!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Try running PowerShell as Administrator" -ForegroundColor Yellow
    exit 1
}
