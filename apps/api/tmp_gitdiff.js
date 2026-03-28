const { execSync } = require('child_process');
const diff = execSync('git diff apps/web/src/components/org-chart/org-chart-canvas.tsx apps/web/src/components/org-chart/custom-nodes/employee-node.tsx').toString();

const lines = diff.split('\n');
let modified = [];
for (let line of lines) {
    if (line.startsWith('- ') || line.startsWith('+ ')) {
        modified.push(line);
    } else if (line.startsWith('@@ ')) {
        modified.push('', line);
    }
}
console.log(modified.join('\n'));
