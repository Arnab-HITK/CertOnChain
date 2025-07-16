const CONTRACT_ADDRESS = "0x3669FF365E03fb8de8d3E277F78B98e670d61Bc0";
const PINATA_JWT = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJiNjA1YmE4ZC05YzIwLTRlOGEtODkyMS00ZDQzNGU4YWIyNDIiLCJlbWFpbCI6ImFybmFic2VuYXBhdGkxMEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiY2RiODgwYjhjNTdkMDk3OTRkMjIiLCJzY29wZWRLZXlTZWNyZXQiOiJiZmVkYmFmNWRlOTM1YTY5NGQzODA4NTE1NzhiNTQyMjY1MjUwNThkMDYyNmZiZWQ1YzVhMGY3MDY0YWU1OTFkIiwiZXhwIjoxNzgxODUxMzQ1fQ.iF8RZbSXEFQS5xuHxmjWmIIlNvSv0mJ3GO69DstSssU"; // Your JWT (already present)

const ABI = [{
  "inputs": [
    { "internalType": "bytes32", "name": "certHash", "type": "bytes32" },
    { "internalType": "string", "name": "studentName", "type": "string" },
    { "internalType": "string", "name": "course", "type": "string" },
    { "internalType": "string", "name": "issueDate", "type": "string" },
    { "internalType": "string", "name": "ipfsHash", "type": "string" }
  ],
  "name": "issueCertificate",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
{
  "inputs": [{ "internalType": "bytes32", "name": "certHash", "type": "bytes32" }],
  "name": "verifyCertificate",
  "outputs": [
    { "internalType": "string", "name": "", "type": "string" },
    { "internalType": "string", "name": "", "type": "string" },
    { "internalType": "string", "name": "", "type": "string" },
    { "internalType": "string", "name": "", "type": "string" },
    { "internalType": "bool", "name": "", "type": "bool" }
  ],
  "stateMutability": "view",
  "type": "function"
}];

let web3, account, contract;

async function connectWallet() {
  const walletStatus = document.getElementById("walletStatus");
  if (!window.ethereum) {
    walletStatus.innerText = "❌ MetaMask🦊 not detected.";
    return;
  }
  try {
    web3 = new Web3(window.ethereum);
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    account = accounts[0];
    contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);
    walletStatus.innerText = `✅ Connected: ${account}`;
    document.getElementById("connectBtn").style.display = "none";
    document.getElementById("adminSection").style.display = "block";
  } catch (err) {
    console.error("Wallet connection failed", err);
    walletStatus.innerText = "❌ Connection failed";
  }
}

function validateFiles() {
  const fileInput = document.getElementById("certFiles");
  const fileError = document.getElementById("fileError");
  const files = Array.from(fileInput.files);
  fileError.innerHTML = "";
  const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
  const maxSize = 3 * 1024 * 1024;
  const validFiles = [];

  if (!files.length) {
    fileError.innerHTML = "❗ Please select at least one file.";
    return [];
  }

  let messages = "";
  for (let file of files) {
    if (!allowedTypes.includes(file.type)) {
      messages += `❌ ${file.name} — Invalid file type<br>`;
      continue;
    }
    if (file.size > maxSize) {
      messages += `❌ ${file.name} — File too large (>3MB)<br>`;
      continue;
    }
    messages += `✅ ${file.name} — Valid file<br>`;
    validFiles.push(file);
  }
  fileError.innerHTML = messages;
  return validFiles;
}

async function sha256File(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const buffer = reader.result;
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      resolve(hashHex);
    };
    reader.onerror = () => reject("Error reading file");
    reader.readAsArrayBuffer(file);
  });
}

async function uploadToIPFS(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: PINATA_JWT },
    body: formData
  });
  const data = await res.json();
  return data.IpfsHash;
}

async function issueCertificate() {
  const validFiles = validateFiles();
  const resultDiv = document.getElementById("issueResult");
  resultDiv.innerHTML = "";

  const studentName = document.getElementById("studentName").value.trim();
  const course = document.getElementById("course").value.trim();
  const issueDate = document.getElementById("issueDate").value;

  if (!studentName || !course || !issueDate) {
    alert("❗ All student details are required.");
    return;
  }

  if (validFiles.length === 0) {
    resultDiv.innerHTML = "❌ No valid files to process.";
    return;
  }

  for (let file of validFiles) {
    const entryId = "issue_" + file.name.replace(/\W/g, "_");
    resultDiv.innerHTML += `<div id="${entryId}">
      <span class="spinner"></span>Processing <strong>${file.name}</strong>...
    </div>`;
    try {
      const shaHash = await sha256File(file);
      const certHash = web3.utils.keccak256(shaHash);
      document.getElementById(entryId).innerHTML = `<span class="spinner"></span>Checking <strong>${file.name}</strong> status...`;
      const existing = await contract.methods.verifyCertificate(certHash).call();
      if (existing[4]) {
        document.getElementById(entryId).innerHTML = `❌ <strong>${file.name}</strong> — Already issued to ${existing[0]} on ${existing[2]}<br>🔗 <a href="https://gateway.pinata.cloud/ipfs/${existing[3]}" target="_blank">${existing[3]}</a>`;
        continue;
      }

      document.getElementById(entryId).innerHTML = `<span class="spinner"></span>Uploading <strong>${file.name}</strong> to IPFS...`;
      const ipfsHash = await uploadToIPFS(file);

      document.getElementById(entryId).innerHTML = `<span class="spinner"></span>Waiting for MetaMask confirmation...`;

      const txPromise = contract.methods.issueCertificate(certHash, studentName, course, issueDate, ipfsHash).send({ from: account });

      txPromise.once('transactionHash', (hash) => {
        const txStart = performance.now();

        txPromise.then(receipt => {
          const txEnd = performance.now();
          const txTime = ((txEnd - txStart)).toFixed(2);

          document.getElementById(entryId).innerHTML = `✅ <strong>${file.name}</strong> issued successfully<br>🔗 <strong>Tx Hash:</strong> <code>${receipt.transactionHash}</code><br>📄 <strong>IPFS:</strong> <a href="https://gateway.pinata.cloud/ipfs/${ipfsHash}" target="_blank">${ipfsHash}</a>`;
        });
      });
    } catch (err) {
      console.error(`❌ Error issuing ${file.name}:`, err);
      document.getElementById(entryId).innerHTML = `❌ <strong>${file.name}</strong> — Error: ${err.message}`;
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("certFiles");
  if (fileInput) {
    fileInput.addEventListener("change", validateFiles);
  }
});


/*
const CONTRACT_ADDRESS = "0x454a07fadcd703081a57A8f04f93cFff9405fE91";
const PINATA_JWT = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJiNjA1YmE4ZC05YzIwLTRlOGEtODkyMS00ZDQzNGU4YWIyNDIiLCJlbWFpbCI6ImFybmFic2VuYXBhdGkxMEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiY2RiODgwYjhjNTdkMDk3OTRkMjIiLCJzY29wZWRLZXlTZWNyZXQiOiJiZmVkYmFmNWRlOTM1YTY5NGQzODA4NTE1NzhiNTQyMjY1MjUwNThkMDYyNmZiZWQ1YzVhMGY3MDY0YWU1OTFkIiwiZXhwIjoxNzgxODUxMzQ1fQ.iF8RZbSXEFQS5xuHxmjWmIIlNvSv0mJ3GO69DstSssU"; // Your JWT (already present)

const ABI = [
  {
    "inputs": [
      { "internalType": "bytes32[]", "name": "certHashes", "type": "bytes32[]" },
      { "internalType": "string[]", "name": "studentNames", "type": "string[]" },
      { "internalType": "string[]", "name": "courses", "type": "string[]" },
      { "internalType": "string[]", "name": "issueDates", "type": "string[]" },
      { "internalType": "string[]", "name": "ipfsHashes", "type": "string[]" }
    ],
    "name": "batchIssueCertificates",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "bytes32", "name": "certHash", "type": "bytes32" },
      { "internalType": "string", "name": "studentName", "type": "string" },
      { "internalType": "string", "name": "course", "type": "string" },
      { "internalType": "string", "name": "issueDate", "type": "string" },
      { "internalType": "string", "name": "ipfsHash", "type": "string" }
    ],
    "name": "issueCertificate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "certHash", "type": "bytes32" }],
    "name": "verifyCertificate",
    "outputs": [
      { "internalType": "string", "name": "", "type": "string" },
      { "internalType": "string", "name": "", "type": "string" },
      { "internalType": "string", "name": "", "type": "string" },
      { "internalType": "string", "name": "", "type": "string" },
      { "internalType": "bool", "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

let web3, account, contract;

async function connectWallet() {
    if (!window.ethereum) return alert("Please install MetaMask.");
    web3 = new Web3(window.ethereum);
    await window.ethereum.request({ method: "eth_requestAccounts" });
    account = (await web3.eth.getAccounts())[0];
    contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);
    document.getElementById("walletStatus").innerText = `✅ Connected: ${account}`;
}

function validateFiles() {
  const fileInput = document.getElementById("certFiles");
  const fileError = document.getElementById("fileError");
  const files = Array.from(fileInput.files);

  fileError.innerHTML = "";

  const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
  const maxSize = 3 * 1024 * 1024;
  const validFiles = [];

  if (!files.length) {
    fileError.innerHTML = "❗ Please select at least one file.";
    return [];
  }

  let messages = "";

  for (let file of files) {
    if (!allowedTypes.includes(file.type)) {
      messages += `❌ ${file.name} — Invalid file type<br>`;
      continue;
    }

    if (file.size > maxSize) {
      messages += `❌ ${file.name} — File too large (>3MB)<br>`;
      continue;
    }

    messages += `✅ ${file.name} — Valid file<br>`;
    validFiles.push(file);
  }

  fileError.innerHTML = messages;
  return validFiles;
}



async function sha256File(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
            const buffer = reader.result;
            const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
            const hashHex = Array.from(new Uint8Array(hashBuffer))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            resolve(hashHex);
        };
        reader.onerror = () => reject("Error reading file");
        reader.readAsArrayBuffer(file);
    });
}

async function uploadToIPFS(file) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
        method: "POST",
        headers: { Authorization: PINATA_JWT },
        body: formData
    });
    const data = await res.json();
    return data.IpfsHash;
}

async function issueCertificate() {
  const validFiles = validateFiles();
  const resultDiv = document.getElementById("issueResult");

  resultDiv.innerHTML = "";

  const studentName = document.getElementById("studentName").value.trim();
  const course = document.getElementById("course").value.trim();
  const issueDate = document.getElementById("issueDate").value;

  if (!studentName || !course || !issueDate) {
    alert("❗ All student details are required.");
    return;
  }

  if (validFiles.length === 0) {
    resultDiv.innerHTML = "❌ No valid files to process.";
    return;
  }

  const certHashes = [];
  const ipfsHashes = [];
  const studentNames = [];
  const courses = [];
  const issueDates = [];

  for (let file of validFiles) {
    try {
      const shaHash = await sha256File(file);
      const certHash = web3.utils.keccak256(shaHash);

      const existing = await contract.methods.verifyCertificate(certHash).call();
      if (existing[4]) {
        resultDiv.innerHTML += `❌ ${file.name}: Already issued to ${existing[0]} on ${existing[2]}.<br>`;
        continue;
      }

      const ipfsHash = await uploadToIPFS(file);

      certHashes.push(certHash);
      ipfsHashes.push(ipfsHash);
      studentNames.push(studentName);
      courses.push(course);
      issueDates.push(issueDate);

      resultDiv.innerHTML += `🕓 ${file.name}: Queued for batch<br>`;
    } catch (err) {
      resultDiv.innerHTML += `❌ ${file.name}: Error — ${err.message}<br>`;
    }
  }

  if (!certHashes.length) {
    resultDiv.innerHTML += "❌ Nothing to issue.";
    return;
  }

  try {
    await contract.methods.batchIssueCertificates(
      certHashes, studentNames, courses, issueDates, ipfsHashes
    ).send({ from: account });

    resultDiv.innerHTML += `<br>✅ Batch issued successfully:<br>`;
    for (let i = 0; i < certHashes.length; i++) {
      resultDiv.innerHTML += `
        📄 ${validFiles[i].name} issued<br>
        🔗 <a href="https://gateway.pinata.cloud/ipfs/${ipfsHashes[i]}" target="_blank">${ipfsHashes[i]}</a><br><br>
      `;
    }
  } catch (err) {
    console.error("❌ Batch issue failed:", err);
    resultDiv.innerHTML += `❌ Batch issue failed: ${err.message}`;
  }
}


// Bind the file input change event after DOM is ready
window.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("certFiles");
  if (fileInput) {
    fileInput.addEventListener("change", validateFiles);
  }
});
*/