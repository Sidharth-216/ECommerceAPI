import requests
import json
from urllib.parse import urlparse

# -----------------------------
# CONFIG GENERATOR FROM SWAGGER
# -----------------------------

SWAGGER_URL = "https://b471811fe3b7.ngrok-free.app/swagger/v1/swagger.json"


def fetch_swagger(swagger_url):
    resp = requests.get(swagger_url)
    resp.raise_for_status()
    return resp.json()


def get_base_url(swagger_url: str) -> str:
    parsed = urlparse(swagger_url)
    return f"{parsed.scheme}://{parsed.netloc}"


def extract_payloads(swagger_json, swagger_url):
    """
    Extract all POST endpoints and their request payload schemas
    """
    payload_config = {
        "base_url": get_base_url(swagger_url),
        "auth": {
            "flows": {},
            "token_type": "Bearer",
            "token_path": "token"
        }
    }

    paths = swagger_json.get("paths", {})
    components = swagger_json.get("components", {}).get("schemas", {})

    for path, methods in paths.items():
        for method, meta in methods.items():
            if method.upper() != "POST":
                continue

            request_body = meta.get("requestBody")
            if not request_body:
                continue

            content = request_body.get("content", {})
            app_json = content.get("application/json", {})
            schema = app_json.get("schema", {})

            payload_example = {}

            # Resolve schema reference
            if "$ref" in schema:
                ref_name = schema["$ref"].split("/")[-1]
                comp_schema = components.get(ref_name, {})
                props = comp_schema.get("properties", {})
            else:
                props = schema.get("properties", {})

            for field, meta in props.items():
                payload_example[field] = meta.get("type", "string")

            flow_key = path.strip("/").replace("/", "_").replace("-", "_")

            payload_config["auth"]["flows"][flow_key] = {
                "endpoint": path,
                "method": method.upper(),
                "payload": payload_example
            }

    return payload_config


def main():
    swagger_json = fetch_swagger(SWAGGER_URL)
    config = extract_payloads(swagger_json, SWAGGER_URL)
    print(json.dumps(config, indent=2))


if __name__ == "__main__":
    main()


