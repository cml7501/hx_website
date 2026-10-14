$cmd = 'Out-File -FilePath C:\workspace\hx_website\deploy\elev-probe.txt -InputObject ok -Encoding utf8; try { & C:\workspace\hx_website\deploy\iis-setup.ps1 } catch { Out-File -FilePath C:\workspace\hx_website\deploy\elev-probe-err.txt -InputObject ($_.Exception.Message) -Encoding utf8 }'
try {
    Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $cmd
    Write-Output 'LAUNCHED'
} catch {
    Write-Output ('ELEV-ERR: ' + $_.Exception.Message)
}
