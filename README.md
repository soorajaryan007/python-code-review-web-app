CodeSentry - AI-Powered Code ReviewCodeSentry is a full-stack web application that securely connects to your GitHub account, allows you to browse your repositories, and provides real-time, asynchronous code analysis using AI.This project uses a modern, scalable architecture with a decoupled React frontend and a Django backend. It leverages Celery, RabbitMQ, and Redis to process AI analysis requests in the background and delivers the results instantly to the user via WebSockets.<!-- Replace this with a real screenshot URL! -->🏛️ Architecture OverviewThis application runs on five core services that all work together:React Frontend: (Port 3000) The user interface, built in React.Django/Daphne Backend: (Port 8000) The ASGI server that handles all HTTP API requests and WebSocket connections.RabbitMQ: (Port 5672) The message broker that holds "analysis" jobs for Celery.Redis: (Port 6379) The channel layer broker that allows Django to send real-time WebSocket messages.Celery Worker: A background process that picks up jobs from RabbitMQ, calls the AI, and publishes results to Redis.graph TD
    subgraph User's Computer
        A[🌐 Browser @ localhost:3000<br>(React App)]
    end
    
    subgraph Server-Side Services
        B[🐍 Django Server @ localhost:8000<br>(Daphne - ASGI)]
        C[🐇 Celery Worker<br>(Background Process)]
        D[🐰 RabbitMQ<br>(Message Queue)]
        E[♦️ Redis<br>(Channel Layer)]
    end
    
    subgraph External APIs
        F[🐙 GitHub API<br>(OAuth & Repo Data)]
        G[🤖 Groq AI API<br>(Code Analysis)]
    end
    
    A -- 1. Login --> F
    F -- 2. Auth Callback --> B
    B -- 3. Get Repos --> F
    F -- 4. Repo List --> B
    B -- 5. Show Repos --> A
    A -- 6. Analyze File (HTTP POST) --> B
    B -- 7. Create Task --> D
    C -- 8. Get Task --> D
    C -- 9. Call AI --> G
    G -- 10. AI Result --> C
    C -- 11. Send Result --> E
    E -- 12. WebSocket Push --> B
    B -- 13. WebSocket Push --> A

✨ FeaturesSecure GitHub Login: Authenticates users via the GitHub OAuth2 flow.Repository Browser: Fetches and displays a user's repositories, including files and folder structure.Code Viewer: Renders file content with syntax highlighting.Asynchronous AI Analysis: Uses Celery and RabbitMQ to run AI code reviews in a background task, so the UI is never blocked.Real-time Results: Uses Django Channels and Redis to push the analysis results to the user over a WebSocket the moment they are ready.💻 Tech StackFrontend: React, React Hooks, react-syntax-highlighter, atobBackend: Python, Django, Django REST Framework, Django ChannelsAsync & Real-time: Celery, RabbitMQ, Redis, WebSocketsDatabase: SQLite (default for development)AI: Groq API (using the Llama 3, Mixtral, or Gemma models)Auth: GitHub OAuthInfrastructure: Docker (for RabbitMQ and Redis)⚖️ LicenseThis project is licensed under the MIT License - see the LICENSE.txt file for details.🛠️ Setup & InstallationBefore you begin, you must have Docker installed and running on your system.1. Clone the Repositorygit clone [https://github.com/soorajaryan007/python-code-review-web-app.git](https://github.com/soorajaryan007/python-code-review-web-app.git)

# In terminal
cd python-code-review-web-app

2. Backend Setup First, let's set up the Django backend and its dependencies.
# Navigate to the backend directory
cd backend  (it will look like : python-code-review-web-app/backend )

# Create a Python virtual environment
python3 -m venv venv

# Activate the environment
source venv/bin/activate

# Before you install, generate a requirements.txt file
# (Run this once on your original machine to create the file)
# pip freeze > requirements.txt

# Install all Python dependencies
pip install -r requirements.txt

3. Frontend SetupNext, set up the React frontend.# From the root directory, navigate to the frontend
cd frontend

# Install all Node.js dependencies
npm install

4. Configuration (API Keys)This project requires secret API keys to run. We will use a .env file for this.Install python-decouple in your backend venv:pip install python-decouple

Create your .env file:In the backend directory, create a new file named .env and add your keys to it:# In backend/.env

GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GROQ_API_KEY=your_groq_api_key_here

Update your settings.py file:Open backend/config/settings.py and replace the hard-coded keys at the bottom with this code, which safely loads them from your .env file.# At the top of backend/config/settings.py
from decouple import config

# ... (rest of your settings) ...

# At the bottom of backend/config/settings.py
# REPLACE your old GitHub/Groq keys with this:

# API Key Configuration
GITHUB_CLIENT_ID = config('GITHUB_CLIENT_ID')
GITHUB_CLIENT_SECRET = config('GITHUB_CLIENT_SECRET')
GROQ_API_KEY = config('GROQ_API_KEY')

🚀 How to RunTo run the application, you must have 5 services running simultaneously in 5 separate terminals.Terminal 1: Start RabbitMQThis service holds the "analysis" jobs.# (You only need to run this once ever)
docker run -d --name my-rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management

# (Run this every time you want to start it)
docker start my-rabbitmq

Terminal 2: Start RedisThis service handles real-time WebSocket messages.# (You only need to run this once ever)
docker run -d --name my-redis -p 6379:6379 redis:latest

# (Run this every time you want to start it)
docker start my-redis

Terminal 3: Start the Backend (Daphne)This is your main Django API and WebSocket server.cd backend
source venv/bin/activate

# Run the Daphne ASGI server
# (If you created the 'run_asgi' config in PyCharm, just press Play)
daphne config.asgi:application

Terminal 4: Start the Celery WorkerThis is the background process that runs the AI analysis.cd backend
source venv/bin/activate

# Run the Celery worker
celery -A config worker --loglevel=info

Terminal 5: Start the Frontend (React)This is your user interface.cd frontend

# Run the React app
npm start

You're live!Once all 5 services are running, open your browser to http://localhost:3000 to use the application.
