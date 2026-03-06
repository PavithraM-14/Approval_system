# Setup script for ERP/CRM/HR integrations
# Run: .\setup-integrations.ps1

Write-Host "Setting up ERP/CRM/HR Integrations" -ForegroundColor Green
Write-Host ""

# Check if Docker is installed
Write-Host "Checking Docker installation..." -ForegroundColor Yellow
$dockerInstalled = Get-Command docker -ErrorAction SilentlyContinue
if (-not $dockerInstalled) {
    Write-Host "ERROR: Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Cyan
    exit 1
}
Write-Host "SUCCESS: Docker is installed" -ForegroundColor Green
Write-Host ""

# Start Odoo
Write-Host "Setting up Odoo ERP..." -ForegroundColor Yellow
$odooExists = docker ps -a --filter "name=odoo" --format "{{.Names}}"
if ($odooExists) {
    Write-Host "  Odoo container exists, starting..." -ForegroundColor Cyan
    docker start odoo
} else {
    Write-Host "  Creating Odoo container..." -ForegroundColor Cyan
    docker run -d -p 8069:8069 --name odoo odoo:17
}
Write-Host "SUCCESS: Odoo running at http://localhost:8069" -ForegroundColor Green
Write-Host ""

# Start SuiteCRM
Write-Host "Setting up SuiteCRM..." -ForegroundColor Yellow
$crmExists = docker ps -a --filter "name=suitecrm" --format "{{.Names}}"
if ($crmExists) {
    Write-Host "  SuiteCRM container exists, starting..." -ForegroundColor Cyan
    docker start suitecrm
} else {
    Write-Host "  Creating SuiteCRM container..." -ForegroundColor Cyan
    docker run -d -p 8080:8080 --name suitecrm bitnami/suitecrm:latest
}
Write-Host "SUCCESS: SuiteCRM running at http://localhost:8080" -ForegroundColor Green
Write-Host ""

# Start OrangeHRM
Write-Host "Setting up OrangeHRM..." -ForegroundColor Yellow
$hrmExists = docker ps -a --filter "name=orangehrm" --format "{{.Names}}"
if ($hrmExists) {
    Write-Host "  OrangeHRM container exists, starting..." -ForegroundColor Cyan
    docker start orangehrm
} else {
    Write-Host "  Creating OrangeHRM container..." -ForegroundColor Cyan
    docker run -d -p 8081:80 --name orangehrm orangehrm/orangehrm:latest
}
Write-Host "SUCCESS: OrangeHRM running at http://localhost:8081" -ForegroundColor Green
Write-Host ""

# Wait for services to start
Write-Host "Waiting for services to start (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check status
Write-Host "Checking service status..." -ForegroundColor Yellow
Write-Host ""

$odooStatus = docker ps --filter "name=odoo" --format "{{.Status}}"
$crmStatus = docker ps --filter "name=suitecrm" --format "{{.Status}}"
$hrmStatus = docker ps --filter "name=orangehrm" --format "{{.Status}}"

Write-Host "  Odoo: $odooStatus" -ForegroundColor $(if ($odooStatus) { "Green" } else { "Red" })
Write-Host "  SuiteCRM: $crmStatus" -ForegroundColor $(if ($crmStatus) { "Green" } else { "Red" })
Write-Host "  OrangeHRM: $hrmStatus" -ForegroundColor $(if ($hrmStatus) { "Green" } else { "Red" })
Write-Host ""

# Display next steps
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Configure Odoo:" -ForegroundColor Yellow
Write-Host "   - Open http://localhost:8069"
Write-Host "   - Create database: 'sead_erp'"
Write-Host "   - Login: admin/admin"
Write-Host ""
Write-Host "2. Configure SuiteCRM:" -ForegroundColor Yellow
Write-Host "   - Open http://localhost:8080"
Write-Host "   - Complete setup wizard"
Write-Host "   - Create OAuth client in Admin"
Write-Host ""
Write-Host "3. Configure OrangeHRM:" -ForegroundColor Yellow
Write-Host "   - Open http://localhost:8081"
Write-Host "   - Complete setup wizard"
Write-Host "   - Register OAuth client"
Write-Host ""
Write-Host "4. Update .env.local with credentials" -ForegroundColor Yellow
Write-Host ""
Write-Host "5. Test integrations:" -ForegroundColor Yellow
Write-Host "   npx ts-node scripts/test-integrations.ts"
Write-Host ""
Write-Host "Full documentation: docs/ERP_CRM_HR_INTEGRATION.md" -ForegroundColor Cyan
Write-Host ""
