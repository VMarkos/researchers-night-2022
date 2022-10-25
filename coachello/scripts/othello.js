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
let PLAYING = false;
let EMPTY_CELLS;
let NO_LEGAL_MOVES = false;
let TEMP_BOARD = undefined;
let MACHINE_COLOR = 1;

let EXPLANATION = {};

let EXPLANATION_BORDERS = [];

let CURRENT_GAME = [];
let currentMove;
let canMoveForward = false, canMoveBackward = false;
let highlightedCell = "";

const highlightEvent = new Event("highlight");

/* Current Game Structure:
[
    {
        cell: [row, col],
        color: 1|-1,
        board: BOARD,
        legalMove: LEGAL_MOVES,
    },
    ...
]
*/

// TEST_POLICY = `@Knowledge
// RME :: legalMove(X,Y), cell(X+1,Y,-1), cell(X+2,Y,1) implies move(X,Y);`

let TEST_POLICY = "";

const TEST_DICT = {
    "D1": "Play any legal move available, resolving ties at random.",
    "D2": "If there is a move to a corner available, then do not play any other move.",
    "D3": "If there is a move to a corner available, then do not play any other move.",
    "C1": "Square at (0,0) is a corner square.",
    "C2": "Square at (0,7) is a corner square.",
    "C3": "Square at (7,0) is a corner square.",
    "C4": "Square at (7,7) is a corner square.",
    "R1": "If there is a legal move to a corner, prefer that move.",
    "R2": "If there is a legal move next to a corner, avoid that move.",
};

const TEST_LITERAL_DICT = {
    "move": (x, y) => {return `move to (${x + 1}, ${y + 1})`;},
};

function initializeBoard() {
    document.getElementById("blacks").innerText = 2;
    document.getElementById("whites").innerText = 2;
    EMPTY_CELLS = N_ROWS * N_COLS - 4;
    const boardContainer = document.getElementById("board-container");
    let othelloCell, borderCell;
    boardContainer.style.gridTemplateColumns = "repeat(" + (N_COLS + 2) + ", 1fr)";
    BOARD = new Array(N_ROWS);
    for (let i = -1; i < N_ROWS + 1; i++) {
        if (i > -1 && i < N_ROWS) {
            BOARD[i] = [];
        }
        for (let j = -1; j < N_COLS + 1; j++) {
            if (i < 0 || j < 0 || i === N_ROWS || j === N_COLS) {
                borderCell = document.createElement("div");
                borderCell.classList.add("border-cell");
                borderCell.id = "bc|" + i + "|" + j;
                boardContainer.append(borderCell);
            } else {
                BOARD[i].push(0);
                othelloCell = document.createElement("div");
                othelloCell.classList.add("othello-cell");
                othelloCell.id = "oc-" + i + "-" + j;
                boardContainer.append(othelloCell);
            }
        }
    }
    setUpPosition(boardContainer);
    calculateLegalMoves();
    drawLegalMoves();
}

function drawBoard(board) {
    let cell, piece;
    for (let i = 0; i < N_ROWS; i++) {
        for (let j = 0; j < N_COLS; j++) {
            cell = document.getElementById("oc-" + i + "-" + j);
            for (const child of cell.childNodes) {
                child.remove();
            }
            if (board[i][j] === 1) {
                piece = document.createElement("div");
                piece.classList.add("othello-piece-white");
                cell.append(piece);
            } else if (board[i][j] === -1) {
                piece = document.createElement("div");
                piece.classList.add("othello-piece-black");
                cell.append(piece);
            }
        }
    }
}

function drawLegalMoves(color = -1, interactive = true, legalMoves = undefined) {
    if (legalMoves === undefined) {
        legalMoves = LEGAL_MOVES;
    }
    let cellContainer, legalMove, coords, row, col;
    // console.log("Drawing:");
    for (const cellId of legalMoves) {
        // console.log(cellId);
        // debugger;
        cellContainer = document.getElementById(cellId);
        legalMove = document.createElement("div");
        legalMove.classList.add("legal-moves-black");
        if (color === -1 && interactive) {
            legalMove.addEventListener("mouseup", () => {
                removeExplanationBorders();
                // console.log("Interactive!");
                coords = cellId.split("-");
                row = parseInt(coords[1]);
                col = parseInt(coords[2]);
                makeDoubleMove(row, col);
            });
        } else {
            legalMove.style.cursor = "auto";
        }
        cellContainer.append(legalMove);
        // console.log("appended");
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

function flipPieces(cellIds = undefined) {
    // if (TO_BE_FLIPPED[LAST_MOVE] === undefined) {
    //     return;
    // }
    let coords, currentPiece, row, col;
    // console.log("TO_BE_FLIPPED:", TO_BE_FLIPPED);
    // console.log("LAST_MOVE:", LAST_MOVE);
    if (cellIds === undefined) {
        cellIds = TO_BE_FLIPPED[LAST_MOVE];
    }
    if (cellIds === undefined) {
        return;
    }
    // console.log("inFlip:", cellIds);
    for (const cellId of cellIds) {
        // currentPiece = document.getElementById(cellId).lastChild;
        currentPiece = document.getElementById(cellId).firstChild;
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
    if (LEGAL_MOVES.length === 0 && opponent === 1) {
        calculateLegalMoves((-1) * opponent);
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

function updateGameHistory(row, col, color) {
    const copyBoard = [];
    for (const brow of BOARD) {
        copyBoard.push([...brow]);
    }
    CURRENT_GAME.push({
        cell: [row, col],
        color: color,
        board: copyBoard,
        legalMoves: [...LEGAL_MOVES],
    });
    currentMove = CURRENT_GAME.length;
    canMoveBackward = true;
    appendMoveToGameHistory(row, col, color);
}

function makeSingleMove(row, col, color = -1) {
    updateGameHistory(row, col, color);
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
    drawLegalMoves((-1) * color);
    EMPTY_CELLS -= 1;
}

function updateScore(color, blacks = undefined, whites = undefined) {
    const blacksElement = document.getElementById("blacks");
    const whitesElement = document.getElementById("whites");
    let flipped, oldBlacks, oldWhites;
    if (blacks === undefined || whites === undefined) {
        flipped = TO_BE_FLIPPED[LAST_MOVE].length;
        oldBlacks = parseInt(blacksElement.innerText);
        oldWhites = parseInt(whitesElement.innerText);
    }
    if (color === 1) {
        if (blacks === undefined || whites === undefined) {
            blacks = oldBlacks - flipped;
            whites = oldWhites + flipped + 1;
        }
        blacksElement.innerText = blacks;
        whitesElement.innerText = whites;
    } else {
        if (blacks === undefined || whites === undefined) {
            blacks = oldBlacks + flipped +1;
            whites = oldWhites - flipped;
        }
        blacksElement.innerText = blacks;
        whitesElement.innerText = whites;
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
    return EMPTY_CELLS === 0;
}

/* Agents */

function randomMove(color = -1) {
    if (LEGAL_MOVES.length === 0) {
        return 0;
    }
	let row, col;
	do {
		row = Math.floor(N_ROWS * Math.random());
		col = Math.floor(N_COLS * Math.random());
	} while (!LEGAL_MOVES.includes("oc-" + row + "-" + col));
	const cellId = "oc-" + row + "-" + col;
	updateLastMove(cellId);
    if (color === MACHINE_COLOR) {
        const playButton = document.getElementById("play-pause");
        playButton.classList.remove("inactive");
        const cell = document.getElementById(cellId);
        cell.classList.add("highlighted");
        highlightedCell = cellId;
        const makeMove = () => {
            makeSingleMove(row, col, color);
            // const playButton = document.getElementById("play-pause");
            playButton.removeEventListener("click", makeMove, false);
            playButton.classList.add("inactive");
            cell.classList.remove("highlighted");
            highlightedCell = "";
        };
        console.log("moved randomly");
        playButton.addEventListener("click", makeMove, false);
    } else {
        makeSingleMove(row, col, color);
    }
	if (isGameOver()) {
		return 1;
	}
	return 0;
}

function makeDoubleMove(row, col, color = -1) {
    if (!PLAYING) {
        const stepBackward = document.getElementById("step-backward");
        stepBackward.addEventListener("click", previousMove, false);
        stepBackward.classList.remove("inactive");
        const fastBackward = document.getElementById("fast-backward");
        fastBackward.addEventListener("click", backwardFast, false);
        fastBackward.classList.remove("inactive");
        PLAYING = true;
    }
    // const explanationContainer = document.getElementById("explanation-text");
    // explanationContainer.innerHTML = "";
    let gameOverCounter = 0;
    if (LEGAL_MOVES.length > 0) {
        // CURRENT_GAME.push({
        //     cell: [row, col],
        //     color: color,
        //     flipped: TO_BE_FLIPPED["oc-" + row + "-" + col],
        // });
        makeSingleMove(row, col, color);
        gameOverCounter = 0;
    } else {
        // console.log("NO LEGAL MOVES (human)");
        updateGameHistory(-1, -1, color);
        calculateLegalMoves(color);
        drawLegalMoves((-1) * color);
        gameOverCounter++;
    }
    if (gameOverCounter === 2) {
        return;
    }
    if (LEGAL_MOVES.length > 0) {
        console.log("waiting");
        setTimeout(() => {
            const move = prudensMove((-1) * color);
        }, 500);
        gameOverCounter = 0;
    } else {
        // console.log("NO LEGAL MOVES (Prudens)");
        updateGameHistory(-1, -1, (-1) * color);
        calculateLegalMoves((-1) * color);
        drawLegalMoves(color);
        gameOverCounter++;
    }
    if (gameOverCounter === 2) {
        return;
    }
}

function previousMove(casualCall = true) {
    if (!canMoveForward) {
        canMoveForward = true;
        const stepForward = document.getElementById("step-forward");
        stepForward.classList.remove("inactive");
        stepForward.addEventListener("click", nextMove, false);
        const fastForward = document.getElementById("fast-forward");
        fastForward.classList.remove("inactive");
        fastForward.addEventListener("click", forwardFast, false);
    }
    const lastDot = document.getElementById("last-dot");
    // console.log("Is casual call?", casualCall);
    if (lastDot && casualCall) {
        lastDot.id = "";
        lastDot.classList.remove("fa-dot-circle-o");
        lastDot.classList.add("fa-circle-o");
        document.getElementById(highlightedCell).classList.remove("highlighted");
        highlightedCell = ""
    }
    currentMove--;
    updateMoveSpan();
    let prevMove, row, col, color;
    const thisMove = CURRENT_GAME[currentMove];
    if (TEMP_BOARD === undefined) {
        TEMP_BOARD = BOARD;
    }
    BOARD = thisMove["board"];
    drawBoard(thisMove["board"]);
    eraseLegalMoves();
    drawLegalMoves(color, false, thisMove["legalMoves"]);
    updateScore(color, ...countStones(thisMove["board"]));
    if (currentMove === 0) {
        canMoveBackward = false;
        // console.log(canMoveForward, canMoveBackward);
        // console.log("In");
        const fastBackward = document.getElementById("fast-backward");
        fastBackward.classList.add("inactive");
        fastBackward.removeEventListener("click", backwardFast, false);
        const stepBackward = document.getElementById("step-backward");
        stepBackward.classList.add("inactive");
        stepBackward.removeEventListener("click", previousMove, false);
        return false;
    }
    if (currentMove > 0) {
        prevMove = CURRENT_GAME[currentMove - 1];
        row = prevMove["cell"][0];
        col = prevMove["cell"][1];
        color = prevMove["color"];
        if (row > -1 && col > -1) {
            const cell = document.getElementById("oc-" + row + "-" + col);
            const piece = cell.firstChild;
            const redDot = document.createElement("div");
            redDot.id = "last-move";
            redDot.classList.add("othello-last-move");
            piece.append(redDot);
        }
    }
    updateScore(color, ...countStones(thisMove["board"]));
    return true;
}

function countStones(board) {
    let whites = 0, blacks = 0;
    for (let i = 0; i < N_ROWS; i++) {
        for (let j = 0; j < N_COLS; j++) {
            if (board[i][j] === 1) {
                whites++;
            } else if (board[i][j] === -1) {
                blacks++;
            }
        }
    }
    return [blacks, whites];
}

function backwardFast(existsPreviousMove = true, moveCount = 65, cell = undefined, casualCall = true) {
    // console.log("backward-fast");
    if (existsPreviousMove && moveCount > 0) {
        existsPreviousMove = previousMove(casualCall);
        moveCount--
        setTimeout(() => {backwardFast(existsPreviousMove, moveCount, cell, casualCall);}, 50);
    }
    if (!existsPreviousMove) {
        // console.log("removed bf:", moveCount);
        const fastBackward = document.getElementById("fast-backward");
        fastBackward.removeEventListener("click", backwardFast, false);
    }
    if (cell && moveCount === 0) {
        cell.dispatchEvent(highlightEvent);
    }
}

function nextMove(casualCall = true) {
    if (!canMoveBackward) {
        canMoveBackward = true;
        const stepBackward = document.getElementById("step-backward");
        stepBackward.classList.remove("inactive");
        stepBackward.addEventListener("click", previousMove, false);
        const fastBackward = document.getElementById("fast-backward");
        fastBackward.classList.remove("inactive");
        fastBackward.addEventListener("click", backwardFast, false);
    }
    const lastDot = document.getElementById("last-dot");
    if (lastDot && casualCall) {
        lastDot.id = "";
        lastDot.classList.remove("fa-dot-circle-o");
        lastDot.classList.add("fa-circle-o");
        document.getElementById(highlightedCell).classList.remove("highlighted");
        highlightedCell = "";
    }
    currentMove++;
    updateMoveSpan();
    let prevMove, row, col, color;
    prevMove = CURRENT_GAME[currentMove - 1];
    row = prevMove["cell"][0];
    col = prevMove["cell"][1];
    color = prevMove["color"];
    let value;
    eraseLegalMoves();
    if (currentMove === CURRENT_GAME.length) {
        canMoveForward = false;
        BOARD = TEMP_BOARD;
        TEMP_BOARD = undefined;
        drawBoard(BOARD);
        // updateScore(color, ...countStones(BOARD));
        drawLegalMoves((-1) * color);
        // console.log("LM:", LEGAL_MOVES);
        const fastForward = document.getElementById("fast-forward");
        fastForward.classList.add("inactive");
        fastForward.removeEventListener("click", forwardFast, false);
        const stepForward = document.getElementById("step-forward");
        stepForward.classList.add("inactive");
        stepForward.removeEventListener("click", nextMove, false);
        value = false;
    } else {
        const thisMove = CURRENT_GAME[currentMove];
        BOARD = thisMove["board"];
        drawBoard(thisMove["board"]);
        drawLegalMoves(color, false, thisMove["legalMoves"]);
        value = true;
    }
    if (row > -1 && col > -1) {
        const cell = document.getElementById("oc-" + row + "-" + col);
        const piece = cell.firstChild;
        const redDot = document.createElement("div");
        redDot.id = "last-move";
        redDot.classList.add("othello-last-move");
        piece.append(redDot);
    }
    updateScore(color, ...countStones(BOARD));
    return value;
}

function forwardFast(existsNextMove = true, moveCount = 65, cell = undefined, casualCall = true) {
    if (existsNextMove && moveCount > 0) {
        existsNextMove = nextMove(casualCall);
        moveCount--;
        setTimeout(() => {forwardFast(existsNextMove, moveCount, cell, casualCall);}, 50);
    }
    if (!existsNextMove) {
        const fastForward = document.getElementById("fast-forward");
        fastForward.removeEventListener("click", forwardFast, false);
    }
    if (cell && moveCount === 0) {
        cell.dispatchEvent(highlightEvent);
    }
}

function updateMoveSpan(moveCols = 2) {
    let index;
    if (currentMove === 0) {
        index = 0;
    } else if (currentMove % moveCols === 1) {
        index = Math.floor(CURRENT_GAME.length / moveCols) + Math.floor(currentMove / moveCols);
    } else {
        index = Math.floor(3 * CURRENT_GAME.length / moveCols) + Math.floor(currentMove / moveCols) - 1;
    }
    const previousSpan = document.getElementById("last-move-span");
    // let currentMoveNumber = currentMove;
    if (previousSpan) {
        previousSpan.classList.remove("last-move-span");
        previousSpan.id = "";
        // currentMoveNumber = parseInt(previousSpan.getAttribute("data-move-number"));
    }
    if (currentMove !== 0) {
        const targetSpan = document.getElementsByClassName("move-span")[index];
        // console.log("spans:", document.getElementsByClassName("move-span"));
        // console.log("index:", index);
        targetSpan.classList.add("last-move-span");
        targetSpan.id = "last-move-span";
        targetSpan.scrollIntoView();
    }
}

function appendMoveToGameHistory(row, col, color) {
    const pendingMoveContainer = document.getElementById(`pending-${color === 1 ? "white" : "black"}-moves`);
    const pendingMove = document.createElement("span");
    pendingMove.classList.add("move-span");
    pendingMove.setAttribute("data-move-number", "" + currentMove);
    pendingMove.addEventListener("click", goToPendingMove, false);
    const emptyDot = document.createElement("i")
    emptyDot.classList.add("fa");
    emptyDot.classList.add("fa-circle-o");
    pendingMove.append(emptyDot);
    pendingMoveContainer.append(pendingMove);
    // Add the actual move.
    const moveString = translateMove(row, col, color);
    const moveContainer = document.getElementById(`${color === 1 ? "white" : "black"}-moves`);
    const moveSpan = document.createElement("span");
    moveSpan.classList.add("move-span");
    const previousSpan = document.getElementById("last-move-span");
    if (previousSpan) {
        previousSpan.classList.remove("last-move-span");
        previousSpan.id = "";
    }
    moveSpan.id = "last-move-span";
    moveSpan.classList.add("last-move-span");
    moveSpan.innerText = moveString;
    moveSpan.setAttribute("data-move-number", "" + currentMove);
    moveSpan.addEventListener("click", goToMove, false);
    moveContainer.append(moveSpan);
    moveSpan.scrollIntoView();
    if (color === -1) {
        const moveNumberContainer = document.getElementById("move-numbers");
        const moveNumberSpan = document.createElement("span");
        moveNumberSpan.classList.add("number-span");
        moveNumberSpan.innerText = Math.ceil(currentMove / 2);
        moveNumberContainer.append(moveNumberSpan);
    }
}

function goToPendingMove(event) {
    if (highlightedCell) {
        document.getElementById(highlightedCell).classList.remove("highlighted");
    }
    const targetSpan = event.currentTarget;
    console.log(targetSpan);
    const emptyDot = targetSpan.firstChild;
    const lastDot = document.getElementById("last-dot");
    if (lastDot) {
        lastDot.id = "";
        lastDot.classList.remove("fa-dot-circle-o");
        lastDot.classList.add("fa-circle-o");
    }
    emptyDot.id = "last-dot";
    emptyDot.classList.remove("fa-circle-o");
    emptyDot.classList.add("fa-dot-circle-o");
    const moveNumber = parseInt(targetSpan.getAttribute("data-move-number"));
    let currentMoveNumber = currentMove;
    const cell = document.getElementById("oc-" + CURRENT_GAME[moveNumber - 1]["cell"].join("-"));
    cell.addEventListener("highlight", highlightPendingCell, false);
    removeLastDot = false;
    if (moveNumber < currentMoveNumber) {
        backwardFast(true, currentMoveNumber - moveNumber + 1, cell, false);
    } else if (moveNumber > currentMoveNumber) {
        forwardFast(true, moveNumber - currentMoveNumber - 1, cell, false);
    }
}

function highlightPendingCell(event) {
    event.target.classList.add("highlighted");
    event.target.removeEventListener("highlight", highlightPendingCell, false);
    highlightedCell = event.target.id;
}

function goToMove(event) {
    const targetSpan = event.currentTarget;
    const moveNumber = parseInt(targetSpan.getAttribute("data-move-number"));
    let currentMoveNumber = currentMove;
    if (moveNumber < currentMoveNumber) {
        backwardFast(true, currentMoveNumber - moveNumber);
    } else if (moveNumber > currentMoveNumber) {
        forwardFast(true, moveNumber - currentMoveNumber);
    }
}

function translateMove(row, col, color) {
    if (row === -1 || col === -1) {
        return "PS";
    }
    const cols = ["A", "B", "C", "D", "E", "F", "G", "H"];
    return `${color === -1 ? cols[col].toLowerCase() : cols[col]}${row + 1}`;
}

function scrollGameHistory() {
    const numbersContainer = document.getElementById("move-numbers");
    const moves = document.getElementById("moves");
    numbersContainer.scrollTop = moves.scrollTop;
}

function resetGameHistory() {
    const blackMoves = document.getElementById("black-moves");
    const whiteMoves = document.getElementById("white-moves");
    const moveNums = document.getElementById("move-numbers");
    blackMoves.innerHTML = "";
    whiteMoves.innerHTML = "";
    moveNums.innerHTML = "";
}

function reset() {
    PLAYING = false;
    const board = document.getElementById("board-container");
    board.innerHTML = "";
    EXPLANATION = {}; // Is this needed?
    downloadPolicy();
    coachedPolicyString = "";
    currentMove = undefined;
    resetGameHistory();
    initializeBoard();
}

function prudensMove(color = 1) { // Infers all legible moves according to the provided policy and then choses at random (this might need to be changed).
    if (LEGAL_MOVES.length === 0) {
        return 0;
    }
	const outObj = otDeduce();
    const output = outObj["output"];
    if (!output) {
        return randomMove(color);
    }
    const inferences = outObj["inferences"].split(/\s*;\s*/).filter(Boolean);
	const suggestedMoves = [];
	// console.log("inferences:", inferences);
	for (const literal of inferences) {
        // console.log(literal.trim().substring(0, 5));
		if (literal.trim().substring(0, 5) === "move(") {
			suggestedMoves.push(literal.trim());
		}
	}
    // console.log(suggestedMoves);
	if (suggestedMoves.length === 0) {
        // randomMove();
		return randomMove(color);
	}
	// const moveLiteral = suggestedMoves[Math.floor(suggestedMoves.length * Math.random())].trim();
    const moveLiteral = suggestedMoves.pop().trim();
    generateExplanation(moveLiteral, output);
    // generateContrastiveExplanation(moveLiteral, output);
    // console.log("moveLiteral:", moveLiteral);
	const coords = moveLiteral.substring(5, moveLiteral.length - 1).split(",");
	const row = coords[0].trim();
	const col = coords[1].trim();
	const cellId = "oc-" + row + "-" + col;
	updateLastMove(cellId);
    if (TO_BE_FLIPPED[LAST_MOVE] === undefined) {
        EXPLANATION.flipped = [];
    } else {
        EXPLANATION.flipped = [...TO_BE_FLIPPED[LAST_MOVE]];
    }
	if (!LEGAL_MOVES.includes(cellId)) { // Need to throw exception at this point.
        // console.log("Not legal:", LEGAL_MOVES, cellId);
		return -1;
	}
    const playButton = document.getElementById("play-pause");
    playButton.classList.remove("inactive");
    const cell = document.getElementById(cellId);
    cell.classList.add("highlighted");
    highlightedCell = cellId;
    const makeMove = () => {
        makeSingleMove(row, col, color);
        const playButton = document.getElementById("play-pause");
        playButton.removeEventListener("click", makeMove, false);
        playButton.classList.add("inactive");
        cell.classList.remove("highlighted");
        highlightedCell = "";
    };
    console.log("moved");
    playButton.addEventListener("click", makeMove, false);
	// makeSingleMove(row, col, color);
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
  const output = forwardChaining(kbObject, contextObject["context"]);
  const inferences = output["facts"];
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
    let cellId, bodyCell, bodyBorder;
    // console.log(EXPLANATION.flipped);
    if (!alreadyFlipped) {
        flipPieces(EXPLANATION["flipped"]);
        alreadyFlipped = true;
    }
    for (const cell of EXPLANATION.body) {
        if (cell[0] < 0 || cell[1] < 0 || cell[0] === N_ROWS || cell[1] === N_COLS) {
            cellId = "bc|" + cell[0] + "|" + cell[1];
        } else {
            cellId = "oc-" + cell[0] + "-" + cell[1];
        }
        EXPLANATION_BORDERS.push(cellId);
        bodyCell = document.getElementById(cellId);
        bodyBorder = document.createElement("div");
        bodyBorder.id = "bb-" + cell[0] + "-" + cell[1];
        bodyBorder.classList.add("body-cell-explanation");
        bodyCell.append(bodyBorder);
    }
    cellId = "oc-" + EXPLANATION.head[0] + "-" + EXPLANATION.head[1];
    EXPLANATION_BORDERS.push(cellId);
    bodyCell = document.getElementById(cellId);
    bodyBorder = document.createElement("div");
    bodyBorder.id = "bb-" + EXPLANATION.head[0] + "-" + EXPLANATION.head[1];
    bodyBorder.classList.add("head-cell-explanation");
    bodyCell.append(bodyBorder);
}

function generateExplanation(inference, output) {
    // console.log("genExp:", output);
    const splitInf = inference.split(",");
    const row = parseInt(splitInf[0][splitInf[0].length - 1]);
    const col = parseInt(splitInf[1].trim()[0]);
    EXPLANATION = {body: [], head: [row, col]};
    // console.log("flipped:", flippedPieces);
    const graph = output["graph"];
    const crownRules = graph[inference];
    const rule = crownRules.pop();
    const ruleName = rule.name;
    // const ruleTransforms = RULE_MAP.get(ruleName);
    const rulePoints = RULE_MAP_JSON[ruleName];
    // console.log("rt:", ruleTransforms);
    for (const point of rulePoints) {
        EXPLANATION.body.push([point[0] + row, point[1] + col]);
    }
    // console.log(EXPLANATION);
}

function removeExplanationBorders() {
    let cellSplit, coords, borderCell;
    for (const cellId of EXPLANATION_BORDERS) {
        if (cellId[0] === "b") {
            cellSplit = cellId.split("|");
        } else {
            cellSplit = cellId.split("-");
        }
        coords = [parseInt(cellSplit[1]), parseInt(cellSplit[2])];
        borderCell = document.getElementById("bb-" + coords[0] + "-" + coords[1]);
        document.getElementById(cellId).removeChild(borderCell);
    }
    EXPLANATION_BORDERS = [];
    if (alreadyFlipped) {
        flipPieces(EXPLANATION["flipped"]);
        alreadyFlipped = false;
    }
}

function showSiblings(id) {
    const element = document.getElementById(id);
    // console.log(element.parentElement.parentElement, element.parentElement.parentElement.classList);
    if (!element.parentElement.classList.contains("active")) {
        element.parentElement.classList.add("active");
    } else {
        element.parentElement.classList.remove("active");
    }
    const children = element.parentElement.children;
    let child;
    for (let i = 1; i < children.length; i++) {
        child = children[i];
        if (child.classList.contains("hidden")) {
            child.classList.remove("hidden");
        } else {
            child.classList.add("hidden");
        }
    }
}

function shadeCell(row, col) {
    // console.log("row:", row, "col:", col);
    // this.row = row;
    // this.col = col;
    const cell = document.getElementById("oc-" + row + "-" + col);
    if (cell.classList.contains("highlighted")) {
        cell.classList.remove("highlighted");
    } else {
        cell.classList.add("highlighted");
    }
}

function setupNavigationButtons() {
    const stepBackward = document.getElementById("step-backward");
    stepBackward.classList.add("inactive");
    const fastBackward = document.getElementById("fast-backward");
    fastBackward.classList.add("inactive");
    const stepForward = document.getElementById("step-forward");
    stepForward.classList.add("inactive");
    const fastForward = document.getElementById("fast-forward");
    fastForward.classList.add("inactive");
}

/* Main */

function main() {
    initializeBoard();
    const policyFileInput = document.getElementById("policy-file");
    const gameFileInput = document.getElementById("game-file");
    const policyButton = document.getElementById("policy-button");
    const gameButton = document.getElementById("game-button");
    policyFileInput.addEventListener("change", uploadPolicy, false);
    policyButton.addEventListener("click", (e) => {
        policyFileInput.click();
    });
    // gameButton.addEventListener("click", (e) => {
    //     gameFileInput.click();
    // });
    document.getElementById("moves").addEventListener("scroll", scrollGameHistory, true);
    // setupNavigationButtons();
}

window.addEventListener("load", main);