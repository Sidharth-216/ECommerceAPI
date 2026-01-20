'''import requests
import json
from urllib.parse import urlparse

# -----------------------------
# CONFIG + PAYLOAD GENERATOR
# -----------------------------

SWAGGER_URL = "https://b315429de5f3.ngrok-free.app/swagger/v1/swagger.json"


def fetch_swagger(swagger_url):
    resp = requests.get(swagger_url)
    resp.raise_for_status()
    return resp.json()


def get_base_url(swagger_url: str) -> str:
    parsed = urlparse(swagger_url)
    return f"{parsed.scheme}://{parsed.netloc}"


def generate_config_and_payloads(swagger_json, swagger_url):
    """
    Generates a config with endpoint info and example payloads
    """
    config = {
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

            # If schema references a component
            if "$ref" in schema:
                ref_name = schema["$ref"].split("/")[-1]
                comp_schema = components.get(ref_name, {})
                props = comp_schema.get("properties", {})
            else:
                props = schema.get("properties", {})

            # Generate example payload based on type
            for field, meta in props.items():
                field_type = meta.get("type", "string")
                # Provide simple example values based on type
                if field_type == "string":
                    payload_example[field] = f"<{field}>"
                elif field_type in ["integer", "number"]:
                    payload_example[field] = 0
                elif field_type == "boolean":
                    payload_example[field] = False
                elif field_type == "array":
                    payload_example[field] = []
                else:
                    payload_example[field] = None

            # Generate a key name dynamically
            flow_key = path.strip("/").replace("/", "_").replace("-", "_")

            config["auth"]["flows"][flow_key] = {
                "endpoint": path,
                "method": method.upper(),
                "payload": payload_example
            }

    return config


def main():
    swagger_json = fetch_swagger(SWAGGER_URL)
    config_with_payloads = generate_config_and_payloads(swagger_json, SWAGGER_URL)
    print(json.dumps(config_with_payloads, indent=2))


if __name__ == "__main__":
    main()
'''

import requests
import json
from urllib.parse import urlparse

class PayloadGenerator:
    def __init__(self, swagger_url: str):
        self.swagger_url = swagger_url
        self.swagger_json = self._fetch_swagger()
        self.components = self.swagger_json.get("components", {}).get("schemas", {})

    def _fetch_swagger(self) -> dict:
        resp = requests.get(self.swagger_url)
        resp.raise_for_status()
        return resp.json()

    def _get_base_url(self) -> str:
        parsed = urlparse(self.swagger_url)
        return f"{parsed.scheme}://{parsed.netloc}"

    def generate_payloads(self) -> dict:
        paths = self.swagger_json.get("paths", {})
        payloads = {}

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

                payload_example = self._generate_example(schema)
                flow_key = path.strip("/").replace("/", "_").replace("-", "_")

                payloads[flow_key] = {
                    "endpoint": path,
                    "method": method.upper(),
                    "payload": payload_example
                }

        return {
            "base_url": self._get_base_url(),
            "flows": payloads
        }

    def _generate_example(self, schema: dict) -> dict:
        """
        Generate an example payload from a schema
        """
        payload_example = {}

        if "$ref" in schema:
            ref_name = schema["$ref"].split("/")[-1]
            comp_schema = self.components.get(ref_name, {})
            props = comp_schema.get("properties", {})
        else:
            props = schema.get("properties", {})

        for field, meta in props.items():
            field_type = meta.get("type", "string")
            if field_type == "string":
                payload_example[field] = f"<{field}>"
            elif field_type in ["integer", "number"]:
                payload_example[field] = 0
            elif field_type == "boolean":
                payload_example[field] = False
            elif field_type == "array":
                payload_example[field] = []
            else:
                payload_example[field] = None

        return payload_example


if __name__ == "__main__":
    SWAGGER_URL = "https://b315429de5f3.ngrok-free.app/swagger/v1/swagger.json"

    generator = PayloadGenerator(SWAGGER_URL)
    payload_config = generator.generate_payloads()

    print(json.dumps(payload_config, indent=2))
