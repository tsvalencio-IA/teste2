/**
 * src/ia/api-service.js
 * Gerencia a gravação das chaves da API Gemini e Groq.
 */

import { AppState } from '../core/app-state.js';
import { StorageManager } from '../core/storage-manager.js';

export const ApiService = {
    saveKeys: () => { 
        AppState.apiKeys.gemini = document.getElementById('api-gemini').value.trim(); 
        AppState.apiKeys.groq = document.getElementById('api-groq').value.trim(); 
        StorageManager.save(); 
        window.App.ui.toggleModal('modalSettings'); 
        window.App.ui.toast("Chaves salvas!", "success"); 
    }
};
