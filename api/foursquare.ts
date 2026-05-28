import type { VercelRequest, VercelResponse } from '@vercel/node';

function getFoursquareApiKey(): string | undefined {
  const raw =
    process.env.FOURSQUARE_API_KEY ?? process.env.VITE_FOURSQUARE_API_KEY;
  if (!raw) return undefined;

  const trimmed = raw.trim();
  if (trimmed.toLowerCase().startsWith('fsq ')) {
    return trimmed.slice(4).trim();
  }
  if (trimmed.toLowerCase().startsWith('fsq')) {
    return trimmed.slice(3).trim();
  }
  return trimmed;
}

function buildAuthorizationHeader(apiKey: string): string {
  return `fsq ${apiKey}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { zipCode, radius } = req.query;

  if (!zipCode || typeof zipCode !== 'string') {
    return res.status(400).json({ error: 'Zip code is required' });
  }

  const apiKey = getFoursquareApiKey();
  if (!apiKey) {
    return res.status(500).json({
      error: 'Foursquare API is not configured',
      hint: 'Set FOURSQUARE_API_KEY (recommended) or VITE_FOURSQUARE_API_KEY in Vercel → Settings → Environment Variables for Production.',
    });
  }

  if (process.env.VERCEL_ENV !== 'production') {
    console.log(
      'Foursquare key check:',
      apiKey.slice(0, 4) + '…',
      '| length:',
      apiKey.length,
      '| env:',
      process.env.FOURSQUARE_API_KEY
        ? 'FOURSQUARE_API_KEY'
        : 'VITE_FOURSQUARE_API_KEY',
    );
  }

  const radiusMeters = Math.round(
    Number(radius || process.env.VITE_SEARCH_RADIUS_MILES || 5) * 1609,
  );

  const limit = process.env.VITE_MAX_RESULTS || '20';

  const searchParams = new URLSearchParams({
    query: 'happy hour',
    near: zipCode,
    categories: '13003,13065',
    limit: String(limit),
    fields:
      'fsq_id,name,location,distance,rating,tel,website,hours,categories',
    radius: String(radiusMeters),
  });

  try {
    const response = await fetch(
      `https://api.foursquare.com/v3/places/search?${searchParams.toString()}`,
      {
        headers: {
          Authorization: buildAuthorizationHeader(apiKey),
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message =
        typeof errorBody === 'object' &&
        errorBody !== null &&
        'message' in errorBody
          ? String((errorBody as { message: unknown }).message)
          : 'Foursquare request failed';

      if (response.status === 401) {
        return res.status(401).json({
          error: 'Foursquare rejected the API key (invalid token).',
          hint:
            'In Vercel, set FOURSQUARE_API_KEY to the key only (no "fsq " prefix). Regenerate the key at foursquare.com/developers if needed, then redeploy.',
          foursquareMessage: message,
        });
      }

      return res.status(response.status).json({
        error: 'Foursquare request failed',
        foursquareMessage: message,
      });
    }

    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(data);
  } catch {
    return res.status(500).json({ error: 'Request failed. Please try again.' });
  }
}
