/**
 * src/marcenaria/bom-engine.js
 * Motor Orçamentário Fabril (Bill of Materials).
 * Calcula custos físicos de chapa, ferragens e mão de obra paramétrica.
 */

import { AppState } from '../core/app-state.js';
import { StorageManager } from '../core/storage-manager.js';
import { MatDefs } from '../3d/material-factory.js';

export const BOMEngine = {
    calculateModule: (mod) => {
        const w = mod.largura/1000, h = mod.altura/1000, d = mod.profundidade/1000;
        let area = 0; let hwCusto = 0; let laborMult = 1.0; let matCusto = 0;
        let qtdDobradicas = 0, qtdCorredicas = 0, qtdTrilhos = 0, qtdPistoes = 0;

        const calcCustoPeca = (areaPeca, chaveMatCustom) => {
            let matKey = chaveMatCustom || mod.material;
            let pMult = MatDefs[matKey] ? MatDefs[matKey].mult : 1.0;
            return areaPeca * (AppState.config.preco_mdf * pMult);
        };

        if (mod.tipo === 'balcao_curvo' || mod.tipo === 'sofa_redondo' || mod.tipo === 'mesa_redonda' || mod.tipo === 'mesa_atendimento_mercadao') { 
            let a = (Math.PI * w * h); area += a; matCusto += calcCustoPeca(a, null); laborMult = 2.5; 
        } 
        else if (mod.tipo === 'expositor_degraus' || mod.tipo === 'vitrine_otica') { 
            let a = (h * d * 3) + (w * d * 3); area += a; matCusto += calcCustoPeca(a, null); laborMult = 1.8; 
        }
        else if (mod.tipo === 'expositor_oculos_inclinado' || mod.tipo === 'parede_otica' || mod.tipo === 'expositor_oculos_hexagonal') { 
            let a = (w * h) + (w * d * 2) + (h * d * 2); area += a; matCusto += calcCustoPeca(a, null); laborMult = 1.6; 
        }
        else if (mod.tipo === 'expositor_oculos_chillibeans') { 
            let a = (w * h * 2) + (w * d * 2); area += a; matCusto += calcCustoPeca(a, null); laborMult = 2.0; 
        }
        else if (mod.tipo === 'mesa') { 
            let aTeto = (w * d); area += aTeto; matCusto += calcCustoPeca(aTeto, mod.materiaisCustomizados?.estrutura?.['teto']);
            let aPernas = (h * 0.6) * 2; area += aPernas; matCusto += calcCustoPeca(aPernas, mod.materiaisCustomizados?.estrutura?.['lateralEsq']);
            if (mod.formato === 'dobravel') { hwCusto += 150; laborMult = 1.2; }
        } else if (mod.tipo === 'painel_tv' || mod.tipo === 'painel_fixo' || mod.tipo === 'porta_avulsa') { 
            area += (w*h); matCusto += calcCustoPeca(w*h, null);
            if(mod.tipo === 'porta_avulsa') { 
                if (mod.abertura === 'correr') { qtdTrilhos += 1; hwCusto += 45.0; } 
                else if (mod.abertura === 'basculante') { qtdPistoes += 1; hwCusto += 35.0; } 
                else { let dp = h > 1.5 ? 4 : 2; qtdDobradicas += dp; hwCusto += dp * 7.5; } 
            }
            if(mod.tipo === 'painel_tv' && (mod.gavetas || mod.portas)) { 
                let n = (w*d*2) + (h*d*2); area += n; matCusto += calcCustoPeca(n, null); 
            }
        } else if (mod.tipo === 'gaveta_avulsa') {
            area += (w * 0.3 + d * 0.3 * 2 + w * d); matCusto += calcCustoPeca(area, null); qtdCorredicas += 1; hwCusto += 25.0;
        } else if (mod.tipo === 'sofa' || mod.tipo === 'puff' || mod.tipo === 'cadeira') {
            area += (w * h * d) * 2; matCusto += calcCustoPeca(area, null); laborMult = 1.5;
        } else {
            let aLat = (h * d * 2); area += aLat; matCusto += calcCustoPeca(aLat/2, mod.materiaisCustomizados?.estrutura?.['lateralEsq']) + calcCustoPeca(aLat/2, mod.materiaisCustomizados?.estrutura?.['lateralDir']);
            let aTetoBase = (w * d * 2); area += aTetoBase; matCusto += calcCustoPeca(aTetoBase/2, mod.materiaisCustomizados?.estrutura?.['teto']) + calcCustoPeca(aTetoBase/2, mod.materiaisCustomizados?.estrutura?.['base']);
            let aFundo = (w * h); area += aFundo; matCusto += calcCustoPeca(aFundo, mod.materiaisCustomizados?.estrutura?.['fundo']);
            if(mod.formato === 'L_esq' || mod.formato === 'L_dir') { 
                const rL = (mod.retornoL/1000) - d; 
                if(rL > 0) { let aL = (h*rL*2) + (d*rL*2) + (d*h); area += aL; matCusto += calcCustoPeca(aL, null); } 
            }
            else if (mod.formato.includes('canto_')) { 
                area = (w*h*2) + (w*d); matCusto += calcCustoPeca(area, null); laborMult = 1.3; 
            }
        }

        if(mod.prateleiras) { let a = mod.prateleiras * (w*d); area += a; matCusto += calcCustoPeca(a, null); }
        if(mod.prateleirasExternas) { let a = mod.prateleirasExternas * (w * 0.20); area += a; matCusto += calcCustoPeca(a, null); } 
        
        if (mod.tipo !== 'porta_avulsa' && mod.tipo !== 'gaveta_avulsa' && mod.tipo !== 'painel_fixo' && !mod.tipo.includes('otica') && !mod.tipo.includes('expositor') && mod.tipo !== 'balcao_curvo') {
            if(mod.gavetas > 0) {
                for (let i = 0; i < mod.gavetas; i++) {
                    const gavKey = `gaveta_${i}`; const cG_W = mod.medidasCustomizadas?.[gavKey]?.w ? (mod.medidasCustomizadas[gavKey].w / 1000) : (mod.compW > 0 ? mod.compW / 1000 : w);
                    let a = (cG_W * 0.3 + d * 0.3 * 2 + cG_W * d); area += a; matCusto += calcCustoPeca(a, mod.materiaisCustomizados?.frentes?.[gavKey]); qtdCorredicas += 1; hwCusto += 25.0; 
                }
            }
            if(mod.portas > 0) {
                let portasReais = (mod.layoutInterno === 'ilha_dupla') ? mod.portas * 2 : mod.portas;
                for (let i = 0; i < portasReais; i++) {
                    const portKey = (mod.layoutInterno === 'ilha_dupla') ? (i % 2 === 0 ? `porta_frente_${i/2}` : `porta_tras_${Math.floor(i/2)}`) : `porta_${i}`;
                    const cP_W = mod.medidasCustomizadas?.[portKey]?.w ? (mod.medidasCustomizadas[portKey].w / 1000) : (mod.compW > 0 ? mod.compW / 1000 : (w / mod.portas));
                    const cP_H = mod.medidasCustomizadas?.[portKey]?.h ? (mod.medidasCustomizadas[portKey].h / 1000) : (mod.compH > 0 ? mod.compH / 1000 : h);
                    let a = (cP_W * cP_H); area += a; matCusto += calcCustoPeca(a, mod.materiaisCustomizados?.frentes?.[portKey]);
                    if (mod.abertura === 'correr') { qtdTrilhos += 1; hwCusto += 45.0; } else if (mod.abertura === 'basculante') { qtdPistoes += 1; hwCusto += 35.0; } else { let dp = cP_H > 1.5 ? 4 : 2; qtdDobradicas += dp; hwCusto += dp * 7.5; }
                }
            }
        }

        if(mod.ripadoFrontal) { let a = (w*h) * 1.5; area += a; matCusto += calcCustoPeca(a, null); laborMult += 0.3; }
        if(mod.tampoVidro) hwCusto += (w*d) * 150;

        return { area: area * 1.15, hardwareCost: hwCusto, laborMult: laborMult, customMatCostTotal: matCusto * 1.15, counts: { dobradicas: qtdDobradicas, corredicas: qtdCorredicas, trilhos: qtdTrilhos, pistoes: qtdPistoes } }; 
    },
    update: () => {
        let tArea = 0, tHWDyn = 0, tLaborDyn = 0, tHWFix = parseFloat(AppState.config.preco_ferragem), totalMatsCost = 0; 
        let cDob = 0, cCor = 0, cTril = 0, cPist = 0;
        
        AppState.modules.forEach(m => { 
            const b = BOMEngine.calculateModule(m); 
            tArea += b.area; 
            tHWDyn += b.hardwareCost; 
            tLaborDyn += (b.area * AppState.config.preco_mao_obra * b.laborMult); 
            totalMatsCost += b.customMatCostTotal; 
            cDob += b.counts.dobradicas; cCor += b.counts.corredicas; cTril += b.counts.trilhos; cPist += b.counts.pistoes;
        });
        
        const cTotal = totalMatsCost + tHWFix + tHWDyn + tLaborDyn; 
        const profit = cTotal * (AppState.config.margem_lucro / 100);
        const fmt = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        document.getElementById('bom-price').innerText = fmt(cTotal + profit); 
        document.getElementById('bom-area').innerText = tArea.toFixed(2) + ' m²'; 
        document.getElementById('bom-mat').innerText = fmt(totalMatsCost + tHWFix + tHWDyn); 
        document.getElementById('bom-mobra').innerText = fmt(tLaborDyn); 
        document.getElementById('bom-profit').innerText = fmt(profit); 
        document.getElementById('bom-hw-cost').innerText = fmt(tHWDyn);
        
        let hwListStr = []; 
        if (cDob > 0) hwListStr.push(`${cDob}x Dobradiças`); 
        if (cCor > 0) hwListStr.push(`${cCor}x Corrediças`); 
        if (cTril > 0) hwListStr.push(`${cTril}x Trilhos`); 
        if (cPist > 0) hwListStr.push(`${cPist}x Pistões`); 
        document.getElementById('bom-hw-list').innerText = hwListStr.length > 0 ? hwListStr.join(' | ') : "Nenhuma ferragem identificada.";
    },
    updateParams: () => { 
        AppState.config.preco_mdf = parseFloat(document.getElementById('cost-mdf').value) || 85.00; 
        AppState.config.preco_mao_obra = parseFloat(document.getElementById('cost-labor').value) || 80.00; 
        AppState.config.preco_ferragem = parseFloat(document.getElementById('cost-hardware').value) || 0.00; 
        AppState.config.margem_lucro = parseFloat(document.getElementById('cost-margin').value) || 40; 
        BOMEngine.update(); 
        StorageManager.save(); 
    }
};
