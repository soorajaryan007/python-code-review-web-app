from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view

from django.conf import settings
from django.shortcuts import redirect

from api.tasks import run_analysis_task, run_fix_task
import requests


# -------------------------------------------------------
# SIMPLE TEST VIEW
# -------------------------------------------------------
class HelloView(APIView):
    def get(self, request, format=None):
        return Response({"message": "Hello from the Django API!"})


# -------------------------------------------------------
# GITHUB OAUTH
# -------------------------------------------------------
class GitHubLoginView(APIView):
    def get(self, request, format=None):
        return Response({'client_id': settings.GITHUB_CLIENT_ID})


class GitHubCallbackView(APIView):
    def get(self, request, format=None):
        code = request.GET.get('code')
        if not code:
            return Response({"error": "No code provided"}, status=400)

        params = {
            'client_id': settings.GITHUB_CLIENT_ID,
            'client_secret': settings.GITHUB_CLIENT_SECRET,
            'code': code
        }

        headers = {'Accept': 'application/json'}
        response = requests.post(
            'https://github.com/login/oauth/access_token',
            params=params,
            headers=headers
        )

        if response.status_code != 200:
            return Response({"error": "Failed to get access token"}, status=400)

        access_token = response.json().get("access_token")
        if not access_token:
            return Response({"error": "No access token in response"}, status=400)

        return redirect(f'http://localhost:3000?token={access_token}')


# -------------------------------------------------------
# ANALYSIS VIEW (class-based)
# -------------------------------------------------------
class AnalysisView(APIView):
    def post(self, request, format=None):
        content = request.data.get('content')
        if not content:
            return Response({"error": "No content provided"}, status=400)

        task = run_analysis_task.delay(content)

        return Response(
            {"task_id": task.id, "message": "Analysis started"},
            status=status.HTTP_202_ACCEPTED
        )


# -------------------------------------------------------
# AUTO FIX VIEW (function-based)
# -------------------------------------------------------
@api_view(["POST"])
def fix_file(request):
    content = request.data.get("content")
    if not content:
        return Response({"error": "No content provided"}, status=400)

    task = run_fix_task.delay(content)

    return Response(
        {"task_id": task.id, "message": "Auto fix started"},
        status=status.HTTP_202_ACCEPTED
    )
