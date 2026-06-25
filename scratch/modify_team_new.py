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

# Check if this exact block is in content and remove it
if edit_logs_block in content:
    content = content.replace(edit_logs_block, "")
    print("Access Logs removed from original bottom spot in Edit view.")
else:
    print("Warning: Access Logs block in Edit view not found for removal.")

# 4. Insert Left Column end, Right Column start, and checklist container replacement
target_checklist_start = """                  {/* Custom Access Permissions Checklist */}
                  <div className="border-t border-slate-800 pt-4 space-y-4">"""

# We want to place the access logs at the end of the Left Column, then end the Left Column, and then start the Right Column
replacement_checklist_start = edit_logs_block + """
                  </div> {/* End of Left Column */}

                  {/* Right Column: Custom Access Permissions Checklist */}
                  <div className="md:col-span-7 space-y-6 md:border-l md:border-slate-850 md:pl-8">"""

if target_checklist_start in content:
    content = content.replace(target_checklist_start, replacement_checklist_start)
    print("Checklist transition and column setup in Edit view success.")
else:
    print("Warning: Checklist start target not found.")


# 5. Modify View Profile (Read-only View) starts
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

# 6. Extract Access Logs in View view and remove/replace it
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
                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Access Permissions</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {['Leads', 'Orders', 'Reports', 'Team'].map((cat) => {
                          const catPerms = ALL_PERMISSIONS.filter(p => p.category === cat && selectedMember.permissions.includes(p.key));
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
