// import type { VercelRequest, VercelResponse } from '@vercel/node';

// export default async function handler(req: VercelRequest, res: VercelResponse) {
//   const { zipCode, radius } = req.query;

//   if (!zipCode || typeof zipCode !== 'string') {
//     return res.status(400).json({ error: 'Zip code is required' });
//   }

//   const apiKey = process.env.FOURSQUARE_API_KEY;
//   if (!apiKey) {
//     return res.status(500).json({ error: 'Foursquare API is not configured' });
//   }

//   const radiusMeters = Math.round(
//     Number(radius || process.env.VITE_SEARCH_RADIUS_MILES || 5) * 1609,
//   );

//   const limit = process.env.VITE_MAX_RESULTS || '20';

//   const searchParams = new URLSearchParams({
//     query: 'happy hour',
//     near: zipCode,
//     categories: '13003,13065',
//     limit: String(limit),
//     fields:
//       'fsq_id,name,location,distance,rating,tel,website,hours,categories',
//     radius: String(radiusMeters),
//   });

//   try {
//     const response = await fetch(
//       `https://api.foursquare.com/v3/places/search?${searchParams.toString()}`,
//       {
//         headers: {
//           Authorization: `fsq ${apiKey}`,
//           Accept: 'application/json',
//         },
//       },
//     );

//     if (!response.ok) {
//       return res
//         .status(response.status)
//         .json({ error: 'Foursquare request failed' });
//     }

//     const data = await response.json();
//     res.setHeader('Access-Control-Allow-Origin', '*');
//     return res.status(200).json(data);
//   } catch {
//     return res.status(500).json({ error: 'Request failed. Please try again.' });
//   }
// }

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { zipCode } = req.query;

  if (!zipCode || typeof zipCode !== 'string') {
    return res.status(400).json({ error: 'Zip code is required' });
  }

  const apiKey = process.env.FOURSQUARE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Foursquare API is not configured' });
  }

  const limit = process.env.MAX_RESULTS || '20';

  try {
    // Step 1: Convert zip to city using Zippopotam (no key needed)
    const geoRes = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
    if (!geoRes.ok) {
      return res.status(400).json({ error: 'Could not locate zip code. Please try again.' });
    }
    const geoData = await geoRes.json();
    const city = geoData.places[0]['place name'];
    const state = geoData.places[0]['state abbreviation'];
    const location = `${city}, ${state}`;

    // Step 2: Search Foursquare using city string
    const response = await fetch(
      `https://places-api.foursquare.com/places/search?query=happy+hour&near=${encodeURIComponent(location)}&categories=13003,13065&limit=${limit}&fields=fsq_id,name,location,distance,rating,tel,website,hours,categories`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'X-Places-Api-Version': '2025-06-17',
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorBody = await response.json();
      return res.status(response.status).json({
        error: 'Foursquare request failed',
        details: errorBody,
      });
    }

    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(data);

  } catch (error) {
    return res.status(500).json({ error: 'Request failed. Please try again.' });
  }
}