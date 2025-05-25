import pandas as pd
import numpy as np
import re
from collections import Counter
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report ,confusion_matrix
import pickle

DATA_PATH = '/Users/steve/Desktop/Thei-FYP/my-app/ml/organized_data.csv'
MODEL_OUTPUT_PATH = '/Users/steve/Desktop/Thei-FYP/my-app/ml/scalper_model.pkl'
DOMAIN_STATS_PATH = '/Users/steve/Desktop/Thei-FYP/my-app/ml/domain_stats.csv'

def load_data():
    print("載入數據...")
    df = pd.read_csv(DATA_PATH, header=0)
    df.columns = ['phone_last_digits', 'email_domain']
    if df.empty:
        raise ValueError("CSV 文件為空或無有效數據")
    return df

def detect_repetitive_pattern(domain: str) -> int:
    pattern = re.compile(r'(.{2,4})\1', re.IGNORECASE)
    return 1 if pattern.search(domain) else 0

def analyze_domains(df):
    print("分析域名...")
    if df.empty:
        raise ValueError("輸入數據框為空，無法分析域名")
    domain_counts = Counter(df['email_domain'])
    total_domains = len(domain_counts)
    domain_stats = []
    for domain, count in domain_counts.items():
        popularity = count / len(df)
        domain_length = len(domain)
        common_providers = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.com.hk',
                            'qq.com', 'icloud.com', '163.com', '126.com', 'ymail.com', 'foxmail.com'
                            ]
        is_common_provider = 1 if domain in common_providers else 0
        has_numbers = 1 if re.search(r'\d', domain) else 0
        ext = domain.split('.')[-1]
        is_common_tld = 1 if ext in ['com', 'org', 'net', 'edu', 'gov'] else 0
        char_counts = Counter(domain)
        entropy = -sum((count / len(domain)) * np.log2(count / len(domain)) 
                      for count in char_counts.values()) if len(domain) > 0 else 0
        suspicious_keywords = ['ticket', 'tix', 'scalp', 'resell', 'yeez', 'sneaker', 'piaowu', 
                              'cocomarshy', 'ouhuang', 'wahfung', 'yuexiu', 'sneakerhead', 
                              'sneakernews', 'sneakerfreaker', 'sneakerfiles', 'sneakerwatch', 
                              'sneakergallery', 'sneakermuseum', 'sneakercon', 'sneakerholics', 
                              'yorklohshoes', 'yorkloh', 'hellozlc', 'kakalam', 'douxing']
        has_suspicious_keyword = 1 if any(keyword in domain.lower() for keyword in suspicious_keywords) else 0
        has_repetitive_pattern = detect_repetitive_pattern(domain)
        suspected_scalper = 0 if is_common_provider else (1 if (has_suspicious_keyword or has_numbers or has_repetitive_pattern) else 0)
        domain_stats.append({
            'domain': domain,
            'count': count,
            'popularity': popularity,
            'domain_length': domain_length,
            'is_common_provider': is_common_provider,
            'has_numbers': has_numbers,
            'is_common_tld': is_common_tld,
            'entropy': entropy,
            'has_suspicious_keyword': has_suspicious_keyword,
            'has_repetitive_pattern': has_repetitive_pattern,
            'suspected_scalper': suspected_scalper
        })
    domain_stats_df = pd.DataFrame(domain_stats)
    if domain_stats_df.empty:
        raise ValueError("域名統計數據框為空，無法繼續")
    domain_stats_df.to_csv(DOMAIN_STATS_PATH, index=False)
    return domain_stats_df

def train_model(domain_stats_df):
    print("訓練模型...")
    features = ['popularity', 'domain_length', 'is_common_provider', 
                'has_numbers', 'is_common_tld', 'entropy', 
                'has_suspicious_keyword', 'has_repetitive_pattern']
    X = domain_stats_df[features]
    y = domain_stats_df['suspected_scalper']
    # 合併手動標籤
    try:
        manual_labels = pd.read_csv('manual_labels.csv')  # 格式: domain, is_scalper
        domain_stats_df = domain_stats_df.merge(manual_labels, on='domain', how='left')
        domain_stats_df['suspected_scalper'] = domain_stats_df['is_scalper'].fillna(domain_stats_df['suspected_scalper'])
        y = domain_stats_df['suspected_scalper']
    except FileNotFoundError:
        print("未找到手動標籤文件，使用自動標籤")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
    model = RandomForestClassifier(n_estimators=100, max_depth=15, random_state=42)  # 增加樹數和深度
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)
    print("\n模型評估:")
    print(classification_report(y_test, y_pred))
    print("\n混淆矩陣:")
    print(confusion_matrix(y_test, y_pred))
    feature_importance = pd.DataFrame({
        'Feature': features,
        'Importance': model.feature_importances_
    }).sort_values('Importance', ascending=False)
    print("\n特徵重要性:")
    print(feature_importance)
    with open(MODEL_OUTPUT_PATH, 'wb') as f:
        pickle.dump(model, f)
    return model

def identify_suspicious_domains(domain_stats_df, top_n=20):
    risk_score = (domain_stats_df['suspected_scalper'] * 5 + 
                 domain_stats_df['has_suspicious_keyword'] * 3 + 
                 domain_stats_df['has_numbers'] * 2 + 
                 domain_stats_df['has_repetitive_pattern'] * 2) * (1 - domain_stats_df['is_common_provider'])
    domain_stats_df['risk_score'] = risk_score
    suspicious_domains = domain_stats_df.sort_values('risk_score', ascending=False).head(top_n)
    print("\n最可疑域名:")
    for i, (_, row) in enumerate(suspicious_domains.iterrows(), 1):
        print(f"{i}. {row['domain']} (計數: {row['count']}, 風險分數: {row['risk_score']:.2f})")
    return suspicious_domains

def main():
    df = load_data()
    domain_stats_df = analyze_domains(df)
    model = train_model(domain_stats_df)
    suspicious_domains = identify_suspicious_domains(domain_stats_df)
    print(f"\n分析完成。模型已保存至 {MODEL_OUTPUT_PATH}")
    print(f"域名統計已保存至 {DOMAIN_STATS_PATH}")

if __name__ == "__main__":
    main()