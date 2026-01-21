from flask import Flask, render_template, request, redirect, jsonify, make_response
from database import init_db, create_short_url, get_original_url, create_ab_test, get_ab_test
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
import random
import markdown

app = Flask(__name__)
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",
)

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
    posts_dir = os.path.join(app.root_path, 'posts')
    posts = []
    if os.path.exists(posts_dir):
        for filename in os.listdir(posts_dir):
            if filename.endswith('.md'):
                slug = filename[:-3]
                with open(os.path.join(posts_dir, filename), 'r') as f:
                    content = f.read()
                    # Simple metadata parsing (expecting Title: ... on first line)
                    lines = content.split('\n')
                    title = lines[0].replace('Title:', '').strip() if lines[0].startswith('Title:') else slug.replace('-', ' ').title()
                    excerpt = lines[2].strip() if len(lines) > 2 else "Read more about " + title
                    date = lines[1].replace('Date:', '').strip() if len(lines) > 1 and lines[1].startswith('Date:') else "Jan 22, 2026"
                    posts.append({'slug': slug, 'title': title, 'excerpt': excerpt, 'date': date})
    return render_template('blog.html', posts=posts)

@app.route('/blog/<slug>')
def blog_post(slug):
    posts_dir = os.path.join(app.root_path, 'posts')
    post_path = os.path.join(posts_dir, f'{slug}.md')
    if os.path.exists(post_path):
        with open(post_path, 'r') as f:
            content = f.read()
            html_content = markdown.markdown(content)
            # Extract title for SEO
            lines = content.split('\n')
            title = lines[0].replace('Title:', '').strip() if lines[0].startswith('Title:') else slug.replace('-', ' ').title()
            return render_template('blog_post.html', content=html_content, title=title)
    return render_template('404.html'), 404

# === API ===
@app.route('/api/shorten', methods=['POST'])
@limiter.limit("10 per minute")
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

@app.route('/api/bulk-shorten', methods=['POST'])
@limiter.limit("5 per minute")
def bulk_shorten():
    data = request.json
    urls = data.get('urls', [])
    if not urls or not isinstance(urls, list):
        return jsonify({'error': 'URLs list is required'}), 400
    
    if len(urls) > 500:
        return jsonify({'error': 'Max 500 links per request'}), 400

    results = []
    for item in urls:
        url = item.get('url')
        alias = item.get('alias')
        if url:
            if not url.startswith(('http://', 'https://')):
                url = 'https://' + url
            short_alias = create_short_url(url, alias)
            results.append({'url': url, 'alias': short_alias})
    
    return jsonify({'success': True, 'results': results})

@app.route('/api/ab/create', methods=['POST'])
def api_create_ab_test():
    data = request.json
    name = data.get('name')
    url_a = data.get('url_a')
    url_b = data.get('url_b')
    split = int(data.get('split', 50))
    
    if not all([name, url_a, url_b]):
        return jsonify({'error': 'Missing required fields'}), 400
        
    test_id = f"ab_{random.getrandbits(32):x}"
    if create_ab_test(test_id, name, url_a, url_b, split):
        return jsonify({'success': True, 'test_id': test_id})
    return jsonify({'error': 'Failed to create test'}), 500

@app.route('/api/contact', methods=['POST'])
@limiter.limit("3 per minute")
def api_contact():
    data = request.json
    # In a real app, verify reCAPTCHA here
    # For now, just simulated success
    return jsonify({'success': True, 'message': 'Thank you! We will get back to you soon.'})

@app.route('/ab/<test_id>')
def ab_redirect(test_id):
    test = get_ab_test(test_id)
    if not test:
        return render_template('404.html'), 404
    
    # Check for existing variant in cookies
    cookie_name = f'ab_test_{test_id}'
    assigned_variant = request.cookies.get(cookie_name)
    
    if not assigned_variant:
        # 0-99 scale
        if random.randint(0, 99) < test['split']:
            assigned_variant = 'a'
        else:
            assigned_variant = 'b'
            
    target_url = test['url_a'] if assigned_variant == 'a' else test['url_b']
    
    response = make_response(redirect(target_url))
    response.set_cookie(cookie_name, assigned_variant, max_age=30*24*60*60) # 30 days
    return response

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
