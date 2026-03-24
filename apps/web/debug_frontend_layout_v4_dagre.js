const fs = require('fs');
// Since Dagre may not be installed in absolute root, we can try importing it
// Or we can just use run_command on a workspace context that has it.
// Wait! apps/web has it installed. Can I run in d:\00.APPS\EOFFICE\apps\web?
// I will create debugging_layout_dagre.js in apps/web.

const dump = JSON.parse(fs.readFileSync('../api/org_chart_dump.json', 'utf8'));

try {
    const dagre = require('dagre');
    const NODE_W = 272;
    const NODE_H = 210;

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: 'TB', nodesep: 50, ranksep: 120 }); // TB = top to bottom

    const allNodes = [];
    const edges = [];

    // Exclude sections from Dagre edges to do manual list building later
    dump.companies.forEach(c => c.showOnOrgChart && allNodes.push({ id: `company-${c.id}`, name: c.name }));
    dump.factories.forEach(f => { if (f.showOnOrgChart) { allNodes.push({ id: `factory-${f.id}`, name: f.name }); if (f.companyId) edges.push({ source: `company-${f.companyId}`, target: `factory-${f.id}` }); } });
    dump.divisions.forEach(d => { if (d.showOnOrgChart) { allNodes.push({ id: `division-${d.id}`, name: d.name }); if (d.factoryId) edges.push({ source: `factory-${d.factoryId}`, target: `division-${d.id}` }); else if (d.companyId) edges.push({ source: `company-${d.companyId}`, target: `division-${d.id}` }); } });
    dump.departments.forEach(d => { if (d.showOnOrgChart) { allNodes.push({ id: `department-${d.id}`, name: d.name }); if (d.divisionId) edges.push({ source: `division-${d.divisionId}`, target: `department-${d.id}` }); } });
    dump.sections.forEach(s => { if (s.showOnOrgChart) { allNodes.push({ id: `section-${s.id}`, name: s.name }); } });

    // ONLY insert non-section edges to DAGRE graph
    const allEdges = [];
    dump.factories.forEach(f => f.companyId && allEdges.push({ source: `company-${f.companyId}`, target: `factory-${f.id}` }));
    dump.divisions.forEach(d => d.factoryId ? allEdges.push({ source: `factory-${d.factoryId}`, target: `division-${d.id}` }) : d.companyId && allEdges.push({ source: `company-${d.companyId}`, target: `division-${d.id}` }));
    dump.departments.forEach(d => d.divisionId && allEdges.push({ source: `division-${d.divisionId}`, target: `department-${d.id}` }));

    allNodes.forEach(n => {
        if (!n.id.startsWith('section-')) {
             dagreGraph.setNode(n.id, { width: NODE_W, height: NODE_H });
        }
    });

    allEdges.forEach(e => {
        dagreGraph.setEdge(e.source, e.target);
    });

    dagre.layout(dagreGraph);

    const positions = new Map();
    allNodes.forEach(n => {
        if (!n.id.startsWith('section-')) {
            const pos = dagreGraph.node(n.id);
            positions.set(n.id, { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 });
        }
    });

    // Manual Section override
    dump.departments.forEach(dept => {
        const deptId = `department-${dept.id}`;
        if (positions.has(deptId)) {
             const deptPos = positions.get(deptId);
             const deptEdges = dump.sections.filter(e => e.departmentId === dept.id).map(e => `section-${e.id}`);
             
             let currentY = deptPos.y + NODE_H + 40;
             let currentX = deptPos.x + 30;

             deptEdges.forEach(secId => {
                 positions.set(secId, { x: currentX, y: currentY });
                 currentY += NODE_H + 20;
             });
        }
    });

    console.log("\n=== DAGRE LAYOUT COORDINATES ===");
    positions.forEach((pos, id) => {
         const n = allNodes.find(an => an.id === id);
         if (!id.startsWith('department-')) return;
         console.log(`[${id}] "${n ? n.name : '?'}" -> x: ${pos.x}, y: ${pos.y}`);
    });

} catch (e) {
    console.error("Dagre might not be resolving locally in Node.", e);
}
