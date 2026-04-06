/**
 * src/ui/ui-controller.js
 * Manipulador Global do DOM e Eventos do Editor.
 */

import { AppState } from '../core/app-state.js';
import { MatDefs } from '../3d/material-factory.js';
import { OracleEngine } from '../marcenaria/oracle-engine.js';
import { StorageManager } from '../core/storage-manager.js';

export const UIController = {
    toggleModal: (id) => { 
        const m = document.getElementById(id); 
        if(m) m.style.display = (m.style.display === 'flex') ? 'none' : 'flex'; 
    },
    abrirHUD: (id) => { 
        document.querySelectorAll('.bottom-sheet').forEach(s => s.classList.remove('active')); 
        document.getElementById(id).classList.add('active'); 
    },
    fecharHUDs: () => { 
        document.querySelectorAll('.bottom-sheet').forEach(s => s.classList.remove('active')); 
    },
    fecharEditor: () => { 
        document.getElementById('floatingEditor').classList.remove('active'); 
        window.App.modules.select(null); 
    },
    toast: (msg, type = 'info') => { 
        const t = document.getElementById('toast'); 
        document.getElementById('toastMessage').innerText = msg; 
        t.className = `show ${type}`; 
        setTimeout(() => t.className = '', 3500); 
    },
    showLoader: (msg) => { 
        document.getElementById('statusText').innerText = msg; 
        document.getElementById('statusOverlay').style.display = 'flex'; 
    }, 
    hideLoader: () => { 
        document.getElementById('statusOverlay').style.display = 'none'; 
    },
    renderList: () => { 
        const c = document.getElementById('listaModulosContainer'); 
        if (!c) return; 
        c.innerHTML = ''; 
        AppState.modules.forEach(m => { 
            const d = document.createElement('div'); 
            d.className = `module-card ${AppState.selectedModule===m.id?'selected':''}`; 
            d.onclick = () => { 
                window.App.modules.select(m.id); 
                UIController.fecharHUDs(); 
                UIController.openLiveEditor(m.id); 
            }; 
            
            // CORREÇÃO APLICADA AQUI: Remoção do Optional Chaining '?.label' para suporte universal.
            const matLabel = MatDefs[m.material] ? MatDefs[m.material].label : 'Material Padrão';
            
            d.innerHTML = `<h4>${m.nome}</h4><p>${m.largura}x${m.altura}x${m.profundidade}mm - Mat: ${matLabel}</p>`; 
            c.appendChild(d); 
        }); 
    },
    openLiveEditor: (id) => {
        const m = AppState.modules.find(x => x.id === id); 
        if (!m) return; 
        
        const elId = document.getElementById('eId'); 
        if (elId) elId.value = m.id;
        
        const props = ['tipo','formato','layoutInterno','dobradicaLado','material','abertura','largura','altura','profundidade','retornoL','portas','gavetas','prateleiras','prateleirasExternas','compW','compH','posX','posY','posZ','rotY'];
        const keys = ['eT','eFormato','eLayoutInt','eDobradica','eMat','eA','eL','eAl','eP','eRetL','ePo','eG','ePr','ePratExt','eCompW','eCompH','ePx','ePy','ePz','eRy'];
        
        keys.forEach((k, i) => { 
            const el = document.getElementById(k); 
            if (el) el.value = m[props[i]] !== undefined ? m[props[i]] : (['eT','eFormato','eLayoutInt','eDobradica','eMat','eA'].includes(k) ? '' : 0); 
        });
        
        const chkR = document.getElementById('eRipado'); if (chkR) chkR.checked = m.ripadoFrontal; 
        const chkV = document.getElementById('eVidro'); if (chkV) chkV.checked = m.tampoVidro; 
        const chkInternas = document.getElementById('eFrentesInternas'); if (chkInternas) chkInternas.checked = m.frentesInternas;
        
        const custContainer = document.getElementById('customFrentesContainer');
        if (custContainer) {
            custContainer.innerHTML = ''; let html = '';
            
            const addField = (key, label) => { 
                const w = m.medidasCustomizadas?.[key]?.w || ''; 
                const h = m.medidasCustomizadas?.[key]?.h || ''; 
                const mat = m.materiaisCustomizados?.frentes?.[key] || ''; 
                let matOpts = `<option value="">-- Cor Padrão --</option>`; 
                Object.keys(MatDefs).forEach(k => { 
                    matOpts += `<option value="${k}" ${mat===k?'selected':''}>${MatDefs[k].label}</option>`; 
                }); 
                html += `<div style="margin-bottom:10px; padding:10px; background:#fff; border:1px solid #ccc; border-radius:4px;"><div style="font-weight:900; font-size:0.8rem; margin-bottom:8px; text-transform:uppercase; color:var(--primary-dark);">${label}</div><div style="display:flex; gap:10px; margin-bottom:8px;"><input type="number" id="custW_${key}" placeholder="Largura (mm)" value="${w}" style="flex:1; padding:8px; font-size:0.8rem; border:1px solid #ccc; border-radius:3px;" onchange="window.App.ui.syncCustom('${key}')"><input type="number" id="custH_${key}" placeholder="Altura (mm)" value="${h}" style="flex:1; padding:8px; font-size:0.8rem; border:1px solid #ccc; border-radius:3px;" onchange="window.App.ui.syncCustom('${key}')"></div><select id="custM_${key}" style="width:100%; padding:8px; font-size:0.8rem; border:1px solid #ccc; border-radius:3px;" onchange="window.App.ui.syncCustom('${key}')">${matOpts}</select></div>`; 
            };
            
            for (let i = 0; i < m.gavetas; i++) addField(`gaveta_${i}`, `Gaveta ${i+1}`); 
            for (let i = 0; i < m.portas; i++) addField(`porta_${i}`, `Porta ${i+1}`); 
            if (m.layoutInterno === 'ilha_dupla') { 
                for (let i = 0; i < m.portas; i++) addField(`porta_tras_${i}`, `Porta Traseira ${i+1}`); 
            }
            
            html += `<div style="font-weight:900; font-size:0.85rem; color:var(--secondary-wood); margin:15px 0 10px 0; border-top: 2px dashed #ccc; padding-top:15px;">CORES DA CAIXARIA</div>`;
            const parts = ['teto', 'base', 'lateralEsq', 'lateralDir', 'fundo']; 
            const partLabels = ['Teto / Tampo', 'Base / Chão', 'Lateral Esquerda', 'Lateral Direita', 'Fundo (Costas)'];
            
            parts.forEach((p, idx) => { 
                const pMat = m.materiaisCustomizados?.estrutura?.[p] || ''; 
                let popts = `<option value="">-- Cor Padrão --</option>`; 
                Object.keys(MatDefs).forEach(k => popts += `<option value="${k}" ${pMat===k?'selected':''}>${MatDefs[k].label}</option>`); 
                html += `<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;"><span style="font-size:0.8rem; font-weight:700;">${partLabels[idx]}</span><select id="custE_${p}" style="width:160px; padding:6px; font-size:0.75rem; border:1px solid #ccc; border-radius:3px;" onchange="window.App.ui.syncCustomStruct('${p}')">${popts}</select></div>`; 
            }); 
            custContainer.innerHTML = html;
        } 
        document.getElementById('floatingEditor').classList.add('active');
    },
    syncCustom: (key) => { 
        const elId = document.getElementById('eId'); if (!elId) return; 
        const m = AppState.modules.find(x => x.id === elId.value); if (!m) return; 
        
        if (!m.medidasCustomizadas) m.medidasCustomizadas = {}; 
        if (!m.materiaisCustomizados) m.materiaisCustomizados = { frentes:{}, estrutura:{} }; 
        
        const w = parseFloat(document.getElementById(`custW_${key}`).value) || 0; 
        const h = parseFloat(document.getElementById(`custH_${key}`).value) || 0; 
        const mat = document.getElementById(`custM_${key}`).value; 
        
        if (w > 0 || h > 0) m.medidasCustomizadas[key] = { w, h }; else delete m.medidasCustomizadas[key]; 
        if (mat) m.materiaisCustomizados.frentes[key] = mat; else delete m.materiaisCustomizados.frentes[key]; 
        
        window.App.modules.refreshAll(); 
        StorageManager.save(); 
    },
    syncCustomStruct: (part) => { 
        const elId = document.getElementById('eId'); if (!elId) return; 
        const m = AppState.modules.find(x => x.id === elId.value); if (!m) return; 
        
        if (!m.materiaisCustomizados) m.materiaisCustomizados = { frentes:{}, estrutura:{} }; 
        
        const mat = document.getElementById(`custE_${part}`).value; 
        if (mat) m.materiaisCustomizados.estrutura[part] = mat; else delete m.materiaisCustomizados.estrutura[part]; 
        
        window.App.modules.refreshAll(); 
        StorageManager.save(); 
    },
    syncToState: () => {
        const elId = document.getElementById('eId'); if (!elId) return; 
        const m = AppState.modules.find(x => x.id === elId.value); if (!m) return;
        
        const props = ['tipo','formato','layoutInterno','dobradicaLado','material','abertura','largura','altura','profundidade','retornoL','portas','gavetas','prateleiras','prateleirasExternas','compW','compH','posX','posY','posZ','rotY'];
        const keys = ['eT','eFormato','eLayoutInt','eDobradica','eMat','eA','eL','eAl','eP','eRetL','ePo','eG','ePr','ePratExt','eCompW','eCompH','ePx','ePy','ePz','eRy'];
        
        keys.forEach((k, i) => { 
            const el = document.getElementById(k); 
            if (el) m[props[i]] = ['eT','eFormato','eLayoutInt','eDobradica','eMat','eA'].includes(k) ? el.value : parseFloat(el.value)||0; 
        });
        
        const chkR = document.getElementById('eRipado'); if(chkR) m.ripadoFrontal = chkR.checked; 
        const chkV = document.getElementById('eVidro'); if(chkV) m.tampoVidro = chkV.checked; 
        const chkInternas = document.getElementById('eFrentesInternas'); if(chkInternas) m.frentesInternas = chkInternas.checked;
        
        OracleEngine.validateAndFix(m); 
        window.App.modules.refreshAll(); 
        UIController.openLiveEditor(m.id); 
        StorageManager.save();
    },
    syncToStateNoRebuild: () => { 
        const elId = document.getElementById('eId'); if (!elId) return; 
        const m = AppState.modules.find(x => x.id === elId.value); if (!m) return; 
        
        const pxEl = document.getElementById('ePx'); if (pxEl) pxEl.value = m.posX; 
        const pzEl = document.getElementById('ePz'); if (pzEl) pzEl.value = m.posZ; 
        const ryEl = document.getElementById('eRy'); if(ryEl) ryEl.value = m.rotY; 
        const pyEl = document.getElementById('ePy'); if(pyEl) pyEl.value = m.posY; 
        
        StorageManager.save(); 
    }
};
