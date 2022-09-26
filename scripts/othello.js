const N_ROWS = 8;
const N_COLS = 8;

let BOARD; // 0 = empty, 1 = white, -1 = black.
let LEGAL_MOVES; // String array, containing all cell ids that are legal moves.
let TO_BE_FLIPPED; // List of cell ids that should be flipped.
let LAST_MOVE;
let ALL_DIRECTIONS = [
    [1, -1], [1, 0], [1, 1],
    [0, -1], [0, 1],
    [-1, -1], [-1, 0], [-1, 1],
];
let PLAYING = true;
let EMPTY_CELLS;
let NO_LEGAL_MOVES = false;

let EXPLANATION = "";

const TEST_POLICY = `@KnowledgeBase
Dummy :: legalMove(X, Y) implies move(X, Y);`

const TEST_DICT = {"Dummy": "I chose at random among any legal moves I was allowed to make."};

function initializeBoard() {
    document.getElementById("blacks").innerText = 2;
    document.getElementById("whites").innerText = 2;
    EMPTY_CELLS = N_ROWS * N_COLS - 4;
    const boardContainer = document.getElementById("board-container");
    let othelloCell;
    boardContainer.style.gridTemplateColumns = "repeat(" + N_COLS + ", 1fr)";
    BOARD = new Array(N_ROWS);
    for (let i=0; i < N_ROWS; i++) {
        BOARD[i] = [];
        for (let j=0; j < N_COLS; j++) {
            BOARD[i].push(0);
            othelloCell = document.createElement("div");
            othelloCell.classList.add("othello-cell");
            othelloCell.id = "oc-" + i + "-" + j;
            boardContainer.append(othelloCell);
        }
    }
    setUpPosition(boardContainer);
    calculateLegalMoves();
    // debugger;
    drawLegalMoves();
}

function drawLegalMoves() {
    let cellContainer, legalMove, coords, row, col;
    for (const cellId of LEGAL_MOVES) {
        // console.log(cellId);
        // debugger;
        cellContainer = document.getElementById(cellId);
        legalMove = document.createElement("div");
        legalMove.classList.add("legal-moves-black");
        legalMove.addEventListener("mouseup", () => {
            coords = cellId.split("-");
            row = parseInt(coords[1]);
            col = parseInt(coords[2]);
            makeDoubleMove(row, col);
        });
        cellContainer.append(legalMove);
    }
}

function eraseLegalMoves() {
    let cellContainer;
    for (const cellId of LEGAL_MOVES) {
        cellContainer = document.getElementById(cellId);
        while (cellContainer.firstChild) {
            cellContainer.removeChild(cellContainer.lastChild);
        }
    }
}

function flipPieces() {
    let coords, currentPiece, row, col;
    // console.log("TO_BE_FLIPPED:", TO_BE_FLIPPED);
    console.log("LAST_MOVE:", LAST_MOVE);
    for (const cellId of TO_BE_FLIPPED[LAST_MOVE]) {
        currentPiece = document.getElementById(cellId).lastChild;
        // console.log("cellId:", cellId);
        coords = cellId.split("-");
        row = coords[1];
        col = coords[2];
        // console.log("row:", row, "col:", col);
        if (BOARD[row][col] === -1) {
            currentPiece.classList.remove("othello-piece-black");
            currentPiece.classList.add("othello-piece-white");
            BOARD[row][col] = 1;
        } else {
            currentPiece.classList.remove("othello-piece-white");
            currentPiece.classList.add("othello-piece-black");
            BOARD[row][col] = -1;
        }
    }
}

function setUpPosition() {
    let xc1, xc2, yc1, yc2, cell, piece;
    if (N_ROWS % 2 === 0) {
        xc1 = N_ROWS / 2 - 1;
        xc2 = xc1 + 1;
    } else {
        xc1 = (N_ROWS - 1) / 2;
        xc2 = xc1 + 1;
    }
    if (N_COLS % 2 === 0) {
        yc1 = N_COLS / 2 - 1;
        yc2 = yc1 + 1;
    } else {
        yc1 = (N_COLS - 1) / 2;
        yc2 = yc1 + 1;
    }
    BOARD[xc1][yc1] = 1;
    cell = document.getElementById("oc-" + xc1 + "-" + yc1);
    piece = document.createElement("div");
    piece.classList.add("othello-piece-white");
    cell.append(piece);
    BOARD[xc1][yc2] = -1;
    cell = document.getElementById("oc-" + xc1 + "-" + yc2);
    piece = document.createElement("div");
    piece.classList.add("othello-piece-black");
    cell.append(piece);
    BOARD[xc2][yc1] = -1;
    cell = document.getElementById("oc-" + xc2 + "-" + yc1);
    piece = document.createElement("div");
    piece.classList.add("othello-piece-black");
    cell.append(piece);
    BOARD[xc2][yc2] = 1;
    cell = document.getElementById("oc-" + xc2 + "-" + yc2);
    piece = document.createElement("div");
    piece.classList.add("othello-piece-white");
    cell.append(piece);
}

function calculateLegalMoves(opponent = 1) {
    LEGAL_MOVES = [];
    TO_BE_FLIPPED = {};
    let toBeFlipped, currentCellId;
    for (let i = 0; i < N_ROWS; i++) {
        for (let j = 0; j < N_COLS; j++) {
            currentCellId = "oc-" + i + "-" + j;
            toBeFlipped = [];
            for (const direction of ALL_DIRECTIONS) {
                toBeFlipped.push(...isLegalMoveInDirection(currentCellId, direction[0], direction[1], opponent));
            }
            if (toBeFlipped.length !== 0) {
                LEGAL_MOVES.push(currentCellId);
                TO_BE_FLIPPED[currentCellId] = toBeFlipped;
            }
        }
    }
}

function isLegalMoveInDirection(cellId, xStep, yStep, opponent = 1) {
    const coords = cellId.split("-");
    // console.log(cellId);
    const cellX = parseInt(coords[1]);
    const cellY = parseInt(coords[2]);
    const opponentCells = [];
    if (BOARD[cellX][cellY] !== 0) {
        return [];
    }
    let currentX = cellX + xStep, currentY = cellY + yStep, isPreviousWhite = false;
    while (currentX < N_ROWS && currentX >= 0 && currentY < N_COLS && currentY >= 0 && BOARD[currentX][currentY] !== 0) {
        if (isPreviousWhite && BOARD[currentX][currentY] === -opponent) {
            return opponentCells;
        }
        if (!isPreviousWhite) {
            if (BOARD[currentX][currentY] === -opponent) {
                return [];
            }
            isPreviousWhite = true;
        }
        opponentCells.push("oc-" + currentX + "-" + currentY);
        currentX += xStep;
        currentY += yStep;
    }
    return [];
}

function makeSingleMove(row, col, color = -1) {
    const lastMoveDot = document.getElementById("last-move");
    if (lastMoveDot) {
        lastMoveDot.remove();
    }
    eraseLegalMoves();
    const pieceClass = `othello-piece-${color === 1 ? "white" : "black"}`;
    const cell = document.getElementById("oc-" + row + "-" + col);
    const piece = document.createElement("div");
    const redDot = document.createElement("div");
    redDot.id = "last-move";
    redDot.classList.add("othello-last-move");
    piece.append(redDot);
    piece.classList.add(pieceClass);
    cell.append(piece);
    BOARD[row][col] = color;
    LAST_MOVE = "oc-" + row + "-" + col;
    flipPieces();
    updateScore(color);
    calculateLegalMoves(color);
    drawLegalMoves();
    EMPTY_CELLS -= 1;
}

function updateScore(color) {
    const flipped = TO_BE_FLIPPED[LAST_MOVE].length;
    const blacksElement = document.getElementById("blacks");
    const whitesElement = document.getElementById("whites");
    const oldBlacks = parseInt(blacksElement.innerText);
    const oldWhites = parseInt(whitesElement.innerText);
    if (color === 1) {
        blacksElement.innerText = oldBlacks - flipped;
        whitesElement.innerText = oldWhites + flipped + 1;
    } else {
        blacksElement.innerText = oldBlacks + flipped + 1;
        whitesElement.innerText = oldWhites - flipped;
    }
}

function updateLastMove(cellId) {
	// const cell = document.getElementById(cellId);
	if (LAST_MOVE) {
        const coords = LAST_MOVE.split("-");
        const row = coords[1];
        const col = coords[2];
        if (BOARD[row][col] === 1) {
            const previousCell = document.getElementById(LAST_MOVE);
            const previousPiece = previousCell.lastChild;
            // console.log(previousPiece);
            previousPiece.removeChild(previousPiece.lastChild);
        }
	}
	LAST_MOVE = cellId;
}

function isGameOver() {
    console.log("EMPTY_CELLS:", EMPTY_CELLS);
    return EMPTY_CELLS === 0;
}

function startNewGameDialogue(result) {
	const newGame = confirm(`${result} Start another game?`);
		if (newGame) {
            PLAYING = true;
            const boardContainer = document.getElementById("board-container");
            while (boardContainer.firstChild) {
                boardContainer.removeChild(boardContainer.lastChild);
            }
			initializeBoard();
		}
}

function nextMove(moveFunction=randomMove) {
	if (!PLAYING) { // Do you really need this?
        // console.log("Not Playing!");
        initializeBoard();
        // console.log("Board populated!");
		PLAYING = true;
        document.getElementById("play-button-text").innerHTML = "Next";
	}
	const move = moveFunction();
    // debugger;
	if (move === 1) {// || EMPTY_CELLS === 0) {
		PLAYING = false;
		startNewGameDialogue("Game Over!");
	}
}

/* Agents */

function randomMove(color = -1) {
    EXPLANATION = "I play at random! :)"
    if (LEGAL_MOVES.length === 0) {
        return 0;
        // calculateLegalMoves((-1) * color);
        // if (LEGAL_MOVES.length === 0) {
        //     return 1;
        // }
    }
	let row, col;
	do {
		row = Math.floor(N_ROWS * Math.random());
		col = Math.floor(N_COLS * Math.random());
	} while (!LEGAL_MOVES.includes("oc-" + row + "-" + col));
	const cellId = "oc-" + row + "-" + col;
	updateLastMove(cellId);
	makeSingleMove(row, col, color);
	if (isGameOver()) {
		return 1;
	}
	return 0;
}

function makeDoubleMove(row, col, color = -1) {
    const explainText = document.getElementById("explanation-text");
    explainText.innerHTML = "";
    makeSingleMove(row, col, color);
    setTimeout(() => {
        const move = prudensMove((-1) * color);
        console.log(move);
    }, 500);
}

function reset() {
    const board = document.getElementById("board-container");
    board.innerHTML = "";
    const explainText = document.getElementById("explanation-text");
    explainText.innerHTML = "";
    EXPLANATION = "";
    initializeBoard();
}

function prudensMove(color = 1) { // Infers all legible moves according to the provided policy and then choses at random (this might need to be changed).
    if (LEGAL_MOVES.length === 0) {
        return 0;
    }
	const outObj = otDeduce();
    const output = outObj["output"];
    const inferences = outObj["inferences"].split(";").filter(Boolean);
	const suggestedMoves = [];
	console.log("inferences:", inferences);
	for (const literal of inferences) {
        // console.log(literal.trim().substring(0, 5));
		if (literal.trim().substring(0, 5) === "move(") {
			suggestedMoves.push(literal.trim());
		}
	}
    // console.log(suggestedMoves);
	if (suggestedMoves.length === 0) {
        randomMove();
		return randomMove(color);
	}
	const moveLiteral = suggestedMoves[Math.floor(suggestedMoves.length * Math.random())].trim();
    generateExplanation(moveLiteral, output);
    // console.log("moveLiteral:", moveLiteral);
	const coords = moveLiteral.substring(5, moveLiteral.length - 1).split(",");
	const row = coords[0].trim();
	const col = coords[1].trim();
	const cellId = "oc-" + row + "-" + col;
	updateLastMove(cellId);
	if (!LEGAL_MOVES.includes(cellId)) { // Need to throw exception at this point.
        // console.log("Not legal:", LEGAL_MOVES, cellId);
		return -1;
	}
	makeSingleMove(row, col, color);
    // randomMove(1);
    // console.log(isGameOver());
	if (isGameOver()) {
		return 1;
	}
	return 0;
}

function otDeduce() {
  const kbObject = otKbParser();
  if (kbObject["type"] === "error") {
      return "ERROR: " + kbObject["name"] + ":\n" + kbObject["message"];
  }
  const warnings = kbObject["warnings"];
  const contextObject = otContextParser();
  if (contextObject["type"] === "error") {
      return "ERROR: " + contextObject["name"] + ":\n" + contextObject["message"];
  }
  console.log(contextObject); // TODO fix some context parsing issue (in propositional cases it includes the semicolon into the name of the prop)
  const output = forwardChaining(kbObject, contextObject["context"]);
  const inferences = output["facts"];
  // console.log(graph);
  return {
    output: output,
    inferences: contextToString(inferences)
  }
}

function otKbParser() {
  const kbAll = TEST_POLICY;
  return parseKB(kbAll);
}

function otContextParser() {
  const context = extractContext();
  const contextList = parseContext(context);
  // console.log(contextList);
  if (contextList["type"] === "error") {
      return contextList;
  }
  return contextList;
}

function extractContext() { // Convert an othello board to a Prudens context.
	let coords, contextString = "";
	for (let row = 0; row < N_ROWS; row++) {
		for (let col = 0; col < N_COLS; col++) {
			contextString += "cell(" + row + "," + col + "," + BOARD[row][col] + ");";
		}
	}
    for (const cellId of LEGAL_MOVES) {
        coords = cellId.split("-");
        contextString += "legalMove(" + coords[1] + "," + coords[2] + ");";
    }
	return contextString;
}

/* Explanations */

function explain() {
    const explainText = document.getElementById("explanation-text");
    explainText.innerHTML = EXPLANATION;
}

function generateExplanation(inference, output) {
    const graph = output["graph"];
    const crownRules = graph[inference];
    EXPLANATION = "";
    for (const rule of crownRules) {
        EXPLANATION += TEST_DICT[rule["name"]] + "\n";
    }
}

/* Main */

function main() {
    initializeBoard();
}

window.addEventListener("load", main);