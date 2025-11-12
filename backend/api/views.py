from django.shortcuts import render

# Create your views here.
# In backend/api/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings # <-- Add this import
from django.shortcuts import redirect  # <-- This is correct  # <-- Add this import
from .tasks import run_analysis_task # <-- ADD THIS IMPORT
from rest_framework import status
import requests


class HelloView(APIView):
    """
    A simple test view to confirm the API is working.
    """
    def get(self, request, format=None):
        return Response({"message": "Hello from the Django API!"})

# --- Add this new class below HelloView ---

class GitHubLoginView(APIView):
    """
    Provides the GitHub Client ID to the frontend.
    """
    def get(self, request, format=None):
        # We safely get the Client ID from our settings file
        client_id = settings.GITHUB_CLIENT_ID
        return Response({'client_id': client_id})




# ... (Keep your HelloView and GitHubLoginView) ...


class GitHubCallbackView(APIView):
    """
    Handles the callback from GitHub after login.
    """
    def get(self, request, format=None):
        # 1. Get the temporary 'code' from GitHub's redirect
        code = request.GET.get('code')

        if not code:
            return Response({"error": "No code provided"}, status=400)

        # 2. Prepare to exchange the code for an access token
        params = {
            'client_id': settings.GITHUB_CLIENT_ID,
            'client_secret': settings.GITHUB_CLIENT_SECRET,
            'code': code
        }

        # 3. Make the POST request to GitHub to get the token
        # We set 'Accept: application/json' to get the response as JSON
        headers = {'Accept': 'application/json'}
        response = requests.post(
            'https://github.com/login/oauth/access_token',
            params=params,
            headers=headers
        )

        if response.status_code != 200:
            return Response({"error": "Failed to get access token"}, status=400)

        # 4. We have the token!
        token_data = response.json()
        access_token = token_data.get('access_token')

        if not access_token:
            return Response({"error": "Access token not in response"}, status=400)

        # --- For now, we will just print it and redirect ---
        # In a real app, you would:
        # 1. Use this token to get user info (github.com/user)
        # 2. Create or log in the user in your Django database
        # 3. Create a session or a JWT token for your frontend
        # 4. Redirect to the frontend with the session/JWT

        print(f"SUCCESS! Access Token: {access_token}")

        # 5. Redirect the user back to the React frontend
        # We'll add the token as a query parameter (not secure, but fine for testing)
        return redirect(f'http://localhost:3000?token={access_token}')

# --- ADD THIS NEW VIEW AT THE BOTTOM ---

class AnalysisView(APIView):
    """
    This view is called by the 'Analyze File' button.
    It triggers the background Celery task.
    """
    def post(self, request, format=None):
        file_content = request.data.get('content')

        if not file_content:
            return Response(
                {"error": "No content provided"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # This is the magic!
        # Instead of running the function, we call .delay()
        # This sends the job to Celery/RabbitMQ.
        run_analysis_task.delay(file_content)

        # Return an immediate response to the user
        return Response(
            {"message": "Analysis has been started!"},
            status=status.HTTP_202_ACCEPTED
        )