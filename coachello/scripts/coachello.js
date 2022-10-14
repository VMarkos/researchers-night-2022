const PATTERN = new Array(N_ROWS); // 0 empty, 1 red (body), 2 blue (head).
let RULE_MAP = new Map();
let RULE_MAP_JSON = {};
let basePatterns = [];
let existsHead = false;
let N_RULES = 0;

let coachedPolicyString = "";

const D4 = [ // Dihedral group (n=4). Contains the 7 non-trivial transforms of D4 (3 rotations and 4 reflections).
    (x, y) => {return [x, 7 - y];}, // Reflection wrt to x = 0.
    (x, y) => {return [7 - x, y];}, // Reflection wrt to y = 0.
    (x, y) => {return [7 - x, 7 - y];}, // Reflection wrt to y = x.
    (x, y) => {return [y, x];}, // Reflection wrt to y = -x.
    (x, y) => {return [7 - y, x];}, // 90 deg rotation.
    (x, y) => {return [7 - x, 7 - y];}, // 180 deg rotation.
    (x, y) => {return [y, 7 - x];}, // 270 deg rotation.
];

function initPattern() {
    existsHead = false;
    for (let i = -1; i < N_ROWS + 1; i++) {
        PATTERN[i] = new Array(N_COLS);
        for (let j = -1; j < N_COLS + 1; j++) {
            PATTERN[i][j] = 0;
        }
    }
}

function addPattern() {
    initPattern();
    const addButton = document.getElementById("add-button");
    addButton.innerText = "Done!";
    addButton.onclick = doneWithPattern;
    const blocker = document.createElement("div");
    blocker.classList.add("blocker");
    blocker.id = "blocker";
    const bodyContainer  = document.getElementById("body-container");
    bodyContainer.append(blocker);
    addPatternCells();
}

function highlightCell(event) {
    const target = event.target;
    let backgroundCell, splitId = [];
    splitId = target.id.split("|");
    const row = parseInt(splitId[1]);
    const col = parseInt(splitId[2]);
    let borderCell = false;
    if (row < 0 || col < 0 || row === N_ROWS || col === N_COLS) {
        backgroundCell = document.getElementById("bc|" + row + "|" + col);
        borderCell = true;
    } else {
        backgroundCell = document.getElementById("oc-" + row + "-" + col);
    }
    if (PATTERN[row][col] === 0) {
        PATTERN[row][col] = 1;
        backgroundCell.classList.add("body-cell");
    } else if (PATTERN[row][col] === 1 && !existsHead && !borderCell) {
        PATTERN[row][col] = 2;
        backgroundCell.classList.remove("body-cell");
        backgroundCell.classList.add("head-cell");
        existsHead = true;
    } else if (PATTERN[row][col] === 1) {
        PATTERN[row][col] = 0;
        backgroundCell.classList.remove("body-cell");
    } else {
        PATTERN[row][col] = 0;
        backgroundCell.classList.remove("head-cell");
        existsHead = false;
    }
}

/* 
BASE PATTERN = {
    body: [[i, j, 0|1|-1], ...],
    head [x, y, 1|-1],
};
*/

function transformPattern(pattern, transform) {
    const transformed = {body: [], head: undefined};
    for (const cell of pattern.body) {
        transformed.body.push([...transform(cell[0], cell[1]), cell[2]]);
    }
    transformed.head = [...transform(pattern.head[0], pattern.head[1]), pattern.head[2]]; // Do heads need color?
    return transformed;
}

function computeBasePatterns(color = 1) {
    const basePattern = {body: [], head: undefined};
    for (let i = -1; i < N_ROWS + 1; i ++) {
        for (let j = -1; j < N_COLS + 1; j++) {
            if (PATTERN[i][j] === 1) {
                if (i < 0 || j < 0 || i === N_ROWS || j === N_COLS) {
                    basePattern.body.push([i, j, 0]);
                } else {
                    basePattern.body.push([i, j, BOARD[i][j]]);
                }
            } else if (PATTERN[i][j] === 2) {
                basePattern.head = [i, j, color];
            }
        }
    }
    basePatterns.push(basePattern);
    for (const transform of D4) {
        basePatterns.push(transformPattern(basePattern, transform));
    }
}

function transpileToRule(pattern) {
    const headLiteral = "move(X,Y);";
    let bodyString = "legalMove(X,Y),";
    const headCoords = [pattern.head[0], pattern.head[1]];
    let x, y;
    for (const cell of pattern.body) {
        x = cell[0] - headCoords[0];
        y = cell[1] - headCoords[1];
        bodyString += `cell(X${x > 0 ? ("+" + x) : (x === 0 ? "" : x)},Y${y > 0 ? ("+" + y) : (y === 0 ? "" : y)},${cell[2]}),`;
    }
    return " :: " + bodyString.substring(0, bodyString.length - 1) + " implies " + headLiteral;
}

function transpileToFn(pattern, ruleName) {
    const ruleTransforms = [];
    const headCoords = [pattern.head[0], pattern.head[1]];
    let x, y;
    for (const cell of pattern.body) {
        x = cell[0] - headCoords[0];
        y = cell[1] - headCoords[1];
        ruleTransforms.push((a, b) => {return [x + a, y + b];});
        if (RULE_MAP_JSON[ruleName]) {
            RULE_MAP_JSON[ruleName].push([x, y]);
        } else {
            RULE_MAP_JSON[ruleName] = [[x, y]];
        }
    }
    return ruleTransforms;
}

function updatePolicy() {
    let policyString = "";
    for (const pattern of basePatterns) {
        policyString += "R" + N_RULES + transpileToRule(pattern) + "\n";
        RULE_MAP.set("R" + N_RULES, transpileToFn(pattern, "R" + N_RULES));
        N_RULES++;
    }
    coachedPolicyString += policyString;
}

function removeHighlights() {
    let backgroundCell;
    for (let i = -1; i < N_ROWS + 1; i++) {
        for (let j = -1; j < N_COLS + 1; j++) {
            if (i < 0 || j < 0 || i === N_ROWS || j === N_COLS) {
                backgroundCell = document.getElementById("bc|" + i + "|" + j);
            } else {
                backgroundCell = document.getElementById("oc-" + i + "-" + j);
            }
            if (backgroundCell.classList.contains("body-cell")) {
                backgroundCell.classList.remove("body-cell");
            } else if (backgroundCell.classList.contains("head-cell")) {
                backgroundCell.classList.remove("head-cell");
            }
        }
    }
}

function addPatternCells() {
    let cell, patternCell;
    for (let i = -1; i < N_ROWS + 1; i++) {
        for (let j = -1; j < N_COLS + 1; j++) {
            if (i < 0 || j < 0 || i === N_ROWS || j === N_COLS) {
                cell = document.getElementById("bc|" + i + "|" + j);
            } else {
                cell = document.getElementById("oc-" + i + "-" + j);
            }
            patternCell = document.createElement("div");
            patternCell.classList.add("pattern-cell");
            patternCell.id = "pc|" + i + "|" + j;
            patternCell.onclick = (event) => {highlightCell(event);};
            cell.append(patternCell);
        }
    }
}

function removePatternCells() {
    for (let i = -1; i < N_ROWS + 1; i++) {
        for (let j = -1; j < N_COLS + 1; j++) {
            document.getElementById("pc|" + i + "|" + j).remove();
        }
    }
}

function uploadPolicy() {
    const reader = new FileReader();
    reader.onload = (() => {
        policyJSON = JSON.parse(reader.result);
        N_RULES = policyJSON.nRules;
        TEST_POLICY = policyJSON.policy;
        RULE_MAP_JSON = policyJSON.ruleMap;
        loadRuleMap();
    });
    reader.readAsText(this.files[0]);
}

function loadRuleMap() {
    let rulePoints, ruleTransforms;
    for (const rule in RULE_MAP_JSON) {
        rulePoints = RULE_MAP_JSON[rule];
        ruleTransforms = [];
        for (const point of rulePoints) {
            // console.log(point);
            ruleTransforms.push((a, b) => {return [point[0] + a, point[1] + b];});
        }
        RULE_MAP.set(rule, ruleTransforms);
    }
}

function downloadPolicy() {
    const policyJSON = preparePolicyForDownload();
    download("policy.json", JSON.stringify(policyJSON));
}

function download(filename, content) {
    let element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(content));
    element.setAttribute("download", filename);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function preparePolicyForDownload() {
    const policyJSON = {
        nRules: N_RULES,
        policy: (TEST_POLICY[0] === "@" ? "" : "@Knowledge") + TEST_POLICY + "\n" + coachedPolicyString,
        ruleMap: RULE_MAP_JSON,
    };
    return policyJSON;
}

function doneWithPattern() {
    removePatternCells();
    removeHighlights();
    computeBasePatterns();
    updatePolicy();
    // TODO At this point, you have to collect all pattern cells and their colors, so as to generate the rules (which should be generated before this function returns!)
    const addButton = document.getElementById("add-button");
    addButton.innerText = "Add Pattern";
    addButton.onclick = addPattern;
    document.getElementById("blocker").remove();
}