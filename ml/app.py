from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd

app = FastAPI()

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# 載入模型
model = joblib.load('scalper_model.pkl')

# 定義輸入數據結構 - Updated to match the features used during model training
class DomainFeatures(BaseModel):
    popularity: float
    domain_length: int
    is_common_provider: int
    has_numbers: int
    is_common_tld: int
    entropy: float
    has_suspicious_keyword: int

# 預測端點
@app.post("/predict")
async def predict(features: DomainFeatures):
    try:
        # 將輸入數據轉為 DataFrame
        data = pd.DataFrame([features.dict()])
        # 進行預測
        prediction = model.predict(data)[0]
        probability = model.predict_proba(data)[0].max()
        return {"is_scalper": int(prediction), "probability": float(probability)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Add GET handler for /predict endpoint
@app.get("/predict")
async def predict_get():
    return {"message": "Please use POST method with JSON body for prediction"}

# 測試端點
@app.get("/")
async def root():
    return {"message": "Scalper Detection API"}