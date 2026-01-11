// Notion Diagram Generator - Content Script
// This script runs on Notion pages and handles image insertion

(function() {
  'use strict';

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'insertImage') {
      insertImageToNotion(request.imageData)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep the message channel open for async response
    }

    if (request.action === 'getSelection') {
      const selection = window.getSelection().toString().trim();
      sendResponse({ text: selection });
      return true;
    }
  });

  // Insert image to Notion
  async function insertImageToNotion(imageData) {
    try {
      // Method 1: Use clipboard API to paste image
      const blob = await fetch(imageData).then(r => r.blob());

      // Create a clipboard item with the image
      const clipboardItem = new ClipboardItem({
        'image/png': blob
      });

      await navigator.clipboard.write([clipboardItem]);

      // Show notification to user
      showNotification('画像をクリップボードにコピーしました。Ctrl+V (Cmd+V) で貼り付けてください。', 'success');

      // Try to trigger paste automatically
      setTimeout(() => {
        simulatePaste();
      }, 100);

    } catch (clipboardError) {
      console.log('Clipboard API failed, trying alternative method:', clipboardError);

      // Method 2: Show inline image with drag instruction
      showInlineImage(imageData);
    }
  }

  // Simulate paste event
  function simulatePaste() {
    try {
      // Focus on the current Notion block
      const activeElement = document.activeElement;
      const notionPage = document.querySelector('.notion-page-content');

      if (notionPage) {
        // Try to focus and paste
        document.execCommand('paste');
      }
    } catch (error) {
      console.log('Auto-paste failed:', error);
    }
  }

  // Show inline image that user can drag
  function showInlineImage(imageData) {
    // Remove existing overlay if any
    const existingOverlay = document.getElementById('notion-diagram-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'notion-diagram-overlay';
    overlay.innerHTML = `
      <div class="notion-diagram-modal">
        <div class="notion-diagram-header">
          <h3>生成された図解</h3>
          <button class="notion-diagram-close">&times;</button>
        </div>
        <div class="notion-diagram-content">
          <img src="${imageData}" alt="Generated Diagram" draggable="true" id="notion-diagram-image">
          <p class="notion-diagram-instructions">
            📌 この画像をNotionにドラッグ&ドロップするか、<br>
            右クリックで「画像をコピー」してNotionに貼り付けてください。
          </p>
        </div>
        <div class="notion-diagram-actions">
          <button class="notion-diagram-btn copy-btn">📋 画像をコピー</button>
          <button class="notion-diagram-btn download-btn">💾 ダウンロード</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Add event listeners
    const closeBtn = overlay.querySelector('.notion-diagram-close');
    closeBtn.addEventListener('click', () => overlay.remove());

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    // Copy button
    const copyBtn = overlay.querySelector('.copy-btn');
    copyBtn.addEventListener('click', async () => {
      try {
        const blob = await fetch(imageData).then(r => r.blob());
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        showNotification('画像をコピーしました！', 'success');
      } catch (error) {
        console.error('Copy failed:', error);
        showNotification('コピーに失敗しました', 'error');
      }
    });

    // Download button
    const downloadBtn = overlay.querySelector('.download-btn');
    downloadBtn.addEventListener('click', () => {
      const link = document.createElement('a');
      link.href = imageData;
      link.download = `notion-diagram-${Date.now()}.png`;
      link.click();
    });

    // Make image draggable
    const img = overlay.querySelector('#notion-diagram-image');
    img.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/uri-list', imageData);
      e.dataTransfer.setData('text/plain', imageData);
    });
  }

  // Show notification
  function showNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.getElementById('notion-diagram-notification');
    if (existing) {
      existing.remove();
    }

    const notification = document.createElement('div');
    notification.id = 'notion-diagram-notification';
    notification.className = `notion-diagram-notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);

    // Remove after delay
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Initialize
  console.log('Notion Diagram Generator content script loaded');
})();
