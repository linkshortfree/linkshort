let uploadedData = [];
let lastResults = [];

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    // Check if there's a pending URL from UTM Builder
    const pending = localStorage.getItem('pendingShorten');
    if (pending) {
        const bulkContainer = document.getElementById('bulkContainer');
        if (bulkContainer) {
            const urlInput = document.getElementById('urlInput');
            if (urlInput) {
                urlInput.value = pending;
                localStorage.removeItem('pendingShorten');
                if (typeof updateLivePreview === 'function') updateLivePreview();
                showToast("UTM Link loaded! Ready to shorten.");
            }
        }
    }
});

function toggleOptions() {
    const options = document.getElementById('customOptions');
    if (options) options.classList.toggle('show');
}

function switchTab(mode) {
    const bulkContainer = document.getElementById('bulkContainer');
    const singleContainer = document.getElementById('singleContainer');
    const tabBtns = document.querySelectorAll('.tab-btn');

    // Sidebars for Unified QR Designer
    const singlePreview = document.getElementById('singlePreviewSide');
    const bulkProgress = document.getElementById('bulkProgressSide');

    tabBtns.forEach(btn => btn.classList.remove('active'));

    if (mode === 'bulk') {
        if (bulkContainer) bulkContainer.classList.remove('hidden');
        if (singleContainer) singleContainer.classList.add('hidden');

        if (bulkProgress) bulkProgress.classList.remove('hidden');
        if (singlePreview) singlePreview.classList.add('hidden');

        tabBtns.forEach(btn => { if (btn.innerText.includes('Bulk')) btn.classList.add('active'); });
    } else {
        if (bulkContainer) bulkContainer.classList.add('hidden');
        if (singleContainer) singleContainer.classList.remove('hidden');

        if (bulkProgress) bulkProgress.classList.add('hidden');
        if (singlePreview) singlePreview.classList.remove('hidden');

        tabBtns.forEach(btn => { if (btn.innerText.includes('Single')) btn.classList.add('active'); });
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) {
        const div = document.createElement('div');
        div.id = 'toastContainer';
        div.className = 'toast-container';
        document.body.appendChild(div);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <span onclick="this.parentElement.remove()" style="cursor:pointer; margin-left:12px;">&times;</span>
    `;

    document.getElementById('toastContainer').appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
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
        const urlInput = document.getElementById('urlInput');
        if (urlInput) {
            urlInput.value = pendingUrl;
            localStorage.removeItem('pendingShorten');
            updateLivePreview();
        }
    }
});

function filterTools(category, btn) {
    const grid = document.getElementById('toolsGrid');
    if (!grid) return;

    const cards = grid.querySelectorAll('.tool-card');
    const buttons = document.querySelectorAll('.filter-btn');

    // Update active button state
    buttons.forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    // Filter cards
    cards.forEach(card => {
        const cat = card.getAttribute('data-category');
        if (category === 'all' || cat === category) {
            card.style.display = 'block';
            card.style.animation = 'fadeInUp 0.4s ease forwards';
        } else {
            card.style.display = 'none';
        }
    });
}

function updateLivePreview() {
    const urlInput = document.getElementById('urlInput');
    const singleUrlInput = document.getElementById('singleUrlInput');
    const qrGreetingInput = document.getElementById('qrGreetingInput');
    const container = document.getElementById('liveQrContainer');
    const greetingDisplay = document.getElementById('liveQrGreeting');
    const downloadBtn = document.getElementById('liveDownloadBtn');
    const previewCard = document.getElementById('livePreviewCard');

    let firstUrl = "";
    if (urlInput && !urlInput.closest('.hidden')) {
        firstUrl = urlInput.value.split('\n')[0].trim();
    } else if (singleUrlInput) {
        firstUrl = singleUrlInput.value.trim();
    }

    const greeting = qrGreetingInput ? qrGreetingInput.value.split(',')[0].trim() : "";

    const qrColor = document.getElementById('qrColor').value || "#000000";
    const qrBgColor = document.getElementById('qrBgColor').value || "#ffffff";

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
        colorDark: qrColor,
        colorLight: qrBgColor,
        correctLevel: QRCode.CorrectLevel.H
    });

    downloadBtn.onclick = () => downloadQR(firstUrl, greeting);
}

async function shortenUrl() {
    const resultArea = document.getElementById('resultArea');
    const linksList = document.getElementById('linksList');
    const shortenBtn = document.getElementById('shortenBtn');

    // Detect active mode
    const isSingleMode = !document.getElementById('singleContainer').classList.contains('hidden');
    let finalProcessList = [];

    if (isSingleMode) {
        const singleUrl = document.getElementById('singleUrlInput').value.trim();
        const singleAlias = document.getElementById('singleAliasInput').value.trim();
        const singleGreeting = document.getElementById('qrGreetingInput')?.value.trim() || "";
        if (!singleUrl) {
            showToast("Please enter a URL", "error");
            return;
        }
        finalProcessList.push({ url: singleUrl, alias: singleAlias, greeting: singleGreeting });
    } else {
        // Bulk Mode
        const pasteData = document.getElementById('urlInput').value.trim()
            .split('\n')
            .filter(u => u.trim())
            .map((u, i) => ({
                url: u.trim(),
                alias: document.getElementById('aliasInput').value.split(',')[i]?.trim() || "",
                greeting: document.getElementById('qrGreetingInput').value.split(',')[i]?.trim() || ""
            }));

        finalProcessList = uploadedData.length > 0 ? uploadedData : pasteData;
    }

    if (finalProcessList.length === 0) {
        showToast("No URLs to process", "error");
        return;
    }

    if (finalProcessList.length > 500) {
        showToast("Max 500 links allowed at once.", "error");
        return;
    }

    const progressContainer = document.getElementById('bulkProgressContainer');
    const progressBar = document.getElementById('bulkProgressBar');
    const progressText = document.getElementById('bulkProgressText');

    shortenBtn.disabled = true;
    shortenBtn.innerHTML = '<span class="spinner"></span>Shortening...';

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
                    originalUrl: item.url,
                    alias: data.alias,
                    greeting: item.greeting,
                    index: index + 1
                });
            } else {
                showToast(`Error shortening ${item.url}: ${data.error}`, "error");
            }
        } catch (error) {
            showToast("Server error", "error");
        }
    }

    if (progressContainer) {
        setTimeout(() => progressContainer.classList.add('hidden'), 2000);
    }

    shortenBtn.disabled = false;
    shortenBtn.innerText = 'Process & Generate';
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
        <div class="link-info">
            <span class="link-original" title="${originalUrl}">${originalUrl}</span>
            <span class="link-short">${shortUrl}</span>
        </div>
        <div class="link-actions">
            <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 13px;" onclick="openQrModal('${shortUrl}', '${qrGreeting}')">🖼️ QR</button>
            <button class="btn btn-primary" style="padding: 6px 12px; font-size: 13px;" onclick="copyIndividualLink('${shortUrl}', this)">📋 Copy</button>
        </div>
    `;
    linksList.appendChild(div);
}

function openQrModal(url, greeting) {
    const modal = document.getElementById('qrModal');
    const greetingText = document.getElementById('modalGreeting');
    const qrBody = document.getElementById('modalQrContent');
    const downloadBtn = document.getElementById('modalDownloadBtn');

    const qrColor = document.getElementById('qrColor').value || "#000000";
    const qrBgColor = document.getElementById('qrBgColor').value || "#ffffff";

    qrBody.innerHTML = '';
    greetingText.innerText = greeting || '';

    new QRCode(qrBody, {
        text: url,
        width: 200,
        height: 200,
        colorDark: qrColor,
        colorLight: qrBgColor,
        correctLevel: QRCode.CorrectLevel.H
    });

    downloadBtn.onclick = () => downloadQR(url, greeting);
    modal.classList.remove('hidden');
}

function closeModal() {
    document.getElementById('qrModal').classList.add('hidden');
}

function downloadResultsCSV() {
    if (lastResults.length === 0) return;
    let csv = "Index,Long URL,Short URL,Alias,Greeting\n";
    lastResults.forEach(item => {
        csv += `${item.index},"${item.originalUrl}","${item.shortUrl}","${item.alias}","${item.greeting}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `linkshort_results_${new Date().getTime()}.csv`;
    link.click();
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
    if (!linksList) return;
    const div = document.createElement('div');
    div.className = 'link-box';
    div.style.borderLeft = '4px solid var(--error)';
    div.innerHTML = `
        <div class="link-info">
            <span class="link-original" title="${originalUrl}">${originalUrl}</span>
            <span class="link-short" style="color: var(--error)">Failed: ${error}</span>
        </div>
    `;
    linksList.appendChild(div);
}

function copyIndividualLink(text, btn) {
    navigator.clipboard.writeText(text);
    showToast("Link copied!");
    const oldText = btn.innerText;
    btn.innerText = '✅ Copied';
    setTimeout(() => btn.innerText = oldText, 2000);
}

function copyAllLinks() {
    const spans = Array.from(document.querySelectorAll('.link-short'));
    const links = spans
        .filter(s => !s.innerText.includes('Failed:'))
        .map(s => s.innerText)
        .join('\n');
    if (links) {
        navigator.clipboard.writeText(links);
        showToast(`Copied ${spans.length} links!`);
    }
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
    if (!downloadBtn) return;
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
    const selectedSize = parseInt(document.getElementById('qrSizeSelect')?.value || document.getElementById('qrSize')?.value || 300);

    return new Promise((resolve) => {
        const div = document.createElement('div');
        const qrcode = new QRCode(div, {
            text: url,
            width: selectedSize,
            height: selectedSize,
            colorDark: qrColor,
            colorLight: qrBgColor,
            correctLevel: QRCode.CorrectLevel.H
        });

        // QRCode library is sync but we wait for the canvas to be ready
        setTimeout(() => {
            const qrCanvas = div.querySelector('canvas');
            const exportCanvas = document.createElement('canvas');
            const ctx = exportCanvas.getContext('2d');
            const qrSize = selectedSize;
            const padding = Math.round(selectedSize * 0.05); // Dynamic padding
            const textHeight = greeting ? Math.round(selectedSize * 0.15) : 0;

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
            status.innerText = "❌ Error reading file. Use .xlsx or .csv";
            status.style.color = '#cf222e';
        }
    };
    reader.readAsArrayBuffer(file);
}

// UTM Builder Logic
function generateUtm() {
    const baseUrl = document.getElementById('targetUrl')?.value.trim();
    const source = document.getElementById('utmSource')?.value.trim();
    const medium = document.getElementById('utmMedium')?.value.trim();
    const name = document.getElementById('utmName')?.value.trim();
    const id = document.getElementById('utmId')?.value.trim();
    const term = document.getElementById('utmTerm')?.value.trim();
    const content = document.getElementById('utmContent')?.value.trim();
    const platform = document.getElementById('utmPlatform')?.value.trim();
    const creative = document.getElementById('utmCreative')?.value.trim();
    const tactic = document.getElementById('utmTactic')?.value.trim();
    const resultDisplay = document.getElementById('finalUtmUrl');

    if (!baseUrl) {
        if (resultDisplay) resultDisplay.innerText = "Enter a Website URL to begin...";
        return;
    }

    try {
        let url = new URL(baseUrl.startsWith('http') ? baseUrl : 'https://' + baseUrl);
        if (source) url.searchParams.set('utm_source', source);
        if (medium) url.searchParams.set('utm_medium', medium);
        if (name) url.searchParams.set('utm_campaign', name);
        if (id) url.searchParams.set('utm_id', id);
        if (term) url.searchParams.set('utm_term', term);
        if (content) url.searchParams.set('utm_content', content);
        if (platform) url.searchParams.set('utm_source_platform', platform);
        if (creative) url.searchParams.set('utm_creative_format', creative);
        if (tactic) url.searchParams.set('utm_marketing_tactic', tactic);

        if (resultDisplay) resultDisplay.innerText = url.toString();
    } catch (e) {
        if (resultDisplay) resultDisplay.innerText = "Invalid Website URL";
    }
}

async function copyUtm() {
    const url = document.getElementById('finalUtmUrl')?.innerText;
    if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
        await navigator.clipboard.writeText(url);
        showToast("UTM URL copied to clipboard!");
    } else {
        showToast("Please generate a valid URL first", "error");
    }
}

function shortenUtm() {
    const url = document.getElementById('finalUtmUrl')?.innerText;
    if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
        localStorage.setItem('pendingShorten', url);
        window.location.href = '/tools/bulk';
    } else {
        showToast("Please generate a valid URL first", "error");
    }
}

function resetUtmForm() {
    const fields = ['targetUrl', 'utmSource', 'utmMedium', 'utmName', 'utmId', 'utmTerm', 'utmContent', 'utmPlatform', 'utmCreative', 'utmTactic'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const resultDisplay = document.getElementById('finalUtmUrl');
    if (resultDisplay) resultDisplay.innerText = "Enter a Website URL to begin...";

    showToast("Form cleared!");
}

function setUtmPreset(inputId, value) {
    const input = document.getElementById(inputId);
    if (input) {
        input.value = value;
        generateUtm();
        showToast(`Set ${inputId.replace('utm', '')} to ${value}`);
    }
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
        showToast('Please fill in all fields', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>Creating...';
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
        showToast('Server error during A/B test creation', 'error');
    }
    btn.disabled = false;
    btn.innerText = 'Start A/B Test';
}

function copyAbUrl() {
    const url = document.getElementById('finalAbUrl')?.innerText;
    if (url) {
        navigator.clipboard.writeText(url);
        showToast('A/B Test link copied!');
    }
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
    btn.innerHTML = '<span class="spinner"></span>Sending...';

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
// Unified QR Generator Logic
let qrInstance = null;

function generateSingleQR() {
    const link = document.getElementById('singleUrlInput').value.trim();
    const size = parseInt(document.getElementById('qrSizeSelect').value);
    const container = document.getElementById('singleQrContainer');
    const downloadBtn = document.getElementById('downloadSingleQrBtn');

    if (!container) return; // Not on the QR page

    if (!link) {
        container.innerHTML = '<div style="color: #64748b; font-size: 0.9rem; margin-top: 100px;">Enter a link to generate</div>';
        if (downloadBtn) downloadBtn.style.display = 'none';
        return;
    }

    container.innerHTML = '';
    qrInstance = new QRCode(container, {
        text: link,
        width: size,
        height: size,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    if (downloadBtn) downloadBtn.style.display = 'block';
}

function downloadSingleQR() {
    const canvas = document.querySelector('#singleQrContainer canvas');
    if (canvas) {
        const link = document.createElement('a');
        link.download = 'linkshort-qr.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
}
