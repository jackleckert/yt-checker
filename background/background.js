
// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyzeTranscript') {
        analyzeTranscript(request.transcript, request.videoId)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ error: error.message }));
        return true; // Keep channel open for async response
    }
});

async function analyzeTranscript(transcript, videoId) {
    // Get API key
    const data = await chrome.storage.local.get('geminiApiKey');
    const apiKey = data.geminiApiKey;

    if (!apiKey) {
        throw new Error('API Key missing. Please set it in the extension options.');
    }

    // Construct Prompt
    console.log(`Processing transcript with ${transcript.length} segments.`);

    // Simplifying transcript to text with timestamps
    const transcriptText = transcript.map(t => `[${t.start.toFixed(1)}s] ${t.text}`).join('\n');
    console.log(`Full transcript text length: ${transcriptText.length} characters.`);

    const prompt = `
  You are a strict fact-checker. Analyze the following YouTube video transcript.
  Identify distinct factual claims. For each claim, verify it against your knowledge base.
  Return a JSON object with a "claims" array. 
  Each item in "claims" should have:
  - "timestamp": number (start time in seconds)
  - "text": string (the claim text)
  - "truth_score": number (0-100, where 0 is false, 100 is true/verified)
  - "reasoning": string (brief explanation)
  
  Also include an "overall_score": number (0-100) for the whole video.
  
  JSON ONLY. No markdown formatting.
  
  Transcript:
  ${transcriptText}
  `;

    try {
        // Using gemini-2.5-flash for better reasoning on large contexts
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || 'Gemini API request failed');
        }

        const responseData = await response.json();
        const textResult = responseData.candidates[0].content.parts[0].text;

        // Clean up markdown code blocks if present
        const cleanJson = textResult.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(cleanJson);

    } catch (error) {
        console.error('Fact check error:', error);
        throw error;
    }
}
