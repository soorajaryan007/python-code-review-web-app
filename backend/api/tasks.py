import time
from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

# --- NEW IMPORTS ---
from groq import Groq
from django.conf import settings
# --- END NEW IMPORTS ---

@shared_task
def run_analysis_task(file_content):
    """
    This task now calls the Groq API for a free code review.
    """
    print("--- ANALYSIS STARTED (with Groq) ---")

    try:
        # --- THIS IS THE NEW AI CODE ---
        client = Groq(api_key=settings.GROQ_API_KEY)

        completion = client.chat.completions.create(
            # We're using Llama 3, which is excellent
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert code reviewer. "
                        "Find 3 potential bugs, style issues, or optimization "
                        "opportunities in the following code. Be concise and use bullet points."
                    )
                },
                {
                    "role": "user",
                    "content": f"Here is the code to review:\n\n{file_content}"
                }
            ],
            temperature=0.7,
        )

        analysis_result = completion.choices[0].message.content
        # --- END OF NEW AI CODE ---

        print(f"--- ANALYSIS COMPLETE: {analysis_result} ---")

    except Exception as e:
        print(f"--- AI ANALYSIS FAILED: {e} ---")
        analysis_result = f"Error during analysis: {e}"


    # --- This WebSocket code is the same as before ---
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "analysis_group",
            {
                "type": "send_analysis_result",
                "message": analysis_result,
            },
        )
        print("--- Result sent to WebSocket group ---")
    except Exception as e:
        print(f"--- FAILED TO SEND TO WEBSOCKET: {e} ---")

    return analysis_result