/**
 * src/3d/material-factory.js
 * Fábrica de materiais fotorrealistas SENIORES (PBR).
 * CORREÇÃO: THREE.DoubleSide ativado para restaurar o interior das caixarias e gavetas.
 */

export const MatDefs = {
    // MDF Madeirados
    'amadeirado_padrao': { color: 0x8B5A2B, roughness: 0.7, metalness: 0.0, label: "Amadeirado Padrão" },
    'amadeirado_claro': { color: 0xD2B48C, roughness: 0.7, metalness: 0.0, label: "MDF Madeira Clara" }, 
    'louro_freijo': { color: 0x9E7A5A, roughness: 0.75, metalness: 0.0, label: "MDF Louro Freijó" },
    'carvalho_hanover': { color: 0x8A6343, roughness: 0.75, metalness: 0.0, label: "MDF Carvalho Hanover" },
    'nogueira_cadiz': { color: 0x5C4033, roughness: 0.8, metalness: 0.0, label: "MDF Nogueira Cádiz" },
    'tauari': { color: 0xBA8C63, roughness: 0.7, metalness: 0.0, label: "MDF Tauari" },
    'madeira_fuel': { color: 0x3E2723, roughness: 0.6, metalness: 0.0, label: "MDF Escuro / Fuel" },
    
    // MDF Fosco / TX
    'mdf_branco_tx': { color: 0xF5F5F5, roughness: 0.9, metalness: 0.0, label: "MDF Branco Ártico TX" },
    'mdf_preto_tx': { color: 0x1A1A1A, roughness: 0.9, metalness: 0.0, label: "MDF Preto TX / Nero" },
    'mdf_grafite': { color: 0x333333, roughness: 0.8, metalness: 0.0, label: "MDF Grafite" },
    'mdf_cinza_sagrado': { color: 0x777777, roughness: 0.8, metalness: 0.0, label: "MDF Cinza Sagrado" },
    'mdf_azul_petroleo': { color: 0x153E5C, roughness: 0.8, metalness: 0.0, label: "MDF Azul Petróleo" },
    'mdf_verde_savia': { color: 0x556B2F, roughness: 0.8, metalness: 0.0, label: "MDF Verde Sálvia" },
    'mdf_rosa_milkshake': { color: 0xFFB6C1, roughness: 0.8, metalness: 0.0, label: "MDF Rosa Milkshake" },
    'mdf_areia': { color: 0xE8DCC4, roughness: 0.8, metalness: 0.0, label: "MDF Areia" },
    
    // LACA / ALTO BRILHO (Cores Vivas Mercadão)
    'mdf_branco_diamante': { color: 0xFFFFFF, roughness: 0.05, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.02, label: "MDF Branco Diamante (Brilho)" },
    'mdf_azul_mercadao': { color: 0x1565C0, roughness: 0.05, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.02, label: "MDF Azul Mercadão" },
    'mdf_vermelho_mercadao': { color: 0xCC0000, roughness: 0.05, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.02, label: "MDF Vermelho Mercadão" }, 
    'mdf_vermelho_fini': { color: 0xE3242B, roughness: 0.05, metalness: 0.0, clearcoat: 0.8, clearcoatRoughness: 0.05, label: "MDF Vermelho Fini" },
    'misto': { color: 0xFAFAFA, frontColor: 0x8B5A2B, roughness: 0.8, metalness: 0.0, label: "Misto (Branco/Madeira)" },
    
    // Vidros Arquitetônicos
    'vidro_incolor': { color: 0xffffff, roughness: 0.0, metalness: 0.1, transmission: 1.0, ior: 1.52, thickness: 0.05, transparent: true, opacity: 1, label: "Vidro Incolor" },
    'vidro_fume': { color: 0x222222, roughness: 0.0, metalness: 0.2, transmission: 0.8, ior: 1.52, thickness: 0.05, transparent: true, opacity: 1, label: "Vidro Fumê" },
    'vidro_bronze': { color: 0x6e4b33, roughness: 0.0, metalness: 0.3, transmission: 0.85, ior: 1.52, thickness: 0.05, transparent: true, opacity: 1, label: "Vidro Bronze" },
    'vidro_reflecta': { color: 0x8A7B6E, roughness: 0.05, metalness: 0.9, transmission: 0.3, ior: 2.0, thickness: 0.02, transparent: true, opacity: 1, label: "Vidro Reflecta" },
    'espelho': { color: 0xffffff, roughness: 0.0, metalness: 1.0, clearcoat: 1.0, label: "Espelho Prata" },
    
    // Metais e Tecidos
    'metal_preto': { color: 0x151515, roughness: 0.3, metalness: 0.9, label: "Metalon Preto" },
    'metal_dourado': { color: 0xD4AF37, roughness: 0.15, metalness: 1.0, clearcoat: 0.5, label: "Metal Dourado / Inox" },
    'metal_cobre': { color: 0xB87333, roughness: 0.15, metalness: 1.0, clearcoat: 0.5, label: "Metal Cobre" },
    'tecido_linho_cinza': { color: 0x888888, roughness: 1.0, metalness: 0.0, label: "Tecido Linho" },
    'tecido_couro_marrom': { color: 0x4A3022, roughness: 0.6, metalness: 0.0, label: "Couro Marrom" },
    
    'led': { color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2.0, label: "Fita LED" },
    'rodape': { color: 0x111111, roughness: 0.9, metalness: 0.0, label: "Rodapé Preto" }
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
        const tex = new window.THREE.CanvasTexture(canvas); tex.anisotropy = 16; return tex;
    },

    getRealMaterial: (key) => {
        let def = MatDefs[key] || MatDefs.amadeirado_padrao;
        // A SOLUÇÃO DO ESPAÇO OCO ESTÁ AQUI: side: 2 força o motor a pintar o interior do móvel
        let props = { ...def, side: window.THREE.DoubleSide };
        return new window.THREE.MeshPhysicalMaterial(props);
    },

    getLogoMercadaoMaterial: () => {
        const tex = MaterialFactory.createLogoTexture("MERCADÃO DOS ÓCULOS", "#CC0000", "#FFFFFF");
        return new window.THREE.MeshPhysicalMaterial({ 
            map: tex, emissive: 0x330000, emissiveIntensity: 0.5, 
            roughness: 0.05, clearcoat: 1.0, clearcoatRoughness: 0.02,
            side: window.THREE.DoubleSide
        });
    }
};