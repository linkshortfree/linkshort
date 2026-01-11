import sys
import os

print("--- DIAGNOSTIC START ---")
print(f"Python Version: {sys.version}")

print("\n1. Checking Dependencies...")
try:
    import flask
    print(f"✅ Flask is installed (Version: {flask.__version__})")
except ImportError:
    print("❌ ERROR: Flask is NOT installed.")
    print("   Please run terminal command: pip install -r requirements.txt")
    print("   Or if using python3: pip3 install -r requirements.txt")
    sys.exit(1)

import sqlite3
print("✅ SQLite is available.")

print("\n2. Checking Application Code...")
try:
    from app import app
    print("✅ app.py imported successfully.")
except Exception as e:
    print(f"❌ ERROR: Failed to import app.py")
    print(f"   Details: {e}")
    sys.exit(1)

print("\n3. Starting Server...")
print("   Attempting to bind to http://127.0.0.1:5000")
print("   If this fails, the port might be in use or permission denied.")
print("   -----------------------------------------------------------")

try:
    app.run(debug=True, port=5000, host='127.0.0.1')
except OSError as e:
    print(f"\n❌ FAILED TO START SERVER: {e}")
    if "Address already in use" in str(e):
        print("   -> Port 5000 is occupied. Try running on a different port.")
except Exception as e:
    print(f"\n❌ UNEXPECTED ERROR: {e}")
