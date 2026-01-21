import sqlite3
import string
import random
from datetime import datetime

DB_NAME = 'urls.db'

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS urls (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            original_url TEXT NOT NULL,
            alias TEXT UNIQUE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.execute('''
        CREATE TABLE IF NOT EXISTS ab_tests (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            url_a TEXT NOT NULL,
            url_b TEXT NOT NULL,
            split INTEGER DEFAULT 50,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def generate_short_alias(length=6):
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

def create_short_url(original_url, alias=None):
    conn = get_db_connection()
    
    # Normalizing URL to ensure consistency
    if not original_url.startswith(('http://', 'https://')):
        original_url = 'https://' + original_url

    # Check if this exact URL and alias combo already exists
    if alias:
        existing = conn.execute('SELECT 1 FROM urls WHERE alias = ? AND original_url = ?', (alias, original_url)).fetchone()
        if existing:
            conn.close()
            return alias
            
        # If alias is taken by ANOTHER url, append a small random string to resolve it silently
        check_alias = conn.execute('SELECT 1 FROM urls WHERE alias = ?', (alias,)).fetchone()
        if check_alias:
            alias = f"{alias}-{generate_short_alias(3)}"
    
    # Generate random alias if none provided
    if not alias:
        alias = generate_short_alias()
        while conn.execute('SELECT 1 FROM urls WHERE alias = ?', (alias,)).fetchone():
            alias = generate_short_alias()
    
    try:
        conn.execute('INSERT INTO urls (original_url, alias) VALUES (?, ?)',
                     (original_url, alias))
        conn.commit()
        return alias
    except sqlite3.IntegrityError:
        # Final safety fallback: append a bit more randomness and retry once
        alias = f"{alias}{generate_short_alias(2)}"
        try:
            conn.execute('INSERT INTO urls (original_url, alias) VALUES (?, ?)',
                         (original_url, alias))
            conn.commit()
            return alias
        except:
            return None 
    finally:
        conn.close()

def get_original_url(alias):
    conn = get_db_connection()
    url = conn.execute('SELECT original_url FROM urls WHERE alias = ?', (alias,)).fetchone()
    conn.close()
    if url:
        return url['original_url']
    return None

def create_ab_test(test_id, name, url_a, url_b, split=50):
    conn = get_db_connection()
    try:
        conn.execute('INSERT INTO ab_tests (id, name, url_a, url_b, split) VALUES (?, ?, ?, ?, ?)',
                     (test_id, name, url_a, url_b, split))
        conn.commit()
        return True
    except:
        return False
    finally:
        conn.close()

def get_ab_test(test_id):
    conn = get_db_connection()
    test = conn.execute('SELECT * FROM ab_tests WHERE id = ?', (test_id,)).fetchone()
    conn.close()
    return test
