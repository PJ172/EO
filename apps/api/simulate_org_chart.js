const fs = require('fs');

const dump = JSON.parse(fs.readFileSync('org_chart_dump.json', 'utf8'));

const counts = {
    COMPANY: {},
    FACTORY: {},
    DIVISION: {},
    DEPARTMENT: {},
    SECTION: {}
};

const nodes = [];
const edges = [];

const buildNodeData = (item, type) => ({
    id: item.id,
    label: item.name,
    type,
});

dump.companies.forEach((company) => {
    if (company.showOnOrgChart) {
    nodes.push({
        id: `company-${company.id}`,
        type: 'orgNode',
        data: buildNodeData(company, 'COMPANY'),
    });
    }
});

dump.factories.forEach((factory) => {
    if (factory.showOnOrgChart) {
    nodes.push({
        id: `factory-${factory.id}`,
        type: 'orgNode',
        data: buildNodeData(factory, 'FACTORY'),
    });
    if (factory.companyId) {
        edges.push({
            id: `e-com-${factory.companyId}-fac-${factory.id}`,
            source: `company-${factory.companyId}`,
            target: `factory-${factory.id}`,
        });
    }
    }
});

dump.divisions.forEach((division) => {
    if (division.showOnOrgChart) {
    nodes.push({
        id: `division-${division.id}`,
        type: 'orgNode',
        data: buildNodeData(division, 'DIVISION'),
    });
    if (division.factoryId) {
        edges.push({
            id: `e-fac-${division.factoryId}-div-${division.id}`,
            source: `factory-${division.factoryId}`,
            target: `division-${division.id}`,
        });
    } else if (division.companyId) {
        edges.push({
            id: `e-com-${division.companyId}-div-${division.id}`,
            source: `company-${division.companyId}`,
            target: `division-${division.id}`,
        });
    }
    }
});

dump.departments.forEach((dept) => {
    if (dept.showOnOrgChart) {
    nodes.push({
        id: `department-${dept.id}`,
        type: 'orgNode',
        data: buildNodeData(dept, 'DEPARTMENT'),
    });
    if (dept.divisionId) {
        edges.push({
            id: `e-div-${dept.divisionId}-dept-${dept.id}`,
            source: `division-${dept.divisionId}`,
            target: `department-${dept.id}`,
        });
    } else if (dept.companyId) {
        edges.push({
            id: `e-com-${dept.companyId}-dept-${dept.id}`,
            source: `company-${dept.companyId}`,
            target: `department-${dept.id}`,
        });
    }
    }
});

dump.sections.forEach((section) => {
    if (section.showOnOrgChart) {
    nodes.push({
        id: `section-${section.id}`,
        type: 'orgNode',
        data: buildNodeData(section, 'SECTION'),
    });
    if (section.departmentId) {
        edges.push({
            id: `e-dept-${section.departmentId}-sec-${section.id}`,
            source: `department-${section.departmentId}`,
            target: `section-${section.id}`,
        });
    } else if (section.companyId) {
        edges.push({
            id: `e-com-${section.companyId}-sec-${section.id}`,
            source: `company-${section.companyId}`,
            target: `section-${section.id}`,
        });
    }
    }
});

const connectedNodeIds = new Set();
edges.forEach(e => {
    connectedNodeIds.add(e.source);
    connectedNodeIds.add(e.target);
});

const filteredNodes = nodes.filter(n => {
    if (n.id.startsWith('company-')) return true;
    return connectedNodeIds.has(n.id);
});

console.log("\n=== EDGES ===");
edges.forEach(e => console.log(`${e.source} -> ${e.target}`));

console.log("\n=== VISIBLE NODES ===");
filteredNodes.forEach(n => console.log(`[${n.id}] ${n.data.label}`));
