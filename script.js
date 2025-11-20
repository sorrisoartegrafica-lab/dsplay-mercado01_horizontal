// script.js - Lógica Final para GitHub Pages (Horizontal)

const DEFAULT_VIDEO_ID = "1763501352257x910439018930896900";
const API_URL_BASE = "https://bluemdia.bubbleapps.io/version-test/api/1.1/wf/get_video_data";

const queryParams = new URLSearchParams(window.location.search);
let video_id = queryParams.get('video_id');
if (!video_id) {
    console.log("Usando ID padrão de teste.");
    video_id = DEFAULT_VIDEO_ID;
}

const API_URL_FINAL = `${API_URL_BASE}?video_id=${video_id}`;
const CACHE_KEY = `horizontal_data_${video_id}`;

let configCliente = {}, configTemplate = {}, produtos = [];
const logoImg = document.getElementById('logo-img');
const logoContainer = document.getElementById('logo-container');
const produtoImg = document.getElementById('produto-img');
const produtoImgGhost = document.getElementById('produto-img-ghost');
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

const elementosRotativos = [
    produtoContainer, seloContainer, descricaoContainer, precoContainer, infoInferiorWrapper
];

const TEMPO_SLOT_TOTAL = 15000;
const TEMPO_TRANSICAO = 800;

function formatURL(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return 'https:' + url;
}
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
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

function applyConfig(configC, configT) {
    const r = document.documentElement;
    r.style.setProperty('--cor-fundo-principal', configT.cor_01_text);
    r.style.setProperty('--cor-fundo-secundario', configT.cor_02_text);
    r.style.setProperty('--cor-texto-descricao', configT.cor_texto_01_text);
    r.style.setProperty('--cor-texto-preco', configT.cor_texto_02_text);
    r.style.setProperty('--cor-seta-qr', configT.cor_03_text || '#00A300');

    if (configC.logo_mercado_url_text) {
        logoImg.src = formatURL(configC.logo_mercado_url_text);
        logoContainer.classList.add('fadeIn');
    }
}

function updateContent(item) {
    const imgUrl = formatURL(item.imagem_produto_text);
    produtoImg.src = imgUrl;
    if(produtoImgGhost) produtoImgGhost.src = imgUrl;

    descricaoTexto.textContent = item.nome_text;
    precoTexto.textContent = item.valor_text;
    
    if(item.selo_produto_text){
        seloImg.src = formatURL(item.selo_produto_text);
        seloContainer.style.display = 'flex';
    } else {
        seloContainer.style.display = 'none';
    }

    if(item.t_qr_produto_text) qrcodeImg.src = formatURL(item.t_qr_produto_text);
    qrTexto.textContent = item.texto_qr_text || "Venha Conferir";
}

async function playEntrance() {
    elementosRotativos.forEach(el => el.className = 'elemento-animado');
    
    produtoContainer.classList.add('slideInLeft');
    setTimeout(() => { seloContainer.classList.add('stampIn'); }, 200);
    
    descricaoContainer.classList.add('slideInRight');
    precoContainer.classList.add('elasticUp');
    infoInferiorWrapper.classList.add('slideInUp');
    
    await sleep(TEMPO_TRANSICAO);
}

async function playExit() {
    elementosRotativos.forEach(el => el.className = 'elemento-animado');
    
    produtoContainer.classList.add('slideOutLeft');
    seloContainer.classList.add('slideOutLeft');
    descricaoContainer.classList.add('slideOutRight');
    precoContainer.classList.add('slideOutRight');
    infoInferiorWrapper.classList.add('slideOutLeft');
    
    await sleep(500);
}

async function startRotation(items) {
    if(!items || items.length === 0) return;
    let tempoPorItem = Math.max(5000, TEMPO_SLOT_TOTAL / items.length); 

    for (let i = 0; i < items.length; i++) {
        await preloadImagesForSlide(items[i]);
        updateContent(items[i]);
        await playEntrance();
        await sleep(tempoPorItem - TEMPO_TRANSICAO - 500);
        if (i < items.length) await playExit();
    }
    startRotation(items);
}

async function init() {
    let data = null;
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            data = JSON.parse(cached);
            runApp(data);
            fetchData().then(newData => {
                if(newData) localStorage.setItem(CACHE_KEY, JSON.stringify(newData));
            });
        } else {
            data = await fetchData();
            if(data) {
                localStorage.setItem(CACHE_KEY, JSON.stringify(data));
                runApp(data);
            }
        }
    } catch (e) { console.error(e); }
}

async function fetchData() {
    try {
        const res = await fetch(API_URL_FINAL);
        if(!res.ok) throw new Error("Erro API");
        return await res.json();
    } catch (e) { return null; }
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
