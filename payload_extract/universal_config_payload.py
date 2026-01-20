import requests
import json
import re
from urllib.parse import urljoin

class BlackBoxInspector:
    """
    Analyzes API behavior using differential testing to discover 
    structure without hardcoded keywords.
    """
    def __init__(self, base_url):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "Mozilla/5.0", 
            "Content-Type": "application/json"
        })
        self.registry = {}

    def _safe_request(self, url, payload):
        try:
            res = self.session.post(url, json=payload, timeout=5)
            return res.json(), res.text, res.status_code
        except:
            return {}, "", 0

    def inspect_endpoint(self, path):
        url = urljoin(self.base_url, path)
        print(f"🔬 Inspecting: {path}")
        
        # 1. Discover Required Schema via Recursive Error Feedback
        schema = self._discover_schema(url)
        
        # 2. Probe for Value-Driven Behavior (State/Step detection)
        behavior = self._probe_behavior(url, schema)
        
        # 3. Analyze Response Keys for downstream mapping
        response_sample, _, _ = self._safe_request(url, schema)
        
        self.registry[path] = {
            "path": path,
            "fields": list(schema.keys()),
            "schema_template": schema,
            "behavior": behavior,
            "response_keys": self._get_deep_keys(response_sample)
        }

    def _discover_schema(self, url):
        """Recursively builds a payload based on error feedback."""
        payload = {}
        for _ in range(5):
            data, raw, _ = self._safe_request(url, payload)
            # Find any quoted word in the response that isn't already in our payload
            potential_keys = re.findall(r'["\']([a-zA-Z0-9_\-]+)["\']', raw)
            new_keys = [k for k in potential_keys if k not in payload and len(k) > 1]
            
            if not new_keys: break
            for k in new_keys:
                # Use data-type inference: 
                # If key looks like 'otp', use numbers. If 'email', use @.
                payload[k] = self._infer_initial_value(k)
        return payload

    def _infer_initial_value(self, key):
        k = key.lower()
        if any(x in k for x in ['phone', 'mobile', 'num']): return "8770353366"
        if 'email' in k: return "test@example.com"
        if any(x in k for x in ['otp', 'code', 'pin']): return "1234"
        return "discovery_value"

    def _probe_behavior(self, url, schema):
        """Tests which fields change the API's 'State'."""
        behavior = {"controller": None, "discovered_states": []}
        
        for field in schema.keys():
            # Try changing the value to common action patterns
            for test_val in ["send_otp", "verify_otp", "init", "update"]:
                test_payload = schema.copy()
                test_payload[field] = test_val
                _, raw, _ = self._safe_request(url, test_payload)
                
                # If the API echoes our value back or mentions it, it's a controller
                if test_val in raw:
                    behavior["controller"] = field
                    behavior["discovered_states"].append(test_val)
        
        behavior["discovered_states"] = list(set(behavior["discovered_states"]))
        return behavior

    def _get_deep_keys(self, obj, prefix=""):
        keys = []
        if isinstance(obj, dict):
            for k, v in obj.items():
                full_key = f"{prefix}.{k}" if prefix else k
                keys.append(full_key)
                keys.extend(self._get_deep_keys(v, full_key))
        return keys

    def generate_intelligence(self):
        """Synthesizes the final config by correlating all inspected endpoints."""
        config = {"base_url": self.base_url, "endpoints": {}}
        
        for path, data in self.registry.items():
            # LOGIC: If it has a controller (step_param), it's a Workflow/Auth endpoint
            if data["behavior"]["controller"]:
                config["auth_logic"] = {
                    "endpoint": path,
                    "parameter": data["behavior"]["controller"],
                    "actions": data["behavior"]["discovered_states"],
                    "required_inputs": [f for f in data["fields"] if f != data["behavior"]["controller"]]
                }
            
            # LOGIC: If the endpoint accepts keys that were found in the Auth response, 
            # it's a Profile/Data endpoint
            else:
                config["data_logic"] = {
                    "endpoint": path,
                    "fields": data["fields"]
                }
        
        return config

# --- Dynamic Execution ---

def main():
    # User only provides URL and target paths
    inspector = BlackBoxInspector("https://b471811fe3b7.ngrok-free.app/index.html")
    target_paths = [
        "/api/customer/customer-login",
        "/api/customer/update-user-profile"
    ]

    for p in target_paths:
        inspector.inspect_endpoint(p)

    intelligent_config = inspector.generate_intelligence()

    print("\n[Self-Inspected Configuration]")
    print(json.dumps(intelligent_config, indent=2))

    print("\n[Generated Payload Scenarios]")
    # Dynamically build payloads based on the inspection
    auth = intelligent_config.get("auth_logic")
    if auth:
        for action in auth["actions"]:
            p = {auth["parameter"]: action}
            for req in auth["required_inputs"]:
                p[req] = f"<{req}_value>"
            print(f"\nScenario ({action}):\n{json.dumps(p, indent=2)}")

if __name__ == "__main__":
    main()