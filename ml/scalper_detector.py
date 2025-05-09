import pandas as pd
import numpy as np
import re
from collections import Counter
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
import pickle
from urllib.parse import urlparse

# Try to import tldextract, use a fallback if not available
try:
    import tldextract
    tldextract_available = True
except ImportError:
    tldextract_available = False
    print("Warning: tldextract package not installed. Using basic domain parsing.")
    print("To install: pip install tldextract")

# Define file paths
DATA_PATH = '/Users/steve/Desktop/Thei-FYP/my-app/ml/organized_data.csv'
MODEL_OUTPUT_PATH = '/Users/steve/Desktop/Thei-FYP/my-app/ml/scalper_model.pkl'
DOMAIN_STATS_PATH = '/Users/steve/Desktop/Thei-FYP/my-app/ml/domain_stats.csv'

def extract_domain_parts(domain):
    """Extract domain parts using tldextract if available, otherwise use simple parsing."""
    if tldextract_available:
        extract = tldextract.extract(domain)
        return {
            'subdomain': extract.subdomain,
            'domain': extract.domain,
            'suffix': extract.suffix
        }
    else:
        # Simple fallback implementation
        parts = domain.split('.')
        if len(parts) >= 2:
            suffix = parts[-1]
            domain_part = parts[-2]
            subdomain = '.'.join(parts[:-2]) if len(parts) > 2 else ''
            return {
                'subdomain': subdomain,
                'domain': domain_part,
                'suffix': suffix
            }
        return {
            'subdomain': '',
            'domain': domain,
            'suffix': ''
        }

def load_data():
    """Load and parse the domain data."""
    print("Loading data...")
    # Skip header row (which appears to be a description line)
    df = pd.read_csv(DATA_PATH, header=0)
    # Rename columns for clarity
    df.columns = ['phone_last_digits', 'email_domain']
    return df

def analyze_domains(df):
    """Analyze domain frequency and identify patterns."""
    print("Analyzing domains...")
    
    # Count domain occurrences
    domain_counts = Counter(df['email_domain'])
    total_domains = len(domain_counts)
    
    # Calculate stats for each domain
    domain_stats = []
    
    for domain, count in domain_counts.items():
        # Extract features that might indicate scalper behavior
        
        # 1. Domain popularity (normalized count)
        popularity = count / len(df)
        
        # 2. Domain length (longer custom domains might be suspicious)
        domain_length = len(domain)
        
        # 3. Check if it's a common email provider
        common_providers = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 
                           'qq.com', 'icloud.com', '163.com', '126.com']
        is_common_provider = 1 if domain in common_providers else 0
        
        # 4. Contains numbers in domain
        has_numbers = 1 if re.search(r'\d', domain) else 0
        
        # 5. Domain extension
        ext = domain.split('.')[-1]
        is_common_tld = 1 if ext in ['com', 'org', 'net', 'edu', 'gov'] else 0
        
        # 6. Domain entropy (randomness - higher for unusual domains)
        char_counts = Counter(domain)
        entropy = -sum((count / len(domain)) * np.log2(count / len(domain)) 
                      for count in char_counts.values())
        
        # 7. Has suspicious keywords related to tickets or scalping
        suspicious_keywords = ['ticket', 'tix', 'scalp', 'resell', 'yeez', 'sneaker','piaowu','cocomarshy','ouhuang','wahfung','yuexiu','sneakerhead','sneakernews','sneakerfreaker','sneakerfiles','sneakerwatch','sneakergallery','sneakermuseum','sneakercon','sneakerholics','yorklohshoes','yorkloh','hellozlc','kakalam','douxing']
        has_suspicious_keyword = 0
        for keyword in suspicious_keywords:
            if keyword in domain.lower():
                has_suspicious_keyword = 1
                break
        
        # Store all stats
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
            # Initial label (will be refined by the user)
            'suspected_scalper': 1 if (not is_common_provider and (has_suspicious_keyword or has_numbers)) else 0
        })
    
    # Convert to DataFrame
    domain_stats_df = pd.DataFrame(domain_stats)
    
    # Save domain stats for review
    domain_stats_df.to_csv(DOMAIN_STATS_PATH, index=False)
    
    return domain_stats_df

def train_model(domain_stats_df):
    """Train a model to detect scalper domains."""
    print("Training model...")
    
    # Features for classification
    features = ['popularity', 'domain_length', 'is_common_provider', 
                'has_numbers', 'is_common_tld', 'entropy', 
                'has_suspicious_keyword']
    
    X = domain_stats_df[features]
    # Target variable: manually adjust this initial labeling if needed
    y = domain_stats_df['suspected_scalper']
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
    
    # Initialize and train the model
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    print("\nModel Evaluation:")
    print(classification_report(y_test, y_pred))
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'Feature': features,
        'Importance': model.feature_importances_
    }).sort_values('Importance', ascending=False)
    
    print("\nFeature Importance:")
    print(feature_importance)
    
    # Save model
    with open(MODEL_OUTPUT_PATH, 'wb') as f:
        pickle.dump(model, f)
    
    return model

def identify_suspicious_domains(domain_stats_df, top_n=20):
    """Identify the most suspicious domains."""
    # Sort by suspected scalper probability and other risk factors
    risk_score = (domain_stats_df['suspected_scalper'] * 5 + 
                 domain_stats_df['has_suspicious_keyword'] * 3 + 
                 domain_stats_df['has_numbers'] * 2) * (1 - domain_stats_df['is_common_provider'])
    
    domain_stats_df['risk_score'] = risk_score
    
    suspicious_domains = domain_stats_df.sort_values('risk_score', ascending=False).head(top_n)
    
    print("\nTop Suspicious Domains:")
    for i, (_, row) in enumerate(suspicious_domains.iterrows(), 1):
        print(f"{i}. {row['domain']} (count: {row['count']}, risk score: {row['risk_score']:.2f})")
    
    return suspicious_domains

def main():
    """Main execution function."""
    # Load data
    df = load_data()
    
    # Analyze domains
    domain_stats_df = analyze_domains(df)
    
    # Train model
    model = train_model(domain_stats_df)
    
    # Identify suspicious domains
    suspicious_domains = identify_suspicious_domains(domain_stats_df)
    
    print(f"\nAnalysis complete. Model saved to {MODEL_OUTPUT_PATH}")
    print(f"Domain statistics saved to {DOMAIN_STATS_PATH}")

if __name__ == "__main__":
    main()
