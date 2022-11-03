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
let PAUSED = false;
let EMPTY_CELLS;
let NO_LEGAL_MOVES = false;
let TEMP_BOARD = undefined;
let BLACK = 0; // 0 = human, 1 = Prudens, 2 = Edax.
let WHITE = 1; // 0 = human, 1 = Prudens, 2 = Edax.
let MODE = -1; // -1 = undefined, 0 = playing, 1 = auditing.

let EXPLANATION = {};

let EXPLANATION_BORDERS = [];

let CURRENT_GAME = [];
let currentMove;
let canMoveForward = false, canMoveBackward = false;
let highlightedCell = "";

const highlightEvent = new Event("highlight");

const PLAYER_OPTIONS = ["Human", "Prudens"];

/* Current Game Structure:
[
    {
        cell: [row, col],
        color: 1|-1,
        board: BOARD,
        legalMoves: LEGAL_MOVES,
        explanation: EXPLANATION,
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

function initializeBoard(withLegalMoves = true) {
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
    if (withLegalMoves) {
        calculateLegalMoves();
        drawLegalMoves();
    }
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
        if (color === -1 && interactive && MODE === 0) {
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
    if (typeof row === "string" || typeof col === "string") {
        console.log(row, col, color);
    }
    CURRENT_GAME.push({
        cell: [row, col],
        color: color,
        board: copyBoard,
        legalMoves: [...LEGAL_MOVES],
        toBeFlipped: TO_BE_FLIPPED,
        explanation: EXPLANATION === {} ? undefined : EXPLANATION,
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
    makeSingleMove(row, col, color);
    // if (color === MACHINE_COLOR) {
    //     const playButton = document.getElementById("play-pause");
    //     playButton.classList.remove("inactive");
    //     const cell = document.getElementById(cellId);
    //     cell.classList.add("highlighted");
    //     highlightedCell = cellId;
    //     const makeMove = () => {
    //         makeSingleMove(row, col, color);
    //         // const playButton = document.getElementById("play-pause");
    //         playButton.removeEventListener("click", makeMove, false);
    //         playButton.classList.add("inactive");
    //         cell.classList.remove("highlighted");
    //         highlightedCell = "";
    //     };
    //     console.log("moved randomly");
    //     playButton.addEventListener("click", makeMove, false);
    // } else {
    //     makeSingleMove(row, col, color);
    // }
	if (isGameOver()) {
		return 1;
	}
	return 0;
}

function makeDoubleMove(row, col, color = -1) {
    if (!PLAYING) {
        PLAYING = true;
        const settings = document.getElementById("game-settings-container");
        settings.style.opacity = 0.6;
        const blocker = document.createElement("div");
        blocker.classList.add("blocker");
        blocker.classList.add("transparent");
        blocker.classList.add("rounded-corners");
        settings.append(blocker);
        // const modeSetting = document.getElementById("mode-setting-container");
        // modeSetting.classList.add("inactive");
        // const blocker = document.createElement("div");
        // blocker.classList.add("specification-menu-blocker");
        // modeSetting.append(blocker);
        // setupMode();
        // if (MODE === 1) { // TODO This should be changed, since no moves should be played in audit mode.
        //     const stepBackward = document.getElementById("step-backward");
        //     stepBackward.addEventListener("click", previousMove, false);
        //     stepBackward.classList.remove("inactive");
        //     const fastBackward = document.getElementById("fast-backward");
        //     fastBackward.addEventListener("click", backwardFast, false);
        //     fastBackward.classList.remove("inactive");
        // }
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
        const playPause = document.getElementById("play-pause");
        playPause.classList.remove("inactive");
        playPause.addEventListener("click", autoplay, false);
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
    console.log(boardToString(BOARD));
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
            console.log("xy:", row, col);
            const cell = document.getElementById("oc-" + row + "-" + col);
            const piece = cell.firstChild;
            const redDot = document.createElement("div");
            redDot.id = "last-move";
            redDot.classList.add("othello-last-move");
            // try {
                piece.append(redDot);
            // } catch (e) {
            //     console.log(boardToString(BOARD));
            // }
        }
    }
    updateScore(color, ...countStones(thisMove["board"]));
    return true;
}

function boardToString(board) {
    let boardString = "";
    for (const row of board) {
        for (const x of row) {
            if (x === 1) {
                boardString += "O ";
            } else if (x === -1) {
                boardString += "* ";
            } else {
                boardString += ". ";
            }
        }
        boardString += "\n";
    }
    return boardString;
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
    console.log(currentMove);
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
        const playPause = document.getElementById("play-pause");
        playPause.classList.add("inactive");
        playPause.removeEventListener("click", autoplay, false);
        value = false;
    } else {
        const thisMove = CURRENT_GAME[currentMove];
        BOARD = thisMove["board"];
        drawBoard(thisMove["board"]);
        drawLegalMoves(color, false, thisMove["legalMoves"]);
        if (prevMove["explanation"] === {}) {
            EXPLANATION = prevMove["explanation"];
            console.log(EXPLANATION);
            explain();
        }
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
    // if (MODE === 0) {
    const pendingMoveContainer = document.getElementById(`pending-${color === 1 ? "white" : "black"}-moves`);
    const pendingMove = document.createElement("span");
    pendingMove.classList.add("move-span");
    pendingMove.setAttribute("data-move-number", "" + currentMove);
    if (MODE === 0) {
        pendingMove.classList.add("inactive");
    } else {
        pendingMove.addEventListener("click", goToPendingMove, false);
    }
    const emptyDot = document.createElement("i")
    emptyDot.classList.add("fa");
    emptyDot.classList.add("fa-circle-o");
    pendingMove.append(emptyDot);
    pendingMoveContainer.append(pendingMove);
    // }
    // Add the actual move.
    const moveString = translateMove(row, col, color);
    const moveContainer = document.getElementById(`${color === 1 ? "white" : "black"}-moves`);
    const moveSpan = document.createElement("span");
    moveSpan.classList.add("move-span");
    if (MODE === 0) {
        moveSpan.classList.add("inactive");
    } else {
        moveSpan.addEventListener("click", goToMove, false);
    }
    const previousSpan = document.getElementById("last-move-span");
    if (previousSpan) {
        previousSpan.classList.remove("last-move-span");
        previousSpan.id = "";
    }
    moveSpan.id = "last-move-span";
    moveSpan.classList.add("last-move-span");
    moveSpan.innerText = moveString;
    moveSpan.setAttribute("data-move-number", "" + currentMove);
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
        // const toBeUnflipped = document.getElementsByClassName("flip-highlighted"); // FIXME You are fixing this.
        // for (const cell of toBeUnflipped) {
        //     cell.classList.remove("flip-highlighted");
        // }
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
    cell.addEventListener("highlight", (event) => {
        const toBeFlipped = CURRENT_GAME[moveNumber - 1]["toBeFlipped"]["oc-" + CURRENT_GAME[moveNumber - 1]["cell"].join("-")];
        highlightPendingCell(event, toBeFlipped);
    }, false);
    removeLastDot = false;
    if (moveNumber < currentMoveNumber) {
        backwardFast(true, currentMoveNumber - moveNumber + 1, cell, false);
    } else if (moveNumber > currentMoveNumber) {
        forwardFast(true, moveNumber - currentMoveNumber - 1, cell, false);
    }
}

function highlightPendingCell(event, toBeFlipped) {
    event.target.classList.add("highlighted");
    event.target.removeEventListener("highlight", highlightPendingCell, false);
    highlightedCell = event.target.id;
    // for (const cellId of toBeFlipped) { // FIXME You are here as well.
    //     document.getElementById(cellId).classList.add("flip-highlighted");
    // }
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

function changeGameMode() {
    const switchContainer = document.getElementById("mode-switch");
    const ball = document.getElementById("mode-ball");
    if (MODE === 0) {
        switchContainer.classList.add("active");
        ball.classList.add("active");
        MODE = 1;
    } else {
        switchContainer.classList.remove("active");
        ball.classList.remove("active");
        MODE = 0;
    }
}

function translateMove(row, col, color) {
    const iRow = parseInt(row), iCol = parseInt(col);
    if (iRow === -1 || iCol === -1) {
        return "PS";
    }
    const cols = ["A", "B", "C", "D", "E", "F", "G", "H"];
    return `${color === -1 ? cols[iCol].toLowerCase() : cols[col]}${iRow + 1}`;
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
    const pendingBM = document.getElementById("pending-black-moves");
    const pendingWM = document.getElementById("pending-white-moves");
    blackMoves.innerHTML = "";
    whiteMoves.innerHTML = "";
    pendingBM.innerHTML = "";
    pendingWM.innerHTML = "";
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
    // const playButton = document.getElementById("play-pause");
    // playButton.classList.remove("inactive");
    // const cell = document.getElementById(cellId);
    // cell.classList.add("highlighted");
    // highlightedCell = cellId;
    // const makeMove = () => {
    //     makeSingleMove(row, col, color);
    //     const playButton = document.getElementById("play-pause");
    //     playButton.removeEventListener("click", makeMove, false);
    //     playButton.classList.add("inactive");
    //     cell.classList.remove("highlighted");
    //     highlightedCell = "";
    // };
    // console.log("moved");
    // playButton.addEventListener("click", makeMove, false);
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

function setupMode() {
    if (MODE === 0) {
        const addButton = document.getElementById("add-button");
        const whyButton = document.getElementById("why-button");
        addButton.classList.add("inactive");
        whyButton.classList.add("inactive");
        const addBlock = document.createElement("div");
        addBlock.classList.add("specificity-menu-blocker");
        addButton.append(addBlock);
        const whyBlock = document.createElement("div");
        whyBlock.classList.add("specificity-menu-blocker");
        whyButton.append(whyBlock);
    }
}

function prepareGameforDownload() {
    // console.log(boardToString(CURRENT_GAME[CURRENT_GAME.length - 1]["board"]));
    // console.log(boardToString(BOARD));
    return {
        game: CURRENT_GAME,
        policy: preparePolicyForDownload(),
        lastBoard: BOARD,
        lastLegalMoves: [...LEGAL_MOVES],
    }
}

function downloadGame() {
    console.log("download");
    const preparedGame = prepareGameforDownload();
    download("game.json", JSON.stringify(preparedGame, null, 2));
}

function loadGameHistory() {
    let cell, color;
    console.log(CURRENT_GAME.length);
    currentMove = 0
    for (const move of CURRENT_GAME) {
        currentMove++;
        cell = move["cell"];
        color = move["color"];
        appendMoveToGameHistory(...cell, color);
    }
    // backwardFast();
    BOARD = TEMP_BOARD;
    PLAYING = false;
    const board = document.getElementById("board-container");
    board.innerHTML = "";
    // EXPLANATION = {}; // Is this needed?
    // downloadPolicy();
    coachedPolicyString = "";
    // currentMove = undefined;
    initializeBoard(false);
    drawLegalMoves(-1, true, ["oc-2-3", "oc-3-2", "oc-4-5", "oc-5-4"]);
    const previousSpan = document.getElementById("last-move-span");
    if (previousSpan) {
        previousSpan.classList.remove("last-move-span");
        previousSpan.id = "";
    }
    canMoveForward = true;
    currentMove = 0;
    const stepForward = document.getElementById("step-forward");
    stepForward.classList.remove("inactive");
    stepForward.addEventListener("click", nextMove, false);
    const fastForward = document.getElementById("fast-forward");
    fastForward.classList.remove("inactive");
    fastForward.addEventListener("click", forwardFast, false);
    const playPause = document.getElementById("play-pause");
    playPause.classList.remove("inactive");
    playPause.addEventListener("click", autoplay, false);
}

function autoplay(existsMove = true, firstPress = true) {
    const playPause = document.getElementById("play-pause");
    playPause.removeEventListener("click", autoplay, false);
    if (firstPress) {
        for (const child of playPause.children) {
            child.remove();
        }
        const pause = document.createElement("i");
        pause.classList.add("fa");
        pause.classList.add("fa-pause");
        playPause.append(pause);
        playPause.addEventListener("click", pauseGame, false);
    }
    if (existsMove && !PAUSED) {
        existsMove = nextMove();
        setTimeout(() => {autoplay(existsMove, false);}, 1000);
    }
    if (!existsMove || PAUSED) {
        for (const child of playPause.children) {
            child.remove();
        }
        const play = document.createElement("i");
        play.classList.add("fa");
        play.classList.add("fa-play");
        playPause.append(play);
        if (PAUSED) {
            PAUSED = false;
            console.log("Paused:", PAUSED);
            playPause.removeEventListener("click", pauseGame, false);
            playPause.addEventListener("click", autoplay, false);
        }
    }
}

function pauseGame() {
    PAUSED = true;
}

function loadGame() {
    const reader = new FileReader();
    let gameJSON, policyJSON, ball;//, modeSetting, blocker;
    reader.onload = (() => {
        ball = document.getElementById("mode-ball");
        ball.click();
        // modeSetting = document.getElementById("mode-setting-container");
        // modeSetting.classList.add("inactive");
        // blocker = document.createElement("div");
        // blocker.classList.add("specification-menu-blocker");
        // modeSetting.append(blocker);
        gameJSON = JSON.parse(reader.result);
        CURRENT_GAME = gameJSON.game;
        TEMP_BOARD = gameJSON.lastBoard;
        LEGAL_MOVES = gameJSON.lastLegalMoves;
        loadGameHistory();
        policyJSON = gameJSON.policy;
        N_RULES = policyJSON.nRules;
        TEST_POLICY = policyJSON.policy;
        RULE_MAP_JSON = policyJSON.ruleMap;
        loadRuleMap();
    });
    reader.readAsText(this.files[0]);
}

function enterPlayMode() {
    if (MODE === -1) {
        MODE = 0;
        const initButtonsContainer = document.getElementById("init-buttons-container");
        initButtonsContainer.style.transform = "translate(-50%, 0)";
        initButtonsContainer.style.top = "0";
        showPlayModeSettings();
        eraseLegalMoves();
        drawLegalMoves();
    } else if (MODE === 0) {
        const isNonEmpty = currentMove !== undefined && currentMove > 0;
        const newGame = confirm(`${isNonEmpty ? "Save game and s" : "S"}tart new game?`);
        if (newGame) {
            if (isNonEmpty) {
                downloadGame();
            }
            resetGame();
        }
    } else if (MODE === 1) {
        const isNonEmpty = coachedPolicyString !== "";
        const audit = confirm(`${isNonEmpty ? "Save policy and s" : "S"}tart a new game?`);
        if (audit) {
            MODE = 0;
            if (isNonEmpty) {
                downloadPolicy();
            }
            resetGame();
            const auditContainer = document.getElementById("audit-container");
            auditContainer.style.top = "-100vh";
            setTimeout(() => {
                auditContainer.remove();
            }, 250);
            showPlayModeSettings();
        }
    }
}

function resetGame() {
    PLAYING = false;
    const gameSettingsContainer = document.getElementById("game-settings-container");
    if (gameSettingsContainer) {
        gameSettingsContainer.style.opacity = 1.0;
        for (const child of gameSettingsContainer.childNodes) {
            if (child.classList.contains("blocker")) {
                child.remove();
            }
        }
    }
    const board = document.getElementById("board-container");
    board.innerHTML = "";
    currentMove = undefined;
    CURRENT_GAME = [];
    resetGameHistory();
    initializeBoard();
}

function showPlayModeSettings() {
    const rightMenuContainer = document.getElementById("right-menu-container");
    const gameSettingsContainer = document.createElement("div");
    gameSettingsContainer.classList.add("game-settings-container");
    gameSettingsContainer.id = "game-settings-container";
    const blackSettings = setupPlayerSettings("black");
    const whiteSettings = setupPlayerSettings("white", {right: true});
    gameSettingsContainer.append(blackSettings);
    gameSettingsContainer.append(whiteSettings);
    const gh = getGameHistory();
    const saveGame = getSaveGameButton();
    const gameNavContainer = document.createElement("div");
    gameNavContainer.classList.add("game-navigation-container");
    gameNavContainer.append(saveGame);
    gameNavContainer.append(gh);
    // const gNav = generateGameNav();
    const hiddenDownContainer = document.createElement("div");
    hiddenDownContainer.classList.add("show-play-mode");
    hiddenDownContainer.id = "play-game-container";
    hiddenDownContainer.append(gameSettingsContainer);
    hiddenDownContainer.append(gameNavContainer);
    // hiddenDownContainer.append(gNav);
    rightMenuContainer.append(hiddenDownContainer);
    setTimeout(() => {
    	hiddenDownContainer.style.top = "80px";
    }, 10);
//	hiddenDownContainer.style.transform = "none";
}

function getSaveGameButton() {
    const container = document.createElement("div");
    container.classList.add("game-up-down-load-container");
    const button = document.createElement("div");
    button.classList.add("game-load-container");
    button.addEventListener("click", downloadGame, false);
    button.append(document.createTextNode("Save "));
    const icon = document.createElement("i");
    icon.classList.add("fa");
    icon.classList.add("fa-download");
    button.append(icon);
    container.append(button);
    return container;
}

function getGameHistory() {
	const gameHistoryContainer = document.createElement("div");
	gameHistoryContainer.classList.add("game-history-container");
	const moveNumContainer = document.createElement("div");
	moveNumContainer.classList.add("move-number-container");
	const movesContainer = document.createElement("div");
	movesContainer.classList.add("moves-container");
	const pendingBM = document.createElement("div");
	const bm = document.createElement("div");
	const pendingWM = document.createElement("div");
	const wm = document.createElement("div");
	moveNumContainer.id = "move-numbers";
	movesContainer.id = "moves";
    movesContainer.addEventListener("scroll", scrollGameHistory, false);
	pendingBM.classList.add("moves-col");
	pendingBM.id = "pending-black-moves";
	bm.classList.add("moves-col");
	bm.id = "black-moves";
	pendingWM.classList.add("moves-col");
	pendingWM.id = "pending-white-moves";
	wm.classList.add("moves-col");
	wm.id = "white-moves";
	movesContainer.append(pendingBM);
	movesContainer.append(bm);
	movesContainer.append(pendingWM);
	movesContainer.append(wm);
	gameHistoryContainer.append(moveNumContainer);
	gameHistoryContainer.append(movesContainer);
	return gameHistoryContainer;
}

function generateGameNav() {
	const navContainer = document.createElement("div");
	navContainer.classList.add("game-navbar-container");
	const items = ["fast-backward", "step-backward", "play", "step-forward", "fast-forward"];
	let e, ei;
	for (const x of items) {
		e = document.createElement("div");
		e.id = x === "play" ? x + "-pause" : x;
		e.classList.add("navigation-button");
		e.classList.add("inactive");
		ei = document.createElement("i");
		ei.classList.add("fa");
		ei.classList.add("fa-" + x);
		e.append(ei);
		navContainer.append(e);
	}
	return navContainer;
}

function setupPlayerSettings(color, params = {
    right: false,
    defaultPlayers: {
        black: "Human",
        white: "Prudens",
    },
}) {
    if (params.defaultPlayers === undefined) {
        params.defaultPlayers = {
            black: "Human",
            white: "Prudens",
        };
    }
    const settings = document.createElement("div");
    settings.classList.add("player-settings");
    if (params["right"]) {
        settings.classList.add("right");
    }
    const colorLabel = document.createElement("div");
    const playerColor = document.createElement("div");
    colorLabel.innerHTML = "<b>Color</b>:";
    playerColor.innerText = color[0].toUpperCase() + color.slice(1);
    const playerLabel = document.createElement("div");
    const playerType = document.createElement("div");
    playerLabel.innerHTML = "<b>Player</b>:";
    playerType.classList.add("player-type-container");
    playerType.innerText = params.defaultPlayers[color];
    const downArrow = document.createElement("div");
    downArrow.classList.add("fa");
    downArrow.classList.add("fa-angle-down");
    playerType.append(downArrow);
    playerType.id = color + "-type";
    const dropdown = playerTypeDropdown(color);
    playerType.append(dropdown);
    const particularsLabel = document.createElement("div");
    const particulars = document.createElement("input");
    const particularsButton = document.createElement("div");
    particularsLabel.innerHTML = "<b>Policy</b>:";
	particularsLabel.id = color + "-particulars-label";
	particulars.type = "file";
	particulars.addEventListener("change", uploadPolicy, false);
	particulars.id = color + "-particulars";
	particularsButton.innerText = "Upload...";
	particularsButton.id = color + "-policy-button";
    if (params.defaultPlayers[color] !== "Prudens") {
    	particularsLabel.classList.add("inactive");
		particularsButton.classList.add("inactive");
    } else {
    	particularsButton.classList.add("policy-upload-button");
    	particularsButton.tempFunc = () => {particulars.click();};
		particularsButton.addEventListener("click", particularsButton.tempFunc, false);
    }
    settings.append(colorLabel);
    settings.append(playerColor);
    settings.append(playerLabel);
    settings.append(playerType);
    settings.append(particularsLabel);
    settings.append(particulars);
    settings.append(particularsButton);
    return settings;
}

function playerTypeDropdown(color) {
    const dropdown = document.createElement("div");
    dropdown.classList.add("player-dropdown-container");
    const dropdownUl = document.createElement("ul");
    let option;
    for (let i = 0; i < PLAYER_OPTIONS.length; i++) {
        option = PLAYER_OPTIONS[i];
        const li = document.createElement("li");
        li.id = color + "-" + option.toLowerCase();
        li.innerText = option;
        li.addEventListener("click", (event) => {
            if (color === "white") {
                WHITE = i;
            } else {
                BLACK = i;
            }
            const ggParent = event.target.parentElement.parentElement.parentElement;
            for (const child of ggParent.childNodes) {
            	if (child.nodeType === 3) {
            		child.remove();
            	}
            }
            const newTextNode = document.createTextNode(PLAYER_OPTIONS[i]);
            ggParent.append(newTextNode);
            if (i === 1) {
            	const label = document.getElementById(color + "-particulars-label");
            	const button = document.getElementById(color + "-policy-button");
            	label.classList.remove("inactive");
            	button.classList.remove("inactive");
            	button.classList.add("policy-upload-button");
            	activatePolicyUpload(color);
            } else if (i === 0) {
            	const label = document.getElementById(color + "-particulars-label");
            	const button = document.getElementById(color + "-policy-button");
            	if (!label.classList.contains("inactive")) {
	            	label.classList.add("inactive");	
            	}
            	if (!button.classList.contains("inactive")) {
					button.classList.add("inactive");            	
            	}
            	button.classList.remove("policy-upload-button");
            	button.removeEventListener("click", button.tempFunc, false);
            }
        }, false)
        dropdownUl.append(li);
    }
    dropdown.append(dropdownUl);
    return dropdown;
}

function activatePolicyUpload(color) {
	const inputElement = document.getElementById(color + "-particulars");
	const policyButton = document.getElementById(color + "-policy-button");
	policyButton.tempFunc = () => {inputElement.click();};
	policyButton.addEventListener("click", policyButton.tempFunc, false);
}

function enterAuditMode() {
    if (MODE === -1) {
        MODE = 1;
        const initButtonsContainer = document.getElementById("init-buttons-container");
        initButtonsContainer.style.transform = "translate(-50%, 0)";
        initButtonsContainer.style.top = "0";
        showAuditModeSettings();
    } else if (MODE === 0) {
        const isNonEmpty = currentMove !== undefined && currentMove > 0;
        const audit = confirm(`${isNonEmpty ? "Save game and p" : "P"}roceed to audit mode?`);
        if (audit) {
            MODE = 1;
            if (isNonEmpty) {
                downloadGame();
            }
            resetAudit();
            const gameContainer = document.getElementById("play-game-container");
            gameContainer.style.top = "-100vh";
            setTimeout(() => {
                gameContainer.remove();
            }, 250);
            showAuditModeSettings();
        }
    } else if (MODE === 1) {
        const isNonEmpty = coachedPolicyString !== "";
        const audit = confirm(`${isNonEmpty ? "Save policy and r" : "R"}estart auditing?`);
        if (audit) {
            if (isNonEmpty) {
                downloadPolicy();
            }
            resetAudit();
        }
    }
}

function resetAudit() {
    PLAYING = false;
    const board = document.getElementById("board-container");
    board.innerHTML = "";
    currentMove = undefined;
    EXPLANATION = {};
    CURRENT_GAME = [];
    resetGameHistory();
    initializeBoard();
}

function showAuditModeSettings() {
    const rightMenuContainer = document.getElementById("right-menu-container");
    const gameSettingsContainer = getAuditSettings();
    const gh = getGameHistory();
    const gameHeader = getGameHeader();
    const gameNavContainer = document.createElement("div");
    gameNavContainer.classList.add("game-navigation-container");
    gameNavContainer.append(gameHeader);
    gameNavContainer.append(gh);
    const gNav = generateGameNav();
    gameNavContainer.append(gNav);
    const hiddenDownContainer = document.createElement("div");
    hiddenDownContainer.classList.add("show-play-mode");
    hiddenDownContainer.id = "audit-container";
    hiddenDownContainer.append(gameSettingsContainer);
    hiddenDownContainer.append(gameNavContainer);
    // hiddenDownContainer.append(gNav);
    rightMenuContainer.append(hiddenDownContainer);
    setTimeout(() => {
    	hiddenDownContainer.style.top = "80px";
    }, 10);
}

function getAuditSettings() {
    const container = document.createElement("div");
    container.classList.add("game-settings-container");
    container.classList.add("audit-settings-container");
    const gameUploadLabel = document.createElement("div");
    gameUploadLabel.innerHTML = "<b>Current Game</b>:";
    const gameUploadButton = document.createElement("div");
    gameUploadButton.classList.add("policy-upload-button");
    gameUploadButton.innerText = "Upload...";
    const gameUploadInput = document.createElement("input");
    gameUploadInput.type = "file";
    gameUploadButton.addEventListener("click", () => {gameUploadInput.click()}, false);
    gameUploadInput.addEventListener("change", loadGame, false);
    const gameUploadContainer = document.createElement("div");
    gameUploadContainer.classList.add("game-upload-container");
    gameUploadContainer.append(gameUploadLabel);
    gameUploadContainer.append(gameUploadInput);
    gameUploadContainer.append(gameUploadButton);
    container.append(gameUploadContainer);
    container.append(getAuditPlayerSettings("black"));
    container.append(getAuditPlayerSettings("white", {right: true}));
    return container;
}

function getAuditPlayerSettings(color, params = {
    right: false,
}) {
    const settings = document.createElement("div");
    settings.classList.add("player-settings");
    if (params["right"]) {
        settings.classList.add("right");
    }
    const colorLabel = document.createElement("div");
    const playerColor = document.createElement("div");
    colorLabel.innerHTML = "<b>Color</b>:";
    playerColor.innerText = color[0].toUpperCase() + color.slice(1);
    const playerLabel = document.createElement("div");
    const playerType = document.createElement("div");
    playerLabel.innerHTML = "<b>Player</b>:";
    playerType.classList.add("player-type-container");
    playerType.innerText = "??";
    playerType.id = color + "-type";
    const particularsLabel = document.createElement("div");
    const particularsButton = document.createElement("div");
    particularsLabel.innerHTML = "<b>Policy</b>:";
	particularsLabel.id = color + "-particulars-label";
	particularsButton.innerText = "??";
	particularsButton.id = color + "-policy-button";
    settings.append(colorLabel);
    settings.append(playerColor);
    settings.append(playerLabel);
    settings.append(playerType);
    settings.append(particularsLabel);
    settings.append(particularsButton);
    return settings;
}

function getGameHeader() {
    const container = document.createElement("div");
    container.classList.add("game-up-down-load-container");
    const button = document.createElement("div");
    button.classList.add("game-load-container");
    button.addEventListener("click", downloadPolicy, false);
    button.append(document.createTextNode("Save "));
    const icon = document.createElement("i");
    icon.classList.add("fa");
    icon.classList.add("fa-download");
    button.append(icon);
    container.append(button);
    const advise = document.createElement("div");
    advise.classList.add("game-load-container");
    advise.addEventListener("click", addPattern, false);
    advise.append(document.createTextNode("Offer advice "));
    const offerIcon = document.createElement("i");
    offerIcon.classList.add("fa");
    offerIcon.classList.add("fa-plus-square");
    advise.append(offerIcon);
    container.append(advise);
    return container;
}

/* Main */

function main() {
    initializeBoard();
    // const policyFileInput = document.getElementById("policy-file");
    // const gameFileInput = document.getElementById("game-file");
    // const policyButton = document.getElementById("policy-button");
    // const gameButton = document.getElementById("game-load-button");
    // policyFileInput.addEventListener("change", uploadPolicy, false);
    // policyButton.addEventListener("click", (e) => {
    //     policyFileInput.click();
    // });
    // gameFileInput.addEventListener("change", loadGame, false);
    // gameButton.addEventListener("click", (e) => {
    //     gameFileInput.click();
    // });
    // document.getElementById("moves").addEventListener("scroll", scrollGameHistory, false);
    // document.getElementById("mode-ball").addEventListener("click", changeGameMode, false);
    // const modeSetting = document.getElementById("mode-setting-container");
    // const blocker = document.createElement("div");
    // blocker.classList.add("specification-menu-blocker");
    // modeSetting.append(blocker);
}

window.addEventListener("load", main);
