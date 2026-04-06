/**
 * src/main.js
 * Ponto de entrada (Bootstrapper). Orquestra os módulos e os expõe ao HTML.
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
    
    processGlobalPhoto: (input) => { 
        if (input.files && input.files[0]) { 
            const f = input.files[0]; 
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
                    const container = document.getElementById('canvas-container'); 
                    container.style.backgroundImage = `url(${AppState.imagemFundoURL})`; 
                    container.style.backgroundSize = 'cover'; 
                    container.style.backgroundPosition = 'center'; 
                    document.getElementById('arBtnText').innerText = 'Desativar Fundo Real'; 
                    SceneBuilder.rebuildScene(); 
                    UIController.fecharHUDs();
                }
                StorageManager.save();
                UIController.toast("Foto Carregada e Guardada!", "success"); 
            }; 
            r.readAsDataURL(f);
        } 
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
            if (id && document.getElementById('floatingEditor').classList.contains('active')) { 
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
            document.getElementById('cutPlanContainer').style.display = 'block'; 
            UIController.toast("Plano de Corte (Nesting) Gerado!"); 
        }
    },

    ar: {
        setModoCamera: (m) => { 
            AppState.tool = m; 
            document.getElementById('btnOrbit').className = `tool-btn ${m==='orbit'?'active':''}`; 
            document.getElementById('btnMove').className = `tool-btn ${m==='move'?'active':''}`; 
            const btnAdd = document.getElementById('btnAddComp'); 
            if (btnAdd) btnAdd.className = `tool-btn ${m==='add_comp'?'active':''}`; 
            const btnRm = document.getElementById('btnRemComp'); 
            if(btnRm) btnRm.className = `tool-btn eraser ${m==='remove_part'?'active':''}`; 
        },
        setModoInteracao: (m) => { 
            AppState.modoInteracao = m; 
            document.getElementById('sw-peca').className = `switch-btn ${m==='peca'?'active':''}`; 
            document.getElementById('sw-projeto').className = `switch-btn ${m==='projeto'?'active':''}`; 
        },
        syncRoomBounds: () => { 
            AppState.roomWidth = parseFloat(document.getElementById('roomW').value) || 4500; 
            AppState.roomDepth = parseFloat(document.getElementById('roomD').value) || 8000; 
            SceneBuilder.rebuildScene(); 
            StorageManager.save(); 
        },
        toggleAR: () => { 
            AppState.arActive = !AppState.arActive; 
            const container = document.getElementById('canvas-container'); 
            const txt = document.getElementById('arBtnText'); 
            if (AppState.arActive) { 
                if(AppState.imagemFundoURL) {
                    container.style.backgroundImage = `url(${AppState.imagemFundoURL})`; 
                    container.style.backgroundSize = 'cover'; 
                    container.style.backgroundPosition = 'center'; 
                    if (txt) txt.innerText = 'Desativar Fundo Real'; 
                    SceneBuilder.rebuildScene();
                    UIController.toast("Fundo ativado. Ajuste a Caixa Azul nas paredes!", "success"); 
                } else {
                    document.getElementById('fotoCliente').click(); 
                }
            } else { 
                container.style.background = 'radial-gradient(circle, #ffffff 0%, #cbd5e1 100%)'; 
                container.style.backgroundImage = 'none'; 
                if (txt) txt.innerText = 'Ativar Fundo Real'; 
                SceneBuilder.rebuildScene(); 
            } 
        },
        applyTransform: () => { 
            const s = parseFloat(document.getElementById('camScale').value); 
            ThreeEngine.rootNode.scale.set(s, s, s); 
            ThreeEngine.rootNode.rotation.x = parseFloat(document.getElementById('camRotX').value); 
            ThreeEngine.rootNode.rotation.y = parseFloat(document.getElementById('camRotY').value); 
            ThreeEngine.rootNode.position.y = parseFloat(document.getElementById('camPosY').value); 
        },
        resetAR: () => { 
            ThreeEngine.rootNode.rotation.set(0,0,0); 
            ThreeEngine.rootNode.position.set(0,0,0); 
            ThreeEngine.rootNode.scale.set(1,1,1); 
            document.getElementById('camScale').value = 1; 
            document.getElementById('camRotX').value = 0; 
            document.getElementById('camRotY').value = 0; 
            document.getElementById('camPosY').value = 0; 
        },
        enterPrintMode: () => { 
            UIController.fecharHUDs(); 
            UIController.fecharEditor(); 
            ['mainHeader','mainSignature','mainControls','toolModeContainer'].forEach(id => document.getElementById(id).classList.add('hide-for-print')); 
            document.getElementById('btnExitPrint').style.display='block'; 
            ThreeEngine.controls.enableRotate = false; 
            ThreeEngine.controls.enablePan = false; 
            ThreeEngine.controls.enableZoom = false; 
        },
        exitPrintMode: () => { 
            ['mainHeader','mainSignature','mainControls','toolModeContainer'].forEach(id => document.getElementById(id).classList.remove('hide-for-print')); 
            document.getElementById('btnExitPrint').style.display='none'; 
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
