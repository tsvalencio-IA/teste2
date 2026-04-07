/**
 * src/3d/scene-builder.js
 * Construtor Paramétrico de Cenários.
 * EVOLUÇÃO ABSOLUTA: Caixaria Oca Real (Chapa por Chapa) e Óculos 3D nas prateleiras e gavetas.
 */

import { AppState } from '../core/app-state.js';
import { ThreeEngine } from './three-engine.js';
import { MaterialFactory } from './material-factory.js';

const THREE = window.THREE;

export const SceneBuilder = {
    
    // Gerador de Óculos de Sol 3D para enfeitar o interior dos móveis
    createGlasses: () => {
        const group = new THREE.Group();
        const frameMat = new THREE.MeshStandardMaterial({color: 0x111111, roughness: 0.2});
        const lensMat = new THREE.MeshPhysicalMaterial({color: 0x000000, transmission: 0.8, opacity: 1, transparent: true, roughness: 0, ior: 1.5, side: THREE.DoubleSide});
        
        // Lente Esquerda
        const geomL = new THREE.CylinderGeometry(0.025, 0.025, 0.002, 32);
        const l1 = new THREE.Mesh(geomL, lensMat);
        l1.rotation.x = Math.PI / 2;
        l1.position.set(-0.03, 0, 0);
        
        // Lente Direita
        const l2 = new THREE.Mesh(geomL, lensMat);
        l2.rotation.x = Math.PI / 2;
        l2.position.set(0.03, 0, 0);
        
        // Ponte do óculos
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.005, 0.005), frameMat);
        
        group.add(l1, l2, bridge);
        return group;
    },

    rebuildScene: () => {
        const root = ThreeEngine.rootNode;
        for (let i = root.children.length - 1; i >= 0; i--) {
            const child = root.children[i];
            root.remove(child);
        }

        AppState.modules.forEach(m => {
            const modGroup = SceneBuilder.buildParametricModule(m);
            root.add(modGroup);
        });
    },

    buildParametricModule: (m) => {
        const group = new THREE.Group();
        group.userData = { isRootModule: true, id: m.id, type: m.tipo };

        // Posição no mundo (Convertendo mm para metros)
        group.position.set((m.posX || 0) / 1000, (m.posY || 0) / 1000, (m.posZ || 0) / 1000);
        if (m.rotY) group.rotation.y = THREE.MathUtils.degToRad(m.rotY);

        const w = (m.largura || 1000) / 1000;
        const h = (m.altura || 800) / 1000;
        const d = (m.profundidade || 500) / 1000;
        const t = 0.018; // Espessura da chapa MDF: 18mm

        const matCaixa = MaterialFactory.getRealMaterial(m.material);
        const matFrente = MaterialFactory.getRealMaterial(m.materiaisCustomizados?.frentes?.padrao || m.material);

        // ==========================================
        // 1. CONSTRUÇÃO DA CAIXARIA OCA (Chapa a Chapa)
        // ==========================================
        
        // Base
        if (!m.removedParts?.includes('base')) {
            const base = new THREE.Mesh(new THREE.BoxGeometry(w, t, d), matCaixa);
            base.position.set(0, t/2, 0);
            base.castShadow = true; base.receiveShadow = true;
            group.add(base);
        }

        // Teto / Tampo
        if (!m.removedParts?.includes('teto')) {
            const teto = new THREE.Mesh(new THREE.BoxGeometry(w, t, d), m.tampoVidro ? MaterialFactory.getRealMaterial('vidro_incolor') : matCaixa);
            teto.position.set(0, h - t/2, 0);
            teto.castShadow = true; teto.receiveShadow = true;
            group.add(teto);
        }

        // Lateral Esquerda
        if (!m.removedParts?.includes('lateralEsq')) {
            const esq = new THREE.Mesh(new THREE.BoxGeometry(t, h - t*2, d), matCaixa);
            esq.position.set(-w/2 + t/2, h/2, 0);
            esq.castShadow = true; esq.receiveShadow = true;
            group.add(esq);
        }

        // Lateral Direita
        if (!m.removedParts?.includes('lateralDir')) {
            const dir = new THREE.Mesh(new THREE.BoxGeometry(t, h - t*2, d), matCaixa);
            dir.position.set(w/2 - t/2, h/2, 0);
            dir.castShadow = true; dir.receiveShadow = true;
            group.add(dir);
        }

        // Fundo (Costas)
        if (!m.removedParts?.includes('fundo')) {
            const fundo = new THREE.Mesh(new THREE.BoxGeometry(w - t*2, h - t*2, t), matCaixa);
            fundo.position.set(0, h/2, -d/2 + t/2);
            fundo.castShadow = true; fundo.receiveShadow = true;
            group.add(fundo);
        }

        // ==========================================
        // 2. PRATELEIRAS INTERNAS COM ÓCULOS
        // ==========================================
        const numPrats = m.prateleiras || 0;
        const espacoLivreY = h - (t * 2);
        const gapY = espacoLivreY / (numPrats + 1);

        for (let i = 1; i <= numPrats; i++) {
            const pY = t + (gapY * i);
            const prat = new THREE.Mesh(new THREE.BoxGeometry(w - t*2, t, d - t), matCaixa);
            prat.position.set(0, pY, t/2);
            prat.castShadow = true; prat.receiveShadow = true;
            group.add(prat);

            // Popula a prateleira com óculos 3D!
            for(let j = -1; j <= 1; j++) {
                const glasses = SceneBuilder.createGlasses();
                glasses.position.set(j * (w/4), pY + 0.015, t/2);
                group.add(glasses);
            }
        }

        // ==========================================
        // 3. GAVETAS (Com Óculos Dentro)
        // ==========================================
        const numGavetas = m.gavetas || 0;
        if (numGavetas > 0) {
            const gavH = (espacoLivreY / numGavetas) - 0.005; // Gap de 5mm
            for (let i = 0; i < numGavetas; i++) {
                const gY = t + (gavH / 2) + (i * (gavH + 0.005));
                const gZ = d/2;

                const gavGroup = new THREE.Group();
                gavGroup.position.set(0, gY, gZ);
                gavGroup.userData = { 
                    isAnimatable: true, type: 'drawer', modId: m.id, compKey: `gaveta_${i}`, 
                    isOpen: m.compStates?.[`gaveta_${i}`] || false, 
                    baseZ: gZ, depth: d 
                };

                // Frente da Gaveta
                const frenteMatKey = m.materiaisCustomizados?.frentes?.[`gaveta_${i}`];
                const frenteGav = new THREE.Mesh(new THREE.BoxGeometry(w - t*2 - 0.005, gavH, t), frenteMatKey ? MaterialFactory.getRealMaterial(frenteMatKey) : matFrente);
                frenteGav.castShadow = true; frenteGav.receiveShadow = true;
                gavGroup.add(frenteGav);

                // Caixa Oca Interna da Gaveta (Para guardar coisas)
                const gBoxMat = MaterialFactory.getRealMaterial('mdf_branco_tx');
                const gW = w - t*4;
                const gD = d - t*2;
                
                const gavBase = new THREE.Mesh(new THREE.BoxGeometry(gW, 0.006, gD), gBoxMat);
                gavBase.position.set(0, -gavH/2 + 0.003, -gD/2 - t/2);
                gavGroup.add(gavBase);

                // Coloca um par de óculos DENTRO da gaveta!
                const glassesGav = SceneBuilder.createGlasses();
                glassesGav.position.set(0, -gavH/2 + 0.02, -gD/2);
                gavGroup.add(glassesGav);

                // Se estiver aberto no estado, já nasce aberto
                if (gavGroup.userData.isOpen) gavGroup.position.z = gZ + (d * 0.8);
                
                group.add(gavGroup);
            }
        }

        // ==========================================
        // 4. PORTAS (Com eixo de Rotação)
        // ==========================================
        const numPortas = m.portas || 0;
        if (numPortas > 0 && numGavetas === 0) {
            const portaW = (w - t*2) / numPortas - 0.005;
            for (let i = 0; i < numPortas; i++) {
                const hingeX = (i === 0) ? (-w/2 + t) : (w/2 - t); 
                const pZ = d/2;

                const portaGroup = new THREE.Group();
                portaGroup.position.set(hingeX, h/2, pZ); // Eixo na lateral
                portaGroup.userData = { 
                    isAnimatable: true, type: 'door_hinge', hinge: i === 0 ? 'left' : 'right',
                    modId: m.id, compKey: `porta_${i}`, isOpen: m.compStates?.[`porta_${i}`] || false 
                };

                const portaMatKey = m.materiaisCustomizados?.frentes?.[`porta_${i}`];
                const portaMesh = new THREE.Mesh(new THREE.BoxGeometry(portaW, h - t*2 - 0.005, t), portaMatKey ? MaterialFactory.getRealMaterial(portaMatKey) : matFrente);
                
                // Desloca a malha para longe do eixo
                const offset = i === 0 ? portaW/2 : -portaW/2;
                portaMesh.position.set(offset, 0, 0);
                portaMesh.castShadow = true; portaMesh.receiveShadow = true;
                portaGroup.add(portaMesh);

                if (portaGroup.userData.isOpen) {
                    portaGroup.rotation.y = (i === 0 ? -1 : 1) * (Math.PI / 1.6);
                }

                group.add(portaGroup);
            }
        }

        return group;
    }
};