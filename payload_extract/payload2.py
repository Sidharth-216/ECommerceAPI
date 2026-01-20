import json
from typing import Dict


CONFIG = {
    "base_url": "https://indishoppe.in",
    "auth_type": "otp",
    "identifier": "mobile",

    "auth_endpoint": "/api/customer/customer-login",
    "profile_update_endpoint": "/api/customer/update-user-profile",

    "token_path": "token",
    "token_type": "Bearer",

    "step_param": "step",
    "steps": {
        "send": "send_otp",
        "verify": "verify_otp"
    },

    "profile_fields": ["phonenumber", "name", "email"]
}


class PayloadExtractor:
    def __init__(self, config: dict):
        self.config = config

    def extract(self) -> Dict:
        payloads = {}

        # 🔹 Generate auth step payloads dynamically
        for step_name, step_value in self.config.get("steps", {}).items():
            payloads[step_name] = self._build_step_payload(step_value)

        # 🔹 Generate profile payload dynamically
        # Dynamically add payloads for any profile-related endpoints
        if "profile_fields" in self.config:
            for key in self.config.keys():
                if key.endswith("_endpoint") and "profile" in key:
                    payloads[key[:-len("_endpoint")]] = self._build_profile_payload()

        return payloads

    def _build_step_payload(self, step_value: str) -> dict:
        payload = {
            self.config["identifier"]: "<string>",
            self.config["step_param"]: step_value
        }

        # If step is NOT send OTP, assume OTP required
        if step_value != self.config["steps"].get("send"):
            payload["otp"] = "<string>"

        return payload

    def _build_profile_payload(self) -> dict:
        return {
            field: "<string>"
            for field in self.config["profile_fields"]
        }


if __name__ == "__main__":
    extractor = PayloadExtractor(CONFIG)
    payloads = extractor.extract()

    print(json.dumps(payloads, indent=2))
