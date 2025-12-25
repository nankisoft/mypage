
const STATE_EMPTY = 0;
const STATE_BLACK = 1;
const STATE_WHITE = 2; // White with dot/marker

let currentPuzzleData = null;
let currentGameState = []; // 2D array
let puzzleList = [];

const boardEl = document.getElementById('board');
const selectEl = document.getElementById('puzzle-select');
const loadBtn = document.getElementById('load-btn');
const checkBtn = document.getElementById('check-btn');
const showSolBtn = document.getElementById('show-solution-btn');
const messageEl = document.getElementById('message');
const solutionContainer = document.getElementById('solution-container');

// --- 初期化処理 ---
async function init() {
    try {
        const response = await fetch('./puzzles/index.json');
        if (!response.ok) throw new Error("パズルリストが見つかりません。'puzzles/index.json' が存在するか確認してください。");
        puzzleList = await response.json();

        if (puzzleList.length === 0) {
            messageEl.textContent = "インデックスに問題が含まれていません。";
            return;
        }

        // IDでソート（Python側でソート済みと仮定）
        puzzleList.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = `問題 ${p.id}`;
            selectEl.appendChild(opt);
        });

        // 最初の問題を自動読み込み
        loadPuzzle(puzzleList[0].id);

    } catch (e) {
        console.error(e);
        messageEl.textContent = "リスト読み込みエラー: " + e.message;
    }
}

// --- パズル読み込み ---
async function loadPuzzle(id) {
    try {
        messageEl.textContent = "読み込み中...";
        solutionContainer.innerHTML = ''; // 解答画像をクリア
        solutionContainer.style.display = 'none';

        const response = await fetch(`./puzzles/problem_${id}.json`);
        if (!response.ok) throw new Error("問題ファイルの読み込みに失敗しました。");

        currentPuzzleData = await response.json();
        resetGame();
        renderBoard();
        messageEl.textContent = "";
    } catch (e) {
        console.error(e);
        messageEl.textContent = "エラー: " + e.message;
    }
}

function resetGame() {
    if (!currentPuzzleData) return;
    const { width, height } = currentPuzzleData;
    currentGameState = Array.from({ length: height }, () => Array(width).fill(STATE_EMPTY));
}

// --- 盤面描画 ---
function renderBoard() {
    if (!currentPuzzleData) return;
    const { width, height, rooms, clues } = currentPuzzleData;

    boardEl.innerHTML = '';
    boardEl.style.gridTemplateColumns = `repeat(${width}, 1fr)`;

    // 部屋の配置に基づいて、各セルの境界線を決定する
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cell = document.createElement('div');
            cell.dataset.x = x;
            cell.dataset.y = y;
            cell.className = 'cell';

            // 部屋の境界線（太線）
            const roomId = rooms[y][x];
            // 上
            if (y === 0 || rooms[y - 1][x] !== roomId) cell.classList.add('border-top');
            // 下
            if (y === height - 1 || rooms[y + 1][x] !== roomId) cell.classList.add('border-bottom');
            // 左
            if (x === 0 || rooms[y][x - 1] !== roomId) cell.classList.add('border-left');
            // 右
            if (x === width - 1 || rooms[y][x + 1] !== roomId) cell.classList.add('border-right');

            // 数字ヒントの描画
            // その部屋の左上セルかどうか判定（Python側のロジックと一致させる）
            const isTop = (y === 0 || rooms[y - 1][x] !== roomId);
            const isLeft = (x === 0 || rooms[y][x - 1] !== roomId);

            if (isTop && isLeft && clues[String(roomId)] !== undefined) {
                const clueSpan = document.createElement('span');
                clueSpan.className = 'clue-text';
                clueSpan.textContent = clues[String(roomId)];
                cell.appendChild(clueSpan);
            }

            // クリックイベント
            cell.onclick = () => onCellClick(x, y);

            updateCellView(cell, x, y);
            boardEl.appendChild(cell);
        }
    }
}

function updateCellView(cell, x, y) {
    const state = currentGameState[y][x];
    cell.classList.remove('state-black', 'state-white');
    if (state === STATE_BLACK) {
        cell.classList.add('state-black');
    } else if (state === STATE_WHITE) {
        cell.classList.add('state-white');
    }
}

function onCellClick(x, y) {
    // サイクル: 空白 -> 黒 -> 白 -> 空白
    let s = currentGameState[y][x];
    if (s === STATE_EMPTY) s = STATE_BLACK;
    else if (s === STATE_BLACK) s = STATE_WHITE;
    else s = STATE_EMPTY;

    currentGameState[y][x] = s;

    // DOM要素を更新（都度検索は非効率だが規模的に問題なし）
    const cell = boardEl.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
    if (cell) updateCellView(cell, x, y);
}

// --- 正誤判定 ---
function checkAnswer() {
    if (!currentPuzzleData || !currentPuzzleData.solution) return;
    const { solution, width, height } = currentPuzzleData;

    let isCorrect = true;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const userBlack = (currentGameState[y][x] === STATE_BLACK);
            const solBlack = (solution[y][x] === 1);
            if (userBlack !== solBlack) {
                isCorrect = false;
                break;
            }
        }
        if (!isCorrect) break;
    }

    if (isCorrect) {
        messageEl.className = 'msg-success';
        messageEl.textContent = "正解です！おめでとうございます！";
    } else {
        messageEl.className = 'msg-error';
        messageEl.textContent = "不正解です。もう一度確認してください。";
    }
}

// --- 解答表示 ---
function showSolution() {
    if (!currentPuzzleData) return;
    const id = currentPuzzleData.id;

    // 既に表示されている場合はトグル（非表示）
    if (solutionContainer.innerHTML !== '') {
        solutionContainer.innerHTML = '';
        solutionContainer.style.display = 'none';
        return;
    }

    const img = document.createElement('img');
    img.src = `./puzzles/solution_${id}.png`;
    img.alt = "Solution";
    img.style.maxWidth = "100%";
    img.style.border = "2px solid #333";
    img.style.marginTop = "20px";

    solutionContainer.appendChild(img);
    solutionContainer.style.display = 'block';
}

// --- イベントリスナー ---
loadBtn.addEventListener('click', () => {
    const id = selectEl.value;
    loadPuzzle(id);
});

checkBtn.addEventListener('click', checkAnswer);
showSolBtn.addEventListener('click', showSolution);

// 開始
init();
