# 🚀 AI-Powered Code Review

**AI-Powered Code Review** is a full-stack web application that securely connects to your GitHub account, allows you to browse your repositories, and provides real-time, asynchronous code analysis using AI.

This project uses a modern, scalable architecture with a decoupled React frontend and a Django backend. It leverages Celery, RabbitMQ, and Redis to process AI analysis requests in the background and delivers the results instantly to the user via WebSockets — now routed through an **NGINX API Gateway** for production.

<!-- Replace this with a real screenshot URL! -->

---

# 🏛️ Architecture Overview (Updated for NGINX)

This application runs on five core services that all work together:

### 🔹 React Frontend (Served by NGINX)

The React build is served from **frontend/build/** by NGINX at:

```
http://localhost
```

### 🔹 Django/Daphne Backend (Port 8000 - internal only)

The ASGI server that handles all HTTP API requests and WebSocket connections.
Users DO NOT access port 8000 directly.

### 🔹 RabbitMQ (Port 5672)

The message broker that holds background jobs.

### 🔹 Redis (Port 6379)

The channel layer used for real-time WebSocket communication.

### 🔹 Celery Worker

A background worker that processes AI analysis tasks.

---

### **Updated Architecture Flow (correct)**

```
User Browser @ http://localhost
        │
        ▼
NGINX (Port 80)
 - Serves React frontend
 - Proxies /api → Django (8000)
 - Proxies /ws → Django Channels (8000)
        │
        ▼
Django ASGI (Daphne @ 8000)
        │
 ┌──────┴──────────────┐
 ▼                      ▼
RabbitMQ (Queue)     Redis (WebSockets)
        │                  │
        ▼                  ▼
Celery Worker → Groq AI → Sends result back → Django → WebSocket → User
```

---

# ✨ Features

* Secure GitHub Login (OAuth)
* Browse GitHub Repositories
* Syntax-highlighted code viewer
* Asynchronous AI code analysis (Celery + RabbitMQ)
* Real-time AI results through WebSockets (Channels + Redis)
* Production-ready NGINX API Gateway

---

# 💻 Tech Stack

### Frontend:

React, React Hooks, Monaco Editor, diff viewer
**Served by NGINX (no dev server needed)**

### Backend:

Python, Django, Django REST Framework, Django Channels, Daphne

### Async & Real-time:

Celery, RabbitMQ, Redis, WebSockets

### AI:

Groq API (using Llama 3 / Mixtral / Gemma)

### Auth:

GitHub OAuth

### Infrastructure:

Docker (RabbitMQ & Redis)
NGINX reverse proxy + static server

---

# ⚖️ License

This project is licensed under the MIT License – see LICENSE.txt.

---

# 🛠️ Setup & Installation

Before you begin, you must have **Docker** and **NGINX** installed.

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
npm run build   # IMPORTANT: Build React for NGINX
```

This generates:

```
frontend/build/
```

Which NGINX will serve automatically.

---

## **4. Configure Environment Variables**

Install python-decouple:

```bash
pip install python-decouple
```

Create `.env` inside backend:

```
GITHUB_CLIENT_ID=your_id_here
GITHUB_CLIENT_SECRET=your_secret_here
GROQ_API_KEY=your_groq_key_here
```

Update `backend/config/settings.py`:

```python
from decouple import config

GITHUB_CLIENT_ID = config('GITHUB_CLIENT_ID')
GITHUB_CLIENT_SECRET = config('GITHUB_CLIENT_SECRET')
GROQ_API_KEY = config('GROQ_API_KEY')
```

---

# 🚀 How to Run the System (Updated for NGINX)

You need **4 terminals**, not 5 (React dev server not required).

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

### **Terminal 3 — Start Django Backend (Daphne)**

```bash
cd backend
source venv/bin/activate
daphne config.asgi:application --port 8000
```

---

### **Terminal 4 — Start Celery Worker**

```bash
cd backend
source venv/bin/activate
celery -A config worker --loglevel=info
```

---

# 🧱 Start NGINX (API Gateway)

Your NGINX config should look like:

```
/etc/nginx/sites-available/api-gateway
```

```nginx
server {
    listen 80;
    server_name _;

    # Serve React build
    root /home/xxxxx/python-code-review-web-app/frontend/build;

    location / {
        try_files $uri /index.html;
    }

    # Proxy Django API
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
    }

    # Proxy WebSockets
    location /ws/ {
        proxy_pass http://127.0.0.1:8000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Test and restart NGINX:

```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

# 🎉 You're Live!

Visit:

👉 **[http://localhost](http://localhost)**
(not [http://localhost:3000](http://localhost:3000))

NGINX will serve the frontend and route all API/WebSocket traffic automatically.

---
