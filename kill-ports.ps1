$ports = @(3000, 5000)
foreach ($port in $ports) {
    $connections = netstat -ano | Select-String "LISTENING" | Select-String ":$port\b"
    foreach ($line in $connections) {
        $parts = $line -split '\s+'
        $processId = $parts[-1]
        if ($processId -and $processId -ne '0') {
            Write-Host "Killing PID $processId on port $port"
            taskkill /PID $processId /F 2>&1
        }
    }
}
Write-Host "Ports cleared"
