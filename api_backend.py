
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
import os
import json
import urllib.parse
import urllib.request

app = FastAPI()

class UserProfile(BaseModel):
    chronotype: str
    pace: int
    interests: List[str]
    foodScale: float
    foodTags: List[str]
    budget: str

class SafetyToggles(BaseModel):
    filterShredder: bool
    bbGuard: bool
    noQueueMode: bool

class TripConfig(BaseModel):
    destination: str
    startDate: str
    endDate: str
    passengers: int
    safetyToggles: SafetyToggles
    accommodation: str
    transport: str
    customNote: str

GOOGLE_PLACES_API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY")

def _safe_get(url: str, headers: Optional[dict] = None) -> dict:
    try:
        req = urllib.request.Request(url, headers=headers or {})
        with urllib.request.urlopen(req) as res:
            payload = res.read().decode("utf-8")
            return json.loads(payload)
    except Exception as e:
        print(f"Request to {url} failed: {e}")
        raise HTTPException(status_code=502, detail=f"Upstream request failed: {e}")

@app.post("/api/plan")
async def create_plan(profile: UserProfile, config: TripConfig):
    # This endpoint logic is handled in geminiService.ts for the React frontend
    return {"message": "Plan generated successfully"}

@app.get("/api/locations/search")
async def search_locations(q: str = Query(..., min_length=2)):
    """
    Proxies requests to Nominatim for location autocomplete.
    Includes User-Agent header as required by OSM usage policy.
    """
    encoded_q = urllib.parse.quote(q)
    url = f"https://nominatim.openstreetmap.org/search?format=json&q={encoded_q}&limit=5&featuretype=city,country&accept-language=en"
    headers = {
        "User-Agent": "JournalinTravelPlanner/1.0 (contact@example.com)"
    }
    return _safe_get(url, headers=headers)

@app.get("/api/places/textsearch")
async def places_textsearch(
    query: str = Query(..., min_length=1),
):
    if not GOOGLE_PLACES_API_KEY:
        raise HTTPException(status_code=500, detail="GOOGLE_PLACES_API_KEY is not configured.")
    encoded_query = urllib.parse.quote(query)
    url = (
        "https://maps.googleapis.com/maps/api/place/textsearch/json"
        f"?query={encoded_query}&key={GOOGLE_PLACES_API_KEY}"
    )
    return _safe_get(url)

@app.get("/api/places/details")
async def places_details(
    place_id: str = Query(..., min_length=1),
    fields: str = Query("opening_hours,name", min_length=1),
):
    if not GOOGLE_PLACES_API_KEY:
        raise HTTPException(status_code=500, detail="GOOGLE_PLACES_API_KEY is not configured.")
    encoded_place_id = urllib.parse.quote(place_id)
    encoded_fields = urllib.parse.quote(fields)
    url = (
        "https://maps.googleapis.com/maps/api/place/details/json"
        f"?place_id={encoded_place_id}&fields={encoded_fields}&key={GOOGLE_PLACES_API_KEY}"
    )
    return _safe_get(url)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
