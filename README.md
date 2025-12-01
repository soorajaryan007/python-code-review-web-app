# 🚀 AI-Powered Code Review

**AI-Powered Code Review** is a full-stack web application that securely connects to your GitHub account, allows you to browse your repositories, and provides real-time, asynchronous code analysis using AI.

This project uses a modern, scalable architecture with a decoupled React frontend and a Django backend. It leverages Celery, RabbitMQ, and Redis to process AI analysis requests in the background and delivers the results instantly to the user via WebSockets.

<!-- Replace this with a real screenshot URL! -->

---

# 🏛️ Architecture Overview

This application runs on five core services that all work together:

### 🔹 React Frontend: (Port 3000)

The user interface, built in React.

### 🔹 Django/Daphne Backend: (Port 8000)

The ASGI server that handles all HTTP API requests and WebSocket connections.

### 🔹 RabbitMQ: (Port 5672)

The message broker that holds "analysis" jobs for Celery.

### 🔹 Redis: (Port 6379)

The channel layer broker that allows Django to send real-time WebSocket messages.

### 🔹 Celery Worker

A background process that picks up jobs from RabbitMQ, calls the AI, and publishes results to Redis.

---

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

---

# ✨ Features

* Secure GitHub Login: Authenticates users via the GitHub OAuth2 flow.
* Repository Browser: Fetches and displays a user's repositories, including files and folder structure.
* Code Viewer: Renders file content with syntax highlighting.
* Asynchronous AI Analysis: Uses Celery and RabbitMQ to run AI code reviews in a background task, so the UI is never blocked.
* Real-time Results: Uses Django Channels and Redis to push the analysis results to the user over a WebSocket the moment they are ready.

---

# 💻 Tech Stack

### Frontend:

React, React Hooks, react-syntax-highlighter, atob

### Backend:

Python, Django, Django REST Framework, Django Channels

### Async & Real-time:

Celery, RabbitMQ, Redis, WebSockets

### Database:

SQLite (default for development)

### AI:

Groq API (using the Llama 3, Mixtral, or Gemma models)

### Auth:

GitHub OAuth

### Infrastructure:

Docker (for RabbitMQ and Redis)

---

# ⚖️ License

This project is licensed under the MIT License - see the LICENSE.txt file for details.

---

# 🛠️ Setup & Installation

Before you begin, you must have **Docker installed** and running on your system.

---

## **1. Clone the Repository**

```bash
git clone https://github.com/soorajaryan007/python-code-review-web-app.git
cd python-code-review-web-app
```

---

## **2. Backend Setup**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## **3. Frontend Setup**

```bash
cd frontend
npm install
```

---

# **4. Configuration (API Keys)**

Install python-decouple:

```bash
pip install python-decouple
```

Create `.env` file inside `backend/`:

```
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GROQ_API_KEY=your_groq_api_key_here
```

Update `backend/config/settings.py`:

```python
from decouple import config

GITHUB_CLIENT_ID = config('GITHUB_CLIENT_ID')
GITHUB_CLIENT_SECRET = config('GITHUB_CLIENT_SECRET')
GROQ_API_KEY = config('GROQ_API_KEY')
```

---

# 🚀 How to Run

You need **5 terminals** open to run the entire system.

---

### **Terminal 1 — Start RabbitMQ**

```bash
docker run -d --name my-rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
docker start my-rabbitmq
```

---

### **Terminal 2 — Start Redis**

```bash
docker run -d --name my-redis -p 6379:6379 redis:latest
docker start my-redis
```

---

### **Terminal 3 — Start Backend (Daphne)**

```bash
cd backend
source venv/bin/activate
daphne config.asgi:application
```

---

### **Terminal 4 — Start Celery Worker**

```bash
cd backend
source venv/bin/activate
celery -A config worker --loglevel=info
```

---

### **Terminal 5 — Start React Frontend**

```bash
cd frontend
npm start
```

---

# 🎉 You're Live!

Visit:

👉 **[http://localhost:3000](http://localhost:3000)**

to use the application.

---


