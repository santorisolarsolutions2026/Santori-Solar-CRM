import sqlite3

conn = sqlite3.connect('dev.db')
cursor = conn.cursor()

rows = cursor.execute("SELECT id, name, email, phone, role FROM User").fetchall()
for r in rows:
    print(r)
