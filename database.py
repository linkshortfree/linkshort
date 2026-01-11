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
    conn.commit()
    conn.close()

def generate_short_alias(length=6):
    chars = string.ascii_letters + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

def create_short_url(original_url, alias=None):
    conn = get_db_connection()
    
    if not alias:
        alias = generate_short_alias()
        # Ensure uniqueness if auto-generated (simple retry)
        while conn.execute('SELECT 1 FROM urls WHERE alias = ?', (alias,)).fetchone():
            alias = generate_short_alias()
    
    try:
        conn.execute('INSERT INTO urls (original_url, alias) VALUES (?, ?)',
                     (original_url, alias))
        conn.commit()
        return alias
    except sqlite3.IntegrityError:
        return None # Alias already exists
    finally:
        conn.close()

def get_original_url(alias):
    conn = get_db_connection()
    url = conn.execute('SELECT original_url FROM urls WHERE alias = ?', (alias,)).fetchone()
    conn.close()
    if url:
        return url['original_url']
    return None
