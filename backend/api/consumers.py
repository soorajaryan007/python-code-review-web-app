# backend/api/consumers.py

import json
from channels.generic.websocket import WebsocketConsumer
from asgiref.sync import async_to_sync


class AnalysisConsumer(WebsocketConsumer):
    MY_GROUP_NAME = "analysis_group"

    def connect(self):
        print("WebSocket connected!")
        async_to_sync(self.channel_layer.group_add)(
            self.MY_GROUP_NAME,
            self.channel_name
        )
        self.accept()

    def disconnect(self, close_code):
        print("WebSocket disconnected.")
        async_to_sync(self.channel_layer.group_discard)(
            self.MY_GROUP_NAME,
            self.channel_name
        )

    # MUST MATCH the "type" sent from Celery
    def send_analysis_result(self, event):
        message = event["message"]

        self.send(text_data=json.dumps({
            "type": "analysis_result",   # frontend expects this
            "message": message
        }))

