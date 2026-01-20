import json
from urllib.parse import urlparse
import requests

class UniversalConfigGenerator:
    """
    Generates a dynamic API config for any API.
    Works with:
    - Swagger/OpenAPI
    - Existing endpoint hints
    - Generic fallback if only URL is given
    """

    def __init__(self, url: str = None, existing_config: dict = None):
        self.url = url
        self.existing_config = existing_config
        self.swagger_json = self._fetch_swagger() if url else {}

    def generate_config(self) -> dict:
        if self.existing_config:
            return self.existing_config

        config = {
            "base_url": self._get_base_url() if self.url else "<BASE_URL>",
            "auth": {
                "flows": {},
                "token_type": "Bearer",
                "token_path": "token"
            }
        }

        if self.swagger_json:
            paths = self.swagger_json.get("paths", {})
            for path, methods in paths.items():
                for method, meta in methods.items():
                    if method.upper() not in ["POST", "PUT", "PATCH"]:
                        continue
                    flow_key = path.strip("/").replace("/", "_").replace("-", "_") or "root"
                    config["auth"]["flows"][flow_key] = {
                        "endpoint": path,
                        "method": method.upper()
                    }
        else:
            # fallback placeholder
            config["auth"]["flows"]["example_flow"] = {
                "endpoint": "/example",
                "method": "POST"
            }

        return config

    # -----------------------------
    # Internal helpers
    # -----------------------------
    def _fetch_swagger(self) -> dict:
        try:
            resp = requests.get(self.url)
            resp.raise_for_status()
            return resp.json()
        except Exception:
            return {}

    def _get_base_url(self) -> str:
        parsed = urlparse(self.url)
        return f"{parsed.scheme}://{parsed.netloc}"


# -----------------------------
# Usage Example
# -----------------------------
if __name__ == "__main__":
    # From Swagger URL
    generator = UniversalConfigGenerator(url="https://b315429de5f3.ngrok-free.app/swagger/v1/swagger.json")
    config = generator.generate_config()
    print("=== Generated Config ===")
    print(json.dumps(config, indent=2))

    # From existing config
    existing = {
        "base_url": "https://indishoppe.in",
        "auth": {
            "flows": {
                "login": {"endpoint": "/api/login", "method": "POST"}
            },
            "token_type": "Bearer",
            "token_path": "token"
        }
    }
    generator2 = UniversalConfigGenerator(existing_config=existing)
    print("\n=== Existing Config Used ===")
    print(json.dumps(generator2.generate_config(), indent=2))
