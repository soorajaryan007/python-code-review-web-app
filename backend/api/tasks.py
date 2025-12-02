from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from django.conf import settings
from groq import Groq


# Create ONE shared Groq client
groq_client = Groq(api_key=settings.GROQ_API_KEY)


# -----------------------------------------------------------
# ANALYSIS TASK
# -----------------------------------------------------------
@shared_task
def run_analysis_task(file_content):

    print("--- ANALYSIS STARTED (Groq) ---")

    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert code reviewer. "
                        "Find exactly 3 bugs, style issues, or optimizations. "
                        "Use bullet points only."
                    )
                },
                {
                    "role": "user",
                    "content": f"Analyze the following code:\n\n{file_content}"
                }
            ],
            temperature=0.5,
        )

        analysis_result = completion.choices[0].message.content
        print("--- ANALYSIS COMPLETE ---")

    except Exception as e:
        analysis_result = f"Error: {e}"
        print(f"--- ANALYSIS FAILED: {e} ---")

    # Send via WebSocket
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "analysis_group",
            {
                "type": "send_analysis_result",
                "message": analysis_result,
            }
        )
        print("--- Analysis sent to WebSocket ---")
    except Exception as e:
        print(f"--- WebSocket send failed: {e} ---")

    return analysis_result



# -----------------------------------------------------------
# AUTO FIX TASK
# -----------------------------------------------------------
@shared_task
def run_fix_task(content):

    prompt = f"""
You are a senior code refactoring AI.
Fix the ENTIRE file below.

Rules:
- Return ONLY the corrected code.
- No explanations.
- Keep structure similar.

Code:
{content}
"""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",  # BETTER than Mixtral
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        fixed_code = response.choices[0].message.content

    except Exception as e:
        fixed_code = f"Error during fix: {e}"

    # Send via WebSocket
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "analysis_group",
            {
                "type": "fix_result",
                "message": fixed_code,
            }
        )
        print("--- Fix result sent to WebSocket ---")
    except Exception as e:
        print(f"--- WebSocket send failed: {e} ---")

    return fixed_code
