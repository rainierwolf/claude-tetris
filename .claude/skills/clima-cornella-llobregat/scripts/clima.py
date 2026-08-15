#!/usr/bin/env python3
"""Consulta el tiempo actual y la previsión de hoy para Cornellà de Llobregat
(Barcelona) usando la API pública y gratuita de Open-Meteo (sin API key).
"""
import json
import sys
import urllib.request

LAT, LON = 41.3557, 2.0700

URL = (
    "https://api.open-meteo.com/v1/forecast"
    f"?latitude={LAT}&longitude={LON}"
    "&current=temperature_2m,relative_humidity_2m,apparent_temperature,"
    "precipitation,weather_code,wind_speed_10m,wind_direction_10m"
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
    "&timezone=Europe%2FMadrid"
)

WEATHER_CODES = {
    0: "Cielo despejado",
    1: "Mayormente despejado",
    2: "Parcialmente nublado",
    3: "Nublado",
    45: "Niebla",
    48: "Niebla con escarcha",
    51: "Llovizna ligera",
    53: "Llovizna moderada",
    55: "Llovizna intensa",
    56: "Llovizna helada ligera",
    57: "Llovizna helada intensa",
    61: "Lluvia ligera",
    63: "Lluvia moderada",
    65: "Lluvia intensa",
    66: "Lluvia helada ligera",
    67: "Lluvia helada intensa",
    71: "Nevada ligera",
    73: "Nevada moderada",
    75: "Nevada intensa",
    77: "Granos de nieve",
    80: "Chubascos ligeros",
    81: "Chubascos moderados",
    82: "Chubascos violentos",
    85: "Chubascos de nieve ligeros",
    86: "Chubascos de nieve intensos",
    95: "Tormenta",
    96: "Tormenta con granizo ligero",
    99: "Tormenta con granizo intenso",
}


def describe(code):
    return WEATHER_CODES.get(code, f"Código de tiempo desconocido ({code})")


def main():
    try:
        with urllib.request.urlopen(URL, timeout=10) as resp:
            data = json.loads(resp.read().decode())
    except Exception as exc:  # noqa: BLE001 - queremos capturar cualquier fallo de red/parseo
        print(f"Error al consultar la API de tiempo de Open-Meteo: {exc}", file=sys.stderr)
        sys.exit(1)

    cur = data["current"]
    daily = data["daily"]

    print("Tiempo actual en Cornellà de Llobregat (Barcelona)")
    print("=" * 52)
    print(f"Condición:        {describe(cur['weather_code'])}")
    print(f"Temperatura:      {cur['temperature_2m']} °C (sensación {cur['apparent_temperature']} °C)")
    print(f"Humedad relativa: {cur['relative_humidity_2m']}%")
    print(f"Precipitación:    {cur['precipitation']} mm")
    print(f"Viento:           {cur['wind_speed_10m']} km/h ({cur['wind_direction_10m']}°)")
    print()
    print("Previsión de hoy")
    print("-" * 52)
    print(f"Condición:        {describe(daily['weather_code'][0])}")
    print(f"Máxima / mínima:  {daily['temperature_2m_max'][0]} °C / {daily['temperature_2m_min'][0]} °C")
    print(f"Prob. de lluvia:  {daily['precipitation_probability_max'][0]}%")


if __name__ == "__main__":
    main()
