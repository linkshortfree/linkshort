function toggleOptions() {
    const options = document.getElementById('customOptions');
    if (options.classList.contains('show')) {
        options.classList.remove('show');
    } else {
        options.classList.add('show');
        document.getElementById('aliasInput').focus();
    }
}

async function shortenUrl() {
    const urlInput = document.getElementById('urlInput');
    const aliasInput = document.getElementById('aliasInput');
    const resultArea = document.getElementById('resultArea');
    const errorArea = document.getElementById('errorArea');
    const shortenBtn = document.getElementById('shortenBtn');

    // Reset UI
    resultArea.classList.remove('visible');
    resultArea.classList.add('hidden');
    errorArea.classList.add('hidden');
    
    const url = urlInput.value.trim();
    if (!url) {
        showError('Please enter a URL');
        return;
    }

    // Loading State
    const originalBtnText = shortenBtn.innerText;
    shortenBtn.innerText = 'Shortening...';
    shortenBtn.disabled = true;

    try {
        const response = await fetch('/api/shorten', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: url,
                alias: aliasInput.value.trim() || null
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Success
            const fullShortUrl = window.location.origin + '/' + data.alias;
            document.getElementById('shortLink').innerText = fullShortUrl;
            
            resultArea.classList.remove('hidden');
            // Small delay for animation
            setTimeout(() => {
                resultArea.classList.add('visible');
            }, 10);
            
            urlInput.value = '';
            aliasInput.value = '';
        } else {
            showError(data.error || 'Something went wrong');
        }

    } catch (err) {
        showError('Failed to connect to server');
        console.error(err);
    } finally {
        shortenBtn.innerText = originalBtnText;
        shortenBtn.disabled = false;
    }
}

function showError(msg) {
    const errorArea = document.getElementById('errorArea');
    errorArea.innerText = msg;
    errorArea.classList.remove('hidden');
}

function copyLink() {
    const linkText = document.getElementById('shortLink').innerText;
    navigator.clipboard.writeText(linkText).then(() => {
        const btn = document.querySelector('.copy-btn');
        const originalText = btn.innerText;
        btn.innerText = 'Copied!';
        btn.style.background = '#238636'; // Success green
        
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.background = 'rgba(255, 255, 255, 0.1)';
        }, 2000);
    });
}

// Enter key support
document.getElementById('urlInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        shortenUrl();
    }
});
