/**
 * src/3d/three-engine.js
 * Núcleo do WebGLRenderer, controles e lógica completa de interação física/AR.
 * EVOLUÇÃO ABSOLUTA: Fundo 360º (Skybox) Fotorrealista, Interação Touch Corrigida e Erradicação de Dispose.
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
    
    evCache: [], prevDiff: -1, gestureMode: 'none', dragStartPoint: null,
    pmremGenerator: null,

    init: () => {
        const c = document.getElementById('canvas-container'); 
        const cv = document.getElementById('cad-canvas');
        
        // Se a DIV do canvas não for achada, aborta e avisa (Trava de segurança)
        if (!c || !cv) return;

        ThreeEngine.scene = new THREE.Scene();
        
        ThreeEngine.scene.add(new THREE.AmbientLight(0xffffff, 0.4)); 
        const dl = new THREE.DirectionalLight(0xffffff, 0.8); 
        dl.position.set(5, 10, 5); 
        dl.castShadow = true; 
        dl.shadow.mapSize.width = 2048; 
        dl.shadow.mapSize.height = 2048; 
        dl.shadow.bias = -0.0005; 
        ThreeEngine.scene.add(dl);
        
        ThreeEngine.camera = new THREE.PerspectiveCamera(45, c.clientWidth / c.clientHeight, 0.1, 1000); 
        ThreeEngine.camera.position.set(4, 4, 6);
        
        ThreeEngine.renderer = new THREE.WebGLRenderer({ 
            canvas: cv, 
            antialias: true, 
            alpha: true, 
            preserveDrawingBuffer: true, 
            powerPreference: "high-performance" 
        }); 
        ThreeEngine.renderer.setClearColor(0x1a1a1a, 1); 
        ThreeEngine.renderer.setSize(c.clientWidth, c.clientHeight); 
        ThreeEngine.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        ThreeEngine.renderer.shadowMap.enabled = true; 
        ThreeEngine.renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
        ThreeEngine.renderer.outputEncoding = THREE.sRGBEncoding; 
        
        // PBR Fotorrealista puro (Sem plástico)
        ThreeEngine.renderer.toneMapping = THREE.ACESFilmicToneMapping; 
        ThreeEngine.renderer.toneMappingExposure = 1.0; 
        
        // Inicializa o gerador de reflexos de ambiente da placa de vídeo
        ThreeEngine.pmremGenerator = new THREE.PMREMGenerator(ThreeEngine.renderer);
        ThreeEngine.pmremGenerator.compileEquirectangularShader();

        PostProcessing.init(ThreeEngine.renderer, ThreeEngine.scene, ThreeEngine.camera, c.clientWidth, c.clientHeight);

        ThreeEngine.controls = new THREE.OrbitControls(ThreeEngine.camera, cv); 
        ThreeEngine.controls.enableDamping = true; 
        ThreeEngine.controls.target.set(0, 0.5, 0);
        
        ThreeEngine.rootNode = new THREE.Group(); 
        ThreeEngine.scene.add(ThreeEngine.rootNode);
        ThreeEngine.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        
        cv.addEventListener('pointerdown', ThreeEngine.onPtrDown, { capture: true }); 
        cv.addEventListener('pointermove', ThreeEngine.onPtrMove, { capture: true }); 
        cv.addEventListener('pointerup', ThreeEngine.onPtrUp, { capture: true });
        cv.addEventListener('pointercancel', ThreeEngine.onPtrUp, { capture: true });
        cv.addEventListener('pointerout', ThreeEngine.onPtrUp, { capture: true });

        const stopTouch = (e) => { if (ThreeEngine.dragObj) e.stopImmediatePropagation(); };
        cv.addEventListener('touchstart', stopTouch, { capture: true, passive: false }); 
        cv.addEventListener('touchmove', stopTouch, { capture: true, passive: false }); 
        cv.addEventListener('touchend', stopTouch, { capture: true, passive: false });

        window.addEventListener('resize', () => { 
            if(c.clientWidth > 0 && c.clientHeight > 0) {
                ThreeEngine.camera.aspect = c.clientWidth / c.clientHeight; 
                ThreeEngine.camera.updateProjectionMatrix(); 
                ThreeEngine.renderer.setSize(c.clientWidth, c.clientHeight); 
                PostProcessing.resize(c.clientWidth, c.clientHeight);
            }
        });
        
        ThreeEngine.animate();
    },

    setBackgroundImage: (base64OrUrl) => {
        if (!base64OrUrl) {
            ThreeEngine.scene.background = null;
            ThreeEngine.scene.environment = null;
            return;
        }
        
        // A MÁGICA 360 GRAUS DE VERDADE
        new THREE.TextureLoader().load(base64OrUrl, (tex) => {
            tex.encoding = THREE.sRGBEncoding;
            
            // Força a imagem a envolver toda a cena 3D (Skybox 360)
            tex.mapping = THREE.EquirectangularReflectionMapping;
            
            // Fundo interativo que gira com a câmera e os dedos
            ThreeEngine.scene.background = tex;
            
            // Usa os pixels da foto para criar reflexos reais nos vidros e vernizes
            if (ThreeEngine.pmremGenerator) {
                const envMap = ThreeEngine.pmremGenerator.fromEquirectangular(tex).texture;
                ThreeEngine.scene.environment = envMap;
            }
            
            // NUNCA colocar tex.dispose() aqui, caso contrário a tela fica preta no WebGL
        });
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
        if (window.App && window.App.ui) window.App.ui.fecharHUDs();

        ThreeEngine.evCache.push(e);
        if (ThreeEngine.evCache.length > 2) { ThreeEngine.evCache = []; return; } 

        const pos = ThreeEngine.getPtr(e); 
        ThreeEngine.isDown = true; 
        ThreeEngine.downTime = Date.now();
        ThreeEngine.gestureMode = 'none';

        if (ThreeEngine.evCache.length === 2) {
            ThreeEngine.controls.enabled = false;
            clearTimeout(ThreeEngine.pressTimer);
            const elInd = document.getElementById('longPressIndicator');
            if (elInd) elInd.style.display = 'none';
            ThreeEngine.prevDiff = -1;
            ThreeEngine.gestureMode = 'pinch';
            return;
        }

        ThreeEngine.pDown = pos; 
        ThreeEngine.isLongPress = false; 
        ThreeEngine.raycaster.setFromCamera(ThreeEngine.pointer, ThreeEngine.camera);
        
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
                if(AppState.tool === 'orbit' && window.App) window.App.modules.select(obj.userData.id);
                
                if (AppState.tool === 'move' || (AppState.arActive && AppState.modoInteracao === 'peca')) { 
                    ThreeEngine.controls.enabled = false; 
                    ThreeEngine.dragPlane.constant = -obj.position.y;
                    const hitPoint = new THREE.Vector3(); 
                    ThreeEngine.raycaster.ray.intersectPlane(ThreeEngine.dragPlane, hitPoint);
                    if (hitPoint) { 
                        ThreeEngine.dragObj = { obj: obj, offset: hitPoint.clone().sub(obj.position) }; 
                        ThreeEngine.gestureMode = 'arrasto_peca';
                    } 
                }
                
                const ind = document.getElementById('longPressIndicator'); 
                if (ind) {
                    ind.style.display = 'block'; 
                    ind.style.left = (e.clientX - 40) + 'px'; 
                    ind.style.top = (e.clientY - 40) + 'px';
                }
                
                ThreeEngine.pressTimer = setTimeout(() => { 
                    if(ind) ind.style.display = 'none'; 
                    if (ThreeEngine.isDown && ThreeEngine.gestureMode !== 'arrasto_peca') { 
                        ThreeEngine.isLongPress = true; 
                        if(window.App && window.App.ui) window.App.ui.openLiveEditor(obj.userData.id); 
                    } 
                }, 600);
            }
        } else { 
            if(ThreeEngine.controls.enabled && window.App) window.App.modules.select(null); 
        }
    },

    onPtrMove: (e) => {
        if (!ThreeEngine.isDown) return; 
        ThreeEngine.getPtr(e);

        for (let i = 0; i < ThreeEngine.evCache.length; i++) {
            if (e.pointerId === ThreeEngine.evCache[i].pointerId) {
                ThreeEngine.evCache[i] = e;
                break;
            }
        }

        if (ThreeEngine.gestureMode === 'pinch' && ThreeEngine.evCache.length === 2 && AppState.arActive && AppState.modoInteracao === 'projeto') {
            const curDiff = Math.hypot(ThreeEngine.evCache[0].clientX - ThreeEngine.evCache[1].clientX, ThreeEngine.evCache[0].clientY - ThreeEngine.evCache[1].clientY);

            if (ThreeEngine.prevDiff > 0) {
                const scaleFactor = 0.005; 
                const delta = (curDiff - ThreeEngine.prevDiff) * scaleFactor;
                let newScale = ThreeEngine.rootNode.scale.x + delta;
                newScale = Math.max(0.1, Math.min(newScale, 8.0)); 
                
                ThreeEngine.rootNode.scale.setScalar(newScale);
                const elScale = document.getElementById('camScale');
                if(elScale) elScale.value = newScale; 
            }
            ThreeEngine.prevDiff = curDiff;
            return;
        }

        if (ThreeEngine.evCache.length === 1 && Math.hypot(e.clientX - ThreeEngine.pDown.x, e.clientY - ThreeEngine.pDown.y) > 15) { 
            clearTimeout(ThreeEngine.pressTimer); 
            ThreeEngine.isLongPress = false; 
            const ind = document.getElementById('longPressIndicator');
            if(ind) ind.style.display = 'none'; 
        }

        if (ThreeEngine.gestureMode === 'arrasto_projeto' && AppState.arActive && AppState.modoInteracao === 'projeto' && ThreeEngine.dragStartPoint) {
            const deltaX = e.clientX - ThreeEngine.dragStartPoint.x;
            const deltaY = e.clientY - ThreeEngine.dragStartPoint.y;
            
            const rotY_Sens = 0.006;
            const posY_Sens = 0.01;

            const newRotY = Math.max(-Math.PI * 1.5, Math.min(ThreeEngine.rootNode.rotation.y + deltaX * rotY_Sens, Math.PI * 1.5));
            ThreeEngine.rootNode.rotation.y = newRotY;
            const elRotY = document.getElementById('camRotY');
            if(elRotY) elRotY.value = newRotY;

            const newPosY = Math.max(-10, Math.min(ThreeEngine.rootNode.position.y - deltaY * posY_Sens, 10));
            ThreeEngine.rootNode.position.y = newPosY;
            const elPosY = document.getElementById('camPosY');
            if(elPosY) elPosY.value = newPosY;
            
            ThreeEngine.dragStartPoint = {x: e.clientX, y: e.clientY}; 
            return;
        }

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

                    const rW2 = AppState.roomWidth / 2000; 
                    const rD2 = AppState.roomDepth / 2000;
                    const halfW = (modData.largura || 1000) / 2000; 
                    const halfD = (modData.profundidade || 500) / 2000;
                    const snapDist = 0.4; 
                    let snapped = false;

                    if (Math.abs((tZ - halfD) - (-rD2)) < snapDist) { tZ = -rD2 + halfD; rY = 0; snapped = true; }
                    else if (Math.abs((tX - halfW) - (-rW2)) < snapDist) { tX = -rW2 + halfW; rY = -90; snapped = true; } 
                    else if (Math.abs((tX + halfW) - (rW2)) < snapDist) { tX = rW2 - halfW; rY = 90; snapped = true; } 

                    ThreeEngine.dragObj.obj.position.set(tX, tY, tZ); 
                    if(snapped) { 
                        ThreeEngine.dragObj.obj.rotation.y = rY * (Math.PI / 180); 
                        modData.rotY = rY; 
                    }
                    
                    modData.posX = tX * 1000; 
                    modData.posZ = tZ * 1000; 
                    if(window.App && window.App.ui) window.App.ui.syncToStateNoRebuild(); 
                }
            }
        }
    },

    onPtrUp: (e) => {
        for (let i = 0; i < ThreeEngine.evCache.length; i++) {
            if (ThreeEngine.evCache[i].pointerId === e.pointerId) {
                ThreeEngine.evCache.splice(i, 1);
                break;
            }
        }

        if (ThreeEngine.evCache.length < 2) { ThreeEngine.prevDiff = -1; }

        ThreeEngine.isDown = false; 
        
        const bEP = document.getElementById('btnExitPrint');
        const isPrintMode = bEP && bEP.style.display === 'block';
        if(AppState.tool === 'orbit' && !isPrintMode) ThreeEngine.controls.enabled = true; 
        
        clearTimeout(ThreeEngine.pressTimer); 
        const ind = document.getElementById('longPressIndicator');
        if(ind) ind.style.display = 'none';
        
        ThreeEngine.dragStartPoint = null;

        if (ThreeEngine.dragObj) { ThreeEngine.dragObj = null; return; } 
        if (ThreeEngine.isLongPress) { ThreeEngine.isLongPress = false; return; } 
        
        if(ThreeEngine.gestureMode === 'pinch' || ThreeEngine.gestureMode === 'arrasto_projeto') {
            ThreeEngine.gestureMode = 'none';
            StorageManager.save();
            return;
        }

        StorageManager.save();

        ThreeEngine.raycaster.setFromCamera(ThreeEngine.pointer, ThreeEngine.camera);

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
                        if(window.App && window.App.modules) window.App.modules.refreshAll(); 
                        if(window.App && window.App.ui) window.App.ui.toast(`Peça ocultada: ${target.userData.partKey}`, 'warning');
                    }
                }
            } return;
        }

        if (AppState.tool === 'add_comp' && Math.hypot(e.clientX - ThreeEngine.pDown.x, e.clientY - ThreeEngine.pDown.y) < 15) {
            const hits = ThreeEngine.raycaster.intersectObject(ThreeEngine.floorCollider);
            if (hits.length > 0 && window.App && window.App.modules) { 
                window.App.modules.add('porta_avulsa', { posX: hits[0].point.x * 1000, posY: hits[0].point.y * 1000, posZ: hits[0].point.z * 1000, largura: 400, altura: 600 }); 
                if(window.App.ui) window.App.ui.toast("Componente Inserido!"); 
            } return;
        }
        
        if (AppState.tool === 'orbit') {
            if (Math.hypot(e.clientX - ThreeEngine.pDown.x, e.clientY - ThreeEngine.pDown.y) < 15) {
                const hits = ThreeEngine.raycaster.intersectObjects(ThreeEngine.rootNode.children, true); 
                let anim = null;
                for (let h of hits) { 
                    let curr = h.object; 
                    if(curr.userData.type && curr.userData.type.includes('wall')) continue; 
                    if (curr.type === 'LineSegments' && curr.parent) curr = curr.parent; 
                    while (curr) { 
                        if (curr.userData && curr.userData.isAnimatable) { anim = curr; break; } 
                        curr = curr.parent; 
                    } 
                    if (anim) break; 
                }
                if (anim) { 
                    anim.userData.isOpen = !anim.userData.isOpen; 
                    const mod = AppState.modules.find(m => m.id === anim.userData.modId); 
                    if (mod) {
                        if (!mod.compStates) mod.compStates = {};
                        mod.compStates[anim.userData.compKey] = anim.userData.isOpen; 
                    }
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
            
            const speed_hinge = 0.08; 
            const speed_linear = 0.18; 
            
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
        
        if(ThreeEngine.controls.enabled) ThreeEngine.controls.update(); 
        PostProcessing.render(); 
    }
};
