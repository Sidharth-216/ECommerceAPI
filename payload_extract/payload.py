import requests
from typing import Optional, Dict


# -----------------------------
# CONFIG (your skeleton) ,try to fetch all these from the config file , without user intervention
# -----------------------------
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


# -----------------------------
# PAYLOAD BUILDER
# -----------------------------
class PayloadBuilder:
    def __init__(self, config: dict):
        self.config = config

    def send_otp(self, identifier_value: str) -> dict:
        return {
            self.config["identifier"]: identifier_value,
            self.config["step_param"]: self.config["steps"]["send"]
        }

    def verify_otp(self, identifier_value: str, otp: str) -> dict:
        return {
            self.config["identifier"]: identifier_value,
            "otp": otp,
            self.config["step_param"]: self.config["steps"]["verify"]
        }

    def profile_update(self, **kwargs) -> dict:
        payload = {}
        for field in self.config["profile_fields"]:
            if field not in kwargs:
                raise ValueError(f"Missing required field: {field}")
            payload[field] = kwargs[field]
        return payload


# -----------------------------
# API CLIENT
# -----------------------------
class IndiShoppeClient:
    def __init__(self, config: dict):
        self.config = config
        self.base_url = config["base_url"].rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({
            "Content-Type": "application/json",
            "Accept": "application/json"
        })
        self.token: Optional[str] = None
        self.builder = PayloadBuilder(config)

    # ---- SEND OTP ----
    def send_otp(self, mobile: str) -> Dict:
        payload = self.builder.send_otp(mobile)
        return self._post(self.config["auth_endpoint"], payload)

    # ---- VERIFY OTP ----
    def verify_otp(self, mobile: str, otp: str) -> Dict:
        payload = self.builder.verify_otp(mobile, otp)
        data = self._post(self.config["auth_endpoint"], payload)

        # Existing user → token returned here
        self._extract_token(data)
        return data

    # ---- UPDATE PROFILE (NEW USER) ----
    def update_profile(self, mobile: str, name: str, email: str) -> Dict:
        payload = self.builder.profile_update(
            phonenumber=mobile,
            name=name,
            email=email
        )
        data = self._post(self.config["profile_update_endpoint"], payload)

        # Token always returned here
        self._extract_token(data)
        return data

    # -----------------------------
    # INTERNAL HELPERS
    # -----------------------------
    def _post(self, endpoint: str, payload: dict) -> Dict:
        url = f"{self.base_url}{endpoint}"
        response = self.session.post(url, json=payload)

        try:
            data = response.json()
        except ValueError:
            raise RuntimeError(f"Invalid JSON response: {response.text}")

        return data

    def _extract_token(self, data: dict):
        token = data.get(self.config["token_path"])
        if token:
            self.token = token
            self.session.headers.update({
                "Authorization": f"{self.config['token_type']} {token}"
            })


# -----------------------------
# EXAMPLE USAGE
# -----------------------------
if __name__ == "__main__":
    client = IndiShoppeClient(CONFIG)

    mobile = input("Enter mobile number: ")

    # Step 1: Send OTP
    send_resp = client.send_otp(mobile)
    print("\nSend OTP Response:", send_resp)

    if not send_resp.get("success"):
        exit("Failed to send OTP")

    # Step 2: Verify OTP
    otp = input("Enter OTP received: ")
    verify_resp = client.verify_otp(mobile, otp)
    print("\nVerify OTP Response:", verify_resp)

    if not verify_resp.get("success"):
        exit("OTP verification failed")

    # Step 3: New user → update profile
    if verify_resp.get("isNewUser"):
        print("\nNew user detected. Updating profile...")
        name = input("Enter name: ")
        email = input("Enter email: ")

        profile_resp = client.update_profile(mobile, name, email)
        print("\nProfile Update Response:", profile_resp)

    print("\n✅ Authentication Complete")
    print("JWT Token:", client.token)
