import re

with open('tmp_canvas_mod.tsx', 'r', encoding='utf-8') as f:
    txt = f.read()

# 1. Add nodeLevels to state
txt = txt.replace(
    'const [nodeColors, setNodeColors]',
    'const [nodeLevels, setNodeLevels] = useState<Record<string, string>>({});\n    const [nodeColors, setNodeColors]'
)

# 2. Add defaults for L8, L9, L10 in defaultColors
repl_colors = """        L7:         { bg: 'linear-gradient(135deg,#334155 0%,#475569 50%,#64748b 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },
        L8:         { bg: 'linear-gradient(135deg,#4c1d95 0%,#6d28d9 50%,#8b5cf6 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },
        L9:         { bg: 'linear-gradient(135deg,#831843 0%,#be185d 50%,#ec4899 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },
        L10:        { bg: 'linear-gradient(135deg,#064e3b 0%,#047857 50%,#10b981 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },"""
txt = txt.replace("L7:         { bg: 'linear-gradient(135deg,#334155 0%,#475569 50%,#64748b 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },", repl_colors)

# 3. Handle useEffect config parsing
# `if (conf.nodeColors) setNodeColors(prev => ({ ...prev, ...conf.nodeColors }));`
repl_effect = """            if (conf.nodeColors) setNodeColors(prev => ({ ...prev, ...conf.nodeColors }));
            if (conf.nodeLevels) setNodeLevels(prev => ({ ...prev, ...conf.nodeLevels }));"""
txt = txt.replace("if (conf.nodeColors) setNodeColors(prev => ({ ...prev, ...conf.nodeColors }));", repl_effect)

# 4. Handle Save Overrides API call manually
repl_save = """    const saveDesignConfig = async () => {
        const chartKey = apiData?.departmentInfo ? `DEPT-${apiData.departmentInfo.id}` : 'global-config';
        try {
            await apiClient.post(`/employees/org-chart/config/${chartKey}`, {
                nodesep,
                ranksep,
                zoom,
                nodeDims,
                nodeColors,
                nodeLevels,
            });
            toast.success('Đã lưu cấu hình thiết kế');
        } catch (error) {
            toast.error('Lỗi khi lưu cấu hình');
        }
    };"""
txt = txt.replace('const saveOverrides = async () => {};', repl_save)

# 5. Handle node creation level overriding
# Look for `customLevel: n.data.customLevel,` inside `nodes.map...`
repl_level_inject = """                    const lvl = nodeLevels[n.id] || `L${n.level || 1}`;
                    const customBgColor = nodeColors[n.id] || nodeColors[lvl];
                    
                    return {
                        ...n,
                        data: {
                            ...n.data,
                            width: currentDims.w,
                            height: currentDims.h,
                            isDesignMode: !isLocked,
                            isHidden: hiddenIds.has(n.id),
                            onHide: () => onHideNode(n.id),
                            customBg: customBgColor?.bg,
                            customText: customBgColor?.text,
                            customBorder: customBgColor?.border,
                            customLevel: lvl,
                            onChangeLevel: (nodeId: string, level: string) => {
                                setNodeLevels(p => ({...p, [nodeId]: level}));
                            }
                        },
"""
# The original code looks like:
#                return {
#                    ...n,
#                    data: {
#                        ...n.data,
txt = re.sub(
    r'return \{\s*\.\.\.n,\s*data:\s*\{\s*\.\.\.n\.data,',
    repl_level_inject.replace('return {', '', 1).replace('...n,', '', 1).replace('data: {', '', 1).replace('...n.data,', '', 1),
    txt,
    count=1
)

# 6. Remove the Hide panel wrapper condition `if (!isLocked)`
txt = txt.replace(
    "{/* Hidden Nodes Unhide Panel */}",
    "{/* Hidden Nodes Unhide Panel */}\n                {!isLocked && "
)
# Close it
txt = txt.replace(
    "                    </Panel>\n                )}",
    "                    </Panel>\n                )}\n                }"
)

# 7. Add Toolbar inside DOM replacing the comment removed
toolbar_code = """
                {/* Design Mode Toolbar restored */}
                {!isLocked && (
                    <Panel position="bottom-center" className="mb-4 flex gap-2 !cursor-default" onClick={e => e.stopPropagation()}>
                        <div className="bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl flex items-center gap-4 border border-indigo-100">
                            
                            {/* Căn chỉnh khoảng cách */}
                            <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
                                <Ruler className="w-4 h-4 text-indigo-500" />
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase w-10">Ngang</span>
                                        <input type="range" min="20" max="200" value={nodesep} onChange={e => setNodesep(Number(e.target.value))} className="w-20" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase w-10">Dọc</span>
                                        <input type="range" min="40" max="300" value={ranksep} onChange={e => setRanksep(Number(e.target.value))} className="w-20" />
                                    </div>
                                </div>
                            </div>
                            
                            {/* Kích thước thẻ */}
                            <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
                                <LayoutList className="w-4 h-4 text-emerald-500" />
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <select 
                                            value={editingDimType} 
                                            onChange={e => setEditingDimType(e.target.value)}
                                            className="text-[10px] bg-slate-100 border-none rounded px-1 py-0.5 outline-none font-bold text-slate-700"
                                        >
                                            {Object.keys(defaultNodeDims).map(k => <option key={k} value={k}>{k}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="number" value={nodeDims[editingDimType]?.w || 200} onChange={e => setNodeDims(p => ({...p, [editingDimType]: {...p[editingDimType], w: Number(e.target.value)}}))} className="w-12 text-[10px] font-bold px-1 py-0.5 rounded border border-slate-200" title="Chiều rộng" />
                                        <input type="number" value={nodeDims[editingDimType]?.h || 100} onChange={e => setNodeDims(p => ({...p, [editingDimType]: {...p[editingDimType], h: Number(e.target.value)}}))} className="w-12 text-[10px] font-bold px-1 py-0.5 rounded border border-slate-200" title="Chiều cao" />
                                    </div>
                                </div>
                            </div>

                            {/* Màu thẻ & Level Palette */}
                            <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
                                <Edit3 className="w-4 h-4 text-amber-500" />
                                <div className="flex flex-col gap-1">
                                    <select 
                                        value={editingColorType} 
                                        onChange={e => setEditingColorType(e.target.value)}
                                        className="text-[10px] bg-slate-100 border-none rounded px-1 py-0.5 outline-none font-bold text-slate-700"
                                    >
                                        <optgroup label="Cấp độ">
                                            {Array.from({length: 10}).map((_, i) => <option key={`L${i+1}`} value={`L${i+1}`}>Cấp L{i+1}</option>)}
                                        </optgroup>
                                        <optgroup label="Loại chức vụ (Dự phòng)">
                                            {Object.keys(defaultColors).filter(k => !k.startsWith('L')).map(k => <option key={k} value={k}>{k}</option>)}
                                        </optgroup>
                                    </select>
                                    <div className="flex gap-1">
                                        {gradientPresets.slice(0, 6).map((preset, idx) => (
                                            <button 
                                                key={idx} 
                                                className="w-4 h-4 rounded-full border border-white shadow-sm hover:scale-125 transition-transform"
                                                style={{ background: preset.bg }}
                                                title={preset.label}
                                                onClick={() => setNodeColors(p => ({...p, [editingColorType]: preset}))}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <button onClick={saveDesignConfig} className="flex flex-col items-center justify-center bg-blue-50 hover:bg-blue-100 p-2 rounded-xl border border-blue-200 transition-colors group">
                                <Save className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                                <span className="text-[9px] font-bold text-blue-700 mt-1 uppercase">Lưu Giao Diện</span>
                            </button>
                            <button onClick={() => {
                                setNodesep(50); setRanksep(120); setNodeDims(defaultNodeDims); setNodeColors(defaultColors); setNodeLevels({});
                            }} className="flex flex-col items-center justify-center bg-rose-50 hover:bg-rose-100 p-2 rounded-xl border border-rose-200 transition-colors group ml-[-8px]">
                                <span className="text-[9px] font-bold text-rose-700 uppercase mt-0.5">Reset</span>
                            </button>
                        </div>
                    </Panel>
                )}
"""

txt = txt.replace(
    "{/* Auto-saved configurations. Design Mode & Save Toolbar Removed as requested */}",
    toolbar_code
)

with open('tmp_canvas_mod.tsx', 'w', encoding='utf-8') as f:
    f.write(txt)
