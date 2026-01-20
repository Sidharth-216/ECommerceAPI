import json
from typing import Dict

class UniversalPayloadGenerator:
    """
    Generates payloads dynamically from:
    - Config
    - Swagger/OpenAPI JSON
    - Or fallback placeholders
    """

    def __init__(self, config: dict = None, swagger_json: dict = None):
        self.config = config or {}
        self.swagger_json = swagger_json or {}
        self.components = self.swagger_json.get("components", {}).get("schemas", {})

    def generate_payloads(self) -> Dict:
        payloads = {}
        flows = self.config.get("auth", {}).get("flows", {})

        for flow_key, flow in flows.items():
            payload_example = {}

            # Try Swagger schema
            if self.swagger_json:
                schema = self.swagger_json.get("paths", {}).get(flow["endpoint"], {}).get(flow["method"].lower(), {}).get("requestBody", {}).get("content", {}).get("application/json", {}).get("schema", {})
                if schema:
                    payload_example = self._generate_example(schema)

            # fallback placeholder
            if not payload_example:
                payload_example = {"<field>": "<value>"}

            payloads[flow_key] = {
                "endpoint": flow["endpoint"],
                "method": flow["method"],
                "payload": payload_example
            }

        return payloads

    # -----------------------------
    # Internal helpers
    # -----------------------------
    def _generate_example(self, schema: dict) -> dict:
        example = {}
        if "$ref" in schema:
            ref_name = schema["$ref"].split("/")[-1]
            comp_schema = self.components.get(ref_name, {})
            props = comp_schema.get("properties", {})
        else:
            props = schema.get("properties", {})

        for field, meta in props.items():
            field_type = meta.get("type", "string")
            if field_type == "string":
                example[field] = f"<{field}>"
            elif field_type in ["integer", "number"]:
                example[field] = 0
            elif field_type == "boolean":
                example[field] = False
            elif field_type == "array":
                example[field] = []
            else:
                example[field] = None

        return example


# -----------------------------
# Usage Example
# -----------------------------
if __name__ == "__main__":
    # Example config
    config = {
        "base_url": "https://indishoppe.in",
        "auth": {
            "flows": {
                "login": {"endpoint": "/api/login", "method": "POST"},
                "register": {"endpoint": "/api/register", "method": "POST"}
            },
            "token_type": "Bearer",
            "token_path": "token"
        }
    }

    generator = UniversalPayloadGenerator(config=config)
    payloads = generator.generate_payloads()
    print("=== Generated Payloads ===")
    print(json.dumps(payloads, indent=2))
