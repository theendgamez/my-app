# Setup Guide for Scalper Detection ML

## Environment Setup

1. **Navigate to the ML directory:**
```bash
```

2. **Make sure Python 3.7+ is installed**
   - Check if Python is available: `python --version` or `python3 --version`
   - If not installed, download from [python.org](https://python.org)

3. **Set up virtual environment (recommended):**
```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

4. **Install required packages:**

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

Or if `python` command is not found, try:

```bash
python3 scalper_detector.py
```

This will:
1. Load the domain data from `organized_data.csv`
2. Analyze domains for patterns
3. Train a machine learning model
4. Save the model and domain statistics for later use

## Troubleshooting

### Common Issues:

**1. "cd: no such file or directory: ml"**
- Make sure you're in the correct parent directory
- Use full path: `cd /Users/steve/Desktop/Thei-FYP/my-app/ml`

**2. "zsh: command not found: python"**
- Try `python3` instead of `python`
- Install Python from [python.org](https://python.org) if not installed
- On macOS with Homebrew: `brew install python`

**3. Import errors or package issues:**
```bash
pip install -r requirements.txt
```

**4. Virtual environment activation:**
- Make sure virtual environment is activated (you should see `(.venv)` in terminal)
- If not activated: `source .venv/bin/activate`

For specific errors with tldextract, you can install it separately:

```bash
pip install tldextract
```

