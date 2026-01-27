from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import numpy as np
import tensorflow as tf
from tensorflow import keras
import joblib
import re
from urllib.parse import urlparse, urljoin
import tldextract
import os
import zipfile
from datetime import datetime
from bs4 import BeautifulSoup
import requests

app = Flask(__name__)
CORS(app)

# ============================================================================
# LOAD MODEL AND PREPROCESSING OBJECTS
# ============================================================================

print("Loading model and preprocessors...")

try:
    if os.path.exists('saved_models/phishing_model.keras'):
        model = keras.models.load_model('saved_models/phishing_model.keras')
        model_file = 'phishing_model.keras'
    elif os.path.exists('saved_models/phishing_model.h5'):
        model = keras.models.load_model('saved_models/phishing_model.h5')
        model_file = 'phishing_model.h5'
    else:
        raise FileNotFoundError("No model file found!")
    print(f"✅ Model loaded: {model_file}")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    model = None
    model_file = None

scaler_url = joblib.load('saved_models/scaler_url.pkl')
scaler_html = joblib.load('saved_models/scaler_html.pkl')
print("✅ Scalers loaded")

feature_config = joblib.load('saved_models/feature_config.pkl')
url_features = feature_config['url_features']
html_features = feature_config['html_features']
print("✅ Feature configuration loaded")

metrics = joblib.load('saved_models/metrics.pkl')
print("✅ Metrics loaded")

print(f"\nModel ready! Features: {len(url_features)} URL + {len(html_features)} HTML")

# ============================================================================
# FEATURE EXTRACTION FUNCTIONS
# ============================================================================

def extract_url_features(url):
    """Extract features from a raw URL string"""
    
    if not url.startswith(('http://', 'https://')):
        url = 'http://' + url
    
    try:
        parsed = urlparse(url)
        ext = tldextract.extract(url)
    except:
        parsed = urlparse('')
        ext = tldextract.extract('')
    
    url_dict = {}
    html_dict = {}
    
    # URL FEATURES
    hostname = parsed.netloc or ''
    domain = ext.domain
    subdomain = ext.subdomain
    
    url_dict['length_url'] = len(url)
    url_dict['length_hostname'] = len(hostname)
    
    ip_pattern = r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$'
    url_dict['ip'] = 1 if re.match(ip_pattern, hostname) else 0
    
    url_dict['nb_dots'] = url.count('.')
    url_dict['nb_hyphens'] = url.count('-')
    url_dict['nb_at'] = url.count('@')
    url_dict['nb_slash'] = url.count('/')
    url_dict['nb_www'] = 1 if 'www' in hostname.lower() else 0
    url_dict['nb_com'] = 1 if '.com' in url.lower() else 0
    
    digits = sum(c.isdigit() for c in url)
    url_dict['ratio_digits_url'] = digits / len(url) if len(url) > 0 else 0
    
    url_dict['punycode'] = 1 if 'xn--' in hostname.lower() else 0
    url_dict['prefix_suffix'] = 1 if '-' in domain else 0
    
    shorteners = ['bit.ly', 'goo.gl', 'tinyurl', 't.co', 'ow.ly', 'is.gd', 'buff.ly']
    url_dict['shortening_service'] = 1 if any(s in hostname.lower() for s in shorteners) else 0
    
    common_tlds = ['.com', '.org', '.net', '.edu', '.gov']
    url_dict['tld_in_subdomain'] = 1 if any(tld in subdomain for tld in common_tlds) else 0
    
    url_dict['abnormal_subdomain'] = 1 if len(subdomain) > 20 or subdomain.count('.') > 3 else 0
    url_dict['nb_subdomains'] = subdomain.count('.') + 1 if subdomain else 0
    
    suspicious_tlds = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.work']
    url_dict['suspecious_tld'] = 1 if any(tld in url.lower() for tld in suspicious_tlds) else 0
    
    phish_keywords = ['login', 'signin', 'secure', 'account', 'verify', 'update', 'confirm', 'banking']
    url_dict['phish_hints'] = 1 if any(kw in url.lower() for kw in phish_keywords) else 0
    
    consonants = sum(1 for c in domain.lower() if c in 'bcdfghjklmnpqrstvwxyz')
    url_dict['random_domain'] = 1 if len(domain) > 0 and (consonants / len(domain)) > 0.7 else 0
    
    url_dict['nb_dslash'] = url.count('//') - 1 if url.startswith(('http://', 'https://')) else url.count('//')
    
    # HTML FEATURES - Default values (no HTML content provided)
    for feature in html_features:
        html_dict[feature] = 0
    
    return url_dict, html_dict, parsed


def extract_html_features(html_content, url, parsed_url):
    """Extract features from HTML content"""
    
    html_dict = {}
    
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
    except:
        # If parsing fails, return default values
        for feature in html_features:
            html_dict[feature] = 0
        return html_dict
    
    hostname = parsed_url.netloc or ''
    
    # HTTP in path
    html_dict['http_in_path'] = 1 if 'http' in parsed_url.path.lower() else 0
    
    # HTTPS token
    html_dict['https_token'] = 1 if 'https' in parsed_url.path.lower() or 'https' in parsed_url.query.lower() else 0
    
    # Count hyperlinks
    hyperlinks = soup.find_all('a', href=True)
    html_dict['nb_hyperlinks'] = len(hyperlinks)
    
    # Analyze hyperlink destinations
    internal_links = 0
    external_links = 0
    null_links = 0
    
    for link in hyperlinks:
        href = link['href'].lower()
        
        if href == '' or href == '#' or href.startswith('javascript:'):
            null_links += 1
        elif hostname in href or href.startswith('/') or href.startswith('./'):
            internal_links += 1
        else:
            external_links += 1
    
    total_links = html_dict['nb_hyperlinks']
    html_dict['ratio_intHyperlinks'] = internal_links / total_links if total_links > 0 else 0
    html_dict['ratio_extHyperlinks'] = external_links / total_links if total_links > 0 else 0
    html_dict['ratio_nullHyperlinks'] = null_links / total_links if total_links > 0 else 0
    
    # External CSS
    stylesheets = soup.find_all('link', rel='stylesheet')
    external_css = sum(1 for s in stylesheets if hostname not in s.get('href', ''))
    html_dict['nb_extCSS'] = external_css
    
    # Redirections (meta refresh, form action redirects)
    meta_refresh = soup.find('meta', attrs={'http-equiv': 'refresh'})
    forms = soup.find_all('form')
    
    internal_redir = 0
    external_redir = 0
    
    if meta_refresh:
        if hostname in meta_refresh.get('content', ''):
            internal_redir += 1
        else:
            external_redir += 1
    
    for form in forms:
        action = form.get('action', '').lower()
        if action and action != '':
            if hostname in action or action.startswith('/') or action.startswith('./'):
                internal_redir += 1
            else:
                external_redir += 1
    
    total_redir = internal_redir + external_redir
    html_dict['ratio_intRedirection'] = internal_redir / total_redir if total_redir > 0 else 0
    html_dict['ratio_extRedirection'] = external_redir / total_redir if total_redir > 0 else 0
    
    # Login form detection
    html_dict['login_form'] = 1 if soup.find('input', {'type': 'password'}) else 0
    
    # External favicon
    favicon = soup.find('link', rel='icon') or soup.find('link', rel='shortcut icon')
    html_dict['external_favicon'] = 0
    if favicon:
        href = favicon.get('href', '').lower()
        if href and hostname not in href and not href.startswith('/'):
            html_dict['external_favicon'] = 1
    
    # Links in tags
    anchors_in_tags = len(soup.find_all('a', href=True))
    html_dict['links_in_tags'] = 1 if anchors_in_tags > 0 else 0
    
    # Submit email to form
    inputs = soup.find_all('input', {'type': 'email'})
    html_dict['submit_email'] = 1 if len(inputs) > 0 else 0
    
    # Server form handler (SFH) - check form action vs hostname
    html_dict['sfh'] = 0
    for form in forms:
        action = form.get('action', '').lower()
        if action and hostname not in action and not action.startswith('/') and not action.startswith('./'):
            html_dict['sfh'] = 1
            break
    
    # iFrame
    html_dict['iframe'] = 1 if soup.find('iframe') else 0
    
    # Popup window (script with window.open)
    scripts = soup.find_all('script')
    popup_count = 0
    for script in scripts:
        if script.string and 'window.open' in script.string.lower():
            popup_count += 1
    html_dict['popup_window'] = 1 if popup_count > 0 else 0
    
    # Safe anchor (href="#")
    safe_anchors = sum(1 for link in hyperlinks if link['href'] == '#')
    html_dict['safe_anchor'] = 1 if safe_anchors > 0 else 0
    
    # Onmouseover
    html_dict['onmouseover'] = 1 if 'onmouseover' in html_content.lower() else 0
    
    # Right click (disable right click)
    html_dict['right_clic'] = 1 if 'oncontextmenu' in html_content.lower() else 0
    
    # Empty title
    title = soup.find('title')
    html_dict['empty_title'] = 1 if not title or not title.string or title.string.strip() == '' else 0
    
    # Domain in title
    html_dict['domain_in_title'] = 1 if title and title.string and hostname.split('.')[0] in title.string.lower() else 0
    
    # Domain with copyright
    html_dict['domain_with_copyright'] = 1 if '©' in html_content or '&copy;' in html_content else 0
    
    # Brand in subdomain/path
    brand_keywords = ['apple', 'google', 'facebook', 'microsoft', 'amazon', 'bank', 'paypal', 'netflix', 'amazon']
    domain_part = hostname.split('.')[0].lower()
    
    html_dict['brand_in_subdomain'] = 1 if any(brand in domain_part for brand in brand_keywords) else 0
    html_dict['brand_in_path'] = 1 if any(brand in parsed_url.path.lower() for brand in brand_keywords) else 0
    
    # Domain in brand (check if domain appears in body content)
    body = soup.find('body')
    html_dict['domain_in_brand'] = 1 if body and hostname.split('.')[0] in body.get_text().lower() else 0
    
    # Ensure all features exist
    for feature in html_features:
        if feature not in html_dict:
            html_dict[feature] = 0
    
    return html_dict


def fetch_url_content(url, timeout=5):
    """Fetch HTML content from URL with timeout and error handling"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(url, timeout=timeout, headers=headers, verify=False)
        response.raise_for_status()
        return response.text
    except Exception as e:
        print(f"Could not fetch HTML: {e}")
        return None


def predict_url(url_features_dict, html_features_dict):
    """Predict if a URL is phishing or legitimate"""
    
    url_array = np.array([[url_features_dict.get(f, 0) for f in url_features]])
    html_array = np.array([[html_features_dict.get(f, 0) for f in html_features]])
    
    url_scaled = scaler_url.transform(url_array)
    html_scaled = scaler_html.transform(html_array)
    
    prob = model.predict([url_scaled, html_scaled], verbose=0)[0][0]
    
    # Ensure probability is between 0 and 1
    prob = float(np.clip(prob, 0, 1))
    
    prediction = 'Phishing' if prob > 0.5 else 'Legitimate'
    
    return prediction, prob


# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.route('/')
def home():
    """Home endpoint"""
    return jsonify({
        'status': 'online',
        'message': 'Phishing Detection API is running',
        'model': 'Attention-Based Deep Fusion Model',
        'model_loaded': model is not None,
        'version': '1.0.3',
        'endpoints': {
            '/predict': 'POST - Predict if URL is phishing',
            '/health': 'GET - Check API health',
            '/metrics': 'GET - Get model performance metrics',
            '/api/download-model': 'GET - Download model file',
            '/api/download-all': 'GET - Download all model files as ZIP'
        }
    })


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'url_features': len(url_features),
        'html_features': len(html_features),
        'timestamp': datetime.now().isoformat()
    })


@app.route('/metrics', methods=['GET'])
def get_metrics():
    """Get model performance metrics"""
    return jsonify({
        'model': 'Attention-Based Deep Fusion Model',
        'metrics': {
            'accuracy': round(metrics['accuracy'] * 100, 2),
            'precision': round(metrics['precision'] * 100, 2),
            'recall': round(metrics['recall'] * 100, 2),
            'f1_score': round(metrics['f1_score'] * 100, 2),
            'roc_auc': round(metrics['roc_auc'] * 100, 2),
        }
    })


@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict if a URL is phishing or legitimate
    
    Request JSON:
    {
        "url": "https://example.com",
        "fetch_html": true  // Optional: fetch and analyze HTML content
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'url' not in data:
            return jsonify({
                'error': 'No URL provided',
                'message': 'Please provide a URL in the request body: {"url": "https://example.com"}'
            }), 400
        
        url = data['url'].strip()
        fetch_html = data.get('fetch_html', False)
        
        if not url:
            return jsonify({
                'error': 'Empty URL',
                'message': 'URL cannot be empty'
            }), 400
        
        # Extract URL features
        url_features_dict, html_features_dict, parsed_url = extract_url_features(url)
        
        # Optionally fetch and analyze HTML
        html_source = None
        if fetch_html:
            html_content = fetch_url_content(url)
            if html_content:
                html_features_dict = extract_html_features(html_content, url, parsed_url)
                html_source = 'fetched'
            else:
                html_source = 'unavailable'
        else:
            html_source = 'not_requested'
        
        # Make prediction
        prediction, confidence = predict_url(url_features_dict, html_features_dict)
        
        # Ensure confidence is clamped between 0 and 1
        confidence = float(np.clip(confidence, 0, 1))
        
        # FIXED: Model outputs PHISHING probability (0-1)
        # So confidence is ALWAYS the phishing probability
        # Phishing Score = confidence * 100
        # Legitimate Score = (1 - confidence) * 100
        phishing_score = round(confidence * 100, 2)
        legitimate_score = round((1 - confidence) * 100, 2)
        
        # Ensure both are in valid range
        phishing_score = max(0, min(100, phishing_score))
        legitimate_score = max(0, min(100, legitimate_score))
        
        # Also calculate confidence_percentage (same as phishing_score but kept for compatibility)
        confidence_percentage = phishing_score
        
        print(f"\n{'='*80}")
        print(f"🔍 ANALYSIS RESULTS")
        print(f"{'='*80}")
        print(f"URL: {url}")
        print(f"Raw Model Output (Phishing Probability): {confidence:.4f}")
        print(f"Prediction: {prediction}")
        print(f"Phishing Score: {phishing_score}%")
        print(f"Legitimate Score: {legitimate_score}%")
        print(f"Sum: {phishing_score + legitimate_score}%")
        print(f"{'='*80}\n")
        
        # Determine risk level
        if prediction == 'Phishing':
            if confidence > 0.9:
                risk_level = "🔴 CRITICAL"
                risk_color = "red"
            elif confidence > 0.7:
                risk_level = "🟠 HIGH"
                risk_color = "orange"
            else:
                risk_level = "🟡 MODERATE"
                risk_color = "yellow"
        else:
            if confidence < 0.1:
                risk_level = "🟢 VERY SAFE"
                risk_color = "green"
            elif confidence < 0.3:
                risk_level = "🟢 SAFE"
                risk_color = "green"
            else:
                risk_level = "🟡 PROBABLY SAFE"
                risk_color = "yellow"
        
        # Prepare response
        response = {
            'url': url,
            'prediction': prediction,
            'confidence': round(confidence, 4),
            'confidence_percentage': confidence_percentage,
            'phishing_score': phishing_score,
            'legitimate_score': legitimate_score,
            'risk_level': risk_level,
            'risk_color': risk_color,
            'is_phishing': prediction == 'Phishing',
            'html_analysis': html_source,
            'features': {
                'url_features': {k: v for k, v in list(url_features_dict.items())[:10]},
                'total_url_features': len(url_features_dict),
                'total_html_features': len(html_features_dict),
                'suspicious_html_features': [k for k, v in html_features_dict.items() if v == 1]
            },
            'recommendations': get_recommendations(prediction),
            'timestamp': datetime.now().isoformat()
        }
        
        return jsonify(response), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Prediction failed',
            'message': str(e)
        }), 500


def get_recommendations(prediction):
    """Get security recommendations based on prediction"""
    if prediction == 'Phishing':
        return [
            "⚠️ DO NOT enter any personal information on this website",
            "❌ DO NOT click on any links or download files",
            "📢 Report this URL to your IT security team",
            "🚪 Close the webpage immediately and clear your browser cache"
        ]
    else:
        return [
            "✅ URL appears to be legitimate based on our analysis",
            "🔒 Always verify HTTPS and valid SSL certificates",
            "👀 Double-check the domain spelling before entering sensitive data",
            "⚡ Stay cautious of suspicious redirects or pop-ups"
        ]


@app.route('/api/download-model', methods=['GET'])
def download_model():
    """Download the model file"""
    try:
        if os.path.exists(f'saved_models/{model_file}'):
            return send_file(
                f'saved_models/{model_file}',
                as_attachment=True,
                download_name=model_file,
                mimetype='application/octet-stream'
            )
        else:
            return jsonify({'error': 'Model file not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/download-all', methods=['GET'])
def download_all():
    """Download all model files as a ZIP"""
    try:
        zip_filename = 'phishing_detection_model.zip'
        zip_path = os.path.join('saved_models', zip_filename)
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            files_to_zip = [
                model_file,
                'scaler_url.pkl',
                'scaler_html.pkl',
                'feature_config.pkl',
                'metrics.pkl'
            ]
            
            for file in files_to_zip:
                file_path = os.path.join('saved_models', file)
                if os.path.exists(file_path):
                    zipf.write(file_path, file)
        
        return send_file(
            zip_path,
            as_attachment=True,
            download_name=zip_filename,
            mimetype='application/zip'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("\n" + "="*80)
    print("🚀 PHISHING DETECTION API SERVER")
    print("="*80)
    print("\nServer starting on http://localhost:5000")
    print("\nAPI Endpoints:")
    print("  • GET  /                    - API info")
    print("  • GET  /health              - Health check")
    print("  • GET  /metrics             - Model metrics")
    print("  • POST /predict             - Predict URL")
    print("  • GET  /api/download-model  - Download model")
    print("  • GET  /api/download-all    - Download all files (ZIP)")
    print("\n" + "="*80)
    print("\n✅ Ready to accept requests from React frontend!")
    print("="*80 + "\n")
    
    app.run(debug=True, host='0.0.0.0', port=5000)