function toggleOptions() {
    const options = document.getElementById('customOptions');
    options.classList.toggle('show');
}

async function shortenUrl() {
    const urlInput = document.getElementById('urlInput');
    const aliasInput = document.getElementById('aliasInput');
    const resultArea = document.getElementById('resultArea');
    const linksList = document.getElementById('linksList');
    const errorArea = document.getElementById('errorArea');
    const shortenBtn = document.getElementById('shortenBtn');

    // Split by lines and filter out empty strings
    const urls = urlInput.value.split('\n').map(u => u.trim()).filter(u => u !== '');
    const customAlias = aliasInput.value.trim();

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
                addLinkToUI(fullShortUrl, url);
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

function addLinkToUI(shortUrl, originalUrl) {
    const linksList = document.getElementById('linksList');
    const div = document.createElement('div');
    div.className = 'link-box';
    div.innerHTML = `
        <span title="${originalUrl}">${shortUrl}</span>
        <button class="copy-btn" onclick="copyIndividualLink('${shortUrl}', this)">Copy</button>
    `;
    linksList.appendChild(div);
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
