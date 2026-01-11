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

    // Split by lines and filter out empty strings
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

    // Reset UI
    errorArea.classList.add('hidden');
    shortenBtn.disabled = true;
    shortenBtn.innerText = 'Shortening...';
    linksList.innerHTML = '';

    let results = [];
    let hasError = false;

    for (let url of urls) {
        try {
            const response = await fetch('/api/shorten', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: url,
                    alias: urls.length === 1 ? customAlias : ""
                }),
            });

            const data = await response.json();

            if (data.success) {
                const fullShortUrl = `${window.location.protocol}//${window.location.host}/${data.alias}`;
                results.push(fullShortUrl);
                addLinkToUI(fullShortUrl, url, qrGreeting);
            } else {
                addErrorToUI(data.error, url);
                hasError = true;
            }
        } catch (error) {
            addErrorToUI("Server error", url);
            hasError = true;
        }
    }

    shortenBtn.disabled = false;
    shortenBtn.innerText = 'Shorten Now';
    resultArea.classList.remove('hidden');
    resultArea.classList.add('visible');
}

function addLinkToUI(shortUrl, originalUrl, qrGreeting) {
    const linksList = document.getElementById('linksList');
    const container = document.createElement('div');
    container.className = 'link-result-wrapper';

    const id = 'qr-' + Math.random().toString(36).substr(2, 9);

    container.innerHTML = `
        <div class="link-box">
            <span title="${originalUrl}">${shortUrl}</span>
            <div style="display: flex; align-items: center;">
                <button class="copy-btn" onclick="copyIndividualLink('${shortUrl}', this)">Copy</button>
                <button class="qr-toggle" onclick="toggleQR('${id}', '${shortUrl}', '${qrGreeting}')">QR</button>
            </div>
        </div>
        <div id="${id}" class="qr-container"></div>
    `;
    linksList.appendChild(container);
}

function toggleQR(id, url, greeting) {
    const qrContainer = document.getElementById(id);
    qrContainer.classList.toggle('show');

    if (qrContainer.classList.contains('show') && qrContainer.innerHTML === '') {
        if (greeting) {
            const greetingDiv = document.createElement('div');
            greetingDiv.className = 'qr-greeting-text';
            greetingDiv.innerText = greeting;
            qrContainer.appendChild(greetingDiv);
        }

        const qrContent = document.createElement('div');
        qrContainer.appendChild(qrContent);

        new QRCode(qrContent, {
            text: url,
            width: 180,
            height: 180,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'download-btn';
        downloadBtn.innerText = 'Download QR';
        downloadBtn.onclick = () => downloadQR(id, greeting);
        qrContainer.appendChild(downloadBtn);
    }
}

function downloadQR(id, greeting) {
    const qrContainer = document.getElementById(id);
    const canvas = qrContainer.querySelector('canvas');
    if (!canvas) return;

    const exportCanvas = document.createElement('canvas');
    const ctx = exportCanvas.getContext('2d');

    const qrSize = 180;
    const padding = 20;
    const textHeight = greeting ? 40 : 0;

    exportCanvas.width = qrSize + (padding * 2);
    exportCanvas.height = qrSize + textHeight + (padding * 2);

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Greeting
    if (greeting) {
        ctx.fillStyle = "#333333";
        ctx.font = "bold 16px Outfit, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(greeting, exportCanvas.width / 2, padding + 20);
    }

    // QR Code
    ctx.drawImage(canvas, padding, padding + textHeight, qrSize, qrSize);

    // Download link
    const link = document.createElement('a');
    link.download = `linkshort-qr-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
}

function addErrorToUI(error, originalUrl) {
    const linksList = document.getElementById('linksList');
    const div = document.createElement('div');
    div.className = 'link-box';
    div.style.borderColor = '#ff7b72';
    div.innerHTML = `
        <span style="color: #ff7b72" title="${originalUrl}">Error: ${error}</span>
        <span style="font-size: 0.8rem; color: var(--text-sub)">${originalUrl.substring(0, 20)}...</span>
    `;
    linksList.appendChild(div);
}

function showError(msg) {
    const errorArea = document.getElementById('errorArea');
    errorArea.innerText = msg;
    errorArea.classList.remove('hidden');
}

function copyIndividualLink(text, btn) {
    navigator.clipboard.writeText(text);
    const originalText = btn.innerText;
    btn.innerText = 'Copied!';
    btn.style.color = '#7ee787';
    setTimeout(() => {
        btn.innerText = originalText;
        btn.style.color = '';
    }, 2000);
}

function copyAllLinks() {
    const linksList = document.getElementById('linksList');
    const spans = Array.from(linksList.querySelectorAll('.link-box span:first-child'));

    // Filter out error spans (those with red color)
    const links = spans
        .filter(span => span.style.color !== 'rgb(255, 123, 114)') // #ff7b72
        .map(span => span.innerText)
        .join('\n');

    if (links) {
        navigator.clipboard.writeText(links);
        alert('All valid links copied to clipboard!');
    }
}
