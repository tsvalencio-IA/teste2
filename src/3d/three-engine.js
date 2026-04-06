/**
 * src/3d/three-engine.js
 * Núcleo do WebGLRenderer, controles e lógica completa de interação física/AR.
 * EVOLUÇÃO PROFISSIONAL: Gesto-a-Gesto AR, Animação Responsiva e Câmera Limpa Interativa.
 */

import { AppState } from '../core/app-state.js';
import { StorageManager } from '../core/storage-manager.js';
import { PostProcessing } from './post-processing.js';

export const ThreeEngine = {
    scene: null, camera: null, renderer: null, controls: null, rootNode: null, 
    plane: null, roomWireframe: null, dragPlane: null,
    floorCollider: null, wallBackCollider: null, wallLeftCollider: null, wallRightCollider: null,
    raycaster: new THREE.Raycaster(), pointer: new THREE.Vector2(), pDown: {x:0,y:0}, 
    dragObj: null, pressTimer: null, isLongPress: false, downTime: 0, isDown: false,
    
    // Novo: Estados para detecção de gestos profissionais (dedos na tela)
    evCache: [], prevDiff: -1, gestureMode: 'none', dragStartPoint: null,

    bgPlane: null,

    init: () => {
        const c = document.getElementById('canvas-container'); 
        const cv = document.getElementById('cad-canvas');
        
        ThreeEngine.scene = new THREE.Scene();
        
        ThreeEngine.scene.add(new THREE.AmbientLight(0xffffff, 0.9)); 
        const dl = new THREE.DirectionalLight(0xffffff, 1.2); 
        dl.position.set(10, 20, 10); 
        dl.castShadow = true; 
        dl.shadow.mapSize.width = 2048; 
        dl.shadow.mapSize.height = 2048; 
        dl.shadow.bias = -0.0005; 
        ThreeEngine.scene.add(dl);
        
        const dl2 = new THREE.DirectionalLight(0xddeeff, 0.4); 
        dl2.position.set(-10, 10, -10); 
        ThreeEngine.scene.add(dl2);
        
        ThreeEngine.camera = new THREE.PerspectiveCamera(45, c.clientWidth / c.clientHeight, 0.1, 1000); 
        ThreeEngine.camera.position.set(4, 4, 6);
        
        ThreeEngine.renderer = new THREE.WebGLRenderer({ 
            canvas: cv, 
            antialias: true, 
            alpha: true, 
            preserveDrawingBuffer: true, 
            powerPreference: "high-performance" 
        }); 
        ThreeEngine.renderer.setClearColor(0x000000, 0); 
        ThreeEngine.renderer.setSize(c.clientWidth, c.clientHeight); 
        ThreeEngine.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        ThreeEngine.renderer.shadowMap.enabled = true; 
        ThreeEngine.renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
        ThreeEngine.renderer.outputEncoding = THREE.sRGBEncoding; 
        ThreeEngine.renderer.toneMapping = THREE.ACESFilmicToneMapping; 
        ThreeEngine.renderer.toneMappingExposure = 1.1; 
        
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/2294472375_24a3b8ef46_o.jpg', (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            texture.encoding = THREE.sRGBEncoding;
            ThreeEngine.scene.environment = texture;
        });

        ThreeEngine.bgPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 1),
            new THREE.MeshBasicMaterial({ depthWrite: false, depthTest: false, toneMapped: false })
        );
        ThreeEngine.bgPlane.renderOrder = -999; 
        ThreeEngine.camera.add(ThreeEngine.bgPlane);
        ThreeEngine.scene.add(ThreeEngine.camera);
        ThreeEngine.bgPlane.visible = false;

        PostProcessing.init(ThreeEngine.renderer, ThreeEngine.scene, ThreeEngine.camera, c.clientWidth, c.clientHeight);

        ThreeEngine.controls = new THREE.OrbitControls(ThreeEngine.camera, cv); 
        ThreeEngine.controls.enableDamping = true; 
        ThreeEngine.controls.target.set(0, 0.5, 0);
        
        ThreeEngine.rootNode = new THREE.Group(); 
        ThreeEngine.scene.add(ThreeEngine.rootNode);
        ThreeEngine.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        
        // Novo: Eventos de ponteiro (suporte para múltiplos dedos/mouse)
        cv.addEventListener('pointerdown', ThreeEngine.onPtrDown, { capture: true }); 
        cv.addEventListener('pointermove', ThreeEngine.onPtrMove, { capture: true }); 
        cv.addEventListener('pointerup', ThreeEngine.onPtrUp, { capture: true });
        cv.addEventListener('pointercancel', ThreeEngine.onPtrUp, { capture: true });
        cv.addEventListener('pointerout', ThreeEngine.onPtrUp, { capture: true });

        // Impede que toques no canvas subam e toquem em menus HTML
        const stopTouch = (e) => { e.stopImmediatePropagation(); };
        cv.addEventListener('touchstart', stopTouch, { capture: true, passive: false }); 
        cv.addEventListener('touchmove', stopTouch, { capture: true, passive: false }); 
        cv.addEventListener('touchend', stopTouch, { capture: true, passive: false });

        window.addEventListener('resize', () => { 
            ThreeEngine.camera.aspect = c.clientWidth / c.clientHeight; 
            ThreeEngine.camera.updateProjectionMatrix(); 
            ThreeEngine.renderer.setSize(c.clientWidth, c.clientHeight); 
            PostProcessing.resize(c.clientWidth, c.clientHeight);
            ThreeEngine.resizeBackground();
        });
        
        ThreeEngine.animate();
    },

    setBackgroundImage: (base64OrUrl) => {
        if (!base64OrUrl) {
            ThreeEngine.bgPlane.visible = false;
            return;
        }
        new THREE.TextureLoader().load(base64OrUrl, (tex) => {
            tex.encoding = THREE.sRGBEncoding;
            ThreeEngine.bgPlane.material.map = tex;
            ThreeEngine.bgPlane.material.needsUpdate = true;
            ThreeEngine.bgPlane.visible = true;
            ThreeEngine.resizeBackground();
        });
    },

    resizeBackground: () => {
        if (!ThreeEngine.bgPlane || !ThreeEngine.bgPlane.material.map || !ThreeEngine.bgPlane.visible) return;
        
        const aspect = window.innerWidth / window.innerHeight;
        const texAspect = ThreeEngine.bgPlane.material.map.image.width / ThreeEngine.bgPlane.material.map.image.height;
        const distance = 100; 
        
        ThreeEngine.bgPlane.position.z = -distance;
        
        const vFov = THREE.MathUtils.degToRad(ThreeEngine.camera.fov);
        const height = 2 * Math.tan(vFov / 2) * distance;
        const width = height * aspect;
        
        ThreeEngine.bgPlane.scale.set(width, height, 1);
        
        const planeAspect = width / height;
        if (planeAspect > texAspect) {
            const scaleY = texAspect / planeAspect;
            ThreeEngine.bgPlane.material.map.repeat.set(1, scaleY);
            ThreeEngine.bgPlane.material.map.offset.set(0, (1 - scaleY) / 2);
        } else {
            const scaleX = planeAspect / texAspect;
            ThreeEngine.bgPlane.material.map.repeat.set(scaleX, 1);
            ThreeEngine.bgPlane.material.map.offset.set((1 - scaleX) / 2, 0);
        }
    },

    getPtr: (e) => {
        const rect = ThreeEngine.renderer.domElement.getBoundingClientRect(); 
        const cX = e.clientX; 
        const cY = e.clientY;
        
        ThreeEngine.pointer.x = ((cX - rect.left) / rect.width) * 2 - 1; 
        ThreeEngine.pointer.y = -((cY - rect.top) / rect.height) * 2 + 1; 
        return {x: cX, y: cY};
    },

    onPtrDown: (e) => {
        ThreeEngine.evCache.push(e); // Guarda o ponto de toque
        
        if (ThreeEngine.evCache.length > 2) { ThreeEngine.evCache = []; return; } // Limpa se houver erro

        const pos = ThreeEngine.getPtr(e); 
        ThreeEngine.isDown = true; 
        ThreeEngine.downTime = Date.now();
        ThreeEngine.gestureMode = 'none';

        if (ThreeEngine.evCache.length === 2) {
            // Gesto de 2 dedos (Pinch/Zoom). Desativa OrbitControls e LongPress indicador
            ThreeEngine.controls.enabled = false;
            clearTimeout(ThreeEngine.pressTimer);
            document.getElementById('longPressIndicator').style.display = 'none';
            ThreeEngine.prevDiff = -1;
            ThreeEngine.gestureMode = 'pinch';
            return;
        }

        // Lógica de 1 dedo ou mouse
        ThreeEngine.pDown = pos; 
        ThreeEngine.isLongPress = false; 
        ThreeEngine.raycaster.setFromCamera(ThreeEngine.pointer, ThreeEngine.camera);
        
        // Se estiver no AR ajustando o projeto (Caixa Azul)
        if (AppState.arActive && AppState.modoInteracao === 'projeto') { 
            ThreeEngine.controls.enabled = false; 
            ThreeEngine.gestureMode = 'arrasto_projeto';
            ThreeEngine.dragStartPoint = {x: e.clientX, y: e.clientY};
            return; 
        }

        const hits = ThreeEngine.raycaster.intersectObjects(ThreeEngine.rootNode.children, true);
        if (hits.length > 0) {
            let target = hits[0].object; 
            if(target.userData.type && target.userData.type.includes('wall')) return;
            if (target.type === 'LineSegments' && target.parent) target = target.parent;
            
            let obj = target; 
            while (obj && !obj.userData.isRootModule && obj.parent) obj = obj.parent;
            
            if (obj && obj.userData.isRootModule) {
                // Seleção fotorrealista. Apenas destaca, não abre menu no down
                if(AppState.tool === 'orbit') window.App.modules.select(obj.userData.id);
                
                // Mover Peça (Com Snap) - Só se OrbitControls estiver habilitado (fora do Print Mode)
                if (ThreeEngine.controls.enabled && (AppState.tool === 'move' || (AppState.arActive && AppState.modoInteracao === 'peca'))) { 
                    ThreeEngine.controls.enabled = false; 
                    ThreeEngine.dragPlane.constant = -obj.position.y;
                    const hitPoint = new THREE.Vector3(); 
                    ThreeEngine.raycaster.ray.intersectPlane(ThreeEngine.dragPlane, hitPoint);
                    if (hitPoint) { 
                        ThreeEngine.dragObj = { obj: obj, offset: hitPoint.clone().sub(obj.position) }; 
                        ThreeEngine.gestureMode = 'arrasto_peca';
                    } 
                }
                
                // Indicador de LongPress Sênior
                const ind = document.getElementById('longPressIndicator'); 
                ind.style.display = 'block'; 
                ind.style.left = (e.clientX - 40) + 'px'; 
                ind.style.top = (e.clientY - 40) + 'px';
                
                ThreeEngine.pressTimer = setTimeout(() => { 
                    ind.style.display = 'none'; 
                    // Se não arrastou a peça, abre o editor
                    if (ThreeEngine.isDown && ThreeEngine.gestureMode !== 'arrasto_peca') { 
                        ThreeEngine.isLongPress = true; 
                        window.App.ui.openLiveEditor(obj.userData.id); 
                    } 
                }, 600);
            }
        } else { 
            // Clicou no nada, desseleciona
            if(ThreeEngine.controls.enabled) window.App.modules.select(null); 
        }
    },

    onPtrMove: (e) => {
        if (!ThreeEngine.isDown) return; 
        ThreeEngine.getPtr(e);

        // Atualiza cache de ponteiros para gestos
        for (let i = 0; i < ThreeEngine.evCache.length; i++) {
            if (e.pointerId === ThreeEngine.evCache[i].pointerId) {
                ThreeEngine.evCache[i] = e;
                break;
            }
        }

        // --- GESTO PROFISSIONAL COM DEDOS ---

        // Gesto 1: Pinch / Zoom (2 dedos na tela)
        if (ThreeEngine.gestureMode === 'pinch' && ThreeEngine.evCache.length === 2 && AppState.arActive && AppState.modoInteracao === 'projeto') {
            const curDiff = Math.hypot(ThreeEngine.evCache[0].clientX - ThreeEngine.evCache[1].clientX, ThreeEngine.evCache[0].clientY - ThreeEngine.evCache[1].clientY);

            if (ThreeEngine.prevDiff > 0) {
                // A Caixa Azul não pode diminuir além do real. Impõe limites de engenharia.
                const scaleFactor = 0.005; // Escala suave PBR
                const delta = (curDiff - ThreeEngine.prevDiff) * scaleFactor;
                let newScale = ThreeEngine.rootNode.scale.x + delta;
                newScale = THREE.MathUtils.clamp(newScale, 0.1, 8.0); // Limites de render fotográfico
                
                ThreeEngine.rootNode.scale.set(newScale, newScale, newScale);
                document.getElementById('camScale').value = newScale; // Sincroniza HUD oculto
            }
            ThreeEngine.prevDiff = curDiff;
            return;
        }

        // Se moveu muito, cancela o LongPress
        if (ThreeEngine.evCache.length === 1 && Math.hypot(e.clientX - ThreeEngine.pDown.x, e.clientY - ThreeEngine.pDown.y) > 15) { 
            clearTimeout(ThreeEngine.pressTimer); 
            ThreeEngine.isLongPress = false; 
            document.getElementById('longPressIndicator').style.display = 'none'; 
        }

        // Gesto 2: Arrasto no Estúdio AR (1 dedo na tela)
        if (ThreeEngine.gestureMode === 'arrasto_projeto' && AppState.arActive && AppState.modoInteracao === 'projeto' && ThreeEngine.dragStartPoint) {
            const deltaX = e.clientX - ThreeEngine.dragStartPoint.x;
            const deltaY = e.clientY - ThreeEngine.dragStartPoint.y;
            
            // Sensibilidade calibrada para exposição fotográfica ACES
            const rotY_Sens = 0.006;
            const posY_Sens = 0.01;

            // X na tela gira a Caixa Azul no eixo Y (Perspectiva)
            const newRotY = THREE.MathUtils.clamp(ThreeEngine.rootNode.rotation.y + deltaX * rotY_Sens, -Math.PI * 1.5, Math.PI * 1.5);
            ThreeEngine.rootNode.rotation.y = newRotY;
            document.getElementById('camRotY').value = newRotY;

            // Y na tela Sobe/Desce a Caixa Azul (Nível do Chão real)
            const newPosY = THREE.MathUtils.clamp(ThreeEngine.rootNode.position.y - deltaY * posY_Sens, -10, 10);
            ThreeEngine.rootNode.position.y = newPosY;
            document.getElementById('camPosY').value = newPosY;
            
            ThreeEngine.dragStartPoint = {x: e.clientX, y: e.clientY}; // Atualiza ponto de partida para continuidade suave
            return;
        }

        // Gesto 3: Mover Peça (Lógica original, agora com 'flag' de gesto)
        if (ThreeEngine.gestureMode === 'arrasto_peca' && ThreeEngine.dragObj && (AppState.tool === 'move' || AppState.arActive)) {
            ThreeEngine.raycaster.setFromCamera(ThreeEngine.pointer, ThreeEngine.camera); 
            const modData = AppState.modules.find(m => m.id === ThreeEngine.dragObj.obj.userData.id); 
            
            if (modData) {
                const hitPointMat = new THREE.Vector3(); 
                ThreeEngine.raycaster.ray.intersectPlane(ThreeEngine.dragPlane, hitPointMat);
                
                if(hitPointMat) {
                    let tX = hitPointMat.x - ThreeEngine.dragObj.offset.x; 
                    let tZ = hitPointMat.z - ThreeEngine.dragObj.offset.z; 
                    let tY = (modData.posY !== undefined) ? modData.posY / 1000 : 0; 
                    let rY = modData.rotY || 0; 

                    // Snapping Físico Líquido Sênior
                    const rW2 = AppState.roomWidth / 2000; 
                    const rD2 = AppState.roomDepth / 2000;
                    const halfW = (modData.largura || 1000) / 2000; 
                    const halfD = (modData.profundidade || 500) / 2000;
                    const snapDist = 0.4; // Distância PBR para "colar"
                    let snapped = false;

                    if (Math.abs((tZ - halfD) - (-rD2)) < snapDist) { tZ = -rD2 + halfD; rY = 0; snapped = true; }
                    else if (Math.abs((tX - halfW) - (-rW2)) < snapDist) { tX = -rW2 + halfW; rY = -90; snapped = true; } 
                    else if (Math.abs((tX + halfW) - (rW2)) < snapDist) { tX = rW2 - halfW; rY = 90; snapped = true; } 

                    ThreeEngine.dragObj.obj.position.set(tX, tY, tZ); 
                    if(snapped) { 
                        ThreeEngine.dragObj.obj.rotation.y = THREE.MathUtils.degToRad(rY); 
                        modData.rotY = rY; 
                    }
                    
                    modData.posX = tX * 1000; 
                    modData.posZ = tZ * 1000; 
                    window.App.ui.syncToStateNoRebuild(); 
                }
            }
        }
    },

    onPtrUp: (e) => {
        // Remove ponteiro do cache
        for (let i = 0; i < ThreeEngine.evCache.length; i++) {
            if (ThreeEngine.evCache[i].pointerId === e.pointerId) {
                ThreeEngine.evCache.splice(i, 1);
                break;
            }
        }

        if (ThreeEngine.evCache.length < 2) { ThreeEngine.prevDiff = -1; }

        ThreeEngine.isDown = false; 
        
        // Reabilita OrbitControls e salva estado apenas se não estiver no "Câmera Limpa"
        if(!AppState.isPrintModeActive) ThreeEngine.controls.enabled = true; 
        
        clearTimeout(ThreeEngine.pressTimer); 
        document.getElementById('longPressIndicator').style.display = 'none';
        
        ThreeEngine.dragStartPoint = null;

        // Limpa estado de arrasto de peça
        if (ThreeEngine.dragObj) { ThreeEngine.dragObj = null; return; } 
        if (ThreeEngine.isLongPress) { ThreeEngine.isLongPress = false; return; } 
        
        // Se finalizou um gesto AR, salva
        if(ThreeEngine.gestureMode === 'pinch' || ThreeEngine.gestureMode === 'arrasto_projeto') {
            ThreeEngine.gestureMode = 'none';
            StorageManager.save();
            return;
        }

        StorageManager.save();

        // --- LÓGICA DE CLIQUE ÚNICO (TOQUE E ABRIR) ---
        ThreeEngine.raycaster.setFromCamera(ThreeEngine.pointer, ThreeEngine.camera);

        // Borracha Master (Ocultar Peça)
        if (AppState.tool === 'remove_part' && Math.hypot(e.clientX - ThreeEngine.pDown.x, e.clientY - ThreeEngine.pDown.y) < 15) {
            const hits = ThreeEngine.raycaster.intersectObjects(ThreeEngine.rootNode.children, true);
            if (hits.length > 0) {
                let target = hits[0].object; 
                if(target.userData.type && target.userData.type.includes('wall')) return;
                if (target.type === 'LineSegments' && target.parent) target = target.parent;
                let modGroup = target; 
                while(modGroup && !modGroup.userData.isRootModule) modGroup = modGroup.parent;
                if (modGroup && target.userData && target.userData.partKey) {
                    const mod = AppState.modules.find(m => m.id === modGroup.userData.id);
                    if (mod && !mod.removedParts?.includes(target.userData.partKey)) {
                        if(!mod.removedParts) mod.removedParts = [];
                        mod.removedParts.push(target.userData.partKey); 
                        window.App.modules.refreshAll(); 
                        window.App.ui.toast(`Peça ocultada: ${target.userData.partKey}`, 'warning');
                    }
                }
            } return;
        }

        // Inserir Manualmente no Clique
        if (AppState.tool === 'add_comp' && Math.hypot(e.clientX - ThreeEngine.pDown.x, e.clientY - ThreeEngine.pDown.y) < 15) {
            const hits = ThreeEngine.raycaster.intersectObject(ThreeEngine.floorCollider);
            if (hits.length > 0) { 
                window.App.modules.add('porta_avulsa', { posX: hits[0].point.x * 1000, posY: hits[0].point.y * 1000, posZ: hits[0].point.z * 1000, largura: 400, altura: 600 }); 
                window.App.ui.toast("Componente Inserido!"); 
            } return;
        }
        
        // CORREÇÃO: "Toque & Abrir Fotorrealista" Funciona sempre, até no Câmera Limpa
        if (AppState.tool === 'orbit') {
            if (Math.hypot(e.clientX - ThreeEngine.pDown.x, e.clientY - ThreeEngine.pDown.y) < 15) {
                const hits = ThreeEngine.raycaster.intersectObjects(ThreeEngine.rootNode.children, true); 
                let anim = null;
                for (let h of hits) { 
                    let curr = h.object; 
                    if(curr.userData.type && curr.userData.type.includes('wall')) continue; 
                    if (curr.type === 'LineSegments' && curr.parent) curr = curr.parent; 
                    while (curr) { 
                        // Procura por peça interativa (dobra, corre, pisca, dobras)
                        if (curr.userData && curr.userData.isAnimatable) { anim = curr; break; } 
                        curr = curr.parent; 
                    } 
                    if (anim) break; 
                }
                if (anim) { 
                    anim.userData.isOpen = !anim.userData.isOpen; 
                    const mod = AppState.modules.find(m => m.id === anim.userData.modId); 
                    if (mod) mod.compStates[anim.userData.compKey] = anim.userData.isOpen; 
                    AppState.animacoesAtivas = AppState.animacoesAtivas.filter(a => a.obj !== anim); 
                    AppState.animacoesAtivas.push({ obj: anim, type: anim.userData.type, target: anim.userData.isOpen }); 
                    StorageManager.save(); 
                }
            }
        }
    },

    highlightSelection: (id) => { 
        ThreeEngine.rootNode.children.forEach(modGroup => { 
            if(modGroup.userData.isRootModule) { 
                const isSelected = (modGroup.userData.id === id); 
                modGroup.traverse(child => { 
                    if (child.isMesh && child.material && !child.material.transparent && !child.material.map && child.material.label !== "Fita LED") { 
                        if (child.material.emissive) child.material.emissive.setHex(isSelected ? 0x333333 : 0x000000); 
                    } 
                }); 
            } 
        }); 
    },

    animate: () => {
        requestAnimationFrame(ThreeEngine.animate);
        
        for (let i = AppState.animacoesAtivas.length - 1; i >= 0; i--) {
            const a = AppState.animacoesAtivas[i]; 
            const obj = a.obj; 
            
            // CORREÇÃO: Animação Sênior Responsiva. Acelerei gavetas e corre de 0.08 para 0.18.
            const speed_hinge = 0.08; // Dobradiça suave
            const speed_linear = 0.18; // Gaveta responsiva PBR
            
            if (a.type === 'door_hinge') { 
                const side = obj.userData.hinge === 'left' ? -1 : 1; 
                const zD = obj.userData.zDir || 1; 
                const targetAngle = a.target ? (Math.PI / 1.6 * side * zD) : 0; 
                obj.rotation.y += (targetAngle - obj.rotation.y) * speed_hinge; 
                if (Math.abs(obj.rotation.y - targetAngle) < 0.005) { obj.rotation.y = targetAngle; AppState.animacoesAtivas.splice(i, 1); } 
            } else if (a.type === 'door_flap') { 
                const zD = obj.userData.zDir || 1; 
                const targetAngle = a.target ? (-Math.PI / 2.2 * zD) : 0; 
                obj.rotation.x += (targetAngle - obj.rotation.x) * speed_hinge; 
                if (Math.abs(obj.rotation.x - targetAngle) < 0.005) { obj.rotation.x = targetAngle; AppState.animacoesAtivas.splice(i, 1); } 
            } else if (a.type === 'door_slide') { 
                const targetPos = a.target ? (obj.userData.baseX + obj.userData.travelX) : obj.userData.baseX; 
                obj.position.x += (targetPos - obj.position.x) * speed_linear; 
                if (Math.abs(obj.position.x - targetPos) < 0.001) { obj.position.x = targetPos; AppState.animacoesAtivas.splice(i, 1); } 
            } else if (a.type === 'drawer') { 
                const zD = obj.userData.zDir || 1; 
                const targetPos = a.target ? (obj.userData.baseZ + obj.userData.depth * 0.8 * zD) : obj.userData.baseZ; 
                obj.position.z += (targetPos - obj.position.z) * speed_linear; 
                if (Math.abs(obj.position.z - targetPos) < 0.001) { obj.position.z = targetPos; AppState.animacoesAtivas.splice(i, 1); } 
            }
        }
        
        // Se OrbitControls estiver ligado, atualiza o damping fotorealista
        if(ThreeEngine.controls.enabled) ThreeEngine.controls.update(); 
        PostProcessing.render(); // Render fotorrealista ativo
    }
};
