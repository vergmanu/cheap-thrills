import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { zipCode, radius } = req.query;

  if (!zipCode || typeof zipCode !== 'string') {
    return res.status(400).json({ error: 'Zip code is required' });
  }

  const apiKey = process.env.FOURSQUARE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Foursquare API is not configured' });
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
          Authorization: `fsq ${apiKey}`,
          Accept: 'application/json',
        },
      },
    );

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: 'Foursquare request failed' });
    }

    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(data);
  } catch {
    return res.status(500).json({ error: 'Request failed. Please try again.' });
  }
}
