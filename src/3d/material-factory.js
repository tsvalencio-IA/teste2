/**
 * src/3d/material-factory.js
 * Fábrica de materiais fotorrealistas SENIORES (PBR).
 * CORREÇÃO: Sem imports destrutivos. Texturas Procedurais ativas.
 */

// Geradores de Textura Procedural (Criar realismo na placa de vídeo)
const TextureGen = {
    noiseCache: null,
    
    getNoiseMap: () => {
        if (TextureGen.noiseCache) return TextureGen.noiseCache;
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(512, 512);
        for (let i = 0; i < imgData.data.length; i += 4) {
            const val = Math.random() * 255;
            imgData.data[i] = val; imgData.data[i+1] = val; imgData.data[i+2] = val; imgData.data[i+3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(4, 4);
        TextureGen.noiseCache = tex;
        return tex;
    },

    createWoodMap: (hexColor) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024; canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = `#${hexColor.toString(16).padStart(6, '0')}`;
        ctx.fillRect(0, 0, 1024, 1024);
        
        ctx.globalAlpha = 0.05;
        for (let i = 0; i < 200; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#000000' : '#ffffff';
            ctx.beginPath();
            const y = Math.random() * 1024;
            ctx.ellipse(512, y, 1024, Math.random() * 20, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
        return tex;
    }
};

export const MatDefs = {
    'amadeirado_padrao': { color: 0x8B5A2B, roughness: 0.85, metalness: 0.0, isWood: true },
    'amadeirado_claro': { color: 0xD2B48C, roughness: 0.8, metalness: 0.0, isWood: true }, 
    'louro_freijo': { color: 0x9E7A5A, roughness: 0.85, metalness: 0.0, isWood: true },
    'carvalho_hanover': { color: 0x8A6343, roughness: 0.85, metalness: 0.0, isWood: true },
    'nogueira_cadiz': { color: 0x5C4033, roughness: 0.9, metalness: 0.0, isWood: true },
    'tauari': { color: 0xBA8C63, roughness: 0.8, metalness: 0.0, isWood: true },
    'madeira_fuel': { color: 0x3a1f11, roughness: 0.75, metalness: 0.05, isWood: true },
    
    'mdf_branco_tx': { color: 0xF5F5F5, roughness: 0.95, metalness: 0.0, isTX: true },
    'mdf_preto_tx': { color: 0x181818, roughness: 0.9, metalness: 0.0, isTX: true },
    'mdf_grafite': { color: 0x333333, roughness: 0.8, metalness: 0.0, isTX: true },
    'mdf_cinza_sagrado': { color: 0x777777, roughness: 0.8, metalness: 0.0, isTX: true },
    'mdf_azul_petroleo': { color: 0x153E5C, roughness: 0.85, metalness: 0.0, isTX: true },
    'mdf_verde_savia': { color: 0x556B2F, roughness: 0.85, metalness: 0.0, isTX: true },
    'mdf_rosa_milkshake': { color: 0xFFB6C1, roughness: 0.85, metalness: 0.0, isTX: true },
    'mdf_areia': { color: 0xE8DCC4, roughness: 0.85, metalness: 0.0, isTX: true },
    
    'mdf_branco_diamante': { color: 0xFFFFFF, roughness: 0.1, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.05 },
    'mdf_azul_mercadao': { color: 0x1565C0, roughness: 0.2, metalness: 0.0, clearcoat: 0.9, clearcoatRoughness: 0.1 },
    'mdf_vermelho_mercadao': { color: 0xD32F2F, roughness: 0.15, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.05 }, 
    'mdf_vermelho_fini': { color: 0xE3242B, roughness: 0.2, metalness: 0.0, clearcoat: 0.8, clearcoatRoughness: 0.1 },
    'misto': { color: 0xFAFAFA, frontColor: 0x8B5A2B, roughness: 0.8, metalness: 0.0, isTX: true },
    
    'vidro_incolor': { color: 0xffffff, roughness: 0.0, metalness: 0.1, transmission: 1.0, ior: 1.52, thickness: 0.05, transparent: true, opacity: 1 },
    'vidro_fume': { color: 0x222222, roughness: 0.0, metalness: 0.2, transmission: 0.8, ior: 1.52, thickness: 0.05, transparent: true, opacity: 1 },
    'vidro_bronze': { color: 0x6e4b33, roughness: 0.0, metalness: 0.3, transmission: 0.85, ior: 1.52, thickness: 0.05, transparent: true, opacity: 1 },
    'vidro_reflecta': { color: 0x8A7B6E, roughness: 0.05, metalness: 0.9, transmission: 0.3, ior: 2.0, thickness: 0.02, transparent: true, opacity: 1 },
    'espelho': { color: 0xffffff, roughness: 0.0, metalness: 1.0, clearcoat: 1.0 },
    
    'metal_preto': { color: 0x151515, roughness: 0.4, metalness: 0.9 },
    'metal_dourado': { color: 0xD4AF37, roughness: 0.2, metalness: 1.0, clearcoat: 0.5 },
    'metal_cobre': { color: 0xB87333, roughness: 0.25, metalness: 1.0, clearcoat: 0.5 },
    
    'tecido_linho_cinza': { color: 0x888888, roughness: 1.0, metalness: 0.0, isTX: true },
    'tecido_couro_marrom': { color: 0x4A3022, roughness: 0.6, metalness: 0.0, isTX: true },
    
    'led': { color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 4.0 },
    'rodape': { color: 0x111111, roughness: 0.9, metalness: 0.0, isTX: true }
};

export const MaterialFactory = {
    createLogoTexture: (text, bgColor, textColor) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024; canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = bgColor; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'bold 90px "Montserrat", sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = textColor; ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        const tex = new THREE.CanvasTexture(canvas); tex.anisotropy = 16; return tex;
    },

    getRealMaterial: (key) => {
        let def = MatDefs[key] || MatDefs.amadeirado_padrao;
        let matProps = { ...def };

        if (def.isWood) {
            matProps.map = TextureGen.createWoodMap(def.color);
            matProps.color = 0xffffff;
            matProps.bumpMap = TextureGen.getNoiseMap();
            matProps.bumpScale = 0.002;
        } else if (def.isTX) {
            matProps.bumpMap = TextureGen.getNoiseMap();
            matProps.bumpScale = 0.001; 
        }

        return new THREE.MeshPhysicalMaterial(matProps);
    },

    getLogoMercadaoMaterial: () => {
        const tex = MaterialFactory.createLogoTexture("MERCADÃO DOS ÓCULOS", "#D32F2F", "#FFFFFF");
        return new THREE.MeshPhysicalMaterial({ 
            map: tex, 
            emissive: 0x550000, 
            emissiveIntensity: 1.0, 
            roughness: 0.1,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05
        });
    }
};