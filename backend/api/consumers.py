# In backend/api/consumers.py

import json
from channels.generic.websocket import WebsocketConsumer
from asgiref.sync import async_to_sync  # <-- NEW IMPORT


class AnalysisConsumer(WebsocketConsumer):
    # This is the channel "group" our Celery task will send to.
    MY_GROUP_NAME = "analysis_group"

    def connect(self):
        print("WebSocket connected!")
        # Add this consumer to our group
        async_to_sync(self.channel_layer.group_add)(
            self.MY_GROUP_NAME,
            self.channel_name
        )
        self.accept()

    def disconnect(self, close_code):
        print("WebSocket disconnected.")
        # Remove this consumer from our group
        async_to_sync(self.channel_layer.group_discard)(
            self.MY_GROUP_NAME,
            self.channel_name
        )

    # This method is called when the Celery task sends a message
    def send_analysis_result(self, event):
        message = event['message']

        # Send the message over the WebSocket to the browser
        self.send(text_data=json.dumps({
            'type': 'analysis_result',
            'message': message
        }))