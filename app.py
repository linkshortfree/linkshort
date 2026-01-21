from flask import Flask, render_template, request, redirect, jsonify
from database import init_db, create_short_url, get_original_url
import os

app = Flask(__name__)

# Initialize DB on start
with app.app_context():
    init_db()

@app.before_request
def redirect_to_https_and_non_www():
    """Redirects www to non-www and enforce https in production."""
    urlparts = request.url.split('://', 1)
    if len(urlparts) < 2: return
    
    protocol, rest = urlparts
    domain_and_path = rest.split('/', 1)
    domain = domain_and_path[0]
    
    # Only redirect in production environments (check for common production indicators)
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

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/privacy')
def privacy():
    return render_template('privacy.html')

@app.route('/terms')
def terms():
    return render_template('terms.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/utm-builder')
def utm_builder():
    return render_template('utm_builder.html')

@app.route('/blog')
def blog():
    posts = [
        {
            'slug': 'benefits-of-url-shortening',
            'title': 'The Hidden Benefits of URL Shortening for Modern Marketing',
            'excerpt': 'Discover how concise links can transform your click-through rates and brand perception.',
            'date': 'Jan 20, 2026'
        },
        {
            'slug': 'qr-code-marketing-guide',
            'title': 'The Ultimate Guide to QR Code Marketing in 2026',
            'excerpt': 'Learn how to leverage branded QR codes to bridge the gap between physical and digital worlds.',
            'date': 'Jan 18, 2026'
        },
        {
            'slug': 'building-brand-trust-with-links',
            'title': 'Building Brand Trust: Why Custom Aliases Matter',
            'excerpt': 'How custom brand links can increase user trust and improve your security profile.',
            'date': 'Jan 15, 2026'
        }
    ]
    return render_template('blog.html', posts=posts)

@app.route('/blog/<slug>')
def blog_post(slug):
    # For a real app, this would come from a DB or markdown files.
    # To keep it simple and SEO friendly, we'll use templates named after slugs.
    try:
        return render_template(f'blog/{slug}.html')
    except:
        return render_template('404.html'), 404

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
  <url>
    <loc>https://linkshort.live/</loc>
    <lastmod>2026-01-14</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://linkshort.live/privacy</loc>
    <lastmod>2026-01-14</lastmod>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://linkshort.live/terms</loc>
    <lastmod>2026-01-17</lastmod>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://linkshort.live/about</loc>
    <lastmod>2026-01-17</lastmod>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://linkshort.live/contact</loc>
    <lastmod>2026-01-17</lastmod>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://linkshort.live/blog</loc>
    <lastmod>2026-01-21</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://linkshort.live/utm-builder</loc>
    <lastmod>2026-01-21</lastmod>
    <priority>0.9</priority>
  </url>
</urlset>""", {'Content-Type': 'application/xml'}

if __name__ == '__main__':
    # Production configuration
    port = int(os.environ.get('PORT', 5001))
    # Disable debug mode in production
    debug_mode = os.environ.get('FLASK_ENV') == 'development'
    app.run(debug=debug_mode, host='0.0.0.0', port=port)
