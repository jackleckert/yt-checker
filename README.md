# YouTube Fact Checker Extension

Analyze YouTube video transcripts and fact-check content using AI (Gemini).

## Installation

1.  Clone or download this repository.
2.  Open Google Chrome and navigate to `chrome://extensions`.
3.  Enable **Developer mode** in the top right corner.
4.  Click **Load unpacked**.
5.  Select the `yt-checker` folder from this repository.

## Setup

1.  Click the extension icon (puzzle piece -> YouTube Fact Checker) in the browser toolbar.
2.  Enter your **Gemini API Key**.
    *   You can get a free API key from [Google AI Studio](https://makersuite.google.com/).
3.  Click **Save Settings**.

## Usage

1.  Navigate to any YouTube video (ensure it has captions/transcripts available).
2.  The extension will automatically:
    *   Detect the video.
    *   Fetch the transcript.
    *   Analyze facts using the LLM.
3.  **Overlay**: A panel will appear in the top-right of the screen showing:
    *   **Truth Score**: An overall 0-100 verification score.
    *   **Claims List**: A list of key claims, their truthfulness, and reasoning.
    *   **Interactive Timeline**: Click any claim to jump to that part of the video. The list auto-scrolls as the video plays.

## Troubleshooting

*   **Overlay not showing?**
    *   Refresh the page.
    *   Ensure the video url has `?v=VIDEO_ID`.
    *   Check the console (Right-click -> Inspect -> Console) for "YT Fact Checker" logs.
*   **"No transcript found"**: The video must have closed captions (CC) available for this tool to work.
*   **API Errors**: Verify your API key is correct and has quota available.

## Development

*   **Manifest**: V3
*   **Permissions**: `activeTab`, `scripting`, `storage`
*   **Model**: Uses `gemini-1.5-pro` for high-quality reasoning.
