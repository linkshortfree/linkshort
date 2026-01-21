from flask import Flask, render_template, request, redirect, jsonify
from database import init_db, create_short_url, get_original_url
import os

app = Flask(__name__)

with app.app_context():
    init_db()

@app.before_request
def redirect_to_https_and_non_www():
    urlparts = request.url.split('://', 1)
    if len(urlparts) < 2: return
    protocol, rest = urlparts
    domain_and_path = rest.split('/', 1)
    domain = domain_and_path[0]
    is_production = os.environ.get('FLASK_ENV') != 'development' and not request.host.startswith('localhost') and not request.host.startswith('127.0.0.1')
    changed = False
    new_protocol = protocol
    new_domain = domain
    if is_production and protocol == 'http':
        new_protocol = 'https'
        changed = True
    if domain.startswith('www.'):
        new_domain = domain[4:]
        changed = True
    if changed:
        new_url = f"{new_protocol}://{new_domain}"
        if len(domain_and_path) > 1:
            new_url += f"/{domain_and_path[1]}"
        return redirect(new_url, code=301)

# === MAIN PAGES ===
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/about-us')
def about_us():
    return render_template('about_us.html')

@app.route('/about')
def about_redirect():
    return redirect('/about-us', code=301)

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/privacy-policy')
def privacy_policy():
    return render_template('privacy_policy.html')

@app.route('/privacy')
def privacy_redirect():
    return redirect('/privacy-policy', code=301)

@app.route('/terms-of-service')
def terms_of_service():
    return render_template('terms_of_service.html')

@app.route('/terms')
def terms_redirect():
    return redirect('/terms-of-service', code=301)

# === TOOL ROUTES ===
@app.route('/tools/bulk')
def tools_bulk():
    return render_template('tools/bulk.html')

@app.route('/tools/utm')
def tools_utm():
    return render_template('tools/utm.html')

@app.route('/tools/utm-ab')
def tools_utm_ab_redirect():
    return redirect('/tools/utm', code=301)

@app.route('/utm-builder')
def utm_builder_redirect():
    return redirect('/tools/utm', code=301)

@app.route('/tools/qr')
def tools_qr():
    return render_template('tools/qr.html')

@app.route('/tools/bulk-qr')
def tools_bulk_qr():
    return render_template('tools/bulk_qr.html')

# === BLOG ===
@app.route('/blog')
def blog():
    posts = [
        {'slug': 'benefits-of-url-shortening', 'title': 'The Hidden Benefits of URL Shortening for Modern Marketing', 'excerpt': 'Discover how concise links can transform your click-through rates and brand perception.', 'date': 'Jan 20, 2026'},
        {'slug': 'qr-code-marketing-guide', 'title': 'The Ultimate Guide to QR Code Marketing in 2026', 'excerpt': 'Learn how to leverage branded QR codes to bridge the gap between physical and digital worlds.', 'date': 'Jan 18, 2026'},
        {'slug': 'building-brand-trust-with-links', 'title': 'Building Brand Trust: Why Custom Aliases Matter', 'excerpt': 'How custom brand links can increase user trust and improve your security profile.', 'date': 'Jan 15, 2026'}
    ]
    return render_template('blog.html', posts=posts)

@app.route('/blog/<slug>')
def blog_post(slug):
    try:
        return render_template(f'blog/{slug}.html')
    except:
        return render_template('404.html'), 404

# === API ===
@app.route('/api/shorten', methods=['POST'])
def shorten_url():
    data = request.json
    original_url = data.get('url')
    custom_alias = data.get('alias')
    if not original_url:
        return jsonify({'error': 'URL is required'}), 400
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

# === STATIC FILES ===
@app.route('/favicon.ico')
def favicon():
    return app.send_static_file('favicon.png')

@app.route('/45c58908f0a24765961d10271034f89d.txt')
def index_now():
    return "45c58908f0a24765961d10271034f89d", {'Content-Type': 'text/plain'}

@app.route('/robots.txt')
def robots():
    return "User-agent: *\nDisallow: /api/\nSitemap: https://linkshort.live/sitemap.xml", {'Content-Type': 'text/plain'}

@app.route('/ads.txt')
def ads_txt():
    return "google.com, pub-5774199741984914, DIRECT, f08c47fec0942fa0", {'Content-Type': 'text/plain'}

@app.route('/sitemap.xml')
def sitemap():
    return """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://linkshort.live/</loc><lastmod>2026-01-22</lastmod><priority>1.0</priority></url>
  <url><loc>https://linkshort.live/tools/bulk</loc><lastmod>2026-01-22</lastmod><priority>1.0</priority></url>
  <url><loc>https://linkshort.live/tools/utm</loc><lastmod>2026-01-22</lastmod><priority>0.9</priority></url>
  <url><loc>https://linkshort.live/tools/qr</loc><lastmod>2026-01-22</lastmod><priority>0.9</priority></url>
  <url><loc>https://linkshort.live/tools/bulk-qr</loc><lastmod>2026-01-22</lastmod><priority>0.9</priority></url>
  <url><loc>https://linkshort.live/blog</loc><lastmod>2026-01-22</lastmod><priority>0.8</priority></url>
  <url><loc>https://linkshort.live/about-us</loc><lastmod>2026-01-22</lastmod><priority>0.6</priority></url>
  <url><loc>https://linkshort.live/contact</loc><lastmod>2026-01-22</lastmod><priority>0.6</priority></url>
  <url><loc>https://linkshort.live/privacy-policy</loc><lastmod>2026-01-22</lastmod><priority>0.4</priority></url>
  <url><loc>https://linkshort.live/terms-of-service</loc><lastmod>2026-01-22</lastmod><priority>0.4</priority></url>
</urlset>""", {'Content-Type': 'application/xml'}

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug_mode = os.environ.get('FLASK_ENV') == 'development'
    app.run(debug=debug_mode, host='0.0.0.0', port=port)
