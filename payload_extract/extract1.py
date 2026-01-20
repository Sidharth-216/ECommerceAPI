import requests
import json

# 🔹 Replace this with your ngrok URL
NGROK_URL = "https://1482063e72f2.ngrok-free.app"

# 🔹 Swagger JSON URL
SWAGGER_JSON_URL = f"{NGROK_URL}/swagger/v1/swagger.json"

try:
    response = requests.get(SWAGGER_JSON_URL)
    response.raise_for_status()
    swagger = response.json()
except Exception as e:
    print("Failed to fetch Swagger JSON:", e)
    exit(1)

api_list = []

# Loop through all paths
for path, methods in swagger.get("paths", {}).items():
    for method, info in methods.items():
        # Only consider endpoints with a requestBody
        request_body = info.get("requestBody", {})
        if "content" in request_body:
            # Try to extract DTO name from $ref
            schema_ref = request_body["content"].get("application/json", {}).get("schema", {}).get("$ref", "")
            dto_name = schema_ref.split("/")[-1] if schema_ref else "UnknownDto"

            # Try to get the parameter name (fallback to 'param')
            param_name = "param"
            examples = request_body["content"].get("application/json", {}).get("examples", {})
            if examples:
                param_name = list(examples.keys())[0]

            api_list.append({
                "method": method.upper(),
                "route": path,
                "payload_dto": dto_name,
                "param_name": param_name
            })

# Print JSON output
print(json.dumps(api_list, indent=4))
