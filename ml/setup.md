# Setup Guide for Scalper Detection ML

## Environment Setup

1. Make sure Python 3.7+ is installed
2. Install required packages:

```bash
pip install -r requirements.txt
```

Or install individual packages:

```bash
pip install pandas numpy scikit-learn tldextract matplotlib
```

## Running the Model

Execute the main script:

```bash
python scalper_detector.py
```

This will:
1. Load the domain data from `organized_data.csv`
2. Analyze domains for patterns
3. Train a machine learning model
4. Save the model and domain statistics for later use

## Troubleshooting

If you encounter import errors, make sure all required packages are installed:

```bash
pip install -r requirements.txt
```

For specific errors with tldextract, you can install it separately:

```bash
pip install tldextract
```

