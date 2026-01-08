#!/bin/bash
# Script para generar un CMS de referencia usando OpenSSL
# Según WSAA Manual del Desarrollador (Pub. 20.2.19)
# Este CMS se puede usar para comparar con el generado por node-forge

# Requiere:
# - OpenSSL instalado
# - Certificado P12 en la ruta especificada
# - TRA generado previamente

CERT_PATH="${1:-certificado.p12}"
CERT_PASSWORD="${2:-password}"
TRA_PATH="${3:-TRA.xml}"

if [ ! -f "$CERT_PATH" ]; then
    echo "Error: No se encuentra el certificado en $CERT_PATH"
    exit 1
fi

if [ ! -f "$TRA_PATH" ]; then
    echo "Error: No se encuentra el TRA en $TRA_PATH"
    exit 1
fi

echo "Generando CMS de referencia con OpenSSL..."
echo "Certificado: $CERT_PATH"
echo "TRA: $TRA_PATH"

# Generar CMS con OpenSSL (NO detached, como en el ejemplo del manual)
openssl cms -sign \
    -in "$TRA_PATH" \
    -nodetach \
    -signer "$CERT_PATH" \
    -inkey "$CERT_PATH" \
    -passin pass:"$CERT_PASSWORD" \
    -outform PEM \
    -out TRA_signed.pem

if [ $? -ne 0 ]; then
    echo "Error al generar CMS con OpenSSL"
    exit 1
fi

# Remover headers MIME (las primeras 4 líneas según el ejemplo del manual)
echo "Removiendo headers MIME..."
tail -n +5 TRA_signed.pem > TRA_signed_clean.pem

# Remover marcadores BEGIN/END CMS
sed -i '/-----BEGIN CMS-----/d' TRA_signed_clean.pem
sed -i '/-----END CMS-----/d' TRA_signed_clean.pem

# Remover saltos de línea para obtener Base64 puro
tr -d '\n' < TRA_signed_clean.pem > TRA_signed_base64.txt

echo "✅ CMS de referencia generado en TRA_signed_base64.txt"
echo "Longitud: $(wc -c < TRA_signed_base64.txt) caracteres"
echo "Primeros 80 chars: $(head -c 80 TRA_signed_base64.txt)"
echo ""
echo "Este CMS se puede usar para comparar con el generado por node-forge"
