/**
 * src/core/storage-manager.js
 * Lida com a persistência de dados críticos do usuário (Projeto, Configurações e Imagem AR).
 */

import { AppState } from './app-state.js';

export const StorageManager = {
    save: () => {
        const data = {
            modules: AppState.modules,
            roomW: AppState.roomWidth,
            roomD: AppState.roomDepth,
            bgImage: AppState.imagemFundoURL,
            config: AppState.config
        };

        try {
            localStorage.setItem('mercadao_save', JSON.stringify(data));
            localStorage.setItem('ak_gemini_cad', AppState.apiKeys.gemini);
            localStorage.setItem('ak_groq_cad', AppState.apiKeys.groq);
        } catch (e) {
            console.warn("Imagem demasiado grande para localStorage. Salvando sem a imagem.");
            data.bgImage = null;
            localStorage.setItem('mercadao_save', JSON.stringify(data));
        }
    },

    load: () => {
        const saved = localStorage.getItem('mercadao_save');
        
        if (saved) {
            try {
                const data = JSON.parse(saved);
                
                if (data.modules) AppState.modules = data.modules;
                
                if (data.roomW) {
                    AppState.roomWidth = data.roomW;
                    const elRoomW = document.getElementById('roomW');
                    if (elRoomW) elRoomW.value = data.roomW;
                }
                
                if (data.roomD) {
                    AppState.roomDepth = data.roomD;
                    const elRoomD = document.getElementById('roomD');
                    if (elRoomD) elRoomD.value = data.roomD;
                }
                
                if (data.config) {
                    AppState.config = data.config;
                    const elMdf = document.getElementById('cost-mdf');
                    if (elMdf) elMdf.value = data.config.preco_mdf;
                    const elLabor = document.getElementById('cost-labor');
                    if (elLabor) elLabor.value = data.config.preco_mao_obra;
                    const elHw = document.getElementById('cost-hardware');
                    if (elHw) elHw.value = data.config.preco_ferragem;
                    const elMargin = document.getElementById('cost-margin');
                    if (elMargin) elMargin.value = data.config.margem_lucro;
                }
                
                if (data.bgImage) {
                    AppState.imagemFundoURL = data.bgImage;
                    AppState.imagemFundoBase64 = data.bgImage.split(',')[1];
                    const imgPreview = document.getElementById('imagePreview');
                    if(imgPreview) {
                        imgPreview.src = data.bgImage;
                        document.getElementById('imgPreviewContainer').style.display = 'block';
                    }
                }
            } catch (error) {
                console.error("Erro ao carregar o save state:", error);
            }
        }
    }
};
