// viewer.js - minimal viewer for puzzles/*.json
const PUZZLE_DIR = "./puzzles/";
const SELECT = document.getElementById("puzzle-select");
const LOAD_BTN = document.getElementById("load-btn");
const BOARD_DIV = document.getElementById("board");
const CHECK_BTN = document.getElementById("check-btn");
const SHOW_SOL_BTN = document.getElementById("show-solution-btn");

async function listPuzzles() {
    // naive: try to fetch /puzzles/index.json if exists; otherwise try 001..020
    try {
        const idx = await (await fetch(PUZZLE_DIR + "index.json")).json();
        return idx.files;
    } catch (e) {
        // fallback
        const arr = [];
        for (let i = 1; i <= 20; i++) {
            const name = String(i).padStart(3, "0") + ".json";
            try {
                const r = await fetch(PUZZLE_DIR + name, { method: "HEAD" });
                if (r.ok) arr.push(name);
            } catch (e) { }
        }
        return arr;
    }
}

function makeOption(name) { const o = document.createElement("option"); o.value = name; o.textContent = name; return o; }

async function loadAndRender(name) {
    const res = await fetch(PUZZLE_DIR + name);
    if (!res.ok) { alert("Failed to load " + name); return; }
    const data = await res.json();
    renderBoard(data);
}

function renderBoard(data) {
    BOARD_DIV.innerHTML = "";
    const rows = data.rows, cols = data.cols;
    const rooms = data.rooms;
    const clues = data.clues || {};
    const solution = data.solution;
    // create state (user)
    const state = Array.from({ length: rows }, () => Array(cols).fill(0)); // 0 white, 1 black
    const svgNS = "http://www.w3.org/2000/svg";
    const size = Math.min(36, Math.floor(600 / Math.max(rows, cols)));
    const w = cols * size, h = rows * size;
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", w);
    svg.setAttribute("height", h);
    svg.style.border = "1px solid #aaa";

    // draw cells
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const rect = document.createElementNS(svgNS, "rect");
            rect.setAttribute("x", c * size);
            rect.setAttribute("y", r * size);
            rect.setAttribute("width", size);
            rect.setAttribute("height", size);
            rect.setAttribute("fill", "#fff");
            rect.setAttribute("stroke", "#ccc");
            rect.classList.add("cell");
            rect.dataset.r = r; rect.dataset.c = c;
            rect.addEventListener("click", () => {
                state[r][c] = 1 - state[r][c];
                rect.setAttribute("fill", state[r][c] === 1 ? "#333" : "#fff");
            });
            svg.appendChild(rect);
        }
    }

    // draw bold room borders (simple approach: draw lines between cells where room differs)
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const id = rooms[r][c];
            // right border
            if (c + 1 < cols && rooms[r][c + 1] !== id) {
                const line = document.createElementNS(svgNS, "line");
                line.setAttribute("x1", (c + 1) * size); line.setAttribute("y1", r * size);
                line.setAttribute("x2", (c + 1) * size); line.setAttribute("y2", (r + 1) * size);
                line.setAttribute("stroke", "#000"); line.setAttribute("stroke-width", "3");
                svg.appendChild(line);
            }
            // bottom border
            if (r + 1 < rows && rooms[r + 1][c] !== id) {
                const line = document.createElementNS(svgNS, "line");
                line.setAttribute("x1", c * size); line.setAttribute("y1", (r + 1) * size);
                line.setAttribute("x2", (c + 1) * size); line.setAttribute("y2", (r + 1) * size);
                line.setAttribute("stroke", "#000"); line.setAttribute("stroke-width", "3");
                svg.appendChild(line);
            }
            // outer borders
            if (r === 0) {
                const line = document.createElementNS(svgNS, "line");
                line.setAttribute("x1", c * size); line.setAttribute("y1", 0);
                line.setAttribute("x2", (c + 1) * size); line.setAttribute("y2", 0);
                line.setAttribute("stroke", "#000"); line.setAttribute("stroke-width", "3");
                svg.appendChild(line);
            }
            if (c === 0) {
                const line = document.createElementNS(svgNS, "line");
                line.setAttribute("x1", 0); line.setAttribute("y1", r * size);
                line.setAttribute("x2", 0); line.setAttribute("y2", (r + 1) * size);
                line.setAttribute("stroke", "#000"); line.setAttribute("stroke-width", "3");
                svg.appendChild(line);
            }
        }
    }

    // draw clues (room-centered if cell is top-left of room)
    const roomPositions = {};
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const id = rooms[r][c];
            if (!(id in roomPositions)) roomPositions[id] = { r, c };
            else {
                // prefer top-left
                const cur = roomPositions[id];
                if (r < cur.r || (r === cur.r && c < cur.c)) roomPositions[id] = { r, c };
            }
        }
    }
    for (const [rid, pos] of Object.entries(roomPositions)) {
        const cl = clues[rid];
        if (cl === null || cl === undefined) continue;
        const tx = pos.c * size + 4;
        const ty = pos.r * size + 12;
        const t = document.createElementNS(svgNS, "text");
        t.setAttribute("x", tx); t.setAttribute("y", ty);
        t.textContent = String(cl);
        t.classList.add("clue");
        svg.appendChild(t);
    }

    BOARD_DIV.appendChild(svg);

    // attach check/solution handlers
    CHECK_BTN.onclick = () => {
        let ok = true;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if ((state[r][c] === 1 ? 1 : 0) !== (solution[r][c] === 1 ? 1 : 0)) {
                    ok = false; break;
                }
            }
            if (!ok) break;
        }
        if (ok) alert("正解！ 🎉");
        else alert("まだ違います。");
    };

    SHOW_SOL_BTN.onclick = () => {
        // fill according to solution
        const rects = svg.querySelectorAll("rect.cell");
        rects.forEach(rect => {
            const r = +rect.dataset.r, c = +rect.dataset.c;
            rect.setAttribute("fill", solution[r][c] == 1 ? "#333" : "#fff");
            state[r][c] = solution[r][c] == 1 ? 1 : 0;
        });
    };
}

// load puzzle list and populate select
(async () => {
    const files = await listPuzzles();
    SELECT.innerHTML = "";
    files.forEach(f => SELECT.appendChild(makeOption(f)));
})();

LOAD_BTN.onclick = () => {
    const name = SELECT.value;
    if (!name) { alert("問題を選んでね"); return; }
    loadAndRender(name);
};
