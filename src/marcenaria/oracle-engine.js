/**
 * src/marcenaria/oracle-engine.js
 * Motor Validador Geométrico e Restrições de Design.
 */

import { AppState } from '../core/app-state.js';

export const OracleEngine = {
    rules: {
        armario: { label: 'Armário/Aéreo' }, balcao: { label: 'Balcão' }, guarda_roupa: { label: 'Guarda-Roupa' },
        mesa: { label: 'Mesa' }, mesa_redonda: { label: 'Mesa Redonda' }, painel_tv: { label: 'Painel TV' }, rack: { label: 'Rack' },
        cadeira: { label: 'Cadeira' }, sofa: { label: 'Sofá' }, puff: { label: 'Puff' }, nicho: { label: 'Nicho' }, 
        porta_avulsa: { label: 'Porta Solo' }, gaveta_avulsa: { label: 'Gaveta Solo' }, painel_fixo: { label: 'Painel Fixo' },
        expositor_oculos_inclinado: { label: 'Expositor Óculos Premium' }, expositor_oculos_chillibeans: { label: 'Ilha Chilli Beans' }, 
        parede_otica: { label: 'Parede Mercadão' }, totem_iluminado_otica: { label: 'Totem Iluminado' }, vitrine_otica: { label: 'Vitrine de Ótica' }, 
        expositor_degraus: { label: 'Expositor Fini' }, sofa_redondo: { label: 'Sofá Circular' }, expositor_oculos_hexagonal: { label: 'Ótica Hexagonal' },
        balcao_curvo: { label: 'Balcão Curvo' }, balcao_mercadao: { label: 'Balcão Caixa Mercadão' }, mesa_atendimento_mercadao: { label: 'Mesa Atendimento Mercadão' }
    },
    validateAndFix: (mod) => {
        if(!AppState.modoOraculo) return; 
        let fixes = [];
        
        if(mod.tipo === 'mesa' && mod.altura > 1100 && mod.formato !== 'dobravel') fixes.push({k:'altura', v:750, msg:'Mesa ajustada (750mm)'});
        if(mod.tipo === 'painel_tv' && mod.profundidade > 300) fixes.push({k:'profundidade', v:100, msg:'Painel afinado (100mm)'});
        if(mod.tipo === 'rack' && mod.altura > 800) fixes.push({k:'altura', v:500, msg:'Rack rebaixado (<800mm)'});
        if(mod.formato.includes('L_') && mod.retornoL < 400) fixes.push({k:'retornoL',v:1000,msg:'Braço do L ajustado (>400mm)'});
        if((mod.formato === 'redondo' || mod.formato === 'triangular') && mod.largura !== mod.profundidade) fixes.push({k:'profundidade', v:mod.largura, msg:'Formas puras exigem L=P'});
        
        if(mod.gavetas > 0 && mod.portas === 0 && mod.layoutInterno !== 'apenas_gavetas') fixes.push({k:'layoutInterno', v:'apenas_gavetas', msg:'Layout de gavetas ativado.'});
        if(mod.portas > 0 && mod.gavetas === 0 && mod.layoutInterno !== 'apenas_portas') fixes.push({k:'layoutInterno', v:'apenas_portas', msg:'Layout de portas ativado.'});
        if(mod.gavetas > 0 && mod.portas > 0 && (mod.layoutInterno === 'apenas_portas' || mod.layoutInterno === 'apenas_gavetas')) fixes.push({k:'layoutInterno', v:'top_drawers', msg:'Layout misto ativado.'});
        if(mod.tipo === 'sofa' || mod.tipo === 'puff') { if(mod.material && !mod.material.includes('tecido')) fixes.push({k:'material', v:'tecido_linho_cinza', msg:'Convertido para estofado.'}); }

        if (mod.medidasCustomizadas) {
            let totalW_Portas = 0; let exceededHeight = false;
            Object.keys(mod.medidasCustomizadas).forEach(key => {
                if (key.includes('porta') && mod.layoutInterno !== 'ilha_dupla') totalW_Portas += mod.medidasCustomizadas[key].w;
                if (mod.medidasCustomizadas[key].h > mod.altura) exceededHeight = true;
            });
            if (totalW_Portas > mod.largura) fixes.push({k:'medidasCustomizadas', v:{}, msg:'Soma excede o vão. Resetado.'});
            if (exceededHeight) fixes.push({k:'medidasCustomizadas', v:{}, msg:'Peça maior que a caixaria. Resetado.'});
        }
        fixes.forEach(f => { 
            mod[f.k] = f.v; 
            if(window.App && window.App.ui) {
                window.App.ui.toast(`Oráculo: ${f.msg}`); 
            }
        });
    }
};
