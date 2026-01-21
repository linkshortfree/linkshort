let uploadedData = [];
let lastResults = []; // Fixed: lastResults was not defined

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

document.addEventListener('DOMContentLoaded', () => {
    // Check if there's a pending URL from UTM Builder
    const pendingUrl = localStorage.getItem('pendingShorten');
    if (pendingUrl) {
        document.getElementById('urlInput').value = pendingUrl;
        localStorage.removeItem('pendingShorten');
        updateLivePreview();
    }
});

function updateLivePreview() {
    const urlInput = document.getElementById('urlInput');
    const qrGreetingInput = document.getElementById('qrGreetingInput');
    const container = document.getElementById('liveQrContainer');
    const greetingDisplay = document.getElementById('liveQrGreeting');
    const downloadBtn = document.getElementById('liveDownloadBtn');
    const previewCard = document.getElementById('livePreviewCard');

    const firstUrl = urlInput.value.split('\n')[0].trim();
    const greeting = qrGreetingInput.value.split(',')[0].trim();

    if (!firstUrl) {
        container.innerHTML = '<div style="color: #64748b; font-size: 0.85rem; margin-top: 80px;">Design your link to see preview</div>';
        greetingDisplay.innerText = '';
        downloadBtn.style.display = 'none';
        previewCard.classList.add('empty');
        return;
    }

    container.innerHTML = '';
    greetingDisplay.innerText = greeting;
    downloadBtn.style.display = 'block';
    previewCard.classList.remove('empty');

    new QRCode(container, {
        text: firstUrl,
        width: 200,
        height: 200,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    downloadBtn.onclick = () => downloadQR(firstUrl, greeting);
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

    if (finalProcessList.length > 500) {
        showError('Max 500 links per request');
        return;
    }

    const progressContainer = document.getElementById('bulkProgressContainer');
    const progressBar = document.getElementById('bulkProgressBar');
    const progressText = document.getElementById('bulkProgressText');

    errorArea.classList.add('hidden');
    shortenBtn.disabled = true;
    shortenBtn.innerText = 'Shortening...';

    if (progressContainer) {
        progressContainer.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressText.innerText = `Processing 0 of ${finalProcessList.length}...`;
    }

    linksList.innerHTML = '';
    lastResults = [];

    for (let [index, item] of finalProcessList.entries()) {
        try {
            if (progressContainer) {
                const percent = Math.round(((index + 1) / finalProcessList.length) * 100);
                progressBar.style.width = `${percent}%`;
                progressText.innerText = `Processing ${index + 1} of ${finalProcessList.length}...`;
            }

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
                lastResults.push({
                    shortUrl: fullShortUrl,
                    alias: data.alias,
                    greeting: item.greeting,
                    index: index + 1
                });
            } else {
                addErrorToUI(data.error || "Error", item.url);
            }
        } catch (error) {
            addErrorToUI("Server error", item.url);
        }
    }

    if (progressContainer) {
        setTimeout(() => progressContainer.classList.add('hidden'), 2000);
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
        <span title="${originalUrl}" style="color: var(--accent-secondary); font-weight: 500;">${shortUrl}</span>
        <div style="display: flex; gap: 8px; align-items: center;">
            <button class="qr-toggle" style="background: rgba(61, 122, 77, 0.15); color: var(--accent-secondary); border: 1px solid rgba(61, 122, 77, 0.3);" onclick="openQrModal('${shortUrl}', '${qrGreeting}')">QR</button>
            <button class="copy-btn" onclick="copyIndividualLink('${shortUrl}', this)">Copy</button>
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
    div.style.borderColor = 'rgba(239, 68, 68, 0.2)';
    div.style.background = 'rgba(239, 68, 68, 0.05)';
    div.innerHTML = `<span style="color: var(--error); font-size: 0.9rem; font-weight: 500;">${error}:</span><small style="color: var(--text-secondary); margin-left: 8px; overflow: hidden; text-overflow: ellipsis;">${originalUrl.substring(0, 20)}...</small>`;
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

function downloadSampleTemplate() {
    const csvContent = "URL,Alias,Greeting\nhttps://google.com,google-home,Welcome to Google\nhttps://youtube.com,yt,Watch videos here";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "linkshort_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

// Bulk QR Tool Logic (standardized)
let bulkQrUrls = [];

function handleBulkQrUpload(input) {
    const file = input.files[0];
    const status = document.getElementById('bulkQrFileStatus');
    const btn = document.getElementById('generateBulkQrBtn');
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(firstSheet);

            bulkQrUrls = json.map(row => {
                const urlKey = Object.keys(row).find(k => ['url', 'link', 'website'].includes(k.toLowerCase().trim()));
                return urlKey ? row[urlKey] : null;
            }).filter(u => u);

            status.innerText = `✅ Found ${bulkQrUrls.length} URLs. Ready to generate.`;
            status.style.color = '#10b981';
            btn.disabled = false;
        } catch (err) {
            status.innerText = "❌ Error reading file.";
            status.style.color = '#ef4444';
        }
    };
    reader.readAsArrayBuffer(file);
}

async function generateBulkQRs() {
    if (bulkQrUrls.length === 0) return;
    if (bulkQrUrls.length > 500) {
        alert("Max 500 URLs per request.");
        return;
    }
    const btn = document.getElementById('generateBulkQrBtn');
    const container = document.getElementById('bulkQrProgressContainer');
    const progressBar = document.getElementById('bulkQrProgressBar');
    const progressText = document.getElementById('bulkQrProgressText');

    btn.disabled = true;
    btn.innerText = "Generating...";

    if (container) {
        container.classList.remove('hidden');
        progressBar.style.width = '0%';
    }

    const zip = new JSZip();

    for (let i = 0; i < bulkQrUrls.length; i++) {
        if (container) {
            const percent = Math.round(((i + 1) / bulkQrUrls.length) * 100);
            progressBar.style.width = `${percent}%`;
            progressText.innerText = `Generating ${i + 1} of ${bulkQrUrls.length}...`;
        }

        const canvas = await generateQRCanvasInMemory(bulkQrUrls[i]);
        const dataUrl = canvas.toDataURL('image/png').split(',')[1];
        zip.file(`qr-${i + 1}.png`, dataUrl, { base64: true });
    }

    if (progressText) progressText.innerText = "Creating ZIP...";
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = "linkshort-bulk-qrs.zip";
    link.click();

    btn.disabled = false;
    btn.innerText = "Generate & Download ZIP";
    if (progressText) progressText.innerText = "✅ Download started!";

    if (container) {
        setTimeout(() => container.classList.add('hidden'), 3000);
    }
}

// A/B Testing Logic
async function createABTest() {
    const name = document.getElementById('abTestName').value.trim();
    const urlA = document.getElementById('variantA').value.trim();
    const urlB = document.getElementById('variantB').value.trim();
    const split = document.getElementById('trafficSplit').value;
    const btn = document.getElementById('startAbBtn');

    if (!name || !urlA || !urlB) {
        alert('Please fill in all fields');
        return;
    }

    btn.disabled = true;
    btn.innerText = 'Creating...';

    try {
        const response = await fetch('/api/ab/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, url_a: urlA, url_b: urlB, split })
        });
        const data = await response.json();
        if (data.success) {
            const finalUrl = `${window.location.protocol}//${window.location.host}/ab/${data.test_id}`;
            document.getElementById('abResultArea').classList.remove('hidden');
            document.getElementById('finalAbUrl').innerText = finalUrl;
        } else {
            alert(data.error || 'Error creating test');
        }
    } catch (err) {
        alert('Server error');
    }
    btn.disabled = false;
    btn.innerText = 'Start A/B Test';
}

function copyAbUrl() {
    const url = document.getElementById('finalAbUrl').innerText;
    navigator.clipboard.writeText(url);
    alert('Copied A/B link!');
}

// Contact Form Logic
async function submitContact(event) {
    if (event) event.preventDefault();
    const name = document.getElementById('contactName').value;
    const email = document.getElementById('contactEmail').value;
    const message = document.getElementById('contactMessage').value;
    const btn = document.getElementById('submitContactBtn');
    const status = document.getElementById('contactStatus');

    btn.disabled = true;
    btn.innerText = 'Sending...';

    try {
        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, message })
        });
        const data = await response.json();
        if (data.success) {
            status.innerText = data.message;
            status.style.color = '#10b981';
            document.getElementById('contactForm').reset();
        } else {
            status.innerText = data.error || 'Error sending message';
            status.style.color = '#ef4444';
        }
    } catch (err) {
        status.innerText = 'Server error';
        status.style.color = '#ef4444';
    }
    btn.disabled = false;
    btn.innerText = 'Send Message';
}
