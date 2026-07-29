import sqlite3

conn = sqlite3.connect('dev.db')
cursor = conn.cursor()

tables = [row[0] for row in cursor.execute("SELECT name FROM sqlite_master WHERE type='table';").fetchall()]
print("Tables in dev.db:", tables)

for table in tables:
    if 'user' in table.lower() or 'employee' in table.lower() or 'lead' in table.lower():
        print(f"\n=== Table: {table} ===")
        rows = cursor.execute(f"SELECT * FROM {table}").fetchall()
        col_names = [description[0] for description in cursor.description]
        print("Columns:", col_names)
        for r in rows:
            print(r)
