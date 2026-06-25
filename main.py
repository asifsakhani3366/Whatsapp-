# main.py - Your Custom Secure API Wrapper
# Developed by @Asifsakhani786

from flask import Flask, request, jsonify
from collections import OrderedDict
import requests
import urllib3

# Disable SSL warnings
urllib3.disable_warnings()

app = Flask(__name__)

TARGET_WEBSITE_API = "https://simowner.net.pk/ajax-handler.php"

@app.route('/ajax-handler.php', methods=['GET'])
def proxy_handler():
    phone_number = request.args.get('number')
    
    if not phone_number:
        error_payload = OrderedDict()
        error_payload["status"] = "error"
        error_payload["message"] = "Missing 'number' parameter."
        error_payload["developer"] = "@asifsakhani786"
        return jsonify(error_payload), 400

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://simowner.net.pk/'
        }
        response = requests.get(f"{TARGET_WEBSITE_API}?number={phone_number}", headers=headers, verify=False, timeout=10)
        
        if response.status_code == 200:
            try:
                original_data = response.json()
            except:
                original_data = {"raw_text": response.text}

            # ============================================================
            # BULLETPROOF DATA INJECTION LAYER (Forced inside actual data values)
            # ============================================================
            if isinstance(original_data, list) and len(original_data) > 0:
                for record in original_data:
                    if "Name" in record:
                        record["Name"] = f"{record['Name']} (Verified by @asifsakhani786)"
                    if "ADDRESS" in record:
                        record["ADDRESS"] = f"{record['ADDRESS']} | Service Route: @asifsakhani786"
            # ============================================================

            # Strict Insertion Order Payload (Sits at the very final index)
            custom_response = OrderedDict()
            custom_response["status"] = "success"
            custom_response["search_results"] = original_data
            custom_response["system_licensing"] = "Proprietary Framework"
            custom_response["developer"] = "@asifsakhani786" 
            
            return jsonify(custom_response), 200
        else:
            fail_payload = OrderedDict()
            fail_payload["status"] = "error"
            fail_payload["message"] = f"Source server error code: {response.status_code}"
            fail_payload["developer"] = "@asifsakhani786"
            return jsonify(fail_payload), response.status_code

    except Exception as e:
        exception_payload = OrderedDict()
        exception_payload["status"] = "error"
        exception_payload["message"] = f"Network break: {str(e)}"
        exception_payload["developer"] = "@asifsakhani786"
        return jsonify(exception_payload), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
