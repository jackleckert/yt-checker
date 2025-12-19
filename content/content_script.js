class YouTubeTranscriptFetcher {
    static async getTranscript(videoId) {
        try {
            const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
            const html = await response.text();

            const captionsJson = this.extractCaptionsJson(html);
            if (!captionsJson) {
                throw new Error('No captions found for this video.');
            }

            const trackUrl = captionsJson.captionTracks[0].baseUrl;
            const transcriptResponse = await fetch(trackUrl);
            const transcriptXml = await transcriptResponse.text();

            return this.parseTranscript(transcriptXml);
        } catch (e) {
            console.error('Error fetching transcript:', e);
            return null;
        }
    }

    static extractCaptionsJson(html) {
        const splitHtml = html.split('"captions":');
        if (splitHtml.length <= 1) return null;

        try {
            const jsonStr = splitHtml[1].split(',"videoDetails')[0].replace('\n', '');
            const json = JSON.parse(jsonStr);
            return json.playerCaptionsTracklistRenderer;
        } catch (e) {
            return null;
        }
    }

    static parseTranscript(xml) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xml, "text/xml");
        const textNodes = xmlDoc.getElementsByTagName("text");

        const transcript = [];
        for (let i = 0; i < textNodes.length; i++) {
            const node = textNodes[i];
            const start = parseFloat(node.getAttribute("start"));
            const dur = parseFloat(node.getAttribute("dur"));
            const text = node.textContent;

            transcript.push({
                start,
                dur,
                text: text.replace(/&#39;/g, "'").replace(/&quot;/g, '"')
            });
        }
        return transcript;
    }
}

// UI Manager
class FactCheckerUI {
    constructor() {
        this.overlay = null;
        this.statusElem = null;
        this.scoreElem = null;
        this.claimsListElem = null;
        this.toggleElem = null;
        this.isExpanded = true;
    }

    createOverlay() {
        if (this.overlay) return;

        this.overlay = document.createElement('div');
        this.overlay.id = 'yt-fact-checker-overlay';

        // Header
        const header = document.createElement('div');
        header.className = 'yt-fc-header';

        const title = document.createElement('span');
        title.className = 'yt-fc-title';
        title.textContent = 'Fact Checker';

        this.scoreElem = document.createElement('span');
        this.scoreElem.className = 'yt-fc-score';
        this.scoreElem.style.display = 'none';

        header.appendChild(title);
        header.appendChild(this.scoreElem);

        // Status
        this.statusElem = document.createElement('div');
        this.statusElem.className = 'yt-fc-status';
        this.statusElem.textContent = 'Ready';

        // Claims List
        this.claimsListElem = document.createElement('div');
        this.claimsListElem.className = 'yt-fc-claims-list';
        this.claimsListElem.style.display = 'none';

        // Toggle
        this.toggleElem = document.createElement('div');
        this.toggleElem.className = 'yt-fc-toggle';
        this.toggleElem.textContent = 'Hide Details';
        this.toggleElem.onclick = () => this.toggleDetails();

        this.overlay.appendChild(header);
        this.overlay.appendChild(this.statusElem);
        this.overlay.appendChild(this.claimsListElem);
        this.overlay.appendChild(this.toggleElem);

        document.body.appendChild(this.overlay);
    }

    toggleDetails() {
        this.isExpanded = !this.isExpanded;
        if (this.isExpanded) {
            this.claimsListElem.style.display = 'block';
            this.toggleElem.textContent = 'Hide Details';
        } else {
            this.claimsListElem.style.display = 'none';
            this.toggleElem.textContent = 'Show Details';
        }
    }

    updateStatus(text) {
        if (this.statusElem) this.statusElem.textContent = text;
    }

    updateScore(score) {
        if (this.scoreElem) {
            this.scoreElem.textContent = `${score}/100`;
            this.scoreElem.style.display = 'block';
            this.scoreElem.className = 'yt-fc-score';
            if (score >= 80) this.scoreElem.classList.add('high');
            else if (score >= 50) this.scoreElem.classList.add('medium');
            else this.scoreElem.classList.add('low');
        }
    }

    displayClaims(claims) {
        this.claimsListElem.innerHTML = '';
        this.claimsListElem.style.display = this.isExpanded ? 'block' : 'none';

        claims.forEach((claim, index) => {
            const item = document.createElement('div');
            item.className = 'yt-fc-claim-item';
            item.id = `claim-${index}`;
            item.dataset.timestamp = claim.timestamp;

            const scoreSpan = document.createElement('span');
            scoreSpan.className = `yt-fc-claim-score ${claim.truth_score > 80 ? 'true' : claim.truth_score < 50 ? 'false' : 'mixed'}`;
            scoreSpan.textContent = `[${claim.truth_score}]`;

            const textSpan = document.createElement('span');
            // Format timestamp
            const min = Math.floor(claim.timestamp / 60);
            const sec = Math.floor(claim.timestamp % 60);
            const timeStr = `${min}:${sec.toString().padStart(2, '0')}`;

            textSpan.textContent = ` ${timeStr} - ${claim.text}`;

            const reasonDiv = document.createElement('div');
            reasonDiv.style.fontSize = '10px';
            reasonDiv.style.color = '#666';
            reasonDiv.style.marginTop = '2px';
            reasonDiv.textContent = claim.reasoning;

            item.appendChild(scoreSpan);
            item.appendChild(textSpan);
            item.appendChild(reasonDiv);

            // Click to seek
            item.addEventListener('click', () => {
                const video = document.querySelector('video');
                if (video) video.currentTime = claim.timestamp;
            });
            item.style.cursor = 'pointer';

            this.claimsListElem.appendChild(item);
        });
    }

    highlightClaim(index) {
        // Remove active class from all
        const items = this.claimsListElem.querySelectorAll('.yt-fc-claim-item');
        items.forEach(i => i.classList.remove('active'));

        if (index >= 0 && index < items.length) {
            const activeItem = items[index];
            activeItem.classList.add('active');
            activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
}

// Main Controller
async function init() {
    console.log('YT Fact Checker: Script loaded');

    // Wait for body if not ready (rare but possible)
    if (!document.body) {
        console.log('YT Fact Checker: Waiting for body...');
        await new Promise(r => window.onload = r);
    }

    const ui = new FactCheckerUI();
    // Try to create immediately
    ui.createOverlay();
    console.log('YT Fact Checker: Overlay created');

    let currentVideoId = null;
    let currentClaims = [];
    let videoElement = null;

    // Watch for video element
    setInterval(() => {
        if (!videoElement) {
            videoElement = document.querySelector('video');
            if (videoElement) {
                videoElement.ontimeupdate = () => {
                    if (currentClaims.length > 0) {
                        const currentTime = videoElement.currentTime;
                        // Find the active claim (closest one before current time, within reasonable window e.g. 30s)
                        let activeIndex = -1;
                        for (let i = 0; i < currentClaims.length; i++) {
                            if (currentClaims[i].timestamp <= currentTime + 2) { // +2s buffer
                                activeIndex = i;
                            } else {
                                break;
                            }
                        }
                        ui.highlightClaim(activeIndex);
                    }
                };
            }
        }
    }, 1000);

    setInterval(async () => {
        // Re-check overlay existence (in case YouTube redraws/wipes it)
        if (!document.getElementById('yt-fact-checker-overlay')) {
            console.log('YT Fact Checker: Overlay missing, recreating...');
            ui.overlay = null; // Reset ref
            ui.createOverlay();
        }

        const urlParams = new URLSearchParams(window.location.search);
        const videoId = urlParams.get('v');

        if (videoId && videoId !== currentVideoId) {
            currentVideoId = videoId;
            currentClaims = []; // Reset
            console.log('YT Fact Checker: New video detected', videoId);

            ui.updateStatus('New video detected. Analyzing...');
            ui.updateScore('');
            ui.claimsListElem.innerHTML = '';

            console.log('Fetching transcript for', videoId);
            const transcript = await YouTubeTranscriptFetcher.getTranscript(videoId);

            if (!transcript) {
                ui.updateStatus('No transcript found (or fetch failed).');
                return;
            }

            ui.updateStatus('Analysing facts with AI...');

            chrome.runtime.sendMessage({
                action: 'analyzeTranscript',
                transcript: transcript,
                videoId: videoId
            }, (response) => {
                if (chrome.runtime.lastError) {
                    ui.updateStatus('Error: ' + chrome.runtime.lastError.message);
                    return;
                }
                if (response.error) {
                    ui.updateStatus('Error: ' + response.error);
                } else {
                    ui.updateStatus('Analysis complete.');
                    ui.updateScore(response.overall_score);
                    if (response.claims) {
                        currentClaims = response.claims.sort((a, b) => a.timestamp - b.timestamp);
                        ui.displayClaims(currentClaims);
                    }
                }
            });
        }
    }, 1000);
}

init();
