import os

file_path = r"c:\Users\anish\Solar-CRM-Project\src\app\(authenticated)\team\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Normalize line endings to \n
content = content.replace("\r\n", "\n")

# 1. Replace the Edit view permissions checklist block
# Search range: from grid-cols-1 sm:grid-cols-2 gap-4 to lines before handleSaveMemberDetails buttons
target_edit_block = """                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {['Leads', 'Orders', 'Reports', 'Team'].map((cat) => {
                        let IconComponent = Users;
                        if (cat === 'Leads') IconComponent = Sun;
                        else if (cat === 'Orders') IconComponent = Lock;
                        else if (cat === 'Reports') IconComponent = History;

                        return (
                          <div key={cat} className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-3 hover:border-slate-700/50 transition-all duration-200 shadow-md">
                            <div className="flex items-center gap-2 border-b border-slate-850 pb-2 mb-1">
                              <IconComponent className="w-4 h-4 text-amber-500 shrink-0" />
                              <span className="block text-slate-200 font-bold uppercase tracking-wider text-[10px]">{cat} Permissions</span>
                            </div>
                            <div className="space-y-2">
                              {ALL_PERMISSIONS.filter(p => p.category === cat).map((perm) => {
                                const isChecked = editMemberPermissions.includes(perm.key);
                                const isDangerous = perm.key.includes('all') || perm.key.includes('manage') || perm.key.includes('verify') || perm.key.includes('delete');
                                
                                return (
                                  <label 
                                    key={perm.key} 
                                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer select-none transition-all duration-200 hover:-translate-y-[1px] ${
                                      isChecked 
                                        ? isDangerous
                                          ? 'bg-rose-500/[0.02] border-rose-500/25 hover:bg-rose-500/[0.04]'
                                          : 'bg-amber-500/[0.02] border-amber-500/20 hover:bg-amber-500/[0.04]'
                                        : 'bg-slate-950/20 border-slate-900 hover:border-slate-800 hover:bg-slate-900/40'
                                    }`}
                                  >
                                    {/* Beautiful Custom Toggle Switch */}
                                    <div className="relative shrink-0 mt-1 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          if (isChecked) {
                                            setEditMemberPermissions(editMemberPermissions.filter(k => k !== perm.key));
                                          } else {
                                            setEditMemberPermissions([...editMemberPermissions, perm.key]);
                                          }
                                        }}
                                        className="sr-only"
                                      />
                                      <div className={`w-8 h-4.5 rounded-full transition-colors duration-200 ease-in-out ${
                                        isChecked 
                                          ? isDangerous ? 'bg-rose-500' : 'bg-amber-500' 
                                          : 'bg-slate-800 border border-slate-700'
                                      }`} />
                                      <div className={`absolute top-0.75 left-0.75 w-3 h-3 rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                                        isChecked ? 'translate-x-3.5' : 'translate-x-0'
                                      }`} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-[11px] font-bold transition-colors ${isChecked ? 'text-white' : 'text-slate-300'}`}>
                                          {perm.label}
                                        </span>
                                        {isDangerous && (
                                          <span className="text-[8px] bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full px-1.5 py-0.25 font-bold uppercase tracking-wider">
                                            Admin
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[9px] text-slate-500 font-mono mt-0.5 tracking-wider uppercase">{perm.key}</span>
                                      <span className="text-[10px] text-slate-400 mt-1 leading-relaxed font-normal">{perm.description}</span>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>"""

replacement_edit_block = """                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {['Leads', 'Orders', 'Reports', 'Team'].map((cat) => {
                        let IconComponent = Users;
                        if (cat === 'Leads') IconComponent = Sun;
                        else if (cat === 'Orders') IconComponent = Lock;
                        else if (cat === 'Reports') IconComponent = History;

                        return (
                          <div key={cat} className="p-4 bg-slate-900/20 border border-slate-850 rounded-xl space-y-3 shadow-sm hover:border-slate-800 transition-all duration-200">
                            <div className="flex items-center gap-2 border-b border-slate-850/80 pb-2 mb-2">
                              <IconComponent className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="block text-slate-300 font-bold uppercase tracking-wider text-[9px]">{cat} Permissions</span>
                            </div>
                            <div className="divide-y divide-slate-850/40">
                              {ALL_PERMISSIONS.filter(p => p.category === cat).map((perm) => {
                                const isChecked = editMemberPermissions.includes(perm.key);
                                const isDangerous = perm.key.includes('all') || perm.key.includes('manage') || perm.key.includes('verify') || perm.key.includes('delete');
                                
                                return (
                                  <div key={perm.key} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                                    <div className="flex-1 min-w-0 pr-4">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[11px] font-bold text-slate-200">
                                          {perm.label}
                                        </span>
                                        {isDangerous && (
                                          <span className="text-[7px] bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded px-1 font-bold uppercase tracking-wider">
                                            Admin
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed font-normal">{perm.description}</p>
                                    </div>
                                    
                                    {/* Clean, brand-appropriate toggle switch */}
                                    <label className="relative inline-flex items-center shrink-0 cursor-pointer select-none">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          if (isChecked) {
                                            setEditMemberPermissions(editMemberPermissions.filter(k => k !== perm.key));
                                          } else {
                                            setEditMemberPermissions([...editMemberPermissions, perm.key]);
                                          }
                                        }}
                                        className="sr-only"
                                      />
                                      <div className={`w-8 h-4.5 rounded-full transition-colors duration-200 ease-in-out ${
                                        isChecked ? 'bg-amber-500' : 'bg-slate-800 border border-slate-700'
                                      }`} />
                                      <div className={`absolute top-0.75 left-0.75 w-3 h-3 rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                                        isChecked ? 'translate-x-3.5' : 'translate-x-0'
                                      }`} />
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>"""

if target_edit_block in content:
    content = content.replace(target_edit_block, replacement_edit_block)
    print("Edit permissions checklist beautified successfully.")
else:
    # Try literal match without layout indent
    print("Warning: Edit permissions block not matched exactly.")

# 2. Replace the View-Only permissions summary block
# Search range: from categories map to end of mapping
target_view_block = """                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {['Leads', 'Orders', 'Reports', 'Team'].map((cat) => {
                          const catPerms = ALL_PERMISSIONS.filter(p => p.category === cat && selectedMember.permissions?.includes(p.key));
                          if (catPerms.length === 0) return null;
                          return (
                            <div key={cat} className="p-4 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-3 hover:border-slate-700/50 transition-all duration-200 shadow-md">
                              <div className="flex items-center gap-2 border-b border-slate-850 pb-2 mb-1">
                                <span className="block text-slate-200 font-bold uppercase tracking-wider text-[10px]">{cat} Permissions</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {catPerms.map((perm) => (
                                  <span key={perm.key} className="text-[9px] bg-slate-950 text-slate-300 border border-slate-850 rounded px-2 py-0.5 font-semibold" title={perm.description}>
                                    {perm.label}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>"""

replacement_view_block = """                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {['Leads', 'Orders', 'Reports', 'Team'].map((cat) => {
                          const catPerms = ALL_PERMISSIONS.filter(p => p.category === cat && selectedMember.permissions?.includes(p.key));
                          if (catPerms.length === 0) return null;
                          return (
                            <div key={cat} className="p-4 bg-slate-900/20 border border-slate-850 rounded-xl space-y-3 hover:border-slate-800 transition-all duration-200 shadow-sm">
                              <div className="flex items-center gap-2 border-b border-slate-850/80 pb-2 mb-1.5">
                                <span className="block text-slate-300 font-bold uppercase tracking-wider text-[9px]">{cat} Permissions</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {catPerms.map((perm) => (
                                  <span key={perm.key} className="text-[9px] bg-slate-950/60 text-slate-350 border border-slate-850 rounded-lg px-2.5 py-1 font-semibold tracking-wide hover:border-slate-700 transition-colors cursor-help" title={perm.description}>
                                    {perm.label}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>"""

if target_view_block in content:
    content = content.replace(target_view_block, replacement_view_block)
    print("View permissions summary beautified successfully.")
else:
    print("Warning: View permissions summary block not matched exactly.")

# Write back using CRLF
content = content.replace("\n", "\r\n")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Team page permissions beautified complete.")
