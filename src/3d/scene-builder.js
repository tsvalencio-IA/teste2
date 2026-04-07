/**
 * src/3d/scene-builder.js
 * Construtor Paramétrico de Geometria 3D.
 * Contém TODAS as regras de geração de malhas, portas, gavetas e móveis específicos.
 */

import { AppState } from '../core/app-state.js';
import { ThreeEngine } from './three-engine.js';
import { MaterialFactory, MatDefs } from './material-factory.js';

export const SceneBuilder = {
    rebuildScene: () => {
        while(ThreeEngine.rootNode.children.length > 0) {
            ThreeEngine.rootNode.remove(ThreeEngine.rootNode.children[0]);
        }
        
        AppState.animacoesAtivas = []; 
        AppState.cutParts = []; 
        
        const rW = AppState.roomWidth / 1000; 
        const rD = AppState.roomDepth / 1000; 
        const rH = 3;
        const cMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }); // Fica 100% invisível mas colide
        
        ThreeEngine.floorCollider = new THREE.Mesh(new THREE.PlaneGeometry(rW*3, rD*3), cMat); 
        ThreeEngine.floorCollider.rotation.x = -Math.PI/2; 
        ThreeEngine.floorCollider.userData.type = 'floor'; 
        ThreeEngine.rootNode.add(ThreeEngine.floorCollider);
        
        ThreeEngine.wallBackCollider = new THREE.Mesh(new THREE.PlaneGeometry(rW, rH), cMat); 
        ThreeEngine.wallBackCollider.position.set(0, rH/2, -rD/2); 
        ThreeEngine.wallBackCollider.userData.type = 'wallBack'; 
        ThreeEngine.rootNode.add(ThreeEngine.wallBackCollider);
        
        ThreeEngine.wallLeftCollider = new THREE.Mesh(new THREE.PlaneGeometry(rD, rH), cMat); 
        ThreeEngine.wallLeftCollider.rotation.y = Math.PI/2; 
        ThreeEngine.wallLeftCollider.position.set(-rW/2, rH/2, 0); 
        ThreeEngine.wallLeftCollider.userData.type = 'wallLeft'; 
        ThreeEngine.rootNode.add(ThreeEngine.wallLeftCollider);
        
        ThreeEngine.wallRightCollider = new THREE.Mesh(new THREE.PlaneGeometry(rD, rH), cMat); 
        ThreeEngine.wallRightCollider.rotation.y = -Math.PI/2; 
        ThreeEngine.wallRightCollider.position.set(rW/2, rH/2, 0); 
        ThreeEngine.wallRightCollider.userData.type = 'wallRight'; 
        ThreeEngine.rootNode.add(ThreeEngine.wallRightCollider);
        
        if (AppState.arActive) {
            const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(rW, rH, rD));
            ThreeEngine.roomWireframe = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x1565C0, linewidth: 2 }));
            ThreeEngine.roomWireframe.position.set(0, rH/2, 0); 
            ThreeEngine.rootNode.add(ThreeEngine.roomWireframe);
        }

        const matLogoMercadao = MaterialFactory.getLogoMercadaoMaterial();
        
        AppState.modules.forEach(mod => {
            const g = new THREE.Group(); 
            g.userData = { id: mod.id, isRootModule: true };
            
            if (!mod.removedParts) mod.removedParts = []; 
            if (!mod.compStates) mod.compStates = {};
            
            const w = mod.largura / 1000; 
            const h = mod.altura / 1000; 
            const d = mod.profundidade / 1000;
            const rL = (mod.retornoL || 0) / 1000; 
            const esp = 0.018; 
            const folga = 0.003; 
            
            const matCorpo = MaterialFactory.getRealMaterial(mod.material);
            const matFrente = mod.material === 'misto' ? new THREE.MeshStandardMaterial({...MatDefs['amadeirado_padrao'], color: MatDefs['amadeirado_padrao'].frontColor}) : matCorpo;
            const matVidro = MaterialFactory.getRealMaterial('vidro_incolor');
            const matTampoPedra = MaterialFactory.getRealMaterial('mdf_preto_tx');
            const matRodape = MaterialFactory.getRealMaterial('rodape');
            const matBranco = MaterialFactory.getRealMaterial('mdf_branco_diamante');
            const matVermelho = MaterialFactory.getRealMaterial('mdf_vermelho_mercadao');
            const matAzul = MaterialFactory.getRealMaterial('mdf_azul_mercadao');
            const matTecido = MaterialFactory.getRealMaterial('tecido_linho_cinza');
            const matLed = MaterialFactory.getRealMaterial('led');
            const matEspelho = MaterialFactory.getRealMaterial('espelho');
            
            const edgeMat = new THREE.LineBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.15, depthTest: true, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }); 
            edgeMat.raycast = () => {}; 
            
            const selMat = new THREE.MeshStandardMaterial({...matCorpo, emissive: 0x333333 });
            const activeMat = (AppState.selectedModule === mod.id) ? selMat : matCorpo;
            const activeMatFront = (AppState.selectedModule === mod.id) ? selMat : matFrente;

            // FORÇANDO DOUBLE SIDE AQUI PARA VER DENTRO DOS MÓVEIS
            if (activeMat && activeMat.side !== undefined) activeMat.side = THREE.DoubleSide;
            if (activeMatFront && activeMatFront.side !== undefined) activeMatFront.side = THREE.DoubleSide;
            if (matCorpo && matCorpo.side !== undefined) matCorpo.side = THREE.DoubleSide;

            const getMat = (partKey, defaultMat) => { 
                if(mod.materiaisCustomizados?.estrutura?.[partKey]) { 
                    const isSelected = (AppState.selectedModule === mod.id); 
                    const bDef = MatDefs[mod.materiaisCustomizados.estrutura[partKey]]; 
                    if(!bDef) return defaultMat; 
                    const mat = new THREE.MeshStandardMaterial(bDef); 
                    if(isSelected) mat.emissive.setHex(0x333333); 
                    mat.side = THREE.DoubleSide; // Garante que customizados também sejam DoubleSide
                    return mat; 
                } 
                return defaultMat; 
            };
            
            const matTeto = getMat('teto', activeMat); 
            const matBase = getMat('base', activeMat); 
            const matEsq = getMat('lateralEsq', activeMat); 
            const matDir = getMat('lateralDir', activeMat); 
            const matFundo = getMat('fundo', activeMat);

            const criarGeo = (geo, px, py, pz, cMat, partKey) => { 
                if (partKey && mod.removedParts.includes(partKey)) return null;
                const m = new THREE.Mesh(geo, cMat); 
                m.position.set(px, py, pz); 
                m.castShadow = m.receiveShadow = true; 
                if(partKey) m.userData.partKey = partKey;
                if(cMat !== matVidro && cMat !== matLed && cMat !== matEspelho && cMat !== matTecido && !cMat.map) {
                    const lines = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), edgeMat); 
                    lines.raycast = () => {}; 
                    m.add(lines); 
                }
                g.add(m); 
                return m; 
            };
            
            const criarBloco = (gw, gh, gd, px, py, pz, cMat, partKey, cutLabel = "Estrutura") => { 
                if (partKey && mod.removedParts.includes(partKey)) return null;
                if (cMat === activeMat && cMat !== matVidro && cMat !== matLed && cMat !== matEspelho && !cMat.map) {
                    if (gw < 0.02) AppState.cutParts.push({w: Math.round(gh*1000), h: Math.round(gd*1000), label: cutLabel});
                    else if (gh < 0.02) AppState.cutParts.push({w: Math.round(gw*1000), h: Math.round(gd*1000), label: cutLabel});
                    else if (gd < 0.02) AppState.cutParts.push({w: Math.round(gw*1000), h: Math.round(gh*1000), label: cutLabel});
                }
                return criarGeo(new THREE.BoxGeometry(gw, gh, gd), px, py, pz, cMat, partKey);
            };

            const drawGlasses = (px, py, pz) => { 
                const matArmacao = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1, metalness: 0.9 }); 
                const matLente = matVidro; 
                const glGroup = new THREE.Group(); 
                const aroGeo = new THREE.TorusGeometry(0.025, 0.003, 8, 24); 
                const lenteGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.002, 24); 
                const aroE = new THREE.Mesh(aroGeo, matArmacao); aroE.position.set(-0.03, 0, 0); glGroup.add(aroE); 
                const lenteE = new THREE.Mesh(lenteGeo, matLente); lenteE.rotation.x = Math.PI/2; lenteE.position.set(-0.03, 0, 0); glGroup.add(lenteE); 
                const aroD = new THREE.Mesh(aroGeo, matArmacao); aroD.position.set(0.03, 0, 0); glGroup.add(aroD); 
                const lenteD = new THREE.Mesh(lenteGeo, matLente); lenteD.rotation.x = Math.PI/2; lenteD.position.set(0.03, 0, 0); glGroup.add(lenteD); 
                const ponte = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.02, 8), matArmacao); ponte.rotation.z = Math.PI/2; glGroup.add(ponte); 
                const hasteGeo = new THREE.CylinderGeometry(0.002, 0.002, 0.06, 8); 
                const hasteE = new THREE.Mesh(hasteGeo, matArmacao); hasteE.rotation.x = Math.PI/2; hasteE.position.set(-0.055, 0, -0.03); glGroup.add(hasteE); 
                const hasteD = new THREE.Mesh(hasteGeo, matArmacao); hasteD.rotation.x = Math.PI/2; hasteD.position.set(0.055, 0, -0.03); glGroup.add(hasteD); 
                glGroup.position.set(px, py + 0.025, pz); glGroup.rotation.x = -0.15; g.add(glGroup); 
            };

            const drawRipado = (bw, bh, px, py, pz, isRotated = false) => { 
                if (!mod.ripadoFrontal) return; 
                const qty = Math.floor(bw / 0.035); 
                for (let r = 0; r < qty; r++) { 
                    const rGeo = new THREE.BoxGeometry(isRotated ? esp : 0.02, bh, isRotated ? 0.02 : esp); 
                    const rPz = isRotated ? (pz - bw/2 + r*0.035 + 0.017) : pz; 
                    const rPx = isRotated ? px : (px - bw/2 + r*0.035 + 0.017); 
                    criarGeo(rGeo, rPx, py, rPz, activeMatFront, `ripa_${r}`); 
                } 
            };

            const drawInteractiveFronte = (gParent, isDrawer, wF, hF, dF, px, py, pz, cMat, abertura, isLeft, zDir, travelX, compKey) => {
                if (mod.removedParts.includes(compKey)) return;
                const grp = new THREE.Group(); 
                const type = isDrawer ? 'drawer' : (abertura === 'correr' ? 'door_slide' : (abertura === 'basculante' ? 'door_flap' : 'door_hinge'));
                const isOpen = mod.compStates[compKey] || false; 
                grp.userData = { isAnimatable: true, type: type, isOpen: isOpen, modId: mod.id, compKey: compKey, zDir: zDir, depth: dF, baseZ: pz, travelX: travelX, baseX: px, hinge: isLeft ? 'left' : 'right', partKey: compKey };
                
                // Força DoubleSide na frente móvel também
                if (cMat && cMat.side !== undefined) cMat.side = THREE.DoubleSide;

                const pM = new THREE.Mesh(new THREE.BoxGeometry(wF - folga, hF - folga, esp), cMat); 
                pM.castShadow = true; 
                pM.userData.partKey = compKey;
                const edges = new THREE.LineSegments(new THREE.EdgesGeometry(pM.geometry), edgeMat); 
                edges.raycast = () => {}; 
                pM.add(edges);
                
                if (isDrawer) { 
                    grp.position.set(px, py, isOpen ? (pz + dF * 0.8 * zDir) : pz); 
                    
                    // Constrói a gaveta Oca por dentro para segurar os óculos
                    const gBoxMat = MaterialFactory.getRealMaterial('mdf_branco_tx');
                    if (gBoxMat && gBoxMat.side !== undefined) gBoxMat.side = THREE.DoubleSide;
                    const gavBase = new THREE.Mesh(new THREE.BoxGeometry(wF - esp*2, 0.006, dF - esp), gBoxMat);
                    gavBase.position.set(0, -hF/2 + 0.003, -dF/2 + esp/2);
                    grp.add(gavBase);
                    
                    const gavCostas = new THREE.Mesh(new THREE.BoxGeometry(wF - esp*2, hF - esp, 0.015), gBoxMat);
                    gavCostas.position.set(0, 0, -dF + esp);
                    grp.add(gavCostas);

                    const gavEsq = new THREE.Mesh(new THREE.BoxGeometry(0.015, hF - esp, dF - esp), gBoxMat);
                    gavEsq.position.set(-wF/2 + esp, 0, -dF/2 + esp/2);
                    grp.add(gavEsq);

                    const gavDir = new THREE.Mesh(new THREE.BoxGeometry(0.015, hF - esp, dF - esp), gBoxMat);
                    gavDir.position.set(wF/2 - esp, 0, -dF/2 + esp/2);
                    grp.add(gavDir);

                    // Puxador
                    const pux = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.015, 0.02), new THREE.MeshStandardMaterial({color:0x888, metalness:1})); 
                    pux.position.set(0, hF/2 - 0.03, 0.015 * zDir); 
                    pM.add(pux); 

                    // Óculos dentro da gaveta
                    const glassesGav = SceneBuilder.createGlasses();
                    glassesGav.position.set(0, -hF/2 + 0.01, -dF/2);
                    grp.add(glassesGav);

                    grp.add(pM); 
                } else {
                    if (abertura === 'correr') { 
                        grp.position.set(isOpen ? px + travelX : px, py, pz); 
                        grp.add(pM); 
                    } else if (abertura === 'basculante') { 
                        grp.position.set(px, py + hF/2, pz); 
                        pM.position.y = -hF/2; 
                        if (isOpen) grp.rotation.x = -Math.PI / 2.2 * zDir; 
                        grp.add(pM); 
                    } else { 
                        grp.position.set(px + (isLeft ? -wF/2 : wF/2), py, pz); 
                        pM.position.x = isLeft ? wF/2 : -wF/2; 
                        const pux = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.15, 0.02), new THREE.MeshStandardMaterial({color:0x888, metalness:1})); 
                        pux.position.set(isLeft ? wF/2 - 0.04 : -wF/2 + 0.04, 0, 0.015 * zDir); 
                        pM.add(pux); 
                        if (isOpen) grp.rotation.y = (Math.PI / 1.6 * (isLeft ? -1 : 1) * zDir); 
                        grp.add(pM); 
                    }
                } 
                gParent.add(grp);
                AppState.cutParts.push({w: Math.round(wF*1000), h: Math.round(hF*1000), label: isDrawer ? 'Gaveta' : 'Porta'});
            };

            const fillStorageArea = (boxW, boxH, boxD, boxX, boxY, boxZ, portas, gavetas, layout, abertura, dobrLado, zDir, parentGroup) => {
                let startY = boxY - boxH/2, startX = boxX - boxW/2; 
                let hP = boxH, hG = boxH, wP = boxW, wG = boxW; 
                let syP = startY, syG = startY, sxP = startX, sxG = startX;
                let isInternalDrawers = (layout === 'gavetas_internas'); 
                const fixedW = mod.compW > 0 ? (mod.compW/1000) : 0; 
                const fixedH = mod.compH > 0 ? (mod.compH/1000) : 0;

                if (layout === 'ilha_dupla') {
                    const pW = fixedW || (boxW/portas); const actualH = fixedH || boxH; let currentXF = startX, currentXB = startX;
                    for (let i = 0; i < portas; i++) {
                        let isLeft = (i % 2 === 0); if (portas === 1) isLeft = (dobrLado === 'esq'); let tX = (i % 2 === 0) ? pW * 0.95 : -pW * 0.95;
                        const fKey = `porta_frente_${i}`; const bKey = `porta_tras_${i}`;
                        const cPW = mod.medidasCustomizadas?.[fKey]?.w ? (mod.medidasCustomizadas[fKey].w/1000) : pW; 
                        const cPH = mod.medidasCustomizadas?.[fKey]?.h ? (mod.medidasCustomizadas[fKey].h/1000) : actualH;
                        let matPortaFrente = mod.materiaisCustomizados?.frentes?.[fKey] ? new THREE.MeshStandardMaterial(MatDefs[mod.materiaisCustomizados.frentes[fKey]]) : activeMatFront;
                        drawInteractiveFronte(parentGroup, false, cPW, cPH, boxD, currentXF + cPW/2, startY + cPH/2, boxZ, matPortaFrente, abertura, isLeft, zDir, tX, fKey); currentXF += cPW;
                        const backZDir = zDir * -1; const backZ = boxZ + (boxD * backZDir);
                        let matPortaTras = mod.materiaisCustomizados?.frentes?.[bKey] ? new THREE.MeshStandardMaterial(MatDefs[mod.materiaisCustomizados.frentes[bKey]]) : activeMatFront;
                        drawInteractiveFronte(parentGroup, false, cPW, cPH, boxD, currentXB + cPW/2, startY + cPH/2, backZ, matPortaTras, abertura, !isLeft, backZDir, -tX, bKey); currentXB += cPW;
                    } return; 
                }

                if (gavetas > 0 && portas > 0 && !isInternalDrawers) { 
                    if (layout === 'top_drawers') { hG = boxH*0.25; hP = boxH*0.75; syP = startY; syG = startY + hP; } 
                    else if (layout === 'bottom_drawers') { hG = boxH*0.25; hP = boxH*0.75; syG = startY; syP = startY + hG; } 
                    else if (layout === 'left_drawers') { wG = boxW*0.35; wP = boxW*0.65; sxG = startX; sxP = startX + wG; } 
                    else if (layout === 'right_drawers') { wP = boxW*0.65; wG = boxW*0.35; sxP = startX; sxG = startX + wP; } 
                }
                
                if (gavetas > 0 && layout !== 'apenas_portas') { 
                    let currentY = syG; 
                    for (let i = 0; i < gavetas; i++) { 
                        const gavKey = `gaveta_${i}`; 
                        const cG_W = mod.medidasCustomizadas?.[gavKey]?.w ? (mod.medidasCustomizadas[gavKey].w/1000) : (fixedW || wG); 
                        const cG_H = mod.medidasCustomizadas?.[gavKey]?.h ? (mod.medidasCustomizadas[gavKey].h/1000) : (fixedH || (hG / gavetas)); 
                        const matGaveta = mod.materiaisCustomizados?.frentes?.[gavKey] ? new THREE.MeshStandardMaterial(MatDefs[mod.materiaisCustomizados.frentes[gavKey]]) : activeMatFront; 
                        const gZFinal = isInternalDrawers ? boxZ - (0.02 * zDir) : boxZ; 
                        drawInteractiveFronte(parentGroup, true, cG_W, cG_H, boxD, sxG + cG_W/2, currentY + cG_H/2, gZFinal, matGaveta, '', false, zDir, 0, gavKey); 
                        currentY += cG_H; 
                    } 
                }
                
                if (portas > 0 && layout !== 'apenas_gavetas') { 
                    let currentX = sxP; 
                    for (let i = 0; i < portas; i++) { 
                        const portKey = `porta_${i}`; 
                        const cP_W = mod.medidasCustomizadas?.[portKey]?.w ? (mod.medidasCustomizadas[portKey].w/1000) : (fixedW || (wP / portas)); 
                        const cP_H = mod.medidasCustomizadas?.[portKey]?.h ? (mod.medidasCustomizadas[portKey].h/1000) : (fixedH || hP); 
                        let isLeft = (i % 2 === 0); 
                        if (portas === 1) isLeft = (dobrLado === 'esq'); 
                        let tX = (i % 2 === 0) ? cP_W * 0.95 : -cP_W * 0.95; 
                        let doorZReal = boxZ + (abertura === 'correr' ? ((i % 2 === 0 ? 0.01 : 0.035) * zDir) : 0); 
                        const matPorta = mod.materiaisCustomizados?.frentes?.[portKey] ? new THREE.MeshStandardMaterial(MatDefs[mod.materiaisCustomizados.frentes[portKey]]) : activeMatFront; 
                        drawInteractiveFronte(parentGroup, false, cP_W, cP_H, boxD, currentX + cP_W/2, syP + cP_H/2, doorZReal, matPorta, abertura, isLeft, zDir, tX, portKey); 
                        currentX += cP_W; 
                    } 
                }
            };

            // ==============================================================
            // MÓDULOS DE ALTA QUALIDADE DO MERCADÃO E SHOPPING
            // ==============================================================
            if (mod.tipo === 'expositor_oculos_inclinado') {
                const baseH = h * 0.65; 
                criarBloco(w, baseH, d, 0, baseH/2, 0, matBase, "base_otica_inf");
                fillStorageArea(w, baseH, d, 0, baseH/2, d/2, 0, mod.gavetas>0?mod.gavetas:2, 'apenas_gavetas', '', '', 1, g); 
                const inclTop = 0.1; const inclH = h - baseH; 
                const sShape = new THREE.Shape(); 
                sShape.moveTo(-d/2, 0); sShape.lineTo(d/2, 0); sShape.lineTo(d/2, inclTop); sShape.lineTo(-d/2, inclH); sShape.lineTo(-d/2, 0);
                const geoIncl = new THREE.ExtrudeGeometry(sShape, { depth: w-0.04, bevelEnabled: false }); geoIncl.center(); 
                const mIncl = new THREE.Mesh(geoIncl, matBranco); 
                mIncl.position.set(0, baseH + inclH/2, 0); mIncl.rotation.y = Math.PI / 2; 
                mIncl.add(new THREE.LineSegments(new THREE.EdgesGeometry(mIncl.geometry), edgeMat)); 
                if(!mod.removedParts.includes("bloco_inclinado")) { mIncl.userData.partKey="bloco_inclinado"; g.add(mIncl); }
                const angle = Math.atan2(inclH - inclTop, d); const hip = Math.hypot(inclH - inclTop, d); const yCenterVidro = baseH + inclTop + (inclH-inclTop)/2;
                const vidroTop = new THREE.Mesh(new THREE.BoxGeometry(w, 0.01, hip + 0.1), matVidro); 
                vidroTop.position.set(0, yCenterVidro + 0.1, 0); vidroTop.rotation.x = angle; 
                if(!mod.removedParts.includes("vidro_tampa")) { vidroTop.userData.partKey="vidro_tampa"; g.add(vidroTop); }
                criarBloco(w, 0.02, 0.02, 0, h, -d/2 + 0.02, matLed, "led_inclinado"); 
                const pLight = new THREE.PointLight(0xffffff, 0.4, 2); pLight.position.set(0, baseH + inclH, 0); g.add(pLight);
                const numOculos = Math.floor((w-0.2) / 0.2); 
                for(let oc=0; oc<numOculos; oc++) { drawGlasses(-w/2 + 0.15 + (oc * 0.2), yCenterVidro + 0.02, 0); }
            }
            else if (mod.tipo === 'expositor_oculos_hexagonal') {
                const espHex = 0.08; const innerH = h * 0.7; criarBloco(w, innerH, d*0.8, 0, innerH/2, 0, matBranco, "base_hex_branca");
                const angleHex = Math.PI / 4; 
                criarBloco(w-0.1, 0.5, 0.05, 0, innerH + 0.2, d*0.3, matLed, "led_hex_frente").rotation.x = angleHex; 
                criarBloco(w-0.1, 0.5, 0.05, 0, innerH + 0.2, -d*0.3, matLed, "led_hex_tras").rotation.x = -angleHex;
                const criarMolduraHexagonal = (px, pKey) => { 
                    if (mod.removedParts.includes(pKey)) return; 
                    const hShape = new THREE.Shape(); const hd = d/2; const hh = h; 
                    hShape.moveTo(-hd, hh*0.2); hShape.lineTo(-hd*1.2, hh*0.5); hShape.lineTo(-hd, hh*0.8); hShape.lineTo(hd, hh*0.8); hShape.lineTo(hd*1.2, hh*0.5); hShape.lineTo(hd, hh*0.2); hShape.lineTo(-hd, hh*0.2); 
                    const hHole = new THREE.Path(); 
                    hHole.moveTo(-hd+espHex, hh*0.2+espHex); hHole.lineTo(hd-espHex, hh*0.2+espHex); hHole.lineTo(hd*1.2-espHex, hh*0.5); hHole.lineTo(hd-espHex, hh*0.8-espHex); hHole.lineTo(-hd+espHex, hh*0.8-espHex); hHole.lineTo(-hd*1.2+espHex, hh*0.5); hHole.lineTo(-hd+espHex, hh*0.2+espHex); 
                    hShape.holes.push(hHole); 
                    const hexMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(hShape, { depth: 0.1, bevelEnabled: false }), activeMat); 
                    hexMesh.position.set(px, 0, 0); hexMesh.rotation.y = Math.PI / 2; hexMesh.userData.partKey = pKey; 
                    hexMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(hexMesh.geometry), edgeMat)); g.add(hexMesh); 
                };
                criarMolduraHexagonal(-w/2 + 0.05, "moldura_esq"); criarMolduraHexagonal(w/2 - 0.05, "moldura_dir");
                for(let oc=0; oc<4; oc++) { drawGlasses(-w/4 + (oc * 0.2), innerH+0.05, d*0.2); drawGlasses(-w/4 + (oc * 0.2), innerH+0.05, -d*0.2); }
            }
            else if (mod.tipo === 'expositor_oculos_chillibeans') {
                const tableH = h * 0.45; criarBloco(w, tableH, d, 0, tableH/2, 0, matBranco, "mesa_chilli"); 
                criarBloco(0.2, h, d+0.05, -w/2 + 0.1, h/2, 0, matVermelho, "coluna_esq"); criarBloco(0.2, h, d+0.05, w/2 - 0.1, h/2, 0, matVermelho, "coluna_dir");
                const stepH = 0.08; const stepD = d/4;
                for(let i=0; i<3; i++) { 
                    criarBloco(w-0.5, stepH*(i+1), stepD, 0, tableH + (stepH*(i+1))/2, d/2 - stepD/2 - (i*stepD), matBranco, `st_f_${i}`); 
                    criarBloco(w-0.5, 0.015, 0.02, 0, tableH + stepH*(i+1) + 0.01, d/2 - (i*stepD) - 0.02, matVidro, `vd_f_${i}`); 
                    criarBloco(w-0.5, stepH*(i+1), stepD, 0, tableH + (stepH*(i+1))/2, -d/2 + stepD/2 + (i*stepD), matBranco, `st_t_${i}`); 
                    criarBloco(w-0.5, 0.015, 0.02, 0, tableH + stepH*(i+1) + 0.01, -d/2 + (i*stepD) + 0.02, matVidro, `vd_t_${i}`); 
                    const numOculos = Math.floor((w-0.6) / 0.2);
                    for(let oc=0; oc<numOculos; oc++) { drawGlasses(-w/2 + 0.35 + (oc * 0.2), tableH + stepH*(i+1), d/2 - stepD/2 - (i*stepD)); drawGlasses(-w/2 + 0.35 + (oc * 0.2), tableH + stepH*(i+1), -d/2 + stepD/2 + (i*stepD)); }
                }
                criarBloco(w, 0.25, d+0.05, 0, h - 0.125, 0, matBranco, "portico"); criarBloco(w-0.4, 0.2, 0.02, 0, h - 0.125, d/2 + 0.03, matEspelho, "espelho"); criarBloco(w-0.4, 0.02, d-0.1, 0, h - 0.26, 0, matLed, "luz"); 
            }
            else if (mod.tipo === 'parede_otica') {
                const fMat = MaterialFactory.getRealMaterial('amadeirado_claro'); 
                if (fMat && fMat.side !== undefined) fMat.side = THREE.DoubleSide; // Garante o double side
                criarBloco(w, h, 0.05, 0, h/2, -d/2+0.025, fMat, "fundo_parede");
                
                const baseH = h * 0.3; 
                criarBloco(w, baseH, d - 0.052, 0, baseH/2, 0.026, matBranco, "base_gaveteiro");
                fillStorageArea(w, baseH, d - 0.052, 0, baseH/2, d/2, 0, mod.gavetas>0?mod.gavetas:3, 'apenas_gavetas', '', '', 1, g);
                
                const wedgeH = 0.2;
                const wedgeShape = new THREE.Shape(); wedgeShape.moveTo(-d/2, 0); wedgeShape.lineTo(d/2, 0); wedgeShape.lineTo(-d/2, wedgeH);
                const geoWedge = new THREE.ExtrudeGeometry(wedgeShape, { depth: w, bevelEnabled: false }); geoWedge.center();
                const mWedge = new THREE.Mesh(geoWedge, matVermelho); mWedge.position.set(0, baseH + wedgeH/2, 0); mWedge.rotation.y = Math.PI / 2; g.add(mWedge);

                criarBloco(w, 0.25, 0.1, 0, h-0.125, -d/2+0.1, matLogoMercadao, "testeira"); 
                criarBloco(w-0.02, 0.15, 0.02, 0, h-0.125, -d/2+0.16, matLed, "led");
                
                const prateleiras = mod.prateleiras || 5; const espacoUtil = (h*0.85) - baseH - wedgeH;
                for(let i=1; i<=prateleiras; i++) { 
                    const py = baseH + wedgeH + (espacoUtil/(prateleiras+1))*i; 
                    criarBloco(w-0.1, 0.01, d-0.15, 0, py, -0.05, matVidro, `prat_vidro_${i}`); 
                    const numOculos = Math.floor((w-0.2) / 0.2); 
                    for(let oc=0; oc<numOculos; oc++) { drawGlasses(-w/2 + 0.15 + (oc * 0.2), py, -0.05); } 
                }
                const pLight = new THREE.PointLight(0xffffff, 0.4, 3); pLight.position.set(0, h/2, d/2); g.add(pLight);
            }
            else if (mod.tipo === 'mesa_atendimento_mercadao') {
                criarBloco(w, 0.1, d, 0, h, 0, matBranco, "tampo_mesa");
                criarBloco(0.1, h, 0.1, -w/2+0.1, h/2, -d/2+0.1, matAzul, "pe1"); criarBloco(0.1, h, 0.1, w/2-0.1, h/2, -d/2+0.1, matAzul, "pe2");
                criarBloco(0.1, h, 0.1, -w/2+0.1, h/2, d/2-0.1, matAzul, "pe3"); criarBloco(0.1, h, 0.1, w/2-0.1, h/2, d/2-0.1, matAzul, "pe4");
                const mirrorGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.01, 32); const mMirror = new THREE.Mesh(mirrorGeo, matEspelho); mMirror.rotation.x = Math.PI / 2; mMirror.position.set(0, h + 0.25, 0); g.add(mMirror);
                criarBloco(0.02, 0.2, 0.02, 0, h + 0.1, 0, MaterialFactory.getRealMaterial('metal_dourado'), "haste_espelho"); criarGeo(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 32), 0, h + 0.01, 0, MaterialFactory.getRealMaterial('metal_dourado'), "base_espelho");
            }
            else if (mod.tipo === 'balcao_mercadao') {
                criarBloco(w, h, d, 0, h/2, 0, matVermelho, "corpo_balcao"); criarBloco(w+0.05, 0.03, d+0.05, 0, h, 0, matBranco, "tampo");
                criarBloco(w-0.1, 0.2, 0.02, 0, h/2, d/2+0.01, matBranco, "detalhe_frente"); criarBloco(w-0.1, 0.02, 0.02, 0, h/2 - 0.1, d/2+0.02, matLed, "led_balcao");
                fillStorageArea(w-0.05, h-0.05, d-0.1, 0, h/2, -d/2+0.05, mod.portas, mod.gavetas, mod.layoutInterno, mod.abertura, mod.dobradicaLado, -1, g);
            }
            else if (mod.tipo === 'totem_iluminado_otica') {
                criarBloco(w, h, d, 0, h/2, 0, matBranco, "corpo_totem"); 
                criarBloco(w-0.05, h*0.8, 0.02, 0, h/2, d/2+0.01, matLogoMercadao, "led_f"); 
                criarBloco(w-0.05, h*0.8, 0.02, 0, h/2, -d/2-0.01, matLed, "led_t");
            }
            else if (mod.tipo === 'vitrine_otica') {
                const baseH = h * 0.4; const glassH = h * 0.6;
                criarBloco(w, baseH, d, 0, baseH/2, 0, matBase, "base"); criarBloco(w-0.05, 0.08, d-0.05, 0, 0.04, 0, matRodape, "rodape"); criarGeo(new THREE.BoxGeometry(w, glassH, d), 0, baseH + glassH/2, 0, matVidro, "cupula");
                const prateleiras = mod.prateleiras || 2; 
                for(let i=1; i<=prateleiras; i++) { 
                    const py = baseH + (glassH/(prateleiras+1))*i; 
                    criarBloco(w-0.05, 0.01, d-0.05, 0, py, 0, matVidro, `prat_${i}`); 
                    const numOculos = Math.floor((w-0.1) / 0.2); 
                    for(let oc=0; oc<numOculos; oc++) { drawGlasses(-w/2 + 0.1 + (oc * 0.2), py, 0); } 
                }
                criarBloco(w-0.02, 0.02, 0.02, 0, baseH + glassH - 0.02, d/2 - 0.02, matLed, "fita"); const pLight = new THREE.PointLight(0xffffff, 0.4, 2); pLight.position.set(0, baseH + glassH/2, 0); g.add(pLight);
            }
            else if (mod.tipo === 'expositor_degraus') {
                const numSteps = mod.prateleirasExternas > 0 ? mod.prateleirasExternas : 4; const stepH = h / numSteps; const stepD = d / numSteps;
                criarBloco(w, h, esp, 0, h/2, -d/2+esp/2, matFundo, "fundo_fini");
                for (let i = 0; i < numSteps; i++) { 
                    const curH = stepH * (i+1); const curZ = d/2 - stepD/2 - (i*stepD); 
                    criarBloco(w, curH, stepD, 0, curH/2, curZ, activeMat, `degrau_${i}`, "Degrau Fini"); 
                    criarBloco(w, 0.1, 0.005, 0, curH + 0.05, curZ + stepD/2 - 0.005, matVidro, `acrilico_${i}`, "Acrilico"); 
                    const numBaias = mod.gavetas > 0 ? mod.gavetas : 4; const wBaia = w / numBaias; 
                    for (let b = 1; b < numBaias; b++) { criarBloco(0.005, 0.08, stepD - 0.02, -w/2 + (b*wBaia), curH + 0.04, curZ, matVidro, `divisoria_${i}_${b}`, "Div"); } 
                    const numOculos = Math.floor((w-0.2) / 0.2); 
                    for(let oc=0; oc<numOculos; oc++) { drawGlasses(-w/2 + 0.15 + (oc * 0.2), curH, curZ); }
                }
            }
            else if (mod.tipo === 'porta_avulsa') drawInteractiveFronte(g, false, w, h, d, 0, h/2, 0, activeMatFront, mod.abertura, mod.dobradicaLado === 'esq', 1, w, 'porta_avulsa_0');
            else if (mod.tipo === 'gaveta_avulsa') drawInteractiveFronte(g, true, w, h, d, 0, h/2, 0, activeMatFront, '', false, 1, 0, 'gaveta_avulsa_0');
            else if (mod.tipo === 'painel_fixo') criarBloco(w, h, d, 0, h/2, 0, activeMatFront, "painel_f");
            else if (mod.formato === 'redondo' || mod.tipo === 'mesa_redonda' || mod.tipo === 'sofa_redondo') { 
                if (mod.tipo === 'puff' || mod.tipo === 'cadeira' || mod.tipo === 'sofa' || mod.tipo === 'sofa_redondo') { 
                    if(mod.tipo === 'sofa_redondo') { 
                        const raioSofa = w/2; const profAssento = d; 
                        const assentoShape = new THREE.Shape(); 
                        assentoShape.absarc(0, 0, raioSofa, 0, Math.PI, false); 
                        assentoShape.absarc(0, 0, raioSofa - profAssento, Math.PI, 0, true); 
                        const assentoMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(assentoShape, { depth: h * 0.4, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 }), matTecido); 
                        assentoMesh.rotation.x = Math.PI / 2; assentoMesh.position.set(0, h * 0.4, 0); g.add(assentoMesh); 
                        const encostoShape = new THREE.Shape(); 
                        encostoShape.absarc(0, 0, raioSofa, 0, Math.PI, false); 
                        encostoShape.absarc(0, 0, raioSofa - (profAssento * 0.3), Math.PI, 0, true); 
                        const encostoMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(encostoShape, { depth: h * 0.6, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 }), matTecido); 
                        encostoMesh.rotation.x = Math.PI / 2; encostoMesh.position.set(0, h, 0); g.add(encostoMesh); 
                    } else {
                        criarGeo(new THREE.CylinderGeometry(w/2, w/2, h, 32), 0, h/2, 0, activeMatFront, "puff"); 
                    }
                } else { 
                    criarGeo(new THREE.CylinderGeometry(w/2, w/2, esp, 64), 0, h-esp/2, 0, mod.tampoVidro ? matTampoPedra : matTeto, "tampo_r"); 
                    const baseR = w * 0.2; 
                    criarGeo(new THREE.CylinderGeometry(baseR, baseR, h-esp, 32), 0, (h-esp)/2, 0, (mod.material === 'mdf_azul_mercadao' ? matBranco : matBase), "base_r"); 
                } 
            } 
            else if (mod.formato === 'triangular') criarGeo(new THREE.CylinderGeometry(w/2, w/2, h, 3), 0, h/2, 0, activeMatFront, "prisma");
            else if (mod.tipo === 'sofa' || mod.tipo === 'puff' || mod.tipo === 'cadeira') { 
                if (mod.tipo === 'sofa') { 
                    criarBloco(w, h*0.4, d, 0, h*0.2, 0, matTecido, "assento"); 
                    criarBloco(esp*4, h*0.8, d, -w/2+esp*2, h*0.4, 0, matTecido, "br_e"); 
                    criarBloco(esp*4, h*0.8, d, w/2-esp*2, h*0.4, 0, matTecido, "br_d"); 
                    criarBloco(w, h*0.6, esp*4, 0, h*0.7, -d/2+esp*2, matTecido, "encosto"); 
                } else if (mod.tipo === 'cadeira') { 
                    criarBloco(w, esp*3, d, 0, h*0.5, 0, matTecido, "assento"); 
                    criarBloco(0.04, h*0.5, 0.04, -w/2+0.02, h*0.25, -d/2+0.02, matCorpo); 
                    criarBloco(0.04, h*0.5, 0.04, w/2-0.02, h*0.25, -d/2+0.02, matCorpo); 
                    criarBloco(0.04, h*0.5, 0.04, -w/2+0.02, h*0.25, d/2-0.02, matCorpo); 
                    criarBloco(0.04, h*0.5, 0.04, w/2-0.02, h*0.25, d/2-0.02, matCorpo); 
                    criarBloco(w, h*0.5, 0.04, 0, h*0.75, -d/2+0.02, matTecido, "encosto"); 
                } else criarBloco(w, h, d, 0, h/2, 0, matTecido, "corpo"); 
            }
            else if (mod.tipo === 'mesa') { 
                if (mod.tampoVidro) criarBloco(w, 0.015, d, 0, h-0.0075, 0, matVidro, "tampo"); 
                else criarBloco(w, esp*2, d, 0, h-esp, 0, matTeto, "tampo"); 
                if (mod.formato === 'dobravel') { 
                    const mGroup = new THREE.Group();
                    mGroup.position.set(0, h/2, 0);
                    // Lógica paramétrica de dobrar:
                    mGroup.userData = { 
                        isAnimatable: true, type: 'door_hinge', hinge: 'right', modId: mod.id, compKey: 'dobradiça_mesa', 
                        isOpen: mod.compStates?.['dobradiça_mesa'] || false, zDir: 1
                    };
                    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.03, h, 0.03), matBase); p1.position.set(-w/2+0.1, 0, 0); mGroup.add(p1);
                    const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, h, 0.03), matBase); p2.position.set(w/2-0.1, 0, 0); mGroup.add(p2);
                    if (mGroup.userData.isOpen) mGroup.rotation.z = Math.PI / 2; // Mesa dobra para o lado
                    g.add(mGroup);
                } else if (mod.formato === 'L_esq' || mod.formato === 'L_dir') { 
                    const isEsq = mod.formato === 'L_esq'; const wL = d, lenL = rL - d, pxL = isEsq ? -w/2+wL/2 : w/2-wL/2, pzL = -d/2 - lenL/2; 
                    criarBloco(wL, esp*2, lenL, pxL, h-esp, pzL, mod.tampoVidro ? matVidro : matTeto, "tampo_L"); 
                    criarBloco(esp, h-esp*2, d-0.1, -w/2+esp/2, h/2-esp, 0, matEsq, "pe_esq"); 
                    criarBloco(esp, h-esp*2, d-0.1, w/2-esp/2, h/2-esp, 0, matDir, "pe_dir");  
                    criarBloco(wL-0.1, h-esp*2, esp, pxL, h/2-esp, pzL - lenL/2 + esp/2, matFundo, "pe_L"); 
                } else { 
                    criarBloco(esp, h-esp*2, d-0.1, -w/2+esp/2, h/2-esp, 0, matEsq, "pe_esq"); 
                    criarBloco(esp, h-esp*2, d-0.1, w/2-esp/2, h/2-esp, 0, matDir, "pe_dir"); 
                    criarBloco(w-esp*2, h/4, esp, 0, h-h/8-esp*2, 0, matFundo, "saia"); 
                } 
            }
            else if (mod.tipo === 'painel_tv') { 
                criarBloco(w, h, esp, 0, h/2, -d/2+esp/2, matFundo, "fundo_painel"); 
                drawRipado(w, h, 0, h/2, -d/2+esp); 
                if (mod.gavetas || mod.portas) { 
                    const rH = h*0.25, rY = rH/2 + 0.1; 
                    criarBloco(w, esp, d, 0, rY-rH/2, 0, matBase, "base"); 
                    criarBloco(w, esp, d, 0, rY+rH/2, 0, matTeto, "teto"); 
                    criarBloco(esp, rH, d, -w/2+esp/2, rY, 0, matEsq, "latE"); 
                    criarBloco(esp, rH, d, w/2-esp/2, rY, 0, matDir, "latD"); 
                    fillStorageArea(w-esp*2, rH-esp*2, d, 0, rY, d/2-esp/2, mod.portas, mod.gavetas, mod.layoutInterno, mod.abertura, mod.dobradicaLado, 1, g); 
                } 
            } 
            else if (mod.formato === 'canto_obliquo' || mod.formato === 'canto_curvo') { 
                const shape = new THREE.Shape(); 
                shape.moveTo(0,0); shape.lineTo(w,0); 
                if(mod.formato === 'canto_curvo') { 
                    shape.lineTo(w, w*0.4); shape.quadraticCurveTo(w, w, w*0.4, w); shape.lineTo(0,w); 
                } else { 
                    shape.lineTo(w, w*0.5); shape.lineTo(w*0.5, w); shape.lineTo(0,w); 
                } 
                const extrudeSettings = { depth: esp, bevelEnabled: false }; 
                const geoTampo = new THREE.ExtrudeGeometry(shape, extrudeSettings); 
                geoTampo.rotateX(Math.PI/2); geoTampo.translate(-w/2, h-esp/2, d/2); 
                const mTampo = new THREE.Mesh(geoTampo, matTeto); 
                mTampo.castShadow = true; mTampo.userData.partKey = "teto"; g.add(mTampo); 
                const geoBase = new THREE.ExtrudeGeometry(shape, extrudeSettings); 
                geoBase.rotateX(Math.PI/2); geoBase.translate(-w/2, esp/2, d/2); 
                const mBase = new THREE.Mesh(geoBase, matBase); 
                mBase.castShadow = true; mBase.userData.partKey = "base"; g.add(mBase); 
                criarBloco(esp, h-esp*2, w, -w/2+esp/2, h/2, 0, matEsq, "latE"); 
                criarBloco(w, h-esp*2, esp, 0, h/2, -w/2+esp/2, matDir, "latD"); 
                if(mod.portas > 0) criarBloco(w*0.7, h-esp*2, esp, 0, h/2, d/2-esp, activeMatFront, "frente"); 
            } 
            else {
                const isBalcao = (mod.tipo === 'balcao' || mod.tipo === 'balcao_curvo'); 
                const prEx = mod.prateleirasExternas > 0 ? 0.20 : 0; const chassiD = d - prEx; 
                let faceTrabalhoZ = chassiD / 2; let faceAtendimentoZ = -chassiD / 2; let dirTrabalho = 1; let dirAtendimento = -1;
                if (mod.frentesInternas) { faceTrabalhoZ = -chassiD / 2; faceAtendimentoZ = chassiD / 2; dirTrabalho = -1; dirAtendimento = 1; }
                if (isBalcao) { faceTrabalhoZ = -faceTrabalhoZ; faceAtendimentoZ = -faceAtendimentoZ; dirTrabalho = -dirTrabalho; dirAtendimento = -dirAtendimento; }
                const zC = (faceTrabalhoZ + faceAtendimentoZ) / 2;
                
                criarBloco(w, esp, chassiD, 0, esp/2, zC, matBase, "base"); 
                criarBloco(w, esp, chassiD, 0, h-esp/2, zC, mod.tampoVidro ? matTampoPedra : matTeto, "teto"); 
                criarBloco(esp, h-esp*2, chassiD, -w/2+esp/2, h/2, zC, matEsq, "lateralEsq"); 
                criarBloco(esp, h-esp*2, chassiD, w/2-esp/2, h/2, zC, matDir, "lateralDir"); 
                criarBloco(w-esp*2, h-esp*2, 0.006, 0, h/2, faceAtendimentoZ - (0.003 * dirAtendimento), matFundo, "fundo");
                
                if (prEx > 0 || mod.ripadoFrontal) { 
                    criarBloco(w-esp*2, h-esp*2, esp, 0, h/2, faceAtendimentoZ + (esp/2 * dirAtendimento), activeMatFront, "fundo_anc"); 
                    drawRipado(w-esp*2, h-esp*2, 0, h/2, faceAtendimentoZ + (esp * dirAtendimento)); 
                    if (prEx > 0) { 
                        const epEx = (h-esp*2) / (mod.prateleirasExternas + 1); 
                        for(let i=1; i<=mod.prateleirasExternas; i++) { 
                            criarBloco(w-esp*2, esp, prEx, 0, esp+epEx*i, faceAtendimentoZ + (prEx/2 * dirAtendimento), activeMat, `prat_ext_${i}`); 
                        } 
                    } 
                }
                
                if ((mod.formato === 'L_esq' || mod.formato === 'L_dir') && rL > d) { 
                    const isE = mod.formato === 'L_esq'; const wL = chassiD, lenL = rL - d; 
                    const pxL = isE ? -w/2+wL/2 : w/2-wL/2; const pzL = faceTrabalhoZ + (lenL/2 * dirTrabalho); 
                    criarBloco(wL, esp, lenL, pxL, esp/2, pzL, matBase, "base_L"); 
                    criarBloco(wL, esp, lenL, pxL, h-esp/2, pzL, mod.tampoVidro ? matVidro : matTeto, "teto_L"); 
                    criarBloco(wL, h-esp*2, esp, pxL, h/2, pzL + (lenL/2 * dirTrabalho) - (esp/2 * dirTrabalho), matFundo, "fundo_L"); 
                    const ladoParedeX = pxL + (isE ? -wL/2 + esp/2 : wL/2 - esp/2); 
                    const ladoDentroX = pxL + (isE ? wL/2 - esp/2 : -wL/2 + esp/2); 
                    let painelX = mod.frentesInternas ? ladoParedeX : ladoDentroX; 
                    if (isBalcao) { painelX = mod.frentesInternas ? ladoDentroX : ladoParedeX; } 
                    criarBloco(esp, h-esp*2, lenL, painelX, h/2, pzL, isE ? matEsq : matDir, "lateral_L"); 
                    const returnGroup = new THREE.Group(); 
                    returnGroup.position.set(pxL, h/2, pzL); 
                    returnGroup.rotation.y = isE ? -Math.PI/2 : Math.PI/2; 
                    fillStorageArea(lenL-esp*2, h-esp*2, chassiD, 0, 0, (wL/2 * -dirTrabalho), mod.portas, mod.gavetas, mod.layoutInterno, mod.abertura, mod.dobradicaLado, dirTrabalho, returnGroup); 
                    g.add(returnGroup); 
                }
                
                if (mod.prateleiras > 0) { 
                    const epIn = (h-esp*2) / (mod.prateleiras + 1); 
                    for (let i=1; i<=mod.prateleiras; i++) { 
                        const pratInt = criarBloco(w-esp*2, esp, chassiD-0.02, 0, esp+epIn*i, zC, activeMat, `prat_int_${i}`); 
                        // Coloca óculos dentro dos armários!
                        const numOculos = Math.floor((w-0.2) / 0.2);
                        for(let oc=0; oc<numOculos; oc++) { drawGlasses(-w/2 + 0.15 + (oc * 0.2), esp+epIn*i, zC); }
                    } 
                }
                if (mod.tipo === 'guarda_roupa') { 
                    const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, w-esp*2, 16), new THREE.MeshStandardMaterial({color:0xccc, metalness:0.8})); 
                    cab.rotation.z = Math.PI/2; cab.position.set(0, h-0.15, zC); g.add(cab); 
                }
                
                fillStorageArea(w-esp*2, h-esp*2, chassiD, 0, h/2, faceTrabalhoZ, mod.portas, mod.gavetas, mod.layoutInterno, mod.abertura, mod.dobradicaLado, dirTrabalho, g);
            }

            const fx = (mod.posX !== undefined) ? mod.posX / 1000 : 0;
            const fY = (mod.posY !== undefined) ? mod.posY / 1000 : 0; 
            const fZ = (mod.posZ !== undefined) ? mod.posZ / 1000 : 0;
            
            g.position.set(fx, fY, fZ);
            g.rotation.y = THREE.MathUtils.degToRad(mod.rotY || 0);
            
            ThreeEngine.rootNode.add(g);
        });
    }
};