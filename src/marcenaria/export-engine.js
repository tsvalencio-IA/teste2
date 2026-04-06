/**
 * src/marcenaria/export-engine.js
 * Exportador Vetorial DXF das Chapas.
 */

import { AppState } from '../core/app-state.js';
import { CutPlanEngine } from './cut-plan-engine.js';

export const ExportEngine = {
    exportDXF: () => {
        if(!AppState.currentBoards || AppState.currentBoards.length === 0) { 
            return window.App.ui.toast("Gere o Plano de Corte primeiro.", "warning"); 
        }
        
        let dxf = `0\nSECTION\n2\nENTITIES\n`;
        AppState.currentBoards.forEach((b, i) => {
            let offsetX = i * (CutPlanEngine.boardW + 500);
            b.parts.forEach(p => { 
                let x1 = offsetX + p.x, y1 = p.y, x2 = offsetX + p.x + p.w, y2 = p.y + p.h; 
                dxf += `0\nLWPOLYLINE\n8\nCorte\n90\n4\n70\n1\n10\n${x1}\n20\n${y1}\n10\n${x2}\n20\n${y1}\n10\n${x2}\n20\n${y2}\n10\n${x1}\n20\n${y2}\n`; 
            });
        });
        dxf += `0\nENDSEC\n0\nEOF\n`;
        
        const blob = new Blob([dxf], {type: "text/plain"}); 
        const a = document.createElement('a'); 
        a.href = URL.createObjectURL(blob); 
        a.download = "projeto_corte.dxf"; 
        a.click(); 
        window.App.ui.toast("DXF Exportado!");
    }
};
