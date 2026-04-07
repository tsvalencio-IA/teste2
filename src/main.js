/**
 * src/main.js
 * Ponto de entrada (Bootstrapper).
 * CORREÇÃO PERICIAL: Libertação da Rotação para o cliente explorar o modo 3D sem amarras.
 */

import { AppState } from './core/app-state.js';
import { StorageManager } from './core/storage-manager.js';
import { ThreeEngine } from './3d/three-engine.js';
import { SceneBuilder } from './3d/scene-builder.js';
import { BOMEngine } from './marcenaria/bom-engine.js';
import { CutPlanEngine } from './marcenaria/cut-plan-engine.js';
import { ExportEngine } from './marcenaria/export-engine.js';
import { OracleEngine } from './marcenaria/oracle-engine.js';
import { UIController } from './ui/ui-controller.js';
import { ApiService } from './ia/api-service.js';
import { AIService } from './ia/ai-service.js';

window.ExportEngine = ExportEngine;

window.App = {
    storage: StorageManager,
    ui: UIController,
    api: ApiService,
    bom: BOMEngine,
    ai: AIService,
    
    init: () => { 
        window.App.config.load(); 
        ThreeEngine.init(); 
        StorageManager.load();
        
        if(AppState.modules.length === 0) {
            window.App.modules.add('parede_otica', { 
                nome: "Expositor Mercadão", largura: 2000, altura: 2400, profundidade: 450, 
                portas: 0, gavetas: 3, layoutInterno: "apenas_gavetas", 
                material: 'mdf_branco_diamante', posY: 0 
            }); 
        } else {
            SceneBuilder.rebuildScene();
            UIController.renderList();
        }
        UIController.toast("Fábrica 3D Realista Iniciada! Projeto Recuperado.", "success"); 
    },
    
    processGlobalPhoto: (inputData) => { 
        let file = null;
        if (inputData && inputData.files && inputData.files.length > 0) {
            file = inputData.files[0];
        } else if (inputData && inputData.target && inputData.target.files && inputData.target.files.length > 0) {
            file = inputData.target.files[0];
        }
        
        if (!file) return;

        const r = new FileReader(); 
        r.onload = () => { 
            const base64Data = r.result;
            AppState.imagemFundoURL = base64Data; 
            AppState.imagemFundoBase64 = base64Data.split(',')[1]; 
            
            const imgPreview = document.getElementById('imagePreview'); 
            if(imgPreview) imgPreview.src = AppState.imagemFundoURL; 
            
            const previewContainer = document.getElementById('imgPreviewContainer'); 
            if(previewContainer) previewContainer.style.display = 'block'; 
            
            if (AppState.arActive) {
                ThreeEngine.setBackgroundImage(AppState.imagemFundoURL);
                const btnTxt = document.getElementById('arBtnText');
                if (btnTxt) btnTxt.innerText = 'Desativar Fundo Real'; 
                SceneBuilder.rebuildScene(); 
                UIController.fecharHUDs();
            }
            StorageManager.save();
            UIController.toast("Foto Carregada com Sucesso!", "success"); 
        }; 
        r.readAsDataURL(file);
    },

    modules: {
        add: (tipo, overrides = {}) => { 
            const id = Date.now().toString() + Math.floor(Math.random()*1000); 
            const mod = { 
                id, tipo, nome: OracleEngine.rules[tipo]?.label || "Móvel Universal", 
                largura: 1000, altura: 800, profundidade: 500, material: 'mdf_branco_diamante', 
                abertura: 'giro', formato: 'reto', portas: 2, gavetas: 0, prateleiras: 1, 
                prateleirasExternas: 0, layoutInterno: 'apenas_portas', dobradicaLado: 'esq', 
                ripadoFrontal: false, tampoVidro: false, compW: 0, compH: 0, compStates: {}, 
                frentesInternas: false, materiaisCustomizados: { frentes: {}, estrutura: {} }, 
                medidasCustomizadas: {}, posX: 0, posY: 0, posZ: 0, rotY: 0, removedParts: [], 
                ...overrides 
            }; 
            OracleEngine.validateAndFix(mod); 
            AppState.modules.push(mod); 
            window.App.modules.select(id); 
            window.App.modules.refreshAll(); 
            StorageManager.save(); 
        },
        addGeneric: () => { 
            UIController.fecharHUDs(); 
            window.App.modules.add('armario'); 
        },
        select: (id) => { 
            AppState.selectedModule = id; 
            ThreeEngine.highlightSelection(id); 
            UIController.renderList(); 
            const editor = document.getElementById('floatingEditor');
            if (id && editor && editor.classList.contains('active')) { 
                UIController.openLiveEditor(id); 
            } 
        },
        removeCurrent: () => { 
            let idToRem = AppState.selectedModule; 
            if (!idToRem) { 
                const el = document.getElementById('eId'); 
                if(el) idToRem = el.value; 
            } 
            if (!idToRem) return UIController.toast("Nenhum módulo selecionado.", "error"); 
            
            AppState.modules = AppState.modules.filter(m => m.id !== idToRem); 
            window.App.modules.select(null); 
            UIController.fecharEditor(); 
            window.App.modules.refreshAll(); 
            UIController.toast("Módulo removido.", "success"); 
            StorageManager.save(); 
        },
        refreshAll: () => { 
            SceneBuilder.rebuildScene(); 
            BOMEngine.update(); 
            UIController.renderList(); 
        },
        exportarProjeto: () => { 
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(AppState.modules, null, 2)); 
            const downloadAnchorNode = document.createElement('a'); 
            downloadAnchorNode.setAttribute("href", dataStr); 
            downloadAnchorNode.setAttribute("download", "projeto_marcenaria.json"); 
            document.body.appendChild(downloadAnchorNode); 
            downloadAnchorNode.click(); 
            downloadAnchorNode.remove(); 
            UIController.toast("Projeto exportado em JSON!", "success"); 
        },
        gerarPlanoCorte: () => { 
            CutPlanEngine.generate(); 
            const container = document.getElementById('cutPlanContainer');
            if (container) container.style.display = 'block'; 
            UIController.toast("Plano de Corte (Nesting) Gerado!"); 
        }
    },

    ar: {
        setModoCamera: (m) => { 
            AppState.tool = m; 
            const bO = document.getElementById('btnOrbit'); if(bO) bO.className = `tool-btn ${m==='orbit'?'active':''}`; 
            const bM = document.getElementById('btnMove'); if(bM) bM.className = `tool-btn ${m==='move'?'active':''}`; 
            const bA = document.getElementById('btnAddComp'); if(bA) bA.className = `tool-btn ${m==='add_comp'?'active':''}`; 
            const bR = document.getElementById('btnRemComp'); if(bR) bR.className = `tool-btn eraser ${m==='remove_part'?'active':''}`; 
        },
        setModoInteracao: (m) => { 
            AppState.modoInteracao = m; 
            const sP = document.getElementById('sw-peca'); if(sP) sP.className = `switch-btn ${m==='peca'?'active':''}`; 
            const sPr = document.getElementById('sw-projeto'); if(sPr) sPr.className = `switch-btn ${m==='projeto'?'active':''}`; 
        },
        syncRoomBounds: () => { 
            const elW = document.getElementById('roomW');
            const elD = document.getElementById('roomD');
            AppState.roomWidth = elW ? parseFloat(elW.value) || 4500 : 4500; 
            AppState.roomDepth = elD ? parseFloat(elD.value) || 8000 : 8000; 
            SceneBuilder.rebuildScene(); 
            StorageManager.save(); 
        },
        toggleAR: () => { 
            AppState.arActive = !AppState.arActive; 
            const txt = document.getElementById('arBtnText'); 
            if (AppState.arActive) { 
                if(AppState.imagemFundoURL) {
                    ThreeEngine.setBackgroundImage(AppState.imagemFundoURL);
                    if (txt) txt.innerText = 'Desativar Fundo Real'; 
                    SceneBuilder.rebuildScene();
                    UIController.toast("Fundo ativado. Ambiente Fotorrealista pronto!", "success"); 
                } else {
                    const fc = document.getElementById('fotoCliente');
                    if (fc) fc.click(); 
                }
            } else { 
                ThreeEngine.setBackgroundImage(null);
                if (txt) txt.innerText = 'Ativar Fundo Real'; 
                SceneBuilder.rebuildScene(); 
            } 
        },
        applyTransform: () => { 
            const elScale = document.getElementById('camScale');
            const elRotX = document.getElementById('camRotX');
            const elRotY = document.getElementById('camRotY');
            const elPosY = document.getElementById('camPosY');
            
            if (elScale && elScale.value) ThreeEngine.rootNode.scale.setScalar(parseFloat(elScale.value) || 1); 
            if (elRotX && elRotX.value) ThreeEngine.rootNode.rotation.x = parseFloat(elRotX.value) || 0; 
            if (elRotY && elRotY.value) ThreeEngine.rootNode.rotation.y = parseFloat(elRotY.value) || 0; 
            if (elPosY && elPosY.value) ThreeEngine.rootNode.position.y = parseFloat(elPosY.value) || 0; 
        },
        resetAR: () => { 
            ThreeEngine.rootNode.rotation.set(0,0,0); 
            ThreeEngine.rootNode.position.set(0,0,0); 
            ThreeEngine.rootNode.scale.setScalar(1); 
            
            const elScale = document.getElementById('camScale'); if(elScale) elScale.value = 1; 
            const elRotX = document.getElementById('camRotX'); if(elRotX) elRotX.value = 0; 
            const elRotY = document.getElementById('camRotY'); if(elRotY) elRotY.value = 0; 
            const elPosY = document.getElementById('camPosY'); if(elPosY) elPosY.value = 0; 
        },
        
        // MODO APRESENTAÇÃO PARA O CLIENTE
        enterPrintMode: () => { 
            UIController.fecharHUDs(); 
            UIController.fecharEditor(); 
            ['mainHeader','mainSignature','mainControls','toolModeContainer'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('hide-for-print');
            }); 
            const bEP = document.getElementById('btnExitPrint');
            if (bEP) bEP.style.display='block'; 
            
            // Tira a foto de fundo para o cliente "andar" no 3D
            if (ThreeEngine.scene) ThreeEngine.scene.background = null;
            
            // Câmera 100% livre para o cliente explorar a loja e abrir as gavetas
            ThreeEngine.controls.enableRotate = true; 
            ThreeEngine.controls.enablePan = true; 
            ThreeEngine.controls.enableZoom = true; 
        },
        exitPrintMode: () => { 
            ['mainHeader','mainSignature','mainControls','toolModeContainer'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.remove('hide-for-print');
            }); 
            const bEP = document.getElementById('btnExitPrint');
            if (bEP) bEP.style.display='none'; 
            
            // Traz a foto de volta
            if (ThreeEngine.scene && ThreeEngine.bgTexture) {
                ThreeEngine.scene.background = ThreeEngine.bgTexture;
            }
            
            ThreeEngine.controls.enableRotate = true; 
            ThreeEngine.controls.enablePan = true; 
            ThreeEngine.controls.enableZoom = true; 
        }
    },

    config: { 
        save: () => { 
            localStorage.setItem('ak_gemini_cad', AppState.apiKeys.gemini); 
            localStorage.setItem('ak_groq_cad', AppState.apiKeys.groq); 
        }, 
        load: () => { 
            const eG = document.getElementById('api-gemini'); 
            if (eG) eG.value = AppState.apiKeys.gemini; 
            const eQ = document.getElementById('api-groq'); 
            if (eQ) eQ.value = AppState.apiKeys.groq; 
        } 
    }
};

window.addEventListener('DOMContentLoaded', window.App.init);