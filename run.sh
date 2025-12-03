#!/bin/bash

# START FRONTEND
echo "Starting FRONTEND..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

# START DAPHNE
echo "Starting DAPHNE server..."
cd backend
source venv/bin/activate
daphne config.asgi:application &
DAPHNE_PID=$!

# START CELERY
echo "Starting CELERY worker..."
celery -A config worker --loglevel=info &
CELERY_PID=$!

# WAIT + CLEANUP ON EXIT
echo "All services started."
echo "Press CTRL+C to stop everything."

wait

trap "echo 'Stopping services...'; kill $FRONTEND_PID $DAPHNE_PID $CELERY_PID" EXIT
