/**
 * src/ia/ai-service.js
 * Integração Multimodal: Gemini 2.5 Flash e Groq Whisper.
 * CORREÇÃO: Prompt Dinâmico e Orgânico (Sem output fixo).
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
        if(input.files && input.files[0]) AIService.processAudioBlob(input.files[0]); 
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
        const txt = document.getElementById('textoAdicional').value; 
        window.App.ui.showLoader("Oráculo: Projetando Realismo Dinâmico...");
        
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
            // O Prompt agora exige pensamento dinâmico do modelo
            const prompt = `Atue como Engenheiro Arquiteto Chefe. 
Crie uma arquitetura 3D adaptativa baseada EXCLUSIVAMENTE nas necessidades da imagem fornecida e nas instruções de áudio/texto do cliente. Não crie sempre o mesmo projeto.
Se houver pilares, crie ilhas. Se for estreito, use expositores curtos nas laterais.
REGRAS DE MATERIAIS OFICIAIS: 'mdf_vermelho_mercadao', 'mdf_azul_mercadao', 'mdf_branco_diamante', 'amadeirado_padrao', 'vidro_incolor'.
COMPONENTES OFICIAIS: 'parede_otica', 'balcao_mercadao', 'mesa_atendimento_mercadao', 'totem_iluminado_otica', 'expositor_oculos_inclinado', 'expositor_oculos_hexagonal', 'sofa'.
INSTRUÇÃO DO CLIENTE: "${AppState.transcricaoAtual} ${txt}"
RETORNE APENAS O CÓDIGO JSON, sem explicações. Exemplo de estrutura desejada:
{"modulos": [{"tipo": "parede_otica", "nome": "Expositor Esq", "largura": 1500, "altura": 2200, "profundidade": 400, "material": "mdf_branco_diamante", "gavetas": 2}]}`; 
            
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
                window.App.ui.toast("Projeto IA Dinâmico Gerado!"); 
                StorageManager.save();
            } 
        } catch(e) { 
            window.App.ui.toast("Erro no processamento da IA."); 
        } finally { 
            window.App.ui.hideLoader(); 
        } 
    }
};
