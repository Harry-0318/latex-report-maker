import httpx
import os
import asyncio
from typing import List, Dict, Any, Optional

STORAGE_BASE_URL = "https://storage.projectalpha.in"

async def fetchAllTemplates() -> List[Dict[str, Any]]:
    """
    Fetches all templates from the storage service.
    Returns a list of template records.
    Returns an empty list on failure.
    """
    token = os.environ.get("STORAGE_TOKEN")
    if not token:
        print("ERROR: STORAGE_TOKEN environment variable not set")
        return []
    
    url = f"{STORAGE_BASE_URL}/tools/tool_report_templates"
    headers = {
        "Authorization": f"Bearer {token}",
        "token": token
    }
    params = {"limit": 50}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                params=params,
                headers=headers,
                timeout=10.0
            )

            print(response)
            
            if response.status_code != 200:
                print(f"Template fetch failed: {response.status_code} - {response.text}")
                return []
            
            data = response.json()
            
            # Normalize response structure
            # Assuming data is list or dict with items/data
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                return data.get("items", data.get("data", []))
            
            return []

    except Exception as e:
        print(f"Error fetching templates: {e}")
        return []
