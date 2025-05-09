import pickle
import re
import numpy as np
from collections import Counter
import pandas as pd
import os

class ScalperDomainClassifier:
    """Classifier for determining if an email domain belongs to a scalper."""
    
    def __init__(self, model_path='/Users/steve/Desktop/Thei-FYP/my-app/ml/scalper_model.pkl'):
        """Initialize the classifier with a pre-trained model."""
        self.model_path = model_path
        if os.path.exists(model_path):
            with open(model_path, 'rb') as f:
                self.model = pickle.load(f)
            self.model_loaded = True
        else:
            self.model_loaded = False
            print(f"Warning: Model not found at {model_path}")
        
        # Define common email providers
        self.common_providers = [
            'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 
            'qq.com', 'icloud.com', '163.com', '126.com', 'foxmail.com'
        ]
        
    def extract_features(self, domain):
        """Extract features from a domain name."""
        # Count domain occurrences (defaulting to 1 for new domains)
        count = 1
        
        # 1. Domain popularity (normalized - assuming new domain has low popularity)
        popularity = 0.0001
        
        # 2. Domain length
        domain_length = len(domain)
        
        # 3. Check if it's a common email provider
        is_common_provider = 1 if domain in self.common_providers else 0
        
        # 4. Contains numbers in domain
        has_numbers = 1 if re.search(r'\d', domain) else 0
        
        # 5. Domain extension
        ext = domain.split('.')[-1]
        is_common_tld = 1 if ext in ['com', 'org', 'net', 'edu', 'gov'] else 0
        
        # 6. Domain entropy (randomness)
        char_counts = Counter(domain)
        entropy = -sum((count / len(domain)) * np.log2(count / len(domain)) 
                      for count in char_counts.values())
        
        # 7. Has suspicious keywords
        suspicious_keywords = ['ticket', 'tix', 'scalp', 'resell', 'yeez', 'sneaker']
        has_suspicious_keyword = 0
        for keyword in suspicious_keywords:
            if keyword in domain.lower():
                has_suspicious_keyword = 1
                break
        
        # Return features as a DataFrame row
        features = pd.DataFrame({
            'popularity': [popularity],
            'domain_length': [domain_length],
            'is_common_provider': [is_common_provider],
            'has_numbers': [has_numbers],
            'is_common_tld': [is_common_tld],
            'entropy': [entropy],
            'has_suspicious_keyword': [has_suspicious_keyword]
        })
        
        return features
        
    def predict(self, domain):
        """Classify a domain as scalper (1) or not (0)."""
        if not self.model_loaded:
            # Fallback heuristic if model not loaded
            is_common = domain in self.common_providers
            has_suspicious = any(kw in domain.lower() for kw in ['ticket', 'resell', 'scalp', 'yeez'])
            has_numbers = bool(re.search(r'\d', domain))
            
            # Simple rule-based classification
            if is_common:
                return 0  # Not scalper
            elif has_suspicious or (has_numbers and domain.endswith('.com')):
                return 1  # Potential scalper
            else:
                return 0  # Default to not scalper
        
        # Extract features
        features = self.extract_features(domain)
        
        # Make prediction
        prediction = self.model.predict(features)[0]
        
        return prediction
    
    def predict_proba(self, domain):
        """Return probability of domain being a scalper."""
        if not self.model_loaded:
            # Simple heuristic score if model not loaded
            is_common = domain in self.common_providers
            has_suspicious = any(kw in domain.lower() for kw in ['ticket', 'resell', 'scalp', 'yeez'])
            has_numbers = bool(re.search(r'\d', domain))
            
            # Calculate a score between 0-1
            score = 0
            if not is_common:
                score += 0.4
            if has_suspicious:
                score += 0.4
            if has_numbers:
                score += 0.2
            
            return score
        
        # Extract features
        features = self.extract_features(domain)
        
        # Get probability
        proba = self.model.predict_proba(features)[0][1]  # Probability of class 1
        
        return proba

# Example usage
if __name__ == "__main__":
    classifier = ScalperDomainClassifier()
    
    # Test domains
    test_domains = [
        'gmail.com',
        'hotmail.com',
        'hkyeezy.com',
        'ticketseller123.com',
        'ouhuang666.com',
        'cocomarshy.cc',
        'hellozlc.fun',
        'octobersneakers.com'
    ]
    
    print("Domain Classification Results:")
    for domain in test_domains:
        prediction = classifier.predict(domain)
        probability = classifier.predict_proba(domain)
        result = "SCALPER" if prediction == 1 else "NORMAL"
        print(f"{domain}: {result} (Confidence: {probability:.2f})")
