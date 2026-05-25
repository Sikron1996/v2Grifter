const BASES = [
  "https://ipfs.io/ipfs/bafybeidj7wtdowj7d5vazgplrck6baqqie4jng7xqgcouaicbmnjeirx5q/",
  "https://gateway.pinata.cloud/ipfs/bafybeidj7wtdowj7d5vazgplrck6baqqie4jng7xqgcouaicbmnjeirx5q/",
  "https://cloudflare-ipfs.com/ipfs/bafybeidj7wtdowj7d5vazgplrck6baqqie4jng7xqgcouaicbmnjeirx5q/"
];

const grid = document.getElementById("grid");
const modal = document.getElementById("modal");
const cache = new Map();

function ipfsToHttp(url){
  if(!url) return "";
  if(url.startsWith("ipfs://")) return "https://ipfs.io/ipfs/" + url.replace("ipfs://","");
  return url;
}

async function getMeta(id){
  if(cache.has(id)) return cache.get(id);

  for(const base of BASES){
    try{
      const r = await fetch(base + id + ".json");
      const text = await r.text();

      if(!text.trim().startsWith("{")) continue;

      const meta = JSON.parse(text);
      meta.image = ipfsToHttp(meta.image);

      cache.set(id, meta);
      return meta;
    }catch(e){}
  }

  throw new Error("metadata failed " + id);
}

async function loadGrid(start=1, end=240){
  let html = "";
  for(let i=start;i<=end;i++){
    html += `<div class="nft" data-id="${i}">
      <img loading="lazy" id="img${i}">
      <div class="name">#${i}</div>
    </div>`;
  }
  grid.innerHTML = html;

  document.querySelectorAll(".nft").forEach(el=>{
    const id = Number(el.dataset.id);
    loadCard(id);
    el.onclick = async()=>openNFT(id);
  });
}

async function loadCard(id){
  try{
    const meta = await getMeta(id);
    document.getElementById("img"+id).src = meta.image;
    const card = document.querySelector(`.nft[data-id="${id}"] .name`);
    card.textContent = meta.name || ("v2 Grifter #" + id);
  }catch(e){}
}

async function openNFT(id){
  const meta = await getMeta(id);
  modal.classList.remove("hidden");
  document.getElementById("modalImage").src = meta.image;
  document.getElementById("modalTitle").innerText = meta.name || ("v2 Grifter #" + id);
  document.getElementById("traits").innerHTML = (meta.attributes || []).map(a=>`
    <div class="tr"><span>${a.trait_type}</span><b>${a.value}</b></div>
  `).join("");
}

document.getElementById("closeModal").onclick=()=>modal.classList.add("hidden");

async function randomNFT(){
  const id = Math.floor(Math.random()*6666)+1;
  const meta = await getMeta(id);
  document.getElementById("randomImage").src = meta.image;
}
document.getElementById("randomBtn").onclick = randomNFT;

document.getElementById("go").onclick = ()=>{
  const n = Number(document.getElementById("search").value);
  if(n>=1 && n<=6666) loadGrid(n,n);
};

loadGrid();
randomNFT();
