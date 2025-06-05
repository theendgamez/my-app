# Ticket System with Scalper Detection

This project combines a Next.js frontend with a Python ML service for scalper detection.

## Prerequisites

- Node.js 18+ and npm
- Python 3.7+
- Git

## Project Setup

### Clone the repository

```bash
git clone <repository-url>
cd my-app
```

### Frontend Setup (Next.js)

1. Install dependencies:

```bash
npm install
```

2. Create a `.env.local` file in the root directory with required environment variables:

```
# Database
DATABASE_URL=your_database_connection_string

# Authentication
JWT_SECRET=your_jwt_secret

# AWS (if using AWS services)
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region

# ML Service
ML_SERVICE_URL=http://localhost:10000
```

3. Run the development server:

```bash
npm run dev
```

Your Next.js app will be available at [http://localhost:3000](http://localhost:3000).

### ML Service Setup (Python)

1. Navigate to the ML directory:

```bash
cd ml
```

2. Install Python dependencies:

```bash
pip install -r requirements.txt
```

3. Train the ML model (if not already trained):

```bash
python scalper_detector.py
```

4. Start the ML service:

For development:
```bash
python app.py
```

For production:
```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app:app
```

The ML service will run on port 10000 by default.

## Project Structure

```
my-app/
├── app/               # Next.js app directory
├── components/        # React components
├── lib/               # Utility functions
├── ml/                # Machine learning service
│   ├── app.py           # FastAPI server
│   ├── scalper_detector.py  # ML model training
│   └── requirements.txt     # Python dependencies
├── public/            # Static assets
├── styles/            # CSS files
└── ...
```

## Development Workflow

1. Make changes to the frontend code in the Next.js app folders
2. Make changes to the ML service in the `ml/` directory
3. Test both services locally
4. Commit changes when satisfied

## Building for Production

### Frontend (Next.js)

```bash
npm run build
```

This will create an optimized production build in the `.next` directory.

To start the production server:

```bash
npm run start
```

### ML Service (Python)

For production deployment of the ML service, first ensure gunicorn is installed:

```bash
cd ml
pip install gunicorn
# or install all requirements
pip install -r requirements.txt
```

Then start with gunicorn:

```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app:app
```

## Deployment Options

### Option 1: Manual Deployment

#### Frontend (Next.js)
Deploy to any Node.js hosting platform like Vercel, Netlify, or a custom server.

```bash
npm run build
npm run start
```

#### ML Service (Python)
Deploy to any Python hosting platform or containerize using Docker.

### Option 2: Docker Deployment

1. Build and run the containers:

```bash
docker-compose up -d
```

This will start both the Next.js app and the ML service.

### Option 3: Cloud Deployment

Deploy the Next.js app to Vercel/Netlify and the ML service to a cloud provider like AWS Lambda, Google Cloud Run, or Heroku.

## Troubleshooting

### Frontend Issues

- Check browser console for errors
- Verify environment variables are set correctly
- Ensure API endpoints are accessible

### ML Service Issues

- Check ML service logs
- Verify model file exists (`scalper_model.pkl`)
- Ensure required Python packages are installed

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Scikit-learn Documentation](https://scikit-learn.org/stable/)

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.