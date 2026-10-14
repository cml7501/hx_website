# HengXing website - one-shot IIS deployment (run as Administrator)
# Log: deploy\iis-setup.log   Site: http://localhost:8088/
$ErrorActionPreference = 'Stop'
Start-Transcript -Path 'C:\workspace\hx_website\deploy\iis-setup.log' -Force

Import-Module WebAdministration

$siteName = 'hx-website'
$poolName = 'hx-website'
$physPath = 'C:\workspace\hx_website\dist'
$port     = 8088

# 1) App pool: no managed code (pure static site)
if (-not (Test-Path "IIS:\AppPools\$poolName")) {
    New-WebAppPool -Name $poolName | Out-Null
    Write-Host "App pool created: $poolName"
}
Set-ItemProperty IIS:\AppPools\$poolName -Name managedRuntimeVersion -Value ''
Set-ItemProperty IIS:\AppPools\$poolName -Name startMode -Value 'AlwaysRunning'

# 2) Site pointing to the static build output
if (-not (Test-Path "IIS:\Sites\$siteName")) {
    New-Website -Name $siteName -PhysicalPath $physPath -ApplicationPool $poolName -Port $port | Out-Null
    Write-Host "Site created: $siteName (port $port)"
} else {
    Set-ItemProperty IIS:\Sites\$siteName -Name physicalPath -Value $physPath
    Set-ItemProperty IIS:\Sites\$siteName -Name applicationPool -Value $poolName
    Write-Host "Site exists, updated physical path and app pool: $siteName"
}

# 3) Grant the app-pool identity read access to the static folder
icacls $physPath /grant 'IIS_IUSRS:(OI)(CI)RX' /T /Q | Out-Null
Write-Host 'Read access granted to IIS_IUSRS'

# 4) Start site
Start-WebSite -Name $siteName
Start-WebAppPool -Name $poolName
$state = (Get-Website -Name $siteName).state
Write-Host "Site state: $state"
Write-Host "URL: http://localhost:$port/"
Stop-Transcript
