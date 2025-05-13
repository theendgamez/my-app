import os
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import re
from typing import List, Dict, Any, Optional
import math
import uvicorn

app = FastAPI()

# 配置日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 加載模型
try:
    model = joblib.load('scalper_model.pkl')
except Exception as e:
    logger.error(f"模型加載失敗: {e}")
    raise Exception(f"模型加載失敗: {e}")

class DomainFeatures(BaseModel):
    popularity: float
    domain_length: int
    is_common_provider: int
    has_numbers: int
    is_common_tld: int
    entropy: float
    has_suspicious_keyword: int
    has_repetitive_pattern: int

class UserData(BaseModel):
    userId: str
    email: str
    userName: Optional[str] = None

class UsersBatch(BaseModel):
    users: List[UserData]

@app.post("/predict")
async def predict(features: DomainFeatures):
    try:
        data = pd.DataFrame([features.dict()])
        prediction = model.predict(data)[0]
        probability = model.predict_proba(data)[0].max()
        return {"is_scalper": int(prediction), "probability": float(probability)}
    except Exception as e:
        logger.error(f"預測錯誤: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/predict")
async def predict_get():
    return {"message": "請使用 POST 方法提交 JSON 數據進行預測"}

def extract_domain(email: str) -> str:
    if not email or '@' not in email:
        return ""
    return email.split('@')[-1]

def calculate_entropy(domain: str) -> float:
    if not domain:
        return 0
    freq = {}
    for c in domain:
        freq[c] = freq.get(c, 0) + 1
    length = len(domain)
    entropy = 0
    for count in freq.values():
        probability = count / length
        entropy -= probability * math.log2(probability)
    return entropy

def detect_repetitive_pattern(domain: str) -> int:
    pattern = re.compile(r'(.{2,4})\1', re.IGNORECASE)
    return 1 if pattern.search(domain) else 0

def extract_features(domain: str) -> Dict[str, Any]:
    common_providers = [
        'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.com.hk',
        'qq.com', 'icloud.com', '163.com', '126.com', 'ymail.com', 'foxmail.com'
    ]
    common_tlds = ['.com', '.org', '.net', '.edu', '.gov']
    suspicious_keywords = ['ticket', 'tix', 'scalp', 'resell', 'yeez', 'sneaker', 'piaowu', 
                          'cocomarshy', 'ouhuang', 'wahfung', 'yuexiu', 'sneakerhead', 
                          'sneakernews', 'sneakerfreaker', 'sneakerfiles', 'sneakerwatch', 
                          'sneakergallery', 'sneakermuseum', 'sneakercon', 'sneakerholics', 
                          'yorklohshoes', 'yorkloh', 'hellozlc', 'kakalam', 'douxing']
    has_suspicious = 1 if any(keyword in domain.lower() for keyword in suspicious_keywords) else 0
    has_numbers = 1 if re.search(r'\d', domain) else 0
    has_repetitive = detect_repetitive_pattern(domain)
    return {
        'popularity': 1.0,
        'domain_length': len(domain),
        'is_common_provider': 1 if domain in common_providers else 0,
        'has_numbers': has_numbers,
        'is_common_tld': 1 if any(tld in domain for tld in common_tlds) else 0,
        'entropy': calculate_entropy(domain),
        'has_suspicious_keyword': has_suspicious,
        'has_repetitive_pattern': has_repetitive
    }

@app.post("/analyze-users")
async def analyze_users(batch: UsersBatch):
    logger.info(f"接收到批量請求: {batch}")
    results = []
    for user in batch.users:
        try:
            domain = extract_domain(user.email)
            if not domain:
                results.append({
                    "userId": user.userId,
                    "email": user.email,
                    "domain": "",
                    "error": "無效的電子郵件地址",
                    "riskLevel": "unknown"
                })
                continue
            features = extract_features(domain)
            if features['is_common_provider'] == 1:
                prediction = 0  # 非黃牛
                probability = 0.05  # 極低概率
                risk_level = "low"
            else:
                data = pd.DataFrame([features])
                prediction = int(model.predict(data)[0])
                probability = float(model.predict_proba(data)[0].max())
                risk_level = "low"
            if probability > 0.8:
                risk_level = "very-high"
            elif probability > 0.6:
                risk_level = "high"
            elif probability > 0.4:
                risk_level = "medium"
            results.append({
                "userId": user.userId,
                "email": user.email,
                "domain": domain,
                "prediction": {
                    "is_scalper": prediction,
                    "probability": probability,
                    "riskLevel": risk_level
                },
                "features": features
            })
        except Exception as e:
            logger.error(f"用戶 {user.userId} 分析錯誤: {e}")
            results.append({
                "userId": user.userId,
                "email": user.email,
                "error": str(e),
                "riskLevel": "error"
            })
    return {"results": results}

@app.get("/")
async def root():
    return {"message": "黃牛檢測 API"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port, timeout_keep_alive=120)