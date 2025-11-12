# In backend/api/tasks.py

import time
from celery import shared_task
from channels.layers import get_channel_layer  # <-- NEW IMPORT
from asgiref.sync import async_to_sync  # <-- NEW IMPORT


@shared_task
def run_analysis_task(file_content):
    """
    A mock AI analysis task that sends its result over a WebSocket.
    """
    print("--- ANALYSIS STARTED ---")
    print(f"Analyzing content: {file_content[:50]}...")

    # 1. Simulate the long-running AI task
    time.sleep(10)

    # 2. This is the new AI result
    analysis_result = "This code looks great! (Real-time result from Celery)"

    print(f"--- ANALYSIS COMPLETE: {analysis_result} ---")

    # 3. --- NEW PART: Send the result over the WebSocket ---
    try:
        channel_layer = get_channel_layer()

        # This sends the message to our 'AnalysisConsumer'
        # The 'type' field ('send_analysis_result') must match
        # the method name in our consumer.
        async_to_sync(channel_layer.group_send)(
            "analysis_group",  # This is the name of our consumer (we need to set this)
            {
                "type": "send.analysis.result",  # This maps to send_analysis_result
                "message": analysis_result,
            },
        )
        print("--- Result sent to WebSocket ---")
    except Exception as e:
        print(f"--- FAILED TO SEND TO WEBSOCKET: {e} ---")

    return analysis_result