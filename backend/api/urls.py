# In backend/api/urls.py
# In backend/config/urls.py
# In backend/config/urls.py

# In backend/api/urls.py

# In backend/api/urls.py

from django.urls import path
# Make sure GitHubLoginView is imported
from .views import (
    HelloView,
    GitHubLoginView,
    GitHubCallbackView,
    AnalysisView  # <-- ADD THIS IMPORT
)

urlpatterns = [
    path('hello/', HelloView.as_view(), name='hello'),

    # Make sure this line is added, saved, and has no typos
    path('auth/github/login/', GitHubLoginView.as_view(), name='github-login'),
    path('auth/github/callback/', GitHubCallbackView.as_view(), name='github-callback'),
    path('analyze/', AnalysisView.as_view(), name='analyze'),

]