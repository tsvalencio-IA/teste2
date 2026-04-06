/**
 * src/layout/layout-engine.js
 * Motor de Layout Espacial.
 * Posiciona peças na cena 3D automaticamente baseado em regras de negócio (Paredes, Centro, Fundo).
 */

export const LayoutEngine = {
    calculate: (roomWidth, roomDepth, requestedModules) => {
        let placed = []; 
        let zEsq = 0; 
        let zDir = 0; 
        let zCentro = 0; 
        
        requestedModules.forEach(mod => {
            let w = mod.largura || 1000; 
            let d = mod.profundidade || 500;
            
            if (mod.tipo === 'parede_otica' || mod.nome.includes('Expositor') || mod.tipo === 'armario') {
                let goRight = mod.nome.includes('Dir'); 
                let goLeft = mod.nome.includes('Esq');
                
                if (!goRight && !goLeft) { 
                    if (zEsq <= zDir) goLeft = true; 
                    else goRight = true; 
                }
                
                if (goLeft) {
                    mod.posX = -(roomWidth / 2) + (d / 2); 
                    mod.posZ = -(roomDepth / 2) + zEsq + (w / 2) + 500; 
                    mod.rotY = 90; 
                    zEsq += w + 100; 
                } else {
                    mod.posX = (roomWidth / 2) - (d / 2); 
                    mod.posZ = -(roomDepth / 2) + zDir + (w / 2) + 500; 
                    mod.rotY = -90; 
                    zDir += w + 100;
                }
            } else if (mod.tipo.includes('centro') || mod.nome.includes('Pórtico') || mod.nome.includes('Mesa') || mod.nome.includes('Totem') || mod.tipo.includes('chillibeans')) {
                 mod.posX = 0; 
                 if(mod.tipo === 'totem_iluminado_otica') { 
                     mod.posZ = (roomDepth / 2) - 1000; 
                     mod.rotY = 0; 
                 } 
                 else { 
                     mod.posZ = -(roomDepth / 2) + zCentro + (d / 2) + 2000; 
                     zCentro += d + 1500; 
                     mod.rotY = 0; 
                 }
            } else if (mod.tipo === 'balcao' || mod.nome.includes('Caixa') || mod.tipo === 'balcao_mercadao') { 
                mod.posX = 0; 
                mod.posZ = -(roomDepth / 2) + 1000; 
                mod.rotY = 0; 
            }
            else { 
                mod.posX = 0; 
                mod.posZ = 0; 
                mod.rotY = 0; 
            }
            placed.push(mod);
        });
        
        return placed;
    }
};
