const CONTRACT_ADDRESS = "0xB348d4f96Ea76555526d4C10dfBCCb3565180742";
const ABI = [
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

const web3 = new Web3(window.ethereum);
const contract = new web3.eth.Contract(ABI, CONTRACT_ADDRESS);

function validateFiles(files) {
  const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
  const maxSize = 3 * 1024 * 1024;
  const valid = [];
  const invalid = [];

  for (let file of files) {
    if (!allowedTypes.includes(file.type)) {
      invalid.push(`❌ ${file.name} — Invalid file type`);
      continue;
    }
    if (file.size > maxSize) {
      invalid.push(`❌ ${file.name} — File too large (>3MB)`);
      continue;
    }
    valid.push(file);
  }

  return { valid, invalid };
}

async function generateSHA256(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const buffer = reader.result;
        const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        resolve(hashHex);
      } catch (err) {
        reject("Hashing failed");
      }
    };
    reader.onerror = () => reject("File read error");
    reader.readAsArrayBuffer(file);
  });
}

async function verifyCertificates() {
  const input = document.getElementById("verifyFile");
  const resultDiv = document.getElementById("verifyResult");
  const files = Array.from(input.files);
  resultDiv.innerHTML = "";

  if (files.length === 0) {
    alert("Please select one or more files.");
    return;
  }

  const { valid, invalid } = validateFiles(files);

  if (invalid.length > 0) {
    resultDiv.innerHTML += `<strong>❌ Invalid Files:</strong><br>${invalid.join("<br>")}<br><br>`;
  }

  if (valid.length === 0) {
    resultDiv.innerHTML += "⚠️ No valid files to verify.";
    return;
  }

  for (let file of valid) {
    const entryId = "verify_" + file.name.replace(/\W/g, "_");
    resultDiv.innerHTML += `<div id="${entryId}">
      <span class="spinner"></span>Verifying <strong>${file.name}</strong>...
    </div>`;

    try {
      const startTime = performance.now();

      const shaHash = await generateSHA256(file);
      const certHash = web3.utils.keccak256(shaHash);

      const result = await contract.methods.verifyCertificate(certHash).call();

      const endTime = performance.now();
      const verifyTime = ((endTime - startTime) / 1000).toFixed(2); // in seconds

      const name = result[0];
      const course = result[1];
      const date = result[2];
      const ipfs = result[3];
      const isValid = result[4];

      if (isValid) {
        document.getElementById(entryId).innerHTML = `
          ✅ <strong>${file.name}</strong> — Valid<br>
          👤 Name: ${name}<br>
          📘 Course: ${course}<br>
          📅 Issued On: ${date}<br>
          ⏱️ <strong>Verification Time:</strong> ${verifyTime} seconds<br>
          🔗 <a href="https://gateway.pinata.cloud/ipfs/${ipfs}" target="_blank">${ipfs}</a><br>`;
      } else {
        document.getElementById(entryId).innerHTML = `
          ❌ <strong>${file.name}</strong> — Certificate not found or invalid.<br>
          ⏱️ <strong>Verification Time:</strong> ${verifyTime} seconds<br>`;
      }

      console.log(`✅ ${file.name} verified in ${verifyTime}s`);
    } catch (err) {
      console.error(err);
      document.getElementById(entryId).innerHTML = `
        ❌ <strong>${file.name}</strong> — Verification Error: ${err.message}<br>`;
    }
  }
}
