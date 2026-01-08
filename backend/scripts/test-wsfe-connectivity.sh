#!/bin/bash
# Script para probar conectividad con WSFEv1

echo "🔍 Probando conectividad con WSFEv1..."
echo ""

echo "1. Probando WSDL de homologación:"
curl -I "https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL" 2>&1 | head -5

echo ""
echo "2. Probando endpoint de homologación:"
curl -I "https://wswhomo.afip.gov.ar/wsfev1/service.asmx" 2>&1 | head -5

echo ""
echo "✅ Prueba completada"
