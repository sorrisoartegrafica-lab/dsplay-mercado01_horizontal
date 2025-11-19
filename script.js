// script.js - Versão Final: Preload Ativo, Preço Estático

// Configuração da API
const API_URL_BASE = "https://bluemdia.bubbleapps.io/version-test/api/1.1/wf/get_video_data";

// 1. Captura o ID da URL (Obrigatório)
const queryParams = new URLSearchParams(window.location.search);
let video_id = queryParams.get('video_id');

// Se não houver ID, usamos um apenas para teste local, ou paramos.
// Para produção, é ideal avisar que o ID é necessário.
if (!video_id) {
    console.warn("AVISO: 'video_id' não encontrado na URL. Usando ID de teste para demonstração.");
    // ID de exemplo fornecido anteriormente
    video_id = "1763501352257x910439018930896900";
}

const API_URL_FINAL = `${API_URL_BASE}?video_id=${video_id}`;
const CACHE_KEY = `player_cache_${video_id}`;

// Estado Global
let configCliente = {};
let configTemplate = {};
let produtos = [];

// Elementos DOM
const logoImg = document.getElementById('logo-img');
const logoContainer = document.getElementById('logo-container');
const produtoImg = document.getElementById('produto-img');
const produtoContainer = document.getElementById('produto-container');
const descricaoTexto = document.getElementById('descricao-texto');
const descricaoContainer = document.getElementById('descricao-container');
const precoTexto = document.getElementById('preco-texto');
const precoContainer = document.getElementById('preco-container');
const seloImg = document.getElementById('selo-img');
const seloContainer = document.getElementById('selo-container');
const qrcodeImg = document.getElementById('qrcode-img');
const qrTexto = document.getElementById('qr-texto');
const infoInferiorWrapper = document.getElementById('info-inferior-wrapper');

// Elementos que participam da rotação
const elementosRotativos = [
    produtoContainer, seloContainer, descricaoContainer, precoContainer, infoInferiorWrapper
];

const TEMPO_SLOT_TOTAL = 15000; // Tempo total da playlist
const TEMPO_TRANSICAO = 800;    // Tempo da animação CSS

// Helper para garantir HTTPS nas imagens
function formatURL(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return 'https:' + url;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Lógica de Pré-carregamento (Preload) ---
// Garante que a imagem está na memória antes de mostrar
function preloadSingleImage(url) {
    return new Promise((resolve) => {
        if (!url) { resolve(); return; }
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve(); 
        img.src = formatURL(url);
    });
}

async function preloadImagesForSlide(item) {
    const promises = [];
    if (item.imagem_produto_text) promises.push(preloadSingleImage(item.imagem_produto_text));
    if (item.selo_produto_text) promises.push(preloadSingleImage(item.selo_produto_text));
    if (item.t_qr_produto_text) promises.push(preloadSingleImage(item.t_qr_produto_text));
    await Promise.all(promises);
}
// --------------------------------------------

// Aplica cores e logo (roda uma vez ou quando muda config)
function applyConfig(configC, configT) {
    const r = document.documentElement;
    r.style.setProperty('--cor-fundo-principal', configT.cor_01_text);
    r.style.setProperty('--cor-fundo-secundario', configT.cor_02_text);
    r.style.setProperty('--cor-texto-descricao', configT.cor_texto_01_text);
    r.style.setProperty('--cor-texto-preco', configT.cor_texto_02_text);
    r.style.setProperty('--cor-seta-qr', configT.cor_03_text || '#00A300');

    if (configC.logo_mercado_url_text) {
        logoImg.src = formatURL(configC.logo_mercado_url_text);
        logoContainer.classList.add('slideInUp');
    }
}

// Atualiza os textos e imagens do DOM
function updateContent(item) {
    produtoImg.src = formatURL(item.imagem_produto_text);
    descricaoTexto.textContent = item.nome_text;
    
    // Preço direto, sem efeito de digitação
    precoTexto.textContent = item.valor_text; 
    
    if(item.selo_produto_text){
        seloImg.src = formatURL(item.selo_produto_text);
        seloContainer.style.display = 'flex';
    } else {
        seloContainer.style.display = 'none';
    }

    if(item.t_qr_produto_text) qrcodeImg.src = formatURL(item.t_qr_produto_text);
    qrTexto.textContent = item.texto_qr_text || "Confira!";
}

// Animação de Entrada
async function playEntrance() {
    elementosRotativos.forEach(el => el.className = 'elemento-animado'); // Limpa classes antigas
    
    produtoContainer.classList.add('slideInLeft');
    seloContainer.classList.add('slideInLeft');
    
    descricaoContainer.classList.add('slideInRight');
    precoContainer.classList.add('slideInRight');
    
    infoInferiorWrapper.classList.add('slideInUp');
    
    await sleep(TEMPO_TRANSICAO);
}

// Animação de Saída
async function playExit() {
    elementosRotativos.forEach(el => el.className = 'elemento-animado');
    
    produtoContainer.classList.add('slideOutLeft');
    seloContainer.classList.add('slideOutLeft');
    
    descricaoContainer.classList.add('slideOutRight');
    precoContainer.classList.add('slideOutRight');
    infoInferiorWrapper.classList.add('slideOutRight');
    
    await sleep(500); // Tempo para a animação de saída completar
}

// Loop Principal
async function startRotation(items) {
    if(!items || items.length === 0) return;

    // Divide o tempo total pela quantidade de itens, com mínimo de 5s
    let tempoPorItem = Math.max(5000, TEMPO_SLOT_TOTAL / items.length); 

    for (let i = 0; i < items.length; i++) {
        
        // 1. PRELOAD: Baixa a imagem antes de tudo
        await preloadImagesForSlide(items[i]);
        
        // 2. ATUALIZA: Muda o conteúdo escondido
        updateContent(items[i]);
        
        // 3. ENTRADA: Mostra o slide
        await playEntrance();
        
        // 4. ESPERA: Tempo de leitura na tela
        await sleep(tempoPorItem - TEMPO_TRANSICAO - 500);
        
        // 5. SAÍDA: Remove o slide (se não for o último do loop)
        if (i < items.length) { 
             await playExit();
        }
    }
    // Reinicia a playlist
    startRotation(items);
}

// Inicialização
async function init() {
    let data = null;
    try {
        // Tenta pegar do cache primeiro (carregamento instantâneo)
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            data = JSON.parse(cached);
            runApp(data);
            // Atualiza cache em segundo plano
            fetchData().then(newData => {
                if(newData) localStorage.setItem(CACHE_KEY, JSON.stringify(newData));
            });
        } else {
            // Se não tem cache, busca da rede
            data = await fetchData();
            if(data) {
                localStorage.setItem(CACHE_KEY, JSON.stringify(data));
                runApp(data);
            }
        }
    } catch (e) { console.error("Erro na inicialização:", e); }
}

async function fetchData() {
    try {
        const res = await fetch(API_URL_FINAL);
        if(!res.ok) throw new Error("Erro na API do Bubble");
        return await res.json();
    } catch (e) { 
        console.error(e); 
        return null; 
    }
}

function runApp(data) {
    if (!data || !data.response) return;
    
    configCliente = data.response.configCliente;
    configTemplate = data.response.configTemplate;
    produtos = data.response.produtos;

    if(produtos) {
        const validos = produtos.filter(p => p !== null);
        applyConfig(configCliente, configTemplate);
        startRotation(validos);
    }
}

document.addEventListener('DOMContentLoaded', init);