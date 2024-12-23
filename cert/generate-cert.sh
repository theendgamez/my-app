
# Navigate to the 'cert' directory
mkdir cert
cd cert

# Generate a self-signed certificate and key
openssl req -nodes -new -x509 -keyout key.pem -out cert.pem -days 365