/**
 * src/3d/material-factory.js
 * Fábrica de materiais fotorrealistas (PBR).
 * Evolução: Parâmetros físicos rígidos para ACESFilmicToneMapping e reflexos HDRI.
 */

import * as THREE from 'three';

export const MatDefs = {
    'amadeirado_padrao': { color: 0x8B5A2B, roughness: 0.65, metalness: 0.05, label: "Amadeirado Padrão", mult: 1.0 },
    'amadeirado_claro': { color: 0xD2B48C, roughness: 0.6, metalness: 0.05, label: "MDF Madeira Clara", mult: 1.2 }, 
    'louro_freijo': { color: 0x9E7A5A, roughness: 0.65, metalness: 0.05, label: "MDF Louro Freijó", mult: 1.3 },
    'carvalho_hanover': { color: 0x8A6343, roughness: 0.65, metalness: 0.05, label: "MDF Carvalho Hanover", mult: 1.3 },
    'nogueira_cadiz': { color: 0x5C4033, roughness: 0.7, metalness: 0.05, label: "MDF Nogueira Cádiz", mult: 1.3 },
    'tauari': { color: 0xBA8C63, roughness: 0.6, metalness: 0.05, label: "MDF Tauari", mult: 1.3 },
    'madeira_fuel': { color: 0x4a2e1b, roughness: 0.55, metalness: 0.1, label: "MDF Escuro / Fuel", mult: 1.1 },
    'mdf_branco_tx': { color: 0xFAFAFA, roughness: 0.85, metalness: 0.0, label: "MDF Branco Ártico TX", mult: 1.0 },
    'mdf_branco_diamante': { color: 0xFFFFFF, roughness: 0.15, metalness: 0.1, label: "MDF Branco Diamante (Brilho)", mult: 1.4 },
    'mdf_preto_tx': { color: 0x222222, roughness: 0.85, metalness: 0.0, label: "MDF Preto TX / Nero", mult: 1.0 },
    'mdf_grafite': { color: 0x424242, roughness: 0.6, metalness: 0.05, label: "MDF Grafite", mult: 1.0 },
    'mdf_cinza_sagrado': { color: 0x808080, roughness: 0.6, metalness: 0.05, label: "MDF Cinza Sagrado", mult: 1.0 },
    'mdf_azul_petroleo': { color: 0x153E5C, roughness: 0.7, metalness: 0.0, label: "MDF Azul Petróleo", mult: 1.4 },
    'mdf_azul_mercadao': { color: 0x1E88E5, roughness: 0.35, metalness: 0.05, label: "MDF Azul Mercadão", mult: 1.1 },
    'mdf_vermelho_mercadao': { color: 0xE3000F, roughness: 0.25, metalness: 0.05, label: "MDF Vermelho Mercadão", mult: 1.2 }, 
    'mdf_verde_savia': { color: 0x556B2F, roughness: 0.65, metalness: 0.05, label: "MDF Verde Sálvia", mult: 1.4 },
    'mdf_rosa_milkshake': { color: 0xFFB6C1, roughness: 0.65, metalness: 0.05, label: "MDF Rosa Milkshake", mult: 1.4 },
    'mdf_vermelho_fini': { color: 0xE3242B, roughness: 0.35, metalness: 0.05, label: "MDF Vermelho Fini", mult: 1.2 },
    'mdf_areia': { color: 0xE8DCC4, roughness: 0.65, metalness: 0.05, label: "MDF Areia", mult: 1.0 },
    'misto': { color: 0xFAFAFA, frontColor: 0x8B5A2B, roughness: 0.65, metalness: 0.05, label: "Misto (Branco/Madeira)", mult: 1.1 },
    'vidro_incolor': { color: 0xffffff, roughness: 0.0, metalness: 0.1, transmission: 0.98, ior: 1.52, thickness: 0.02, transparent: true, opacity: 1, label: "Vidro Incolor", mult: 2.5 },
    'vidro_fume': { color: 0x333333, roughness: 0.0, metalness: 0.2, transmission: 0.85, ior: 1.52, thickness: 0.02, transparent: true, opacity: 1, label: "Vidro Fumê", mult: 2.5 },
    'vidro_bronze': { color: 0x8A6343, roughness: 0.0, metalness: 0.3, transmission: 0.85, ior: 1.52, thickness: 0.02, transparent: true, opacity: 1, label: "Vidro Bronze", mult: 2.5 },
    'vidro_reflecta': { color: 0xA08A75, roughness: 0.05, metalness: 0.9, transmission: 0.4, ior: 2.0, thickness: 0.02, transparent: true, opacity: 1, label: "Vidro Reflecta", mult: 2.5 },
    'espelho': { color: 0xffffff, roughness: 0.0, metalness: 1.0, label: "Espelho Prata" },
    'metal_preto': { color: 0x1A1A1A, roughness: 0.3, metalness: 0.9, label: "Metalon Preto", mult: 1.5 },
    'metal_dourado': { color: 0xD4AF37, roughness: 0.15, metalness: 1.0, label: "Metal Dourado / Inox", mult: 2.0 },
    'metal_cobre': { color: 0xB87333, roughness: 0.15, metalness: 1.0, label: "Metal Cobre", mult: 2.0 },
    'tecido_linho_cinza': { color: 0x9E9E9E, roughness: 1.0, metalness: 0.0, label: "Tecido Linho", mult: 1.2 },
    'tecido_couro_marrom': { color: 0x5C4033, roughness: 0.6, metalness: 0.0, label: "Couro Marrom", mult: 1.2 },
    'led': { color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.5, label: "Fita LED" },
    'rodape': { color: 0x222222, roughness: 0.8, metalness: 0.0, label: "Rodapé Preto" }
};

export const MaterialFactory = {
    createLogoTexture: (text, bgColor, textColor) => {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'bold 90px "Montserrat", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = textColor;
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const tex = new THREE.CanvasTexture(canvas);
        tex.anisotropy = 16;
        return tex;
    },

    getRealMaterial: (key) => {
        let def = MatDefs[key] || MatDefs.amadeirado_padrao;
        
        // Os vidros e acrílicos precisam de MeshPhysicalMaterial para simular volume, espessura e índice de refração (IOR) na luz HDRI
        if (key === 'vidro_incolor' || key === 'vidro_fume' || key === 'vidro_bronze' || key === 'vidro_reflecta') {
            return new THREE.MeshPhysicalMaterial(def);
        }
        return new THREE.MeshStandardMaterial(def);
    },

    getLogoMercadaoMaterial: () => {
        const tex = MaterialFactory.createLogoTexture("MERCADÃO DOS ÓCULOS", "#E3000F", "#FFFFFF");
        return new THREE.MeshStandardMaterial({ 
            map: tex, 
            emissive: 0x330000, 
            emissiveIntensity: 0.8, 
            roughness: 0.2,
            metalness: 0.1
        });
    }
};
