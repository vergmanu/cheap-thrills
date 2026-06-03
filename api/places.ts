// import type { VercelRequest, VercelResponse } from '@vercel/node';

// export default async function handler(req: VercelRequest, res: VercelResponse) {
//   const { zipCode } = req.query;

//   if (!zipCode || typeof zipCode !== 'string') {
//     return res.status(400).json({ error: 'Zip code is required' });
//   }

//   const apiKey = process.env.GEOAPIFY_API_KEY;
//   if (!apiKey) {
//     return res.status(500).json({ error: 'Geoapify API is not configured' });
//   }

//   const limit = process.env.MAX_RESULTS || '20';
//   const radius = process.env.SEARCH_RADIUS_MILES || '5';
//   const radiusMeters = Math.round(Number(radius) * 1609);

//   try {
//     // Step 1: Convert zip code to lat/lng using Geoapify Geocoding
//     const geoRes = await fetch(
//       `https://api.geoapify.com/v1/geocode/search?postcode=${zipCode}&countrycode=us&apiKey=${apiKey}`
//     );
//     if (!geoRes.ok) {
//       return res.status(400).json({ error: 'Could not locate zip code. Please try again.' });
//     }
//     const geoData = await geoRes.json();
//     if (!geoData.features || geoData.features.length === 0) {
//       return res.status(400).json({ error: 'Zip code not found. Please try again.' });
//     }
//     const [lon, lat] = geoData.features[0].geometry.coordinates;

//     // Step 2: Search for bars and restaurants near those coordinates
//     const placesRes = await fetch(
//       `https://api.geoapify.com/v2/places?categories=catering.bar,catering.restaurant&filter=circle:${lon},${lat},${radiusMeters}&limit=${limit}&apiKey=${apiKey}`
//     );
//     if (!placesRes.ok) {
//       const errorBody = await placesRes.json();
//       return res.status(placesRes.status).json({
//         error: 'Places request failed',
//         details: errorBody,
//       });
//     }

//     const data = await placesRes.json();
//     res.setHeader('Access-Control-Allow-Origin', '*');
//     return res.status(200).json(data);

//   } catch (error) {
//     return res.status(500).json({ error: 'Request failed. Please try again.' });
//   }
// }


import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { zipCode } = req.query;

  if (!zipCode || typeof zipCode !== 'string') {
    return res.status(400).json({ error: 'Zip code is required' });
  }

  const apiKey = process.env.EVENTAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'EventAI API is not configured' });
  }

  const radius = process.env.SEARCH_RADIUS_MILES || '5';
  const limit = process.env.MAX_RESULTS || '20';

  try {
    // Step 1: Convert zip to lat/lng using Zippopotam (no key needed)
    const geoRes = await fetch(`https://api.zippopotam.us/us/${zipCode}`);
    if (!geoRes.ok) {
      return res.status(400).json({ error: 'Could not locate zip code. Please try again.' });
    }
    const geoData = await geoRes.json();
    if (!geoData.places || geoData.places.length === 0) {
      return res.status(400).json({ error: 'Zip code not found. Please try again.' });
    }
    const lat = parseFloat(geoData.places[0].latitude);
    const lng = parseFloat(geoData.places[0].longitude);

    console.log('Searching near:', { lat, lng, radius, limit });

    // Step 2: Fetch happy hours from EventAI
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      radius_miles: radius,
      limit,
    });

    const response = await fetch(
      `https://www.eventaiapi.com/api/v1/happy-hours?${params.toString()}`,
      {
        headers: {
          'X-API-Key': apiKey,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorBody = await response.json();
      return res.status(response.status).json({
        error: 'EventAI request failed',
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