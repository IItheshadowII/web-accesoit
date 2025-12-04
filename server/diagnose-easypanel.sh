#!/bin/bash
# Script de diagnóstico para Easypanel

echo "🔍 DIAGNÓSTICO DE EASYPANEL"
echo "=========================="
echo ""

# 1. Variables de entorno
echo "1️⃣ Variables de entorno configuradas:"
echo "EASYPANEL_URL: ${EASYPANEL_URL:-'NO CONFIGURADA'}"
echo "EASYPANEL_API_KEY: ${EASYPANEL_API_KEY:0:20}... (primeros 20 chars)"
echo "EASYPANEL_PROJECT_ID: ${EASYPANEL_PROJECT_ID:-'NO CONFIGURADA'}"
echo "MOCK_EASYPANEL: ${MOCK_EASYPANEL:-'NO CONFIGURADA (default: false)'}"
echo ""

# 2. Verificar si Easypanel está corriendo
echo "2️⃣ Verificando si Easypanel está corriendo:"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|301\|302"; then
    echo "✅ Easypanel responde en localhost:3000"
else
    echo "❌ Easypanel NO responde en localhost:3000"
    echo "   Probando puerto 3001..."
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 | grep -q "200\|301\|302"; then
        echo "✅ Easypanel responde en localhost:3001"
    else
        echo "❌ Easypanel NO responde"
    fi
fi
echo ""

# 3. Test de conectividad desde dentro del contenedor
echo "3️⃣ Test de conectividad desde el contenedor web-accesoit:"
docker exec web-accesoit curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3000 || echo "❌ No se puede conectar"
echo ""

# 4. Verificar red Docker
echo "4️⃣ Verificando red Docker:"
docker network inspect easypanel | grep -A 5 "web-accesoit" || echo "⚠️ web-accesoit no está en la red easypanel"
echo ""

# 5. Listar contenedores en la red easypanel
echo "5️⃣ Contenedores en la red easypanel:"
docker network inspect easypanel -f '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null || echo "❌ Red easypanel no existe"
echo ""

echo "✅ Diagnóstico completado"
