let provider, signer, contract, userAddress;

// Replace these with your contract's details
const CONTRACT_ADDRESS = "0xYourContractAddressHere";
const CONTRACT_ABI = [ /* Put your ABI JSON here */ ];

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown

async function connectWallet() {
  if (typeof window.ethereum === "undefined") {
    alert("MetaMask is not installed!");
    return;
  }

  try {
    // Request accounts first (popup MetaMask)
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    userAddress = accounts[0];
    console.log("Connected account:", userAddress); // Debug in Console

    // Setup provider and signer after accounts
    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();

    // Switch or add ZenChain - optional, no throw on error
    const chainIdHex = "0x20D8"; // 8408 hex
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }]
      });
      console.log("Switched to ZenChain"); // Debug
    } catch (switchError) {
      if (switchError.code === 4902) { // Not added, add it
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: chainIdHex,
            chainName: "ZenChain Testnet",
            rpcUrls: ["https://zenchain-testnet.api.onfinality.io/public"],
            blockExplorerUrls: ["https://zentrace.io"],
            nativeCurrency: {
              name: "ZTC",
              symbol: "ZTC",
              decimals: 18
            }
          }]
        });
        console.log("Added ZenChain network"); // Debug
      } else {
        console.log("Switch error (continue anyway):", switchError.code); // Ignore, continue
      }
    }

    // Setup contract
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    console.log("Contract ready"); // Debug

    // Update UI
    document.getElementById("walletStatus").innerText = `Connected: ${userAddress}`;
    document.getElementById("connectWallet").innerText = "Disconnect";
    document.getElementById("sendGM").disabled = false;

    checkCooldown();
    loadData();

  } catch (error) {
    console.error("Connection error:", error);
    document.getElementById("walletStatus").innerText = "Failed: " + error.message;
  }
}

function disconnectWallet() {
  userAddress = null;
  signer = null;
  contract = null;
  document.getElementById("walletStatus").innerText = "Status: Disconnected";
  document.getElementById("connectWallet").innerText = "Connect Wallet";
  document.getElementById("sendGM").disabled = true;
}

async function sendGM() {
  if (!contract) {
    alert("Please connect your wallet first.");
    return;
  }
  try {
    const tx = await contract.sendGM();
    await tx.wait();

    localStorage.setItem(`lastGM_${userAddress}`, Date.now().toString());

    document.getElementById("sendGM").disabled = true;
    updateTimer();
    loadData();
  } catch (error) {
    console
