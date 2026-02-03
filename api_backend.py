
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

def _google_places_get(url: str) -> dict:
    if not GOOGLE_PLACES_API_KEY:
        raise HTTPException(status_code=500, detail="GOOGLE_PLACES_API_KEY is not configured on the server.")
    try:
        with urllib.request.urlopen(url) as res:
            payload = res.read().decode("utf-8")
            return json.loads(payload)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Google Places request failed: {e}")

@app.post("/api/plan")
async def create_plan(profile: UserProfile, config: TripConfig):
    # This endpoint logic is handled in geminiService.ts for the React frontend
    # but defined here as requested to maintain backend consistency.
    return {"message": "Plan generated successfully"}

@app.get("/api/places/textsearch")
async def places_textsearch(
    query: str = Query(..., min_length=1),
):
    encoded_query = urllib.parse.quote(query)
    url = (
        "https://maps.googleapis.com/maps/api/place/textsearch/json"
        f"?query={encoded_query}&key={GOOGLE_PLACES_API_KEY}"
    )
    return _google_places_get(url)

@app.get("/api/places/details")
async def places_details(
    place_id: str = Query(..., min_length=1),
    fields: str = Query("opening_hours,name", min_length=1),
):
    encoded_place_id = urllib.parse.quote(place_id)
    encoded_fields = urllib.parse.quote(fields)
    url = (
        "https://maps.googleapis.com/maps/api/place/details/json"
        f"?place_id={encoded_place_id}&fields={encoded_fields}&key={GOOGLE_PLACES_API_KEY}"
    )
    return _google_places_get(url)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
