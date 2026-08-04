import re

file_path = r"c:\Users\anish\Santori-Solar-Solutions\src\app\(authenticated)\reports\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

def replace(pattern, repl, text):
    return re.sub(pattern, repl, text)

# Color transformation rules:
# 1. bg-[#111625] or bg-slate-900 → bg-[#161B22]
content = replace(r'bg-\[\#111625\]', 'bg-[#161B22]', content)
content = replace(r'bg-slate-900', 'bg-[#161B22]', content)
# 2. bg-[#090b11] → bg-[#0D1117]
content = replace(r'bg-\[\#090b11\]', 'bg-[#0D1117]', content)
# 3. border-slate-800 → border-[var(--border-color)]
content = replace(r'border-slate-800', 'border-[var(--border-color)]', content)

# 4. text-blue-400 / text-blue-600 dark:text-blue-400 (accent) → text-emerald-400
# And keeping semantic numbers if needed, but the prompt says:
# "Sales metrics: emerald for positive numbers" (wait, this might need logic? No, only className changes)
content = replace(r'text-blue-400', 'text-emerald-400', content)
content = replace(r'text-blue-500', 'text-emerald-500', content)
content = replace(r'text-blue-600', 'text-emerald-600', content)
# Ensure dark:text-blue-400 is updated if not already
content = replace(r'dark:text-blue-400', 'dark:text-emerald-400', content)

# 5. bg-blue-600 (buttons) → bg-emerald-600
# 7. bg-blue-500/10 → bg-emerald-500/10
# 8. border-blue-500/20 → border-emerald-500/20
content = replace(r'bg-blue-600', 'bg-emerald-600', content)
content = replace(r'bg-blue-500', 'bg-emerald-500', content)
content = replace(r'bg-blue-700', 'bg-emerald-700', content)
content = replace(r'border-blue-500', 'border-emerald-500', content)
content = replace(r'border-blue-600', 'border-emerald-600', content)

# 6. 'bg-gradient-to-r from-blue-600...' → bg-emerald-600
content = replace(r'bg-gradient-to-r\s+from-blue-600\s+to-(?:blue|indigo)-[0-9]+', 'bg-emerald-600', content)
content = replace(r'bg-gradient-to-br\s+from-slate-900\s+to-\[\#111625\]', 'bg-[#161B22]', content)

# 9. hover:text-blue-400 → hover:text-emerald-400
content = replace(r'hover:text-blue-400', 'hover:text-emerald-400', content)
content = replace(r'hover:text-blue-500', 'hover:text-emerald-500', content)
content = replace(r'hover:bg-blue-600', 'hover:bg-emerald-600', content)
content = replace(r'hover:bg-blue-700', 'hover:bg-emerald-700', content)

# 10. focus:border-blue-500 → focus:border-emerald-500
content = replace(r'focus:border-blue-500', 'focus:border-emerald-500', content)
content = replace(r'focus:ring-blue-500', 'focus:ring-emerald-500', content)
content = replace(r'ring-blue-500', 'ring-emerald-500', content)
content = replace(r'shadow-blue-500', 'shadow-emerald-500', content)
content = replace(r'border-blue-400', 'border-emerald-400', content)
content = replace(r'text-blue-100', 'text-emerald-100', content)
content = replace(r'bg-blue-400', 'bg-emerald-400', content)
content = replace(r'hover:border-blue-500', 'hover:border-emerald-500', content)

# The chart COLORS array should be preserved (Rule 12). Since it uses Hex (#3B82F6), the regex won't touch it.

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Regex replacements applied successfully.")
