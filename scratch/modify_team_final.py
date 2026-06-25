import os

file_path = r"c:\Users\anish\Solar-CRM-Project\src\app\(authenticated)\team\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Normalize line endings to \n
content = content.replace("\r\n", "\n")

# 1. Update modal container width dynamically based on selection
target_container = """      {/* View User Modal Dialog / Edit Own Profile Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg bg-[#111625] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">"""

replacement_container = """      {/* View User Modal Dialog / Edit Own Profile Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className={`w-full ${selectedMember.id === user?.id ? 'max-w-lg' : 'max-w-5xl md:max-h-[90vh]'} bg-[#111625] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col`}>"""

if target_container in content:
    content = content.replace(target_container, replacement_container)
    print("Container width replacement success.")
else:
    print("Warning: Container width target not found.")

# 2. Modify Edit Other Profile starts
target_edit_start = """            ) : isAdminOrDirectorOrSalesHead ? (
              /* EDIT OTHER MEMBER'S PROFILE VIEW (Admins, Directors, Sales Heads only) */
              <form onSubmit={handleSaveMemberDetails}>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">"""

replacement_edit_start = """            ) : isAdminOrDirectorOrSalesHead ? (
              /* EDIT OTHER MEMBER'S PROFILE VIEW (Admins, Directors, Sales Heads only) */
              <form onSubmit={handleSaveMemberDetails} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8 overflow-y-auto flex-1 md:max-h-[70vh]">
                  {/* Left Column: Personal details & Logs */}
                  <div className="md:col-span-5 space-y-6">"""

if target_edit_start in content:
    content = content.replace(target_edit_start, replacement_edit_start)
    print("Edit start replacement success.")
else:
    print("Warning: Edit start target not found.")

# 3. Extract access logs in Edit view and remove it from its original spot
edit_logs_block = """                  {/* Access Logs */}
                  <div className="border-t border-slate-800 pt-4 space-y-4">
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Access Logs</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-lg">
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1.5">Last Login Session</span>
                        {selectedMember.lastLoginAt ? (
                          <div className="space-y-1">
                            <span className="block text-white text-xs font-mono">
                              {new Date(selectedMember.lastLoginAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                            <span className="block text-[10px] text-slate-400 italic font-semibold leading-normal">
                              📍 {selectedMember.loginLocation || 'Unknown location'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs italic">No login recorded</span>
                        )}
                      </div>

                      <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-lg">
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1.5">Last Logout Session</span>
                        {selectedMember.lastLogoutAt ? (
                          <div className="space-y-1">
                            <span className="block text-white text-xs font-mono">
                              {new Date(selectedMember.lastLogoutAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                            <span className="block text-[10px] text-slate-400 italic font-semibold leading-normal">
                              📍 {selectedMember.logoutLocation || 'Unknown location'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs italic">No logout recorded</span>
                        )}
                      </div>
                    </div>
                  </div>"""

if edit_logs_block in content:
    content = content.replace(edit_logs_block, "")
    print("Access Logs removed from original bottom spot in Edit view.")
else:
    print("Warning: Access Logs block in Edit view not found for removal.")

# 4. Insert Left Column end, Right Column start, and checklist container replacement
target_checklist_start = """                  {/* Custom Access Permissions Checklist */}
                  <div className="border-t border-slate-800 pt-4 space-y-4">"""

# Toggling reset defaults design
reset_btn_orig = """                    <div className="flex items-center justify-between">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Custom Access Permissions</h5>
                      <button
                        type="button"
                        onClick={() => {
                          const base = editMemberForm.role === 'other' ? editBaseRole : editMemberForm.role;
                          setEditMemberPermissions(getLocalDefaultPermissionsForRole(base));
                        }}
                        className="text-[9px] font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 transition-colors bg-slate-900 border border-slate-800/80 px-2 py-1 rounded cursor-pointer"
                      >
                        Reset to designation defaults
                      </button>
                    </div>"""

# Beautified Reset defaults
reset_btn_beautified = """                    <div className="flex items-center justify-between">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Custom Access Permissions</h5>
                      <button
                        type="button"
                        onClick={() => {
                          const base = editMemberForm.role === 'other' ? editBaseRole : editMemberForm.role;
                          setEditMemberPermissions(getLocalDefaultPermissionsForRole(base));
                        }}
                        className="text-[9px] font-bold uppercase tracking-wider text-slate-350 hover:text-slate-200 transition-colors bg-slate-900 border border-slate-800 px-2.5 py-1 rounded cursor-pointer"
                      >
                        Reset to defaults
                      </button>
                    </div>"""

replacement_checklist_start = edit_logs_block + """
                  </div> {/* End of Left Column */}

                  {/* Right Column: Custom Access Permissions Checklist */}
                  <div className="md:col-span-7 space-y-6 md:border-l md:border-slate-850 md:pl-8">"""

if target_checklist_start in content:
    content = content.replace(target_checklist_start, replacement_checklist_start)
    print("Checklist transition and column setup in Edit view success.")
else:
    print("Warning: Checklist start target not found.")

if reset_btn_orig in content:
    content = content.replace(reset_btn_orig, reset_btn_beautified)
    print("Reset button layout updated successfully.")
else:
    print("Warning: Reset button target not found.")

# 5. Replace permissions checklist grid with a clean list-like theme-aligned design
target_checklist_grid = """                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

replacement_checklist_grid = """                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {['Leads', 'Orders', 'Reports', 'Team'].map((cat) => {
                        let IconComponent = Users;
                        if (cat === 'Leads') IconComponent = Sun;
                        else if (cat === 'Orders') IconComponent = Lock;
                        else if (cat === 'Reports') IconComponent = History;

                        return (
                          <div key={cat} className="p-4 bg-slate-900/20 border border-slate-850 rounded-xl space-y-3 hover:border-slate-800 transition-all duration-200 shadow-sm">
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
                                          <span className="text-[7px] bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded px-1.5 py-0.25 font-bold uppercase tracking-wider">
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

if target_checklist_grid in content:
    content = content.replace(target_checklist_grid, replacement_checklist_grid)
    print("Checklist grid replacement success.")
else:
    print("Warning: Checklist grid target not found.")

# 6. Modify View Profile (Read-only View) starts
target_view_start = """            ) : (
              /* VIEW PROFILE VIEW */
              <div className="p-6 space-y-6">"""

replacement_view_start = """            ) : (
              /* VIEW PROFILE VIEW */
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8 overflow-y-auto flex-1 md:max-h-[70vh]">
                  {/* Left Column: Personal details & Logs */}
                  <div className="md:col-span-5 space-y-6">"""

if target_view_start in content:
    content = content.replace(target_view_start, replacement_view_start)
    print("View start replacement success.")
else:
    print("Warning: View start target not found.")

# 7. Extract Access Logs in View view and remove/replace it
view_logs_block = """                {/* Activity Timing & Geolocation Logs (Admin, Director, Sales Head only) */}
                {isAdminOrDirectorOrSalesHead && (
                  <div className="border-t border-slate-800 pt-4 space-y-4">
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Access Logs</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Last Login Info */}
                      <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-lg">
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1.5">Last Login Session</span>
                        {selectedMember.lastLoginAt ? (
                          <div className="space-y-1">
                            <span className="block text-white text-xs font-mono">
                              {new Date(selectedMember.lastLoginAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                            <span className="block text-[10px] text-slate-400 italic font-semibold leading-normal">
                              📍 {selectedMember.loginLocation || 'Unknown location'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs italic">No login recorded</span>
                        )}
                      </div>

                      {/* Last Logout Info */}
                      <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-lg">
                        <span className="block text-slate-500 font-semibold uppercase tracking-wider text-[9px] mb-1.5">Last Logout Session</span>
                        {selectedMember.lastLogoutAt ? (
                          <div className="space-y-1">
                            <span className="block text-white text-xs font-mono">
                              {new Date(selectedMember.lastLogoutAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                            <span className="block text-[10px] text-slate-400 italic font-semibold leading-normal">
                              📍 {selectedMember.logoutLocation || 'Unknown location'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 text-xs italic">No logout recorded</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}"""

# In View block, we want the Access logs to be after the Core Information Grid, then end the Left Column,
# then start the Right Column with the Custom Access Permissions Summary, then end the Right Column, then end the grid.
replacement_view_logs = view_logs_block + """
                  </div> {/* End of Left Column */}

                  {/* Right Column: Custom Access Permissions Summary */}
                  <div className="md:col-span-7 space-y-6 md:border-l md:border-slate-850 md:pl-8">
                    <div className="space-y-4">
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Access Permissions</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {['Leads', 'Orders', 'Reports', 'Team'].map((cat) => {
                          const catPerms = ALL_PERMISSIONS.filter(p => p.category === cat && selectedMember.permissions?.includes(p.key));
                          if (catPerms.length === 0) return null;
                          return (
                            <div key={cat} className="p-4 bg-slate-900/20 border border-slate-850 rounded-xl space-y-3 hover:border-slate-800 transition-all duration-200 shadow-sm">
                              <div className="flex items-center gap-2 border-b border-slate-850/80 pb-2 mb-1.5">
                                <span className="block text-slate-350 font-bold uppercase tracking-wider text-[9px]">{cat} Permissions</span>
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
                      </div>
                    </div>
                  </div> {/* End of Right Column */}
                </div> {/* End of grid container */}"""

if view_logs_block in content:
    content = content.replace(view_logs_block, replacement_view_logs)
    print("View permissions and logs layout replacement success.")
else:
    print("Warning: View logs block target not found.")

# Write back using original CRLF
content = content.replace("\n", "\r\n")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Finished modifying team/page.tsx!")
