/**
 * src/ia/ai-service.js
 * Integração Multimodal: Gemini 2.5 Flash (Visão/JSON) e Groq Whisper (Áudio).
 */

import { AppState } from '../core/app-state.js';
import { LayoutEngine } from '../layout/layout-engine.js';
import { StorageManager } from '../core/storage-manager.js';

export const AIService = {
    toggleRecording: async () => { 
        if (!AppState.apiKeys.groq) { 
            window.App.ui.toggleModal('modalSettings'); 
            return window.App.ui.toast("Configure a chave Groq."); 
        } 
        
        const btn = document.getElementById('btnRecord'); 
        
        if (AppState.mediaRecorder && AppState.mediaRecorder.state !== "inactive") { 
            AppState.mediaRecorder.stop(); 
            btn.classList.remove('recording'); 
            btn.innerHTML = "<i class='fas fa-microphone'></i> Gravar Voz"; 
        } else { 
            try { 
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); 
                AppState.mediaRecorder = new MediaRecorder(stream); 
                AppState.mediaRecorder.ondataavailable = e => AppState.audioChunks.push(e.data); 
                AppState.mediaRecorder.onstop = () => AIService.processAudioBlob(new Blob(AppState.audioChunks, { type: 'audio/webm' })); 
                AppState.audioChunks = []; 
                AppState.mediaRecorder.start(); 
                btn.classList.add('recording'); 
                btn.innerHTML = "<i class='fas fa-stop'></i> Escutando..."; 
            } catch(e) { 
                window.App.ui.toast("Permissão de Microfone negada."); 
            } 
        } 
    },
    
    uploadAudio: (input) => { 
        if(input.files[0]) AIService.processAudioBlob(input.files[0]); 
    },
    
    processAudioBlob: async (blob) => { 
        window.App.ui.showLoader("Transcrevendo Áudio (Whisper)..."); 
        const fd = new FormData(); 
        fd.append("file", new File([blob], "audio.webm")); 
        fd.append("model", "whisper-large-v3"); 
        
        try { 
            const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", { 
                method: "POST", 
                headers: { "Authorization": `Bearer ${AppState.apiKeys.groq}` }, 
                body: fd 
            }); 
            const data = await res.json(); 
            if (data.text) { 
                AppState.transcricaoAtual = data.text; 
                document.getElementById('transcriptionText').innerText = `"${data.text}"`; 
                window.App.ui.toast("Áudio interpretado com sucesso."); 
            } 
        } catch(e) { 
            window.App.ui.toast("Erro na API Whisper."); 
        } finally { 
            window.App.ui.hideLoader(); 
        } 
    },
    
    generateWithOracle: async () => { 
        const txt = document.getElementById('textoAdicional').value.toLowerCase(); 
        window.App.ui.showLoader("Oráculo: Projetando Realismo do Mercadão...");
        
        setTimeout(async () => {
            let interceptado = false; 
            let baseModules = []; 
            let modsIntercept = [];
            
            // Regras Fixas de Geração Estruturada (Fallbacks)
            if (txt.includes('mercadão') || txt.includes('mercadao') || txt.includes('loja completa')) {
                baseModules = [
                    { tipo: "parede_otica", nome: "Expositor Esq 1 (Mdo)", largura: 2000, altura: 2400, profundidade: 450, material: "mdf_branco_diamante", prateleiras: 5, gavetas: 4 },
                    { tipo: "parede_otica", nome: "Expositor Esq 2 (Mdo)", largura: 2000, altura: 2400, profundidade: 450, material: "mdf_branco_diamante", prateleiras: 5, gavetas: 4 },
                    { tipo: "parede_otica", nome: "Expositor Dir 1 (Mdo)", largura: 2000, altura: 2400, profundidade: 450, material: "mdf_branco_diamante", prateleiras: 5, gavetas: 4 },
                    { tipo: "parede_otica", nome: "Expositor Dir 2 (Mdo)", largura: 2000, altura: 2400, profundidade: 450, material: "mdf_branco_diamante", prateleiras: 5, gavetas: 4 },
                    { tipo: "balcao_mercadao", nome: "Balcão Caixa Principal", largura: 2000, altura: 1100, profundidade: 500, material: "mdf_vermelho_mercadao", portas: 4, gavetas: 4, layoutInterno: "top_drawers" },
                    { tipo: "mesa_atendimento_mercadao", nome: "Mesa Atendimento 1", largura: 1200, altura: 750, profundidade: 700, material: "mdf_azul_mercadao" },
                    { tipo: "cadeira", nome: "Cadeira Cliente 1", largura: 450, altura: 900, profundidade: 500, material: "mdf_branco_diamante" },
                    { tipo: "mesa_atendimento_mercadao", nome: "Mesa Atendimento 2", largura: 1200, altura: 750, profundidade: 700, material: "mdf_azul_mercadao" },
                    { tipo: "cadeira", nome: "Cadeira Cliente 2", largura: 450, altura: 900, profundidade: 500, material: "mdf_branco_diamante" },
                    { tipo: "totem_iluminado_otica", nome: "Totem Publicitário (Vitrine)", largura: 600, altura: 2000, profundidade: 400, material: "mdf_branco_diamante" }
                ];
                modsIntercept = LayoutEngine.calculate(AppState.roomWidth, AppState.roomDepth, baseModules); 
                interceptado = true;
            }
            else if (txt.includes('hexagonal') || (txt.includes('madeira') && txt.includes('ilha'))) {
                modsIntercept = LayoutEngine.calculate(AppState.roomWidth, AppState.roomDepth, [{ tipo: "expositor_oculos_hexagonal", largura: 1800, altura: 1200, profundidade: 800, material: "amadeirado_padrao" }, { tipo: "expositor_oculos_hexagonal", largura: 1800, altura: 1200, profundidade: 800, material: "amadeirado_padrao" }]); 
                interceptado = true;
            }
            else if (txt.includes('chilli') || txt.includes('beans') || txt.includes('quiosque pilar')) {
                modsIntercept = LayoutEngine.calculate(AppState.roomWidth, AppState.roomDepth, [{ tipo: "expositor_oculos_chillibeans", largura: 2500, altura: 2200, profundidade: 1200, material: "amadeirado_padrao" }]); 
                interceptado = true;
            }
            else if (txt.includes('ilha') || txt.includes('chicshades') || txt.includes('fuel') || txt.includes('otica') || txt.includes('óculos')) {
                modsIntercept = LayoutEngine.calculate(AppState.roomWidth, AppState.roomDepth, [{ tipo: "expositor_oculos_inclinado", largura: 1200, altura: 1100, profundidade: 500, material: "madeira_fuel", gavetas: 2 }, { tipo: "expositor_oculos_inclinado", largura: 1200, altura: 1100, profundidade: 500, material: "madeira_fuel", gavetas: 2 }, { tipo: "expositor_oculos_inclinado", largura: 1200, altura: 1100, profundidade: 500, material: "madeira_fuel", gavetas: 2 }, { tipo: "expositor_oculos_inclinado", largura: 1200, altura: 1100, profundidade: 500, material: "madeira_fuel", gavetas: 2 }, { tipo: "totem_iluminado_otica", largura: 400, altura: 2000, profundidade: 400, material: "madeira_fuel" }, { tipo: "totem_iluminado_otica", largura: 400, altura: 2000, profundidade: 400, material: "madeira_fuel" }]); 
                interceptado = true;
            }
            else if (txt.includes('fini') || txt.includes('doces') || txt.includes('quiosque de doce')) {
                 modsIntercept = LayoutEngine.calculate(AppState.roomWidth, AppState.roomDepth, [{ tipo: "expositor_degraus", largura: 1500, altura: 1100, profundidade: 500, material: "mdf_vermelho_fini", prateleirasExternas: 4, gavetas: 4 }, { tipo: "expositor_degraus", largura: 1500, altura: 1100, profundidade: 500, material: "mdf_vermelho_fini", prateleirasExternas: 4, gavetas: 4 }, { tipo: "balcao_curvo", largura: 500, altura: 1100, profundidade: 500, material: "mdf_branco_diamante" }, { tipo: "expositor_degraus", largura: 1500, altura: 1100, profundidade: 500, material: "mdf_vermelho_fini", prateleirasExternas: 4, gavetas: 4 }, { tipo: "expositor_degraus", largura: 1500, altura: 1100, profundidade: 500, material: "mdf_vermelho_fini", prateleirasExternas: 4, gavetas: 4 }]); 
                 interceptado = true;
            }

            if (interceptado) {
                AppState.modules = []; 
                modsIntercept.forEach(m => window.App.modules.add(m.tipo, m)); 
                window.App.ui.fecharHUDs(); 
                window.App.ui.hideLoader();
                StorageManager.save();
                return window.App.ui.toast("Loja do Mercadão Renderizada! Ajuste no Estúdio AR.");
            }

            // Integração Real Gemini
            const key = AppState.apiKeys.gemini; 
            if(!key) { 
                window.App.ui.hideLoader(); 
                window.App.ui.toggleModal('modalSettings'); 
                return window.App.ui.toast("Insira a chave Gemini 2.5 Flash!"); 
            } 
            if(!AppState.imagemFundoBase64 && !AppState.transcricaoAtual && !txt) { 
                window.App.ui.hideLoader(); 
                return window.App.ui.toast("Forneça foto, texto ou áudio."); 
            }
            
            try { 
                const prompt = `Você é o Arquiteto Oficial da franquia Mercadão dos Óculos.
Gere a estrutura 3D da loja baseada na imagem e no pedido.
REGRA ABSOLUTA: Use APENAS as peças e materiais oficiais da marca.
PEÇAS PERMITIDAS: 'parede_otica' (expositores de parede), 'balcao_mercadao' (balcão de caixa), 'mesa_atendimento_mercadao' (mesas centrais azuis), 'totem_iluminado_otica', 'cadeira'.
MATERIAIS PERMITIDOS: 'mdf_vermelho_mercadao', 'mdf_azul_mercadao', 'mdf_branco_diamante', 'amadeirado_claro'.
NUNCA crie armários genéricos ou de madeira escura. O layout deve ter 'parede_otica' nas paredes laterais, 'mesa_atendimento_mercadao' no meio, e 'balcao_mercadao' no fundo.
VOZ/TEXTO DO CLIENTE: "${AppState.transcricaoAtual} ${txt}"
RETORNE APENAS JSON LIMPO, EX: {"modulos": [{"tipo": "parede_otica", "nome": "Expositor Parede Dir", "largura": 2000, "altura": 2400, "profundidade": 450, "material": "mdf_branco_diamante", "posX": 2000, "posY": 0, "posZ": 0, "rotY": -90}]}`; 
                
                const parts = [{ text: prompt }]; 
                if (AppState.imagemFundoBase64) { 
                    parts.push({ inlineData: { mimeType: "image/jpeg", data: AppState.imagemFundoBase64 } }); 
                }
                
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ contents: [{ parts }] }) 
                }); 
                
                const data = await res.json(); 
                if (data.error) throw new Error(data.error.message); 
                
                const jsonStr = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim(); 
                const json = JSON.parse(jsonStr); 
                
                if (json.modulos && json.modulos.length > 0) { 
                    AppState.modules = []; 
                    const modsFisicos = LayoutEngine.calculate(AppState.roomWidth, AppState.roomDepth, json.modulos);
                    modsFisicos.forEach(m => window.App.modules.add(m.tipo || 'parede_otica', m)); 
                    window.App.ui.fecharHUDs(); 
                    window.App.ui.toast("Projeto IA Realista Gerado!"); 
                    StorageManager.save();
                } 
            } catch(e) { 
                window.App.ui.toast("Erro no processamento da IA."); 
            } finally { 
                window.App.ui.hideLoader(); 
            } 
        }, 500);
    }
};
