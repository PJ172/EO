const fs = require('fs');
let txt = fs.readFileSync('apps/web/src/components/org-chart/org-chart-canvas.tsx', 'utf8');

txt = txt.replace(
    'const [nodeDims, setNodeDims] = useState<Record<string, { w: number, h: number }>>({\\n        COMPANY: { w: 272, h: 210 },\\n        FACTORY: { w: 272, h: 210 },\\n        DIVISION: { w: 272, h: 210 },\\n        DEPARTMENT: { w: 272, h: 210 },\\n        SECTION: { w: 260, h: 80 },\\n        EMPLOYEE: { w: 254, h: 220 },\\n    });',
    'const defaultNodeDims: Record<string, { w: number, h: number }> = {\\n        COMPANY: { w: 272, h: 210 },\\n        FACTORY: { w: 272, h: 210 },\\n        DIVISION: { w: 272, h: 210 },\\n        DEPARTMENT: { w: 272, h: 210 },\\n        SECTION: { w: 260, h: 80 },\\n        EMPLOYEE: { w: 254, h: 220 },\\n    };\\n    const [nodeDims, setNodeDims] = useState<Record<string, { w: number, h: number }>>(defaultNodeDims);'
);

txt = txt.replace(
    'const [nodeDims, setNodeDims] = useState<Record<string, { w: number, h: number }>>({\r\n        COMPANY: { w: 272, h: 210 },\r\n        FACTORY: { w: 272, h: 210 },\r\n        DIVISION: { w: 272, h: 210 },\r\n        DEPARTMENT: { w: 272, h: 210 },\r\n        SECTION: { w: 260, h: 80 },\r\n        EMPLOYEE: { w: 254, h: 220 },\r\n    });',
    'const defaultNodeDims: Record<string, { w: number, h: number }> = {\r\n        COMPANY: { w: 272, h: 210 },\r\n        FACTORY: { w: 272, h: 210 },\r\n        DIVISION: { w: 272, h: 210 },\r\n        DEPARTMENT: { w: 272, h: 210 },\r\n        SECTION: { w: 260, h: 80 },\r\n        EMPLOYEE: { w: 254, h: 220 },\r\n    };\r\n    const [nodeDims, setNodeDims] = useState<Record<string, { w: number, h: number }>>(defaultNodeDims);'
);

txt = txt.replace(
    'const [nodeDims, setNodeDims] = useState<Record<string, { w: number, h: number }>>({\n        COMPANY: { w: 272, h: 210 },\n        FACTORY: { w: 272, h: 210 },\n        DIVISION: { w: 272, h: 210 },\n        DEPARTMENT: { w: 272, h: 210 },\n        SECTION: { w: 260, h: 80 },\n        EMPLOYEE: { w: 254, h: 220 },\n    });',
    'const defaultNodeDims: Record<string, { w: number, h: number }> = {\n        COMPANY: { w: 272, h: 210 },\n        FACTORY: { w: 272, h: 210 },\n        DIVISION: { w: 272, h: 210 },\n        DEPARTMENT: { w: 272, h: 210 },\n        SECTION: { w: 260, h: 80 },\n        EMPLOYEE: { w: 254, h: 220 },\n    };\n    const [nodeDims, setNodeDims] = useState<Record<string, { w: number, h: number }>>(defaultNodeDims);'
);

fs.writeFileSync('apps/web/src/components/org-chart/org-chart-canvas.tsx', txt, 'utf8');
