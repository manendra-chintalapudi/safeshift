import { NextResponse } from 'next/server';

const CITIES = [
  { name: 'Delhi',     lat: 28.6139, lng: 77.2090 },
  { name: 'Mumbai',    lat: 19.0760, lng: 72.8777 },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
  { name: 'Chennai',   lat: 13.0827, lng: 80.2707 },
  { name: 'Pune',      lat: 18.5204, lng: 73.8567 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { name: 'Kolkata',   lat: 22.5726, lng: 88.3639 },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { name: 'Jaipur',    lat: 26.9124, lng: 75.7873 },
  { name: 'Lucknow',   lat: 26.8467, lng: 80.9462 },
];

function codeToCondition(code: number): { label: string; emoji: string } {
  if (code === 0)           return { label: 'Clear',        emoji: '☀️'  };
  if (code <= 3)            return { label: 'Partly Cloudy',emoji: '⛅'  };
  if (code <= 48)           return { label: 'Foggy',        emoji: '🌫️' };
  if (code <= 57)           return { label: 'Drizzle',      emoji: '🌦️' };
  if (code <= 67)           return { label: 'Rain',         emoji: '🌧️' };
  if (code <= 77)           return { label: 'Snow',         emoji: '❄️'  };
  if (code <= 82)           return { label: 'Showers',      emoji: '🌧️' };
  if (code <= 99)           return { label: 'Thunderstorm', emoji: '⛈️' };
  return                           { label: 'Cloudy',       emoji: '☁️'  };
}

export async function GET() {
  const results = await Promise.allSettled(
    CITIES.map(async (city) => {
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${city.lat}&longitude=${city.lng}` +
        `&current=temperature_2m,weather_code,wind_speed_10m,precipitation` +
        `&timezone=auto`;
      const res = await fetch(url, { next: { revalidate: 1800 } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const { label, emoji } = codeToCondition(data.current.weather_code);
      return {
        city:      city.name,
        temp:      Math.round(data.current.temperature_2m),
        condition: label,
        emoji,
        wind:      Math.round(data.current.wind_speed_10m),
        rain:      data.current.precipitation as number,
      };
    })
  );

  const weather = results
    .filter((r): r is PromiseFulfilledResult<{
      city: string; temp: number; condition: string;
      emoji: string; wind: number; rain: number;
    }> => r.status === 'fulfilled')
    .map(r => r.value);

  return NextResponse.json({ weather });
}
