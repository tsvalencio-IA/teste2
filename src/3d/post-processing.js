/**
 * src/3d/post-processing.js
 * Configuração de pós-processamento mantendo a intensidade do Bloom original.
 */

export const PostProcessing = {
    composer: null,
    
    init: (renderer, scene, camera, width, height) => {
        const renderScene = new THREE.RenderPass(scene, camera);
        
        const bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(width, height), 
            1.2, 
            0.4, 
            0.85
        );
        bloomPass.threshold = 1.2;
        bloomPass.strength = 1.0;
        bloomPass.radius = 0.3;

        PostProcessing.composer = new THREE.EffectComposer(renderer);
        PostProcessing.composer.addPass(renderScene);
        PostProcessing.composer.addPass(bloomPass);
    },

    resize: (width, height) => {
        if (PostProcessing.composer) {
            PostProcessing.composer.setSize(width, height);
        }
    },

    render: () => {
        if (PostProcessing.composer) {
            PostProcessing.composer.render();
        }
    }
};
