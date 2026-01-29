
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

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

@app.post("/api/plan")
async def create_plan(profile: UserProfile, config: TripConfig):
    # This endpoint logic is handled in geminiService.ts for the React frontend
    # but defined here as requested to maintain backend consistency.
    return {"message": "Plan generated successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
