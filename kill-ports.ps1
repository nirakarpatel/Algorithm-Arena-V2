$ports = @(3000, 5000)
foreach ($port in $ports) {
    $connections = netstat -ano | Select-String "LISTENING" | Select-String ":$port\b"
    foreach ($line in $connections) {
        $parts = $line -split '\s+'
        $pid = $parts[-1]
        if ($pid -and $pid -ne '0') {
            Write-Host "Killing PID $pid on port $port"
            taskkill /PID $pid /F 2>&1
        }
    }
}
Write-Host "Ports cleared"
