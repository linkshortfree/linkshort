from flask import Flask, render_template, request, redirect, jsonify
from database import init_db, create_short_url, get_original_url
import os

app = Flask(__name__)

# Initialize DB on start
with app.app_context():
    init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/shorten', methods=['POST'])
def shorten_url():
    data = request.json
    original_url = data.get('url')
    custom_alias = data.get('alias')

    if not original_url:
        return jsonify({'error': 'URL is required'}), 400

    # Basic validation
    if not original_url.startswith(('http://', 'https://')):
        original_url = 'https://' + original_url

    alias = create_short_url(original_url, custom_alias)
    
    if alias:
        return jsonify({'success': True, 'alias': alias})
    else:
        return jsonify({'error': 'Alias already exists. Please choose another.'}), 409

@app.route('/<alias>')
def redirect_to_url(alias):
    original_url = get_original_url(alias)
    if original_url:
        return redirect(original_url)
    else:
        return render_template('404.html'), 404

if __name__ == '__main__':
    # Production configuration
    port = int(os.environ.get('PORT', 5001))
    # Disable debug mode in production
    debug_mode = os.environ.get('FLASK_ENV') == 'development'
    app.run(debug=debug_mode, host='0.0.0.0', port=port)
