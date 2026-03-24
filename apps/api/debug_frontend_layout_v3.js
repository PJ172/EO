const fs = require('fs');

const dump = JSON.parse(fs.readFileSync('org_chart_dump.json', 'utf8'));

const NODE_W = 272;
const NODE_H = 210;
const V_GAP  = 120; 
const H_GAP  = 50;  

function makeNode(id, parent, number) {
    const n = { id, children: [], x: 0, y: 0, mod: 0, prelim: 0, shift: 0, change: 0, thread: null, parent, number, ancestor: null };
    n.ancestor = n;
    return n;
}

function buildTree(rootId, edgeMap, nodeIds) {
    const visited = new Set();
    function build(id, parent, num) {
        if (visited.has(id)) return makeNode(id, parent, num);
        visited.add(id);
        const n = makeNode(id, parent, num);
        const childIds = edgeMap.get(id) || [];
        childIds.forEach((cid, i) => {
            if (nodeIds.has(cid)) n.children.push(build(cid, n, i + 1));
        });
        return n;
    }
    return build(rootId, null, 1);
}

function leftMost(n) { return n.thread || (n.children.length ? n.children[0] : null); }
function rightMost(n) { return n.thread || (n.children.length ? n.children[n.children.length - 1] : null); }

function ancestor(vim, v, defaultAncestor) {
    return v.parent && v.parent.children.includes(vim.ancestor) ? vim.ancestor : defaultAncestor;
}

function canLink(from, to) {
    const visited = new Set();
    let t = to;
    while (t) {
        if (t === from) return false;
        if (visited.has(t)) return false;
        visited.add(t);
        t = t.thread;
    }
    return true;
}

function moveSubtree(wm, wp, shift) {
    const subtrees = wp.number - wm.number;
    const div = subtrees <= 0 ? 1 : subtrees;
    wp.change -= shift / div;
    wp.shift  += shift;
    wm.change += shift / div;
    wp.prelim += shift;
    wp.mod    += shift;
}

function executeShifts(v) {
    let shift = 0, change = 0;
    for (let i = v.children.length - 1; i >= 0; i--) {
        const w = v.children[i];
        w.prelim  += shift;
        w.mod     += shift;
        change    += w.change;
        shift     += w.shift + change;
    }
}

function apportion(v, defaultAncestor, isHorizontal) {
    const step = isHorizontal ? NODE_H + V_GAP : NODE_W + H_GAP;
    if (v.children.length === 0) return defaultAncestor;
    const w = v.children[0];
    let vip = v.children[v.children.length - 1];
    let vim = w;
    let vop = v.children[0];
    let vom = v.children[0];
    let sip = vip.mod, sim = vim.mod, sop = vop.mod, som = vom.mod;

    let nextRight = rightMost(vim);
    let nextLeft  = leftMost(vip);

    while (nextRight && nextLeft) {
        vim = nextRight; vip = nextLeft;
        const nextVom = leftMost(vom); if (nextVom) vom = nextVom;
        const nextVop = rightMost(vop); if (nextVop) vop = nextVop;
        vop.ancestor = v;
        const shift = (vim.prelim + sim) - (vip.prelim + sip) + step;
        if (shift > 0) {
            moveSubtree(ancestor(vim, v, defaultAncestor), v, shift);
            sip += shift; sop += shift;
        }
        sim += vim.mod; sip += vip.mod;
        som += vom.mod; sop += vop.mod;
        nextRight = rightMost(vim); nextLeft = leftMost(vip);
    }
    if (nextRight && !rightMost(vop) && canLink(vop, nextRight)) { vop.thread = nextRight; vop.mod += sim - sop; }
    if (nextLeft  && !leftMost(vom)  && canLink(vom, nextLeft))  { vom.thread = nextLeft;  vom.mod += sip - som; defaultAncestor = v; }
    return defaultAncestor;
}

function firstWalk(v, isHorizontal) {
    const step = isHorizontal ? NODE_H + V_GAP : NODE_W + H_GAP;
    if (v.children.length === 0) {
        v.prelim = v.parent && v.parent.children.length > 1 && v.number > 1
            ? v.parent.children[v.number - 2].prelim + step : 0;
    } else {
        let defaultAncestor = v.children[0];
        v.children.forEach(w => { firstWalk(w, isHorizontal); defaultAncestor = apportion(w, defaultAncestor, isHorizontal); });
        executeShifts(v);
        const midpoint = (v.children[0].prelim + v.children[v.children.length - 1].prelim) / 2;
        if (v.parent && v.number > 1) {
            v.prelim = v.parent.children[v.number - 2].prelim + step;
            v.mod = v.prelim - midpoint;
        } else {
            v.prelim = midpoint;
        }
    }
}

function secondWalk(v, m, depth, isHorizontal, result) {
    const levelStep = isHorizontal ? NODE_W + H_GAP : NODE_H + V_GAP;
    const pos = isHorizontal
        ? { x: depth * levelStep, y: v.prelim + m }
        : { x: v.prelim + m, y: depth * levelStep };
    result.set(v.id, pos);
    v.children.forEach(w => secondWalk(w, m + v.mod, depth + 1, isHorizontal, result));
}

function treeLayout(rootId, allNodeIds, edges, isHorizontal) {
    const edgeMap = new Map();
    allNodeIds.forEach(id => edgeMap.set(id, []));
    const nonSecEdges = edges.filter(e => !e.target.startsWith('section-'));
    nonSecEdges.forEach(e => { const ch = edgeMap.get(e.source); if (ch) ch.push(e.target); });

    const nodeSet = new Set(allNodeIds);
    const root = buildTree(rootId, edgeMap, nodeSet);

    firstWalk(root, isHorizontal);
    const result = new Map();
    secondWalk(root, -root.prelim, 0, isHorizontal, result);

    allNodeIds.forEach(deptId => {
        if (deptId.startsWith('department-') && result.has(deptId)) {
             const deptPos = result.get(deptId);
             const deptEdges = edges.filter(e => e.source === deptId && e.target.startsWith('section-'));
             const sectionIds = deptEdges.map(e => e.target);

             let currentY = deptPos.y + NODE_H + 40; 
             const currentX = deptPos.x + 30; 

             sectionIds.forEach(secId => {
                 result.set(secId, { x: currentX, y: currentY });
                 currentY += NODE_H + 20; 
             });
        }
    });

    return result;
}

// === LOAD DATA ===
const allNodes = [];
const allEdges = [];

dump.companies.forEach(c => c.showOnOrgChart && allNodes.push({ id: `company-${c.id}`, name: c.name }));
dump.factories.forEach(f => { if (f.showOnOrgChart) { allNodes.push({ id: `factory-${f.id}`, name: f.name }); if (f.companyId) allEdges.push({ source: `company-${f.companyId}`, target: `factory-${f.id}` }); } });
dump.divisions.forEach(d => { if (d.showOnOrgChart) { allNodes.push({ id: `division-${d.id}`, name: d.name }); if (d.factoryId) allEdges.push({ source: `factory-${d.factoryId}`, target: `division-${d.id}` }); else if (d.companyId) allEdges.push({ source: `company-${d.companyId}`, target: `division-${d.id}` }); } });
dump.departments.forEach(d => { if (d.showOnOrgChart) { allNodes.push({ id: `department-${d.id}`, name: d.name }); if (d.divisionId) allEdges.push({ source: `division-${d.divisionId}`, target: `department-${d.id}` }); } });
dump.sections.forEach(s => { if (s.showOnOrgChart) { allNodes.push({ id: `section-${s.id}`, name: s.name }); if (s.departmentId) allEdges.push({ source: `department-${s.departmentId}`, target: `section-${s.id}` }); } });

const nodeIds = allNodes.map(n => n.id);
const res = treeLayout('company-6e64bf96-97c7-4100-b62d-f5c07a033063', nodeIds, allEdges, false);

console.log("\n=== NODE COORDINATES (HYBRID VERBATIM) ===");
res.forEach((pos, id) => {
    const n = allNodes.find(an => an.id === id);
    if (id.startsWith('section-')) return;
    console.log(`[${id}] "${n ? n.name: '?'}" -> x: ${pos.x}, y: ${pos.y}`);
});
