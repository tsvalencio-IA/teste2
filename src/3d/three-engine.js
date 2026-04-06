/**
 * src/3d/three-engine.js
 * Núcleo do WebGLRenderer, controles e lógica completa de interação física/AR.
 * EVOLUÇÃO: Fotorrealismo HDRI, Fundo 3D Físico e Cinemática Suave.
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
        
        cv.addEventListener('pointerdown', ThreeEngine.onPtrDown, { capture: true }); 
        cv.addEventListener('pointermove', ThreeEngine.onPtrMove, { capture: true }); 
        cv.addEventListener('pointerup', ThreeEngine.onPtrUp, { capture: true });

        const stopTouch = (e) => { if (ThreeEngine.dragObj) e.stopImmediatePropagation(); };
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
        let cX = e.clientX; 
        let cY = e.clientY;
        if (cX === undefined && e.changedTouches && e.changedTouches.length > 0) { 
            cX = e.changedTouches[0].clientX; cY = e.changedTouches[0].clientY; 
        } else if (cX === undefined && e.touches && e.touches.length > 0) { 
            cX = e.touches[0].clientX; cY = e.touches[0].clientY; 
        }
        ThreeEngine.pointer.x = ((cX - rect.left) / rect.width) * 2 - 1; 
        ThreeEngine.pointer.y = -((cY - rect.top) / rect.height) * 2 + 1; 
        return {x: cX, y: cY};
    },

    onPtrDown: (e) => {
        const pos = ThreeEngine.getPtr(e); 
        ThreeEngine.pDown = pos; 
        ThreeEngine.isDown = true; 
        ThreeEngine.isLongPress = false; 
        ThreeEngine.downTime = Date.now();
        ThreeEngine.raycaster.setFromCamera(ThreeEngine.pointer, ThreeEngine.camera);
        
        if (AppState.arActive && AppState.modoInteracao === 'projeto') { 
            ThreeEngine.dragPlane.constant = -ThreeEngine.rootNode.position.y;
            const hitPoint = new THREE.Vector3(); 
            ThreeEngine.raycaster.ray.intersectPlane(ThreeEngine.dragPlane, hitPoint);
            if (hitPoint) { 
                ThreeEngine.controls.enabled = false; 
                ThreeEngine.dragObj = { type: 'root', offset: hitPoint.clone().sub(ThreeEngine.rootNode.position) }; 
            } 
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
                window.App.modules.select(obj.userData.id);
                
                if (AppState.tool === 'move' || (AppState.arActive && AppState.modoInteracao === 'peca')) { 
                    ThreeEngine.controls.enabled = false; 
                    ThreeEngine.dragPlane.constant = -obj.position.y;
                    const hitPoint = new THREE.Vector3(); 
                    ThreeEngine.raycaster.ray.intersectPlane(ThreeEngine.dragPlane, hitPoint);
                    if (hitPoint) { 
                        ThreeEngine.dragObj = { obj: obj, offset: hitPoint.clone().sub(obj.position) }; 
                    } 
                }
                
                let cX = e.clientX; 
                let cY = e.clientY; 
                if (cX === undefined && e.touches && e.touches.length > 0) { 
                    cX = e.touches[0].clientX; cY = e.touches[0].clientY; 
                }
                const ind = document.getElementById('longPressIndicator'); 
                ind.style.display = 'block'; 
                ind.style.left = (cX - 40) + 'px'; 
                ind.style.top = (cY - 40) + 'px';
                
                ThreeEngine.pressTimer = setTimeout(() => { 
                    ind.style.display = 'none'; 
                    if (ThreeEngine.isDown && !ThreeEngine.dragObj) { 
                        ThreeEngine.isLongPress = true; 
                        window.App.ui.openLiveEditor(obj.userData.id); 
                    } 
                }, 500);
            }
        } else { 
            window.App.modules.select(null); 
        }
    },

    onPtrMove: (e) => {
        if (!ThreeEngine.isDown) return; 
        let cX = e.clientX; 
        let cY = e.clientY; 
        if (cX === undefined && e.touches && e.touches.length > 0) { 
            cX = e.touches[0].clientX; cY = e.touches[0].clientY; 
        }
        
        if (Math.hypot(cX - ThreeEngine.pDown.x, cY - ThreeEngine.pDown.y) > 15) { 
            clearTimeout(ThreeEngine.pressTimer); 
            ThreeEngine.isLongPress = false; 
            document.getElementById('longPressIndicator').style.display = 'none'; 
        }
        
        if (ThreeEngine.dragObj && (AppState.tool === 'move' || AppState.arActive)) {
            ThreeEngine.getPtr(e); 
            ThreeEngine.raycaster.setFromCamera(ThreeEngine.pointer, ThreeEngine.camera); 
            
            if (ThreeEngine.dragObj.type === 'root') { 
                const hitPoint = new THREE.Vector3(); 
                ThreeEngine.raycaster.ray.intersectPlane(ThreeEngine.dragPlane, hitPoint);
                if(hitPoint) { 
                    const newPos = hitPoint.clone().sub(ThreeEngine.dragObj.offset); 
                    ThreeEngine.rootNode.position.x = newPos.x; 
                    ThreeEngine.rootNode.position.z = newPos.z; 
                    StorageManager.save(); 
                }
            } else { 
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
                            ThreeEngine.dragObj.obj.rotation.y = THREE.MathUtils.degToRad(rY); 
                            modData.rotY = rY; 
                        }
                        
                        modData.posX = tX * 1000; 
                        modData.posZ = tZ * 1000; 
                        window.App.ui.syncToStateNoRebuild(); 
                    }
                }
            }
        }
    },

    onPtrUp: (e) => {
        ThreeEngine.isDown = false; 
        ThreeEngine.controls.enabled = true; 
        clearTimeout(ThreeEngine.pressTimer); 
        document.getElementById('longPressIndicator').style.display = 'none';
        
        if (ThreeEngine.dragObj) { ThreeEngine.dragObj = null; return; } 
        if (ThreeEngine.isLongPress) { ThreeEngine.isLongPress = false; return; } 
        
        StorageManager.save();

        let cX = e.clientX; let cY = e.clientY; 
        if (cX === undefined && e.changedTouches && e.changedTouches.length > 0) { 
            cX = e.changedTouches[0].clientX; cY = e.changedTouches[0].clientY; 
        }

        if (AppState.tool === 'remove_part') {
            if (Math.hypot(cX - ThreeEngine.pDown.x, cY - ThreeEngine.pDown.y) < 15) {
                ThreeEngine.raycaster.setFromCamera(ThreeEngine.pointer, ThreeEngine.camera);
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
                }
            } return;
        }

        if (AppState.tool === 'add_comp') {
            if (Math.hypot(cX - ThreeEngine.pDown.x, cY - ThreeEngine.pDown.y) < 15) {
                ThreeEngine.raycaster.setFromCamera(ThreeEngine.pointer, ThreeEngine.camera); 
                const hits = ThreeEngine.raycaster.intersectObject(ThreeEngine.floorCollider);
                if (hits.length > 0) { 
                    window.App.modules.add('porta_avulsa', { posX: hits[0].point.x * 1000, posY: hits[0].point.y * 1000, posZ: hits[0].point.z * 1000, largura: 400, altura: 600 }); 
                    window.App.ui.toast("Componente Inserido!"); 
                }
            } return;
        }
        
        if (!AppState.arActive && AppState.tool === 'orbit') {
            if (Math.hypot(cX - ThreeEngine.pDown.x, cY - ThreeEngine.pDown.y) < 15) {
                ThreeEngine.raycaster.setFromCamera(ThreeEngine.pointer, ThreeEngine.camera); 
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
            const speed = 0.08; 
            
            if (a.type === 'door_hinge') { 
                const side = obj.userData.hinge === 'left' ? -1 : 1; 
                const zD = obj.userData.zDir || 1; 
                const targetAngle = a.target ? (Math.PI / 1.6 * side * zD) : 0; 
                obj.rotation.y += (targetAngle - obj.rotation.y) * speed; 
                if (Math.abs(obj.rotation.y - targetAngle) < 0.005) { obj.rotation.y = targetAngle; AppState.animacoesAtivas.splice(i, 1); } 
            } else if (a.type === 'door_flap') { 
                const zD = obj.userData.zDir || 1; 
                const targetAngle = a.target ? (-Math.PI / 2.2 * zD) : 0; 
                obj.rotation.x += (targetAngle - obj.rotation.x) * speed; 
                if (Math.abs(obj.rotation.x - targetAngle) < 0.005) { obj.rotation.x = targetAngle; AppState.animacoesAtivas.splice(i, 1); } 
            } else if (a.type === 'door_slide') { 
                const targetPos = a.target ? (obj.userData.baseX + obj.userData.travelX) : obj.userData.baseX; 
                obj.position.x += (targetPos - obj.position.x) * speed; 
                if (Math.abs(obj.position.x - targetPos) < 0.001) { obj.position.x = targetPos; AppState.animacoesAtivas.splice(i, 1); } 
            } else if (a.type === 'drawer') { 
                const zD = obj.userData.zDir || 1; 
                const targetPos = a.target ? (obj.userData.baseZ + obj.userData.depth * 0.8 * zD) : obj.userData.baseZ; 
                obj.position.z += (targetPos - obj.position.z) * speed; 
                if (Math.abs(obj.position.z - targetPos) < 0.001) { obj.position.z = targetPos; AppState.animacoesAtivas.splice(i, 1); } 
            }
        }
        
        ThreeEngine.controls.update(); 
        PostProcessing.render();
    }
};
