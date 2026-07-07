import psycopg2

conn = psycopg2.connect(
    host="103.108.220.19",
    port=5432,
    database="alpha_web",
    user="postgres",
    password="wafewin"
)

cur = conn.cursor()
cur.execute("SELECT content_html, blog_id FROM blogs_details ORDER BY blog_id DESC LIMIT 1;")
row = cur.fetchone()
if row:
    with open("scratch/blog_content.html", "w", encoding="utf-8") as f:
        f.write(row[0])
    print(f"Wrote content_html for blog_id {row[1]} to scratch/blog_content.html")
else:
    print("No row found")

cur.close()
conn.close()
