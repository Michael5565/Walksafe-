const fs = require("fs");
let content = fs.readFileSync("src/components/DriverPwa.tsx", "utf8");

// 1. Change activeSoloTab type - replace 'schedules' with 'defects'
content = content.replace(
  "useState<'check' | 'vehicles' | 'profile' | 'schedules' | 'media'>('check')",
  "useState<'check' | 'vehicles' | 'profile' | 'defects' | 'media'>('check')"
);

// 2. Replace the schedules tab content with defects tab
const oldSchedTab = content.indexOf("/* Solo Operator Active Schedules Panel UI */");
const afterSchedTab = content.indexOf("company.isSoloOperator && activeSoloTab === 'profile'", oldSchedTab);
const beforeProfile = content.lastIndexOf("{company.isSoloOperator && activeSoloTab === 'profile'", afterSchedTab - 50);

if (oldSchedTab >= 0 && beforeProfile > oldSchedTab) {
  const oldContent = content.substring(oldSchedTab, beforeProfile);
  
  const newContent = `{/* Solo Operator Defects Panel UI */}
              {company.isSoloOperator && activeSoloTab === 'defects' && (
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm text-primary uppercase tracking-wider">Open Defects</h3>
                    <span className="text-xs text-on-surface-variant">{defects.filter(d => d.status !== 'closed').length} open</span>
                  </div>
                  {defects.filter(d => d.status !== 'closed').length === 0 ? (
                    <div className="text-center py-8 text-on-surface-variant font-body-sm">
                      <span className="material-symbols-outlined text-3xl block mb-2 opacity-30">check_circle</span>
                      No open defects. All clear!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {defects.filter(d => d.status !== 'closed').map(d => {
                        const veh = vehicles.find(v => v.id === d.vehicleId);
                        const isDangerous = d.severity === 'dangerous';
                        return (
                          <div key={d.id} className="bg-surface-card border border-border-subtle rounded-lg p-4 shadow-sm">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <span className={\`text-[10px] font-bold px-2 py-0.5 rounded \${isDangerous ? "bg-danger-red text-white" : d.severity === 'major' ? "bg-major-defect-orange text-white" : "bg-secondary-container text-primary"}\`}>{d.severity.toUpperCase()}</span>
                                {veh && <span className="text-[10px] text-on-surface-variant ml-2">{veh.registration}</span>}
                              </div>
                              <span className="text-[10px] text-on-surface-variant">{new Date(d.createdAt).toLocaleDateString('en-GB')}</span>
                            </div>
                            <p className="font-bold text-sm text-primary mb-1">{d.itemLabel}</p>
                            <p className="text-xs text-on-surface-variant mb-3">{d.description}</p>
                            <button onClick={async () => {
                              try {
                                const notes = prompt("Repair notes (optional):");
                                await onCloseDefect(d.id, { engineerName: currentDriver?.fullName || "Solo Operator", repairDescription: notes || "Closed by operator", partsUsed: "", engineerSignature: "solo-close" });
                                onTriggerRefresh();
                                alert("Defect closed successfully.");
                              } catch(e) { alert("Failed to close defect."); }
                            }} className="w-full py-2 bg-primary text-white text-xs font-bold rounded flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90 transition-opacity">
                              <span className="material-symbols-outlined text-sm">check</span> CLOSE DEFECT
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
`;
  content = content.replace(oldContent, newContent);
  console.log("Replaced schedules tab with defects tab");
}

// 3. Fix the bottom nav for solo tab - replace 'schedules' with 'defects' in the solo tab nav
content = content.replace(
  "activeSoloTab === 'schedules'",
  "activeSoloTab === 'defects'"
);

// 4. Handle the bottom nav icon/text for the solo defects tab
// The non-solo bottom nav is at the bottom of the file - it uses phase, not activeSoloTab
// So it should be unaffected

fs.writeFileSync("src/components/DriverPwa.tsx", content);
console.log("All changes applied");
