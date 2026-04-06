/**
 * /src/core/AppState.js
 * Centraliza o estado global da aplicação. Nenhuma lógica de negócio fica aqui, apenas dados puros.
 */

export const AppState = {
    modoOraculo: true,
    modules: [],
    selectedModule: null,
    
    config: {
        preco_mdf: 85.00,
        preco_ferragem: 0.00,
        preco_mao_obra: 80.00,
        margem_lucro: 40
    },
    
    apiKeys: {
        gemini: localStorage.getItem('ak_gemini_cad') || '',
        groq: localStorage.getItem('ak_groq_cad') || ''
    },
    
    arActive: false,
    modoInteracao: 'projeto',
    tool: 'orbit',
    animacoesAtivas: [],
    
    transcricaoAtual: "",
    imagemFundoBase64: null,
    imagemFundoURL: null,
    mediaRecorder: null,
    audioChunks: [],
    
    cutParts: [],
    currentBoards: [],
    
    roomWidth: 4500,
    roomDepth: 8000
};
