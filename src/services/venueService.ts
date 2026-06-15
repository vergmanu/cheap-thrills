export interface Venue {
    id: string;
    osm_id?: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    latitude: number;
    longitude: number;
    website?: string;
    phone?: string;
    amenity?: string;
    distance_meters?: number;
  }
  
  export interface VenueSearchResponse {
    results: Venue[];
    searchLat: number;
    searchLng: number;
  }
  
  class VenueService {
    async searchByZip(zipCode: string): Promise<VenueSearchResponse> {
      const response = await fetch(
        `/api/venues?zipCode=${encodeURIComponent(zipCode)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch venues');
      }
  
      return data;
    }
  }
  
  export const venueService = new VenueService();