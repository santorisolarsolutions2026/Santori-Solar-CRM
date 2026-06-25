import os

file_path = r"c:\Users\anish\Solar-CRM-Project\src\app\(authenticated)\orders\page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Normalize line endings to \n
content = content.replace("\r\n", "\n")

# 1. Update modal width
target_modal_width = """      {/* Detail Overlay Panel Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-2xl bg-[#111625] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">"""

replacement_modal_width = """      {/* Detail Overlay Panel Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-5xl md:max-h-[90vh] bg-[#111625] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col">"""

if target_modal_width in content:
    content = content.replace(target_modal_width, replacement_modal_width)
    print("Modal container width updated successfully.")
else:
    print("Warning: Modal container width target not found.")

# 2. Update scrollable body start to grid columns
target_body_start = """            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
              {/* Punching details grid */}"""

replacement_body_start = """            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-8 overflow-y-auto flex-1 md:max-h-[70vh]">
              {/* Left Column: Punching Info and Documents */}
              <div className="md:col-span-5 space-y-6">
                {/* Punching details grid */}"""

if target_body_start in content:
    content = content.replace(target_body_start, replacement_body_start)
    print("Scrollable body start updated successfully.")
else:
    print("Warning: Scrollable body start target not found.")

# 3. Separate Left and Right columns right after Uploaded Documents section
target_documents_end = """                  ))}
                </div>
              </div>"""

replacement_documents_end = """                  ))}
                </div>
              </div>
              </div> {/* End of Left Column */}

              {/* Right Column: Status info, gallery, actions */}
              <div className="md:col-span-7 space-y-6 md:border-l md:border-slate-850 md:pl-8">"""

# Note: We must make sure we replace the correct target_documents_end.
# Let's inspect where Uploaded Documents ends in the file:
# In clean file, it is:
#                   ))}
#                 </div>
#               </div>
# 
#               {/* Installation Photos & Upload for Completed Orders */}
# So replacing target_documents_end will work perfectly if it is followed by the installation section.
# We will do a check during replacement.
if target_documents_end in content:
    content = content.replace(target_documents_end, replacement_documents_end, 1) # Only replace first occurrence
    print("Columns separation updated successfully.")
else:
    print("Warning: Documents end target not found.")

# 4. Insert Right Column close and empty state placeholder before the body ends
# The body ends right after the ops_update form.
# Let's find the end of the modes panels:
# Original:
#                   </div>
#                 </form>
#               )}
#             </div>
# We want to replace it with:
#                   </div>
#                 </form>
#               )}
#
#               {/* Empty Right Column placeholder if not completed and no actions */}
#               {selectedOrder.status !== 'completed' && !modalMode && (
#                 <div className="p-6 bg-slate-900/20 border border-slate-800/80 rounded-xl space-y-4 flex flex-col justify-center items-center h-full min-h-[220px] text-center">
#                   <div className="w-12 h-12 rounded-full bg-slate-950 flex items-center justify-center border border-slate-800 text-amber-500">
#                     <Truck className="w-6 h-6 animate-pulse" />
#                   </div>
#                   <div className="space-y-1">
#                     <h5 className="text-xs font-bold text-white uppercase tracking-wider">Order Status: {selectedOrder.status.toUpperCase().replace('_', ' ')}</h5>
#                     <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
#                       This order is currently in the {selectedOrder.status.replace('_', ' ')} stage. Installation photos and scheduling details will be available once it moves to the Operations Installation phase.
#                     </p>
#                   </div>
#                 </div>
#               )}
#               </div> {/* End of Right Column */}
#             </div>
target_body_end = """                  </div>
                </form>
              )}
            </div>"""

replacement_body_end = """                  </div>
                </form>
              )}

              {/* Empty Right Column placeholder if not completed and no actions */}
              {selectedOrder.status !== 'completed' && !modalMode && (
                <div className="p-6 bg-slate-900/20 border border-slate-800/80 rounded-xl space-y-4 flex flex-col justify-center items-center h-full min-h-[220px] text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-950 flex items-center justify-center border border-slate-800 text-amber-500">
                    <Truck className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider">Order Status: {selectedOrder.status.toUpperCase().replace('_', ' ')}</h5>
                    <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
                      This order is currently in the {selectedOrder.status.replace('_', ' ')} stage. Installation photos and scheduling details will be available once it moves to the Operations Installation phase.
                    </p>
                  </div>
                </div>
              )}
              </div> {/* End of Right Column */}
            </div>"""

if target_body_end in content:
    content = content.replace(target_body_end, replacement_body_end)
    print("Scrollable body end and Right Column close updated successfully.")
else:
    print("Warning: Scrollable body end target not found.")

# Write back using CRLF
content = content.replace("\n", "\r\n")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Finished modifying orders/page.tsx!")
