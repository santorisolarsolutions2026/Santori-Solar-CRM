import sqlite3

conn = sqlite3.connect('dev.db')
cursor = conn.cursor()

# Get all users with reportsTo and role and designation
try:
    cursor.execute("""
        SELECT u.id, u.name, u.role, u.reportsTo, d.name, d.level 
        FROM User u 
        LEFT JOIN Designation d ON u.designationId = d.id
    """)
    users = cursor.fetchall()
    print("--- USER LIST ---")
    for u in users:
        print(f"ID: {u[0]} | Name: {u[1]} | Role: {u[2]} | ReportsTo: {u[3]} | Designation: {u[4]} | Level: {u[5]}")
except Exception as e:
    print("Error:", e)

conn.close()
