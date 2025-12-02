from django.urls import path
from api.views import (
    HelloView,
    GitHubLoginView,
    GitHubCallbackView,
    AnalysisView,
    fix_file
)

urlpatterns = [
    path('hello/', HelloView.as_view(), name='hello'),

    # GitHub OAuth
    path('auth/github/login/', GitHubLoginView.as_view(), name='github-login'),
    path('auth/github/callback/', GitHubCallbackView.as_view(), name='github-callback'),

    # Analysis endpoint (class-based view)
    path('analyze/', AnalysisView.as_view(), name='analyze'),

    # Auto-fix endpoint (function-based view)
    path("fix-file/", fix_file, name="fix-file"),
]
