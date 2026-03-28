const fs = require('fs');

let txt = fs.readFileSync('apps/web/src/components/org-chart/org-chart-canvas.tsx', 'utf8');

// Apply my previous session fixes manually
txt = txt.replace(
    'apiData: { nodes: any[]; edges: any[]; departmentInfo?: any; immediateParentId?: string | null; config?: any } | null;',
    'apiData: { nodes: any[]; edges: any[]; departmentInfo?: any; immediateParentId?: string | null; config?: any; hiddenNodes?: Array<{id: string; fullName: string; jobTitle: string}> } | null;'
);

txt = txt.replace(
    `            await apiClient.post(\`/organization/config/\${chartKey}/hidden\`, {
                // @ts-ignore
                hiddenNodeIds: Array.from(newSet)
            });
            toast.success('Đã lưu cấu hình thu gọn/ẩn');
        } catch (error) {
            toast.error('Lỗi khi lưu thiết kế');
        }
    }, [apiData]);`,
    `            await apiClient.post(\`/employees/org-chart/overrides/\${chartKey}\`, {
                // @ts-ignore
                hiddenNodeIds: Array.from(newSet)
            });
            toast.success('Đã cập nhật hiển thị');
            // Refetch chart data so hidden/unhidden nodes reflect properly
            if (onOverridesChange) onOverridesChange();
        } catch (error) {
            toast.error('Lỗi khi lưu thiết kế');
        }
    }, [apiData, onOverridesChange]);`
);

txt = txt.replace(
    `            const visibleEdges = processedEdges.filter(e => !hiddenIds.has(e.source) && !hiddenIds.has(e.target));

            const shouldLayout = layoutTrigger !== prevLayoutTrigger ||
                nodesep !== prevNodesep ||
                ranksep !== prevRanksep ||
                JSON.stringify(nodeDims) !== JSON.stringify(prevNodeDimsRef.current) ||
                (visibleNodes.length > 0 && visibleNodes.every(n => !n.position || (n.position.x === 0 && n.position.y === 0)));`,
    `            const visibleEdges = processedEdges.filter(e => !hiddenIds.has(e.source) && !hiddenIds.has(e.target));

            // Separate nodes with saved positions vs. nodes at (0,0)
            const savedPositionNodes = new Map<string, {x: number, y: number}>();
            visibleNodes.forEach(n => {
                if (n.position && (n.position.x !== 0 || n.position.y !== 0)) {
                    savedPositionNodes.set(n.id, n.position);
                }
            });
            const allAtOrigin = savedPositionNodes.size === 0;

            const shouldLayout = layoutTrigger !== prevLayoutTrigger ||
                nodesep !== prevNodesep ||
                ranksep !== prevRanksep ||
                JSON.stringify(nodeDims) !== JSON.stringify(prevNodeDimsRef.current) ||
                (visibleNodes.length > 0 && allAtOrigin);`
);

txt = txt.replace(
    `                        targetPosition: n.id.startsWith('section-') && !isHorizontal ? Position.Left : (isHorizontal ? Position.Left : Position.Top),
                        sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
                        position: positionMap.get(n.id)!,`,
    `                        targetPosition: n.id.startsWith('section-') && !isHorizontal ? Position.Left : (isHorizontal ? Position.Left : Position.Top),
                        sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
                        // Use saved position from API if available, otherwise use dagre-calculated position
                        position: savedPositionNodes.get(n.id) ?? positionMap.get(n.id)!,`
);

// Apply NEW feature changes

txt = txt.replace(
    `import { cn } from '@/lib/utils';`,
    "import { Eye, EyeOff } from 'lucide-react';\nimport { cn } from '@/lib/utils';"
);

txt = txt.replace(
    `const [nodeColors, setNodeColors] = useState<Record<string, { bg: string; text: string; border: string }>>(defaultColors);`,
    `const [nodeColors, setNodeColors] = useState<Record<string, { bg: string; text: string; border: string }>>(defaultColors);\n    const [nodeLevels, setNodeLevels] = useState<Record<string, string>>({});`
);

txt = txt.replace(
    `        L7:         { bg: 'linear-gradient(135deg,#334155 0%,#475569 50%,#64748b 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },`,
    `        L7:         { bg: 'linear-gradient(135deg,#334155 0%,#475569 50%,#64748b 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },
        L8:         { bg: 'linear-gradient(135deg,#4c1d95 0%,#6d28d9 50%,#8b5cf6 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },
        L9:         { bg: 'linear-gradient(135deg,#831843 0%,#be185d 50%,#ec4899 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },
        L10:        { bg: 'linear-gradient(135deg,#064e3b 0%,#047857 50%,#10b981 100%)', text: '#ffffff', border: 'rgba(255,255,255,0.12)' },`
);

txt = txt.replace(
    `            if (conf.nodeColors) setNodeColors(prev => ({ ...prev, ...conf.nodeColors }));`,
    `            if (conf.nodeColors) setNodeColors(prev => ({ ...prev, ...conf.nodeColors }));
            if (conf.nodeLevels) setNodeLevels(prev => ({ ...prev, ...conf.nodeLevels }));`
);

txt = txt.replace(
    `    const saveOverrides = async () => {};`,
    `    const saveDesignConfig = async () => {
        const chartKey = apiData?.departmentInfo ? \`DEPT-\${apiData.departmentInfo.id}\` : 'global-config';
        try {
            await apiClient.post(\`/employees/org-chart/config/\${chartKey}\`, {
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
    };
    const saveOverrides = async () => {};`
);

// MAPPING replace!
const originalMapStart = `                    const typeColor = nodeColors[typeKey];
                    return {
                        ...n,
                        data: {
                            ...n.data,
                            // Thêm Level vừa tính vào Data để render Component Node
                            level: isEmployee ? (empLevelMap.get(n.id) || 1) : null,
                            width: typeDims.w,
                            height: typeDims.h,
                            customBg: typeColor?.bg,
                            customText: typeColor?.text,
                            customBorder: typeColor?.border,
                customLevel: n.data.customLevel,`;

const replaceMapStart = `                    const typeColor = nodeColors[typeKey];
                    const defaultLvl = isEmployee ? (empLevelMap.get(n.id) || 1) : null;
                    const lvlString = nodeLevels[n.id] || \`L\${defaultLvl}\`;
                    const customBgColor = nodeColors[n.id] || nodeColors[lvlString] || typeColor;
                    return {
                        ...n,
                        data: {
                            ...n.data,
                            level: defaultLvl,
                            width: typeDims.w,
                            height: typeDims.h,
                            customBg: customBgColor?.bg,
                            customText: customBgColor?.text,
                            customBorder: customBgColor?.border,
                            customLevel: lvlString,
                            onChangeLevel: (nodeId, val) => {
                                setNodeLevels(p => ({...p, [nodeId]: val}));
                            },`;
txt = txt.replace(originalMapStart, replaceMapStart);

// TOOLBAR & HIDDEN NODES
const panelReplacement = `                {/* Hidden Nodes Unhide Panel */}
                {!isLocked && apiData?.hiddenNodes && apiData.hiddenNodes.length > 0 && (
                    <Panel position="top-left" className="mt-2 ml-2">
                        <div className="bg-white/95 backdrop-blur-sm border border-amber-200 rounded-xl shadow-lg p-3 max-w-[260px]">
                            <div className="flex items-center gap-2 mb-2">
                                <EyeOff className="w-4 h-4 text-amber-600" />
                                <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Node đã ẩn ({apiData.hiddenNodes.length})</span>
                            </div>
                            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                                {apiData.hiddenNodes.map((hn) => (
                                    <div key={hn.id} className="flex items-center justify-between gap-2 bg-amber-50 rounded-lg px-2.5 py-1.5 group hover:bg-amber-100 transition-colors">
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-700 truncate">{hn.fullName}</p>
                                            {hn.jobTitle && <p className="text-[10px] text-slate-500 truncate">{hn.jobTitle}</p>}
                                        </div>
                                        <button
                                            onClick={() => onHideNode(hn.id)}
                                            className="shrink-0 p-1 rounded-md hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 transition-colors"
                                            title="Hiện lại node này"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Panel>
                )}

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
                                            {Array.from({length: 10}).map((_, i) => <option key={\`L\${i+1}\`} value={\`L\${i+1}\`}>Cấp L{i+1}</option>)}
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
                        </div>
                    </Panel>
                )}
`;

txt = txt.replace(
    "{/* Auto-saved configurations. Design Mode & Save Toolbar Removed as requested */}",
    panelReplacement
);

fs.writeFileSync('apps/web/src/components/org-chart/org-chart-canvas.tsx', txt, 'utf8');
