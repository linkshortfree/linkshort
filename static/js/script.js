let uploadedData = [];

function toggleOptions() {
    const options = document.getElementById('customOptions');
    options.classList.toggle('show');
}

function handleFileUpload(input) {
    const file = input.files[0];
    const status = document.getElementById('fileStatus');
    if (!file) return;

    status.innerText = `Reading ${file.name}...`;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(firstSheet);

            uploadedData = json.map(row => {
                // Try to find columns regardless of exact case
                const findValue = (keys) => {
                    const foundKey = Object.keys(row).find(k => keys.includes(k.toLowerCase().trim()));
                    return foundKey ? row[foundKey] : "";
                };

                return {
                    url: findValue(['url', 'link', 'original url', 'website']),
                    alias: findValue(['alias', 'short name', 'custom name', 'slug']),
                    greeting: findValue(['greeting', 'message', 'text', 'qr greeting'])
                };
            }).filter(item => item.url);

            status.innerText = `✅ Loaded ${uploadedData.length} links from file. Click "Shorten Now" to process.`;
            status.style.color = '#2da44e';

            // Clear the text area to avoid confusion
            document.getElementById('urlInput').value = "";
            document.getElementById('urlInput').placeholder = "Links loaded from file!";
        } catch (err) {
            status.innerText = "❌ Error reading file. Use .xlsx or .csv";
            status.style.color = '#cf222e';
            console.error(err);
        }
    };
    reader.readAsArrayBuffer(file);
}

async function shortenUrl() {
    const urlInput = document.getElementById('urlInput');
    const aliasInput = document.getElementById('aliasInput');
    const qrGreetingInput = document.getElementById('qrGreetingInput');
    const resultArea = document.getElementById('resultArea');
    const linksList = document.getElementById('linksList');
    const errorArea = document.getElementById('errorArea');
    const shortenBtn = document.getElementById('shortenBtn');

    // Get UI data
    const uiUrls = urlInput.value.split('\n').map(u => u.trim()).filter(u => u !== '');
    const uiAliases = aliasInput.value.split(',').map(a => a.trim()).filter(a => a !== '');
    const uiGreetings = qrGreetingInput.value.split(',').map(g => g.trim()).filter(g => g !== '');

    let finalProcessList = [];

    if (uiUrls.length > 0) {
        // UI has priority for URLs
        finalProcessList = uiUrls.map((url, i) => ({
            url: url,
            alias: uiAliases[i] || "",
            greeting: uiGreetings[i] || ""
        }));
    } else if (uploadedData.length > 0) {
        // File data fallback
        finalProcessList = uploadedData.map((item, i) => ({
            url: item.url,
            // Priority: UI Input > File Input
            alias: uiAliases[i] || item.alias || "",
            greeting: uiGreetings[i] || item.greeting || ""
        }));
    }

    if (finalProcessList.length === 0) {
        showError('Please paste links or upload an Excel file');
        return;
    }

    errorArea.classList.add('hidden');
    shortenBtn.disabled = true;
    shortenBtn.innerText = 'Shortening...';
    linksList.innerHTML = '';

    for (let item of finalProcessList) {
        try {
            const response = await fetch('/api/shorten', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: item.url,
                    alias: item.alias
                }),
            });

            const data = await response.json();
            if (data.success) {
                const fullShortUrl = `${window.location.protocol}//${window.location.host}/${data.alias}`;
                addLinkToUI(fullShortUrl, item.url, item.greeting);
            } else {
                addErrorToUI(data.error || "Error", item.url);
            }
        } catch (error) {
            addErrorToUI("Server error", item.url);
        }
    }

    shortenBtn.disabled = false;
    shortenBtn.innerText = 'Shorten Now';
    resultArea.classList.remove('hidden');
    resultArea.classList.add('visible');

    // Clear uploaded state after processing
    uploadedData = [];
    document.getElementById('fileStatus').innerText = "";
    document.getElementById('fileStatus').style.display = "none";
    document.getElementById('fileInput').value = "";
    document.getElementById('urlInput').placeholder = "Paste your long URL(s) here... (one per line for bulk)";
}

function addLinkToUI(shortUrl, originalUrl, qrGreeting) {
    const linksList = document.getElementById('linksList');
    const div = document.createElement('div');
    div.className = 'link-box';
    div.innerHTML = `
        <span title="${originalUrl}">${shortUrl}</span>
        <div style="display: flex; gap: 8px; align-items: center;">
            <button class="copy-btn" onclick="copyIndividualLink('${shortUrl}', this)">Copy</button>
            <button class="qr-toggle" onclick="openQrModal('${shortUrl}', '${qrGreeting}')">QR</button>
        </div>
    `;
    linksList.appendChild(div);
}

function openQrModal(url, greeting) {
    const modal = document.getElementById('qrModal');
    const greetingText = document.getElementById('modalGreeting');
    const qrBody = document.getElementById('modalQrContent');
    const downloadBtn = document.getElementById('modalDownloadBtn');

    qrBody.innerHTML = '';
    greetingText.innerText = greeting || '';

    new QRCode(qrBody, {
        text: url,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    downloadBtn.onclick = () => downloadQR(url, greeting);
    modal.classList.remove('hidden');
}

function closeModal(event) {
    document.getElementById('qrModal').classList.add('hidden');
}

function downloadQR(url, greeting) {
    const qrCanvas = document.querySelector('#modalQrContent canvas');
    if (!qrCanvas) return;

    const exportCanvas = document.createElement('canvas');
    const ctx = exportCanvas.getContext('2d');
    const qrSize = 200;
    const padding = 20;
    const textHeight = greeting ? 40 : 0;

    exportCanvas.width = qrSize + (padding * 2);
    exportCanvas.height = qrSize + textHeight + (padding * 2);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    if (greeting) {
        ctx.fillStyle = "#333333";
        ctx.font = "bold 16px Outfit, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(greeting, exportCanvas.width / 2, padding + 20);
    }

    ctx.drawImage(qrCanvas, padding, padding + textHeight, qrSize, qrSize);

    const link = document.createElement('a');
    link.download = `linkshort-qr.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
}

function addErrorToUI(error, originalUrl) {
    const linksList = document.getElementById('linksList');
    const div = document.createElement('div');
    div.className = 'link-box';
    div.style.borderColor = '#ff7b72';
    div.innerHTML = `<span style="color: #ff7b72; font-size: 0.9rem;">${error}:</span><small style="color: var(--text-sub); margin-left: 5px;">${originalUrl.substring(0, 15)}...</small>`;
    linksList.appendChild(div);
}

function showError(msg) {
    const errorArea = document.getElementById('errorArea');
    errorArea.innerText = msg;
    errorArea.classList.remove('hidden');
}

function copyIndividualLink(text, btn) {
    navigator.clipboard.writeText(text);
    const oldText = btn.innerText;
    btn.innerText = 'Copied!';
    setTimeout(() => btn.innerText = oldText, 2000);
}

function copyAllLinks() {
    const spans = Array.from(document.querySelectorAll('.link-box span'));
    const links = spans
        .filter(s => !s.style.color.includes('rgb(255, 123, 114)')) // exclude error text
        .map(s => s.innerText)
        .join('\n');
    if (links) { navigator.clipboard.writeText(links); alert('Copied all links!'); }
}

async function downloadAllQRs() {
    if (lastResults.length === 0) return;

    const downloadBtn = document.getElementById('downloadAllQrsBtn');
    const oldText = downloadBtn.innerText;
    downloadBtn.innerText = "Zipping QRs...";
    downloadBtn.disabled = true;

    try {
        const zip = new JSZip();

        for (let item of lastResults) {
            // Re-generate the QR canvas in memory for the zip
            const canvas = await generateQRCanvasInMemory(item.shortUrl, item.greeting);
            const dataUrl = canvas.toDataURL('image/png').split(',')[1];
            // Name format: [index]-[alias].png
            const fileName = `${item.index}-${item.alias || 'link'}.png`;
            zip.file(fileName, dataUrl, { base64: true });
        }

        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = "linkshort-bulk-qrs.zip";
        link.click();
    } catch (err) {
        console.error("Zip error:", err);
        alert("Error generating zip file.");
    }

    downloadBtn.innerText = oldText;
    downloadBtn.disabled = false;
}

// Helper to generate a canvas without appending to DOM
async function generateQRCanvasInMemory(url, greeting) {
    return new Promise((resolve) => {
        const div = document.createElement('div');
        const qrcode = new QRCode(div, {
            text: url,
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        // QRCode library is sync but we wait for the canvas to be ready
        setTimeout(() => {
            const qrCanvas = div.querySelector('canvas');
            const exportCanvas = document.createElement('canvas');
            const ctx = exportCanvas.getContext('2d');
            const qrSize = 200;
            const padding = 20;
            const textHeight = greeting ? 40 : 0;

            exportCanvas.width = qrSize + (padding * 2);
            exportCanvas.height = qrSize + textHeight + (padding * 2);

            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

            if (greeting) {
                ctx.fillStyle = "#333333";
                ctx.font = "bold 16px Outfit, sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(greeting, exportCanvas.width / 2, padding + 20);
            }

            ctx.drawImage(qrCanvas, padding, padding + textHeight, qrSize, qrSize);
            resolve(exportCanvas);
        }, 50);
    });
}
