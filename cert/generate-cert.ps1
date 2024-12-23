# Function to check if OpenSSL is in the system's PATH
function Test-OpenSSL {
    $openssl = Get-Command "openssl" -ErrorAction SilentlyContinue
    return $openssl -ne $null
}

# Check if OpenSSL is in the system's PATH
if (Test-OpenSSL) {
    $opensslPath = "openssl"
} else {
    # Fallback to a manually specified path
    $opensslPath = "C:\OpenSSL-Win64\bin\openssl.exe"  # Update this path based on your installation

    if (-Not (Test-Path $opensslPath)) {
        Write-Error "OpenSSL not found at $opensslPath. Please ensure OpenSSL is installed and the path is correct."
        exit 1
    }

    # Add OpenSSL to the PATH environment variable for the current session
    $env:PATH += ";C:\OpenSSL-Win64\bin"
    $opensslPath = "openssl"
}

# Generate a self-signed certificate and key using OpenSSL
try {
    & $opensslPath req -nodes -new -x509 -keyout key.pem -out cert.pem -days 365 -subj "/C=US/ST=State/L=City/O=Organization/OU=Unit/CN=localhost"
    Write-Output "Certificate and key generated successfully."
} catch {
    Write-Error "An error occurred while generating the certificate and key: $_"
    exit 1
}
