const fs = require('fs');
const path = require('path');

const dir = 'd:/00.APPS/eOffice/apps/web/src/app/(dashboard)';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.tsx')) results.push(file);
        }
    });
    return results;
}

const files = walk(dir);
let changedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    
    // Generic container sizes
    const containerPatterns = [
        { from: /h-10 w-10 sm:h-12 sm:w-12/g, to: 'h-8 w-8 sm:h-10 sm:w-10' },
        { from: /h-10 w-10 md:h-12 md:w-12/g, to: 'h-8 w-8 md:h-10 md:w-10' },
    ];
    
    containerPatterns.forEach(p => {
        if (p.from.test(content)) {
            content = content.replace(p.from, p.to);
            changed = true;
        }
    });

    // Sub-icon inner sizes (scale down by 2 or appropriately to fit inside a w-8 h-8 box)
    const iconPatterns = [
        { from: /h-6 w-6 sm:h-7 sm:w-7/g, to: 'h-4 w-4 sm:h-5 sm:w-5' },
        { from: /h-5 w-5 md:h-6 md:w-6/g, to: 'h-4 w-4 md:h-5 md:w-5' },
    ];

    iconPatterns.forEach(p => {
        if (p.from.test(content)) {
            content = content.replace(p.from, p.to);
            changed = true;
        }
    });

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        changedCount++;
        console.log("Updated: " + file);
    }
});

console.log("Changed " + changedCount + " files.");
