/**
 * src/3d/three-engine.js
 * Núcleo do WebGLRenderer.
 * CORREÇÃO PERICIAL: Mapeamento Linear (Fim do laranja), Luzes Neutras e Fundo Fixo.
 */

import { AppState } from '../core/app-state.js';
import { StorageManager } from '../core/storage-manager.js';
import { PostProcessing } from './post-processing.js';

export const ThreeEngine = {
    scene: null, camera: null, renderer: null, controls: null, rootNode: null, 
    bgPlane: null, dragPlane: null,
    raycaster: new THREE.Raycaster(), pointer: new THREE.Vector2(), pDown: {x:0,y:0}, 
    dragObj: null, pressTimer: null, isLongPress: false, isDown: false,
    
    evCache: [], prevDiff: -1, gestureMode: 'none', dragStartPoint: null,
    pmremGenerator: null, defaultEnvMap: null, bgTexture: null,

    init: () => {
        const c = document.getElementById('canvas-container'); 
        const cv = document.getElementById('cad-canvas');
        if (!c || !cv) return;

        ThreeEngine.scene = new THREE.Scene();
        
        // LUZ BRANCA NEUTRA (Nada de laranja)
        ThreeEngine.scene.add(new THREE.AmbientLight(0xffffff, 0.9)); 
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8); 
        dirLight.position.set(5, 10, 7); 
        dirLight.castShadow = true; 
        dirLight.shadow.mapSize.width = 2048; 
        dirLight.shadow.mapSize.height = 2048; 
        dirLight.shadow.bias = -0.0001; 
        ThreeEngine.scene.add(dirLight);

        ThreeEngine.camera = new THREE.PerspectiveCamera(45, c.clientWidth / c.clientHeight, 0.1, 1000); 
        ThreeEngine.camera.position.set(0, 1.6, 6); 
        
        ThreeEngine.renderer = new THREE.WebGLRenderer({ 
            canvas: cv, antialias: true, alpha: true, 
            preserveDrawingBuffer: true, powerPreference: "high-performance" 
        }); 
        
        ThreeEngine.renderer.useLegacyLights = false;
        ThreeEngine.renderer.setClearColor(0x1a1a1a, 1); 
        ThreeEngine.renderer.setSize(c.clientWidth, c.clientHeight); 
        ThreeEngine.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        ThreeEngine.renderer.shadowMap.enabled = true; 
        ThreeEngine.renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
        ThreeEngine.renderer.outputEncoding = THREE.sRGBEncoding; 
        
        // CORREÇÃO LETAL: LinearToneMapping não altera a cor original do hexadecimal.
        ThreeEngine.renderer.toneMapping = THREE.LinearToneMapping; 
        ThreeEngine.renderer.toneMappingExposure = 1.0; 
        
        // ESTÚDIO DE REFLEXOS 100% BRANCO (Mata a luz amarela do ambiente antigo)
        ThreeEngine.pmremGenerator = new THREE.PMREMGenerator(ThreeEngine.renderer);
        ThreeEngine.pmremGenerator.compileEquirectangularShader();
        const envScene = new THREE.Scene();
        envScene.background = new THREE.Color(0xf0f0f0); 
        ThreeEngine.defaultEnvMap = ThreeEngine.pmremGenerator.fromScene(envScene).texture;
        ThreeEngine.scene.environment = ThreeEngine.defaultEnvMap;

        // O OUTDOOR FOTOGRÁFICO DE FUNDO
        ThreeEngine.bgPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(100, 100),
            new THREE.MeshBasicMaterial({ color: 0xffffff, depthWrite: false })
        );
        ThreeEngine.bgPlane.renderOrder = -999; 
        ThreeEngine.bgPlane.position.set(0, 1.6, -15); 
        ThreeEngine.scene.add(ThreeEngine.bgPlane);
        ThreeEngine.bgPlane.visible = false;

        PostProcessing.init(ThreeEngine.renderer, ThreeEngine.scene, ThreeEngine.camera, c.clientWidth, c.clientHeight);

        ThreeEngine.controls = new THREE.OrbitControls(ThreeEngine.camera, cv); 
        ThreeEngine.controls.enableDamping = true; 
        ThreeEngine.controls.target.set(0, 1.0, 0); 
        
        ThreeEngine.rootNode = new THREE.Group(); 
        ThreeEngine.scene.add(ThreeEngine.rootNode);
        ThreeEngine.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        
        cv.addEventListener('pointerdown', ThreeEngine.onPtrDown, { passive: false }); 
        cv.addEventListener('pointermove', ThreeEngine.onPtrMove, { passive: false }); 
        cv.addEventListener('pointerup', ThreeEngine.onPtrUp, { passive: false });

        window.addEventListener('resize', () => { 
            if(c.clientWidth > 0 && c.clientHeight > 0) {
                ThreeEngine.camera.aspect = c.clientWidth / c.clientHeight; 
                ThreeEngine.camera.updateProjectionMatrix(); 
                ThreeEngine.renderer.setSize(c.clientWidth, c.clientHeight); 
                PostProcessing.resize(c.clientWidth, c.clientHeight);
                ThreeEngine.updateBackgroundCover();
            }
        });
        
        ThreeEngine.animate();
    },

    updateBackgroundCover: () => {
        if (!ThreeEngine.bgTexture || !ThreeEngine.bgPlane.visible) return;
        const imgW = ThreeEngine.bgTexture.image.width;
        const imgH = ThreeEngine.bgTexture.image.height;
        const aspect = imgW / imgH;
        
        const planeHeight = 40;
        const planeWidth = planeHeight * aspect;
        
        ThreeEngine.bgPlane.geometry.dispose();
        ThreeEngine.bgPlane.geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    },

    setBackgroundImage: (base64OrUrl) => {
        if (!base64OrUrl) {
            ThreeEngine.bgPlane.visible = false;
            ThreeEngine.bgTexture = null;
            return;
        }
        
        new THREE.TextureLoader().load(base64OrUrl, (tex) => {
            tex.encoding = THREE.sRGBEncoding;
            ThreeEngine.bgTexture = tex;
            ThreeEngine.bgPlane.material.map = tex;
            ThreeEngine.bgPlane.material.needsUpdate = true;
            ThreeEngine.bgPlane.visible = true;
            ThreeEngine.updateBackgroundCover();
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

        const pos = ThreeEngine.getPtr(e); 
        ThreeEngine.isDown = true; 
        ThreeEngine.pDown = pos; 
        ThreeEngine.isLongPress = false; 

        if (AppState.arActive && AppState.modoInteracao === 'projeto') { 
            return; 
        }

        ThreeEngine.raycaster.setFromCamera(ThreeEngine.pointer, ThreeEngine.camera);
        
        const meshes = [];
        ThreeEngine.rootNode.traverse(child => { if(child.isMesh) meshes.push(child); });
        const hits = ThreeEngine.raycaster.intersectObjects(meshes, false);

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
                    if (ThreeEngine.isDown && !ThreeEngine.dragObj) { 
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

        if (Math.hypot(e.clientX - ThreeEngine.pDown.x, e.clientY - ThreeEngine.pDown.y) > 15) { 
            clearTimeout(ThreeEngine.pressTimer); 
            ThreeEngine.isLongPress = false; 
            const ind = document.getElementById('longPressIndicator');
            if(ind) ind.style.display = 'none'; 
        }

        if (ThreeEngine.dragObj && (AppState.tool === 'move' || (AppState.arActive && AppState.modoInteracao === 'peca'))) {
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
        ThreeEngine.isDown = false; 
        
        const bEP = document.getElementById('btnExitPrint');
        const isPrintMode = bEP && bEP.style.display === 'block';
        if(!isPrintMode) {
            ThreeEngine.controls.enabled = true; 
        }
        
        clearTimeout(ThreeEngine.pressTimer); 
        const ind = document.getElementById('longPressIndicator');
        if(ind) ind.style.display = 'none';

        if (ThreeEngine.dragObj) { ThreeEngine.dragObj = null; return; } 
        if (ThreeEngine.isLongPress) { ThreeEngine.isLongPress = false; return; } 
        
        StorageManager.save();

        ThreeEngine.raycaster.setFromCamera(ThreeEngine.pointer, ThreeEngine.camera);

        if (AppState.tool === 'remove_part' && Math.hypot(e.clientX - ThreeEngine.pDown.x, e.clientY - ThreeEngine.pDown.y) < 15) {
            const meshes = [];
            ThreeEngine.rootNode.traverse(child => { if(child.isMesh) meshes.push(child); });
            const hits = ThreeEngine.raycaster.intersectObjects(meshes, false);
            
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
                const meshes = [];
                ThreeEngine.rootNode.traverse(child => { if(child.isMesh) meshes.push(child); });
                const hits = ThreeEngine.raycaster.intersectObjects(meshes, false);
                
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