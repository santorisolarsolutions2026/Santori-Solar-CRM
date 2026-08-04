import re

with open(r'c:\Users\anish\Santori-Solar-Solutions\src\app\(authenticated)\finance\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace bg-[#111625] -> bg-[#161B22]
content = content.replace('bg-[#111625]', 'bg-[#161B22]')
# Replace bg-slate-900 -> bg-[#161B22]
content = content.replace('bg-slate-900', 'bg-[#161B22]')
# Replace bg-[#090b11] -> bg-[#0D1117]
content = content.replace('bg-[#090b11]', 'bg-[#0D1117]')
# Replace border-slate-800 -> border-[var(--border-color)]
content = content.replace('border-slate-800', 'border-[var(--border-color)]')

# general blue to emerald for tailwind classes
content = re.sub(r'\btext-blue-400\b', 'text-emerald-400', content)
content = re.sub(r'\btext-blue-500\b', 'text-emerald-500', content)
content = re.sub(r'\btext-blue-600\b', 'text-emerald-600', content)
content = re.sub(r'\bbg-blue-400\b', 'bg-emerald-400', content)
content = re.sub(r'\bbg-blue-500\b', 'bg-emerald-500', content)
content = re.sub(r'\bbg-blue-600\b', 'bg-emerald-600', content)
content = re.sub(r'\bbg-blue-700\b', 'bg-emerald-700', content)
content = re.sub(r'\bborder-blue-500\b', 'border-emerald-500', content)
content = re.sub(r'\bborder-blue-600\b', 'border-emerald-600', content)
content = re.sub(r'\bhover:bg-blue-700\b', 'hover:bg-emerald-700', content)
content = re.sub(r'\bhover:bg-blue-600\b', 'hover:bg-emerald-600', content)
content = re.sub(r'\bhover:bg-blue-500\b', 'hover:bg-emerald-500', content)
content = re.sub(r'\bhover:text-blue-400\b', 'hover:text-emerald-400', content)
content = re.sub(r'\bhover:text-blue-500\b', 'hover:text-emerald-500', content)
content = re.sub(r'\bhover:text-blue-600\b', 'hover:text-emerald-600', content)
content = re.sub(r'\bfocus:border-blue-500\b', 'focus:border-emerald-500', content)
content = re.sub(r'\bfocus:ring-blue-500\b', 'focus:ring-emerald-500', content)
content = re.sub(r'\bfrom-blue-600\b', 'from-emerald-600', content)
content = re.sub(r'\bto-indigo-650\b', 'to-emerald-700', content)

# gradients
content = re.sub(r'bg-gradient-to-r from-emerald-600 to-emerald-700[^"\'`]*', 'bg-emerald-600', content)
content = re.sub(r'bg-gradient-to-r from-blue-500 to-blue-600[^"\'`]*', 'bg-emerald-600', content)
content = re.sub(r'bg-gradient-to-r from-blue-600 to-blue-700[^"\'`]*', 'bg-emerald-600', content)
content = re.sub(r'text-blue-600 dark:text-blue-400', 'text-emerald-600 dark:text-emerald-400', content)

# fractional colors
content = content.replace('bg-blue-500/10', 'bg-emerald-500/10')
content = content.replace('bg-blue-500/20', 'bg-emerald-500/20')
content = content.replace('bg-blue-600/10', 'bg-emerald-600/10')
content = content.replace('bg-blue-600/20', 'bg-emerald-600/20')
content = content.replace('border-blue-500/20', 'border-emerald-500/20')
content = content.replace('border-blue-500/30', 'border-emerald-500/30')

# some possible unreplaced cases
content = content.replace('text-blue-400', 'text-emerald-400')
content = content.replace('text-blue-500', 'text-emerald-500')
content = content.replace('text-blue-600', 'text-emerald-600')

with open(r'c:\Users\anish\Santori-Solar-Solutions\src\app\(authenticated)\finance\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
