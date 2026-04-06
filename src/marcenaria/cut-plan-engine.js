/**
 * src/marcenaria/cut-plan-engine.js
 * Algoritmo 2D Nesting para otimização de corte (Bin Packing).
 */

import { AppState } from '../core/app-state.js';

export const CutPlanEngine = {
    boardW: 2750, 
    boardH: 1850,
    generate: () => {
        const parts = [...AppState.cutParts].sort((a, b) => (b.w * b.h) - (a.w * a.h));
        const boards = []; 
        let currentBoard = { x: 0, y: 0, w: CutPlanEngine.boardW, h: CutPlanEngine.boardH, parts: [] }; 
        boards.push(currentBoard);
        
        parts.forEach(p => {
            let placed = false;
            for(let b of boards) {
                let rects = CutPlanEngine.findFreeRects(b);
                for(let r of rects) {
                    if (r.w >= p.w && r.h >= p.h) { 
                        b.parts.push({ x: r.x, y: r.y, w: p.w, h: p.h, label: p.label }); placed = true; break; 
                    } 
                    else if (r.w >= p.h && r.h >= p.w) { 
                        b.parts.push({ x: r.x, y: r.y, w: p.h, h: p.w, label: p.label }); placed = true; break; 
                    }
                } 
                if(placed) break;
            }
            if(!placed) { 
                let newBoard = { x: 0, y: 0, w: CutPlanEngine.boardW, h: CutPlanEngine.boardH, parts: [] }; 
                newBoard.parts.push({ x: 0, y: 0, w: p.w, h: p.h, label: p.label }); 
                boards.push(newBoard); 
            }
        });
        CutPlanEngine.render(boards);
    },
    findFreeRects: (board) => {
        let free = [{x:0, y:0, w:board.w, h:board.h}];
        for(let p of board.parts) {
            let nextFree = [];
            for(let f of free) {
                if (p.x >= f.x + f.w || p.x + p.w <= f.x || p.y >= f.y + f.h || p.y + p.h <= f.y) { 
                    nextFree.push(f); 
                } else {
                    if (p.x > f.x) nextFree.push({x: f.x, y: f.y, w: p.x - f.x, h: f.h});
                    if (p.x + p.w < f.x + f.w) nextFree.push({x: p.x + p.w, y: f.y, w: f.x + f.w - (p.x + p.w), h: f.h});
                    if (p.y > f.y) nextFree.push({x: f.x, y: f.y, w: f.w, h: p.y - f.y});
                    if (p.y + p.h < f.y + f.h) nextFree.push({x: f.x, y: p.y + p.h, w: f.w, h: f.y + f.h - (p.y + p.h)});
                }
            } 
            free = nextFree;
        } 
        return free.sort((a,b) => (b.w*b.h) - (a.w*a.h));
    },
    render: (boards) => {
        const container = document.getElementById('cutPlanContainer'); 
        container.innerHTML = `<h4 style="color:var(--primary-dark); font-size: 0.9rem; margin-bottom: 10px;">Chapas MDF Necessárias: ${boards.length}</h4>`;
        const scale = 0.1;
        boards.forEach((b, i) => {
            let div = document.createElement('div'); 
            div.className = 'cut-board'; 
            div.style.width = (b.w * scale) + 'px'; 
            div.style.height = (b.h * scale) + 'px'; 
            div.style.border = '1px solid #ccc'; 
            div.style.position = 'relative'; 
            div.style.marginBottom = '10px'; 
            div.style.background = '#e5e5e5';
            
            b.parts.forEach(p => { 
                let pDiv = document.createElement('div'); 
                pDiv.style.position = 'absolute'; 
                pDiv.style.background = '#D4AF37'; 
                pDiv.style.border = '1px solid #fff'; 
                pDiv.style.fontSize = '8px'; 
                pDiv.style.display = 'flex'; 
                pDiv.style.alignItems = 'center'; 
                pDiv.style.justifyContent = 'center'; 
                pDiv.style.color = '#fff'; 
                pDiv.style.left = (p.x * scale) + 'px'; 
                pDiv.style.top = (p.y * scale) + 'px'; 
                pDiv.style.width = (p.w * scale) + 'px'; 
                pDiv.style.height = (p.h * scale) + 'px'; 
                pDiv.innerText = `${p.w}x${p.h}`; 
                div.appendChild(pDiv); 
            });
            container.appendChild(div);
        });
        AppState.currentBoards = boards; 
    }
};
