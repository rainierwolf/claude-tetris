---
name: clima-cornella-llobregat
description: Consulta el tiempo actual y la previsión meteorológica de Cornellà de Llobregat (Barcelona) usando la API pública y gratuita Open-Meteo (sin API key). Actívala cuando el usuario pregunte por el clima, el tiempo, la temperatura, la lluvia, el viento o la previsión meteorológica de Cornellà de Llobregat.
---

# Clima de Cornellà de Llobregat

Obtiene el tiempo actual y la previsión del día para Cornellà de Llobregat (Barcelona, España) usando la API pública y gratuita de [Open-Meteo](https://open-meteo.com/) (no requiere API key ni registro).

## Coordenadas usadas
- Latitud: 41.3557
- Longitud: 2.0700
- Zona horaria: Europe/Madrid

## Cómo usarla

Ejecuta el script incluido con Python 3 (solo usa la librería estándar, sin dependencias externas):

```bash
python3 .claude/skills/clima-cornella-llobregat/scripts/clima.py
```

Si el directorio de trabajo actual no es la raíz del proyecto, usa la ruta absoluta del script.

El script imprime:
- Condición actual (despejado, nublado, lluvia, etc.)
- Temperatura y sensación térmica
- Humedad relativa
- Precipitación acumulada
- Velocidad y dirección del viento
- Previsión de máxima/mínima y probabilidad de lluvia para hoy

Después de ejecutarlo, resume el resultado para el usuario en una respuesta breve y natural en español (no te limites a pegar la salida cruda del script).

## Notas
- La API de Open-Meteo es gratuita y no requiere autenticación.
- Si la petición HTTP falla (sin conexión, timeout, servicio caído, etc.), informa del error al usuario en vez de inventar datos meteorológicos.
