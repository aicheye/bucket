
import fs from 'fs';
import path from 'path';

interface ParsedItem {
    name: string;
    category: string;
    grade: number;
    max: number;
    type: string;
}

function parse_grades(text: string): ParsedItem[] {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const items: ParsedItem[] = [];
    let currentCategory = "Uncategorized";

    // Find start
    let startIndex = 0;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("Grade Item") && lines[i].includes("Points")) {
            startIndex = i + 1;
            break;
        }
    }

    // Pre-scan for weights to determine the file format
    // If we see Points (X / Y) followed immediately by another X / Y, it implies the file has Weight columns.
    let hasWeights = false;
    for (let i = startIndex; i < lines.length - 1; i++) {
        if (lines[i].match(/^[\d\.]+\s*\/\s*[\d\.]+$/) && lines[i+1].match(/^[\d\.]+\s*\/\s*[\d\.]+$/)) {
            hasWeights = true;
            break;
        }
    }

    let i = startIndex;
    while (i < lines.length) {
        // Assume lines[i] is the Name
        const name = lines[i].replace(/View statistics for .*$/, '').trim();
        
        // Look ahead
        const j = i + 1;
        if (j >= lines.length) break;

        // Check if lines[j] is Points "X / Y"
        if (lines[j].match(/^[\d\.]+\s*\/\s*[\d\.]+$/)) {
            const pointsStr = lines[j];
            const [grade, max] = pointsStr.split('/').map(s => parseFloat(s.trim()));
            
            // Check next line for Weight
            let k = j + 1;
            let hasWeightHere = false;
            if (k < lines.length && lines[k].match(/^[\d\.]+\s*\/\s*[\d\.]+$/)) {
                hasWeightHere = true;
                k++; // Consume weight
            }
            
            // Check next line for Percentage
            if (k < lines.length && (lines[k].match(/^[\d\.]+\s*%\s*$/) || lines[k].match(/^-\s*%\s*$/))) {
                k++; // Consume percentage
            }

            if (hasWeightHere) {
                // It has explicit weight, so it's an item
                items.push({
                    name: name,
                    category: currentCategory,
                    grade: grade,
                    max: max,
                    type: "Item"
                });
            } else {
                // No weight found for this entry
                if (hasWeights) {
                    // If the file generally has weights, but this entry doesn't, it's likely a Category summary
                    currentCategory = name;
                } else {
                    // If the file doesn't have weights (or at least we didn't detect them), then this is an Item
                    items.push({
                        name: name,
                        category: currentCategory,
                        grade: grade,
                        max: max,
                        type: "Item"
                    });
                }
            }
            
            i = k; // Continue from after the consumed lines
            continue;
        }
        
        // Check if lines[j] is Percentage (without Points)
        // This usually indicates a Category in files that don't show points for categories
        if (lines[j].match(/^[\d\.]+\s*%\s*$/) || lines[j].match(/^-\s*%\s*$/)) {
            currentCategory = name;
            i = j + 1;
            continue;
        }

        // If neither, skip this line (it might be a category with no data, or just noise)
        i++;
    }
    return items;
}

const examplesDir = path.join(process.cwd(), 'examples');
const files = fs.readdirSync(examplesDir).filter(f => f.endsWith('.txt'));

files.forEach(file => {
    console.log(`Testing ${file}...`);
    const content = fs.readFileSync(path.join(examplesDir, file), 'utf-8');
    try {
        const items = parse_grades(content);
        console.log(`Parsed ${items.length} items.`);
        if (items.length > 0) {
            console.log(`First item: ${JSON.stringify(items[0])}`);
            console.log(`Last item: ${JSON.stringify(items[items.length - 1])}`);
        } else {
            console.log("No items parsed!");
        }
    } catch (e) {
        console.error(`Error parsing ${file}:`, e);
    }
    console.log('---');
});
