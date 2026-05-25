import { ethers } from "https://esm.sh/ethers@6.13.4";
import EthereumProvider from "https://esm.sh/@walletconnect/ethereum-provider@2.17.2";
const CONTRACT_ADDRESS="PASTE_CONTRACT_ADDRESS_HERE";
const PROJECT_ID="fe55ea601c3e7e0925c0b33723d6b158";
const READ_RPC="https://ethereum.publicnode.com";
const MAX_SUPPLY=6666;
const BASE_METADATA="https://ipfs.io/ipfs/bafybeidj7wtdowj7d5vazgplrck6baqqie4jng7xqgcouaicbmnjeirx5q/";
const ABI=["function totalSupply() view returns (uint256)","function tokenURI(uint256 tokenId) view returns (string)"];
const MAINNET_HEX="0x1",MAINNET_ID=1;
let wcProvider,provider,signer,readProvider,readContract,account;
const metaCache=new Map();
const $=id=>document.getElementById(id), walletModal=$("walletModal"), detailModal=$("detailModal");
function openWallet(){walletModal.classList.remove("hidden")}function closeWallet(){walletModal.classList.add("hidden")}function closeDetail(){detailModal.classList.add("hidden")}
function ipfsToHttp(u){return u&&u.startsWith("ipfs://")?"https://ipfs.io/ipfs/"+u.replace("ipfs://",""):u}
function setLinks(){if(CONTRACT_ADDRESS!=="PASTE_CONTRACT_ADDRESS_HERE"){$("etherscanLink").href="https://etherscan.io/address/"+CONTRACT_ADDRESS;$("openseaLink").href="https://opensea.io/assets/ethereum/"+CONTRACT_ADDRESS}}
function initRead(){if(CONTRACT_ADDRESS==="PASTE_CONTRACT_ADDRESS_HERE")return false;readProvider=new ethers.JsonRpcProvider(READ_RPC);readContract=new ethers.Contract(CONTRACT_ADDRESS,ABI,readProvider);return true}
async function loadSupply(){try{let s=MAX_SUPPLY;if(readContract)s=Number(await readContract.totalSupply());$("mintedText").textContent=s.toLocaleString();$("remainingText").textContent=Math.max(0,MAX_SUPPLY-s).toLocaleString()}catch(e){}}
async function getMeta(id){if(metaCache.has(id))return metaCache.get(id);let url=BASE_METADATA+id+".json";if(readContract){try{url=ipfsToHttp(await readContract.tokenURI(id))}catch(e){}}const meta=await(await fetch(url)).json();meta.image=ipfsToHttp(meta.image);metaCache.set(id,meta);return meta}
function renderGrid(){const grid=$("grid"),q=$("searchId").value.trim();let ids=[];if(q){const n=Number(q);if(n>=1&&n<=MAX_SUPPLY)ids=[n]}else{for(let i=1;i<=MAX_SUPPLY;i++)ids.push(i)}grid.innerHTML=ids.map(id=>`<article class="card" data-id="${id}"><span class="id">#${id}</span><img loading="lazy" data-id="${id}" src=""><div class="name">v2 Grifter #${id}</div></article>`).join("");document.querySelectorAll(".card").forEach(c=>c.onclick=()=>openDetail(Number(c.dataset.id)));observeImages()}
function observeImages(){const root=$("grid");const io=new IntersectionObserver(entries=>entries.forEach(async entry=>{if(entry.isIntersecting){const img=entry.target,id=Number(img.dataset.id);try{const meta=await getMeta(id);img.src=meta.image;img.closest(".card").querySelector(".name").textContent=meta.name||("v2 Grifter #"+id)}catch(e){}io.unobserve(img)}}),{root,rootMargin:"250px"});document.querySelectorAll(".card img").forEach(img=>io.observe(img))}
function attrHtml(attrs){return(attrs||[]).map(a=>`<div class="attr"><span>${a.trait_type}</span><b>${a.value}</b></div>`).join("")||"<div class='attr'><span>Metadata</span><b>No attributes</b></div>"}
async function openDetail(id){try{const meta=await getMeta(id);$("detailImage").src=meta.image;$("detailName").textContent=meta.name||("v2 Grifter #"+id);$("detailId").textContent="#"+id;$("detailDescription").textContent=meta.description||"";$("attributes").innerHTML=attrHtml(meta.attributes);$("detailOpenSea").href=CONTRACT_ADDRESS==="PASTE_CONTRACT_ADDRESS_HERE"?"#":`https://opensea.io/assets/ethereum/${CONTRACT_ADDRESS}/${id}`;detailModal.classList.remove("hidden")}catch(e){alert("Metadata load error: "+e.message)}}
async function randomGrifter(){const id=Math.floor(Math.random()*MAX_SUPPLY)+1;const meta=await getMeta(id);$("randomImage").src=meta.image;$("randomName").textContent=meta.name||("v2 Grifter #"+id);$("randomAttributes").innerHTML=attrHtml((meta.attributes||[]).slice(0,4));$("randomOpenSea").href=CONTRACT_ADDRESS==="PASTE_CONTRACT_ADDRESS_HERE"?"#":`https://opensea.io/assets/ethereum/${CONTRACT_ADDRESS}/${id}`}
async function setup(p,acc){provider=new ethers.BrowserProvider(p);signer=await provider.getSigner();account=acc||await signer.getAddress();$("wallet").textContent=account.slice(0,6)+"..."+account.slice(-4);closeWallet()}
async function connectBrowser(){try{if(!window.ethereum)throw new Error("Wallet extension not found");if(await window.ethereum.request({method:"eth_chainId"})!==MAINNET_HEX)await window.ethereum.request({method:"wallet_switchEthereumChain",params:[{chainId:MAINNET_HEX}]});const acc=await window.ethereum.request({method:"eth_requestAccounts"});await setup(window.ethereum,acc[0])}catch(e){alert(e.shortMessage||e.message)}}
async function connectWC(){try{wcProvider=await EthereumProvider.init({projectId:PROJECT_ID,chains:[MAINNET_ID],optionalChains:[MAINNET_ID],showQrModal:true});await wcProvider.connect();await setup(wcProvider,(wcProvider.accounts||[])[0])}catch(e){alert(e.shortMessage||e.message)}}
$("connectWalletBtn").onclick=openWallet;$("closeWalletBtn").onclick=closeWallet;$("browserWalletBtn").onclick=connectBrowser;$("walletConnectBtn").onclick=connectWC;$("goBtn").onclick=renderGrid;$("searchId").oninput=renderGrid;$("loadVisibleBtn").onclick=renderGrid;$("closeDetailBtn").onclick=closeDetail;$("randomBtn").onclick=randomGrifter;
setLinks();initRead();loadSupply();renderGrid();randomGrifter();
