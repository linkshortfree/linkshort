function toggleOptions() {
    const options = document.getElementById('customOptions');
    options.classList.toggle('show');
}

async function shortenUrl() {
    const urlInput = document.getElementById('urlInput');
    const aliasInput = document.getElementById('aliasInput');
    const qrGreetingInput = document.getElementById('qrGreetingInput');
    const resultArea = document.getElementById('resultArea');
    const linksList = document.getElementById('linksList');
    const errorArea = document.getElementById('errorArea');
    const shortenBtn = document.getElementById('shortenBtn');

    const urls = urlInput.value.split('\n').map(u => u.trim()).filter(u => u !== '');
    const customAlias = aliasInput.value.trim();
    const qrGreeting = qrGreetingInput.value.trim();

    if (urls.length === 0) {
        showError('Please paste at least one URL');
        return;
    }

    if (urls.length > 1 && customAlias !== '') {
        showError('Custom alias is only supported for single links');
        return;
    }

    errorArea.classList.add('hidden');
    shortenBtn.disabled = true;
    shortenBtn.innerText = 'Shortening...';
    linksList.innerHTML = '';

    for (let url of urls) {
        try {
            const response = await fetch('/api/shorten', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: url,
                    alias: urls.length === 1 ? customAlias : ""
                }),
            });

            const data = await response.json();
            if (data.success) {
                const fullShortUrl = `${window.location.protocol}//${window.location.host}/${data.alias}`;
                addLinkToUI(fullShortUrl, url, qrGreeting);
            } else {
                addErrorToUI(data.error, url);
            }
        } catch (error) {
            addErrorToUI("Server error", url);
        }
    }

    shortenBtn.disabled = false;
    shortenBtn.innerText = 'Shorten Now';
    resultArea.classList.remove('hidden');
    resultArea.classList.add('visible');
}

function addLinkToUI(shortUrl, originalUrl, qrGreeting) {
    const linksList = document.getElementById('linksList');
    const div = document.createElement('div');
    div.className = 'link-box';
    div.innerHTML = `
        <span title="${originalUrl}">${shortUrl}</span>
        <div style="display: flex; gap: 8px;">
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
    div.innerHTML = `<span style="color: #ff7b72">${error}</span><small>${originalUrl.substring(0, 20)}...</small>`;
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
    const links = Array.from(document.querySelectorAll('.link-box span')).map(s => s.innerText).join('\n');
    if (links) { navigator.clipboard.writeText(links); alert('Copied all links!'); }
}
