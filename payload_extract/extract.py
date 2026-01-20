import re
import json

controller_file = "/home/sidhu/Desktop/ECommerceAPI/backend/src/ECommerceAPI.API/Controllers/AuthController.cs"

api_list = []

with open(controller_file, 'r') as f:
    lines = f.readlines()

http_method = None
route = None

for i, line in enumerate(lines):
    line = line.strip()

    # Detect [HttpPost("...")] or other Http methods
    http_match = re.match(r'\[Http(Post|Get|Put|Delete)\("([\w\-\/]+)"\)\]', line, re.IGNORECASE)
    if http_match:
        http_method = http_match.group(1).upper()
        route = http_match.group(2)
        continue

    # Detect the method signature with [FromBody]
    param_match = re.search(r'\[FromBody\]\s+([\w\<\>]+)\s+(\w+)', line)
    if param_match and http_method and route:
        dto_name = param_match.group(1)
        param_name = param_match.group(2)

        api_list.append({
            "method": http_method,
            "route": f"/api/auth/{route}",
            "payload_dto": dto_name,
            "param_name": param_name
        })

        # Reset for next method
        http_method = None
        route = None

# Output JSON
print(json.dumps(api_list, indent=4))
