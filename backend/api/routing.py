# In backend/api/routing.py

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # This regex matches WebSocket URLs like 'ws://.../ws/analysis/'
    re_path(r'ws/analysis/$', consumers.AnalysisConsumer.as_asgi()),
]