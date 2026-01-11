// DOM Elements
const apiKeyInput = document.getElementById('api-key');
const saveApiKeyBtn = document.getElementById('save-api-key');
const apiStatus = document.getElementById('api-status');
const selectedTextDiv = document.getElementById('selected-text');
const noTextMessage = document.getElementById('no-text-message');
const getSelectionBtn = document.getElementById('get-selection');
const generateBtn = document.getElementById('generate-btn');
const previewSection = document.getElementById('preview-section');
const previewImage = document.getElementById('preview-image');
const insertBtn = document.getElementById('insert-btn');
const downloadBtn = document.getElementById('download-btn');
const regenerateBtn = document.getElementById('regenerate-btn');
const loadingDiv = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');

let currentSelectedText = '';
let currentImageData = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadApiKey();
  await getSelectedTextFromPage();
});

// Load saved API key
async function loadApiKey() {
  const result = await chrome.storage.local.get(['geminiApiKey']);
  if (result.geminiApiKey) {
    apiKeyInput.value = '••••••••••••••••';
    apiKeyInput.dataset.saved = 'true';
    showStatus(apiStatus, 'APIキーが保存されています', 'success');
  }
}

// Save API key
saveApiKeyBtn.addEventListener('click', async () => {
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey || apiKey === '••••••••••••••••') {
    showStatus(apiStatus, 'APIキーを入力してください', 'error');
    return;
  }

  await chrome.storage.local.set({ geminiApiKey: apiKey });
  apiKeyInput.value = '••••••••••••••••';
  apiKeyInput.dataset.saved = 'true';
  showStatus(apiStatus, 'APIキーを保存しました', 'success');
  updateGenerateButton();
});

// Clear API key input on focus if it shows masked value
apiKeyInput.addEventListener('focus', () => {
  if (apiKeyInput.dataset.saved === 'true') {
    apiKeyInput.value = '';
    apiKeyInput.type = 'text';
  }
});

apiKeyInput.addEventListener('blur', async () => {
  if (apiKeyInput.value === '') {
    const result = await chrome.storage.local.get(['geminiApiKey']);
    if (result.geminiApiKey) {
      apiKeyInput.value = '••••••••••••••••';
      apiKeyInput.dataset.saved = 'true';
    }
  }
  apiKeyInput.type = 'password';
});

// Get selected text from Notion page
getSelectionBtn.addEventListener('click', getSelectedTextFromPage);

async function getSelectedTextFromPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url.includes('notion.so')) {
      showError('Notionページで使用してください');
      return;
    }

    // Inject content script if needed and get selection
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString()
    });

    const text = results[0]?.result?.trim();

    if (text) {
      currentSelectedText = text;
      selectedTextDiv.textContent = text;
      selectedTextDiv.classList.remove('hidden');
      noTextMessage.classList.add('hidden');
      updateGenerateButton();
      hideError();
    } else {
      currentSelectedText = '';
      selectedTextDiv.classList.add('hidden');
      noTextMessage.classList.remove('hidden');
      showError('テキストが選択されていません');
      updateGenerateButton();
    }
  } catch (error) {
    console.error('Error getting selection:', error);
    showError('テキストの取得に失敗しました');
  }
}

// Update generate button state
async function updateGenerateButton() {
  const result = await chrome.storage.local.get(['geminiApiKey']);
  const hasApiKey = !!result.geminiApiKey;
  const hasText = !!currentSelectedText;

  generateBtn.disabled = !(hasApiKey && hasText);
}

// Generate diagram
generateBtn.addEventListener('click', generateDiagram);
regenerateBtn.addEventListener('click', generateDiagram);

async function generateDiagram() {
  if (!currentSelectedText) {
    showError('テキストを選択してください');
    return;
  }

  const result = await chrome.storage.local.get(['geminiApiKey']);
  if (!result.geminiApiKey) {
    showError('APIキーを設定してください');
    return;
  }

  const style = document.querySelector('input[name="diagram-style"]:checked').value;

  showLoading(true);
  hideError();

  try {
    // Send message to background script to generate image
    const response = await chrome.runtime.sendMessage({
      action: 'generateDiagram',
      text: currentSelectedText,
      style: style,
      apiKey: result.geminiApiKey
    });

    if (response.success) {
      currentImageData = response.imageData;
      previewImage.src = response.imageData;
      previewSection.classList.remove('hidden');
    } else {
      showError(response.error || '図解の生成に失敗しました');
    }
  } catch (error) {
    console.error('Error generating diagram:', error);
    showError('図解の生成中にエラーが発生しました');
  } finally {
    showLoading(false);
  }
}

// Insert image to Notion
insertBtn.addEventListener('click', async () => {
  if (!currentImageData) {
    showError('画像がありません');
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Send message to content script to insert image
    await chrome.tabs.sendMessage(tab.id, {
      action: 'insertImage',
      imageData: currentImageData
    });

    showStatus(apiStatus, 'Notionに画像を挿入しました', 'success');
  } catch (error) {
    console.error('Error inserting image:', error);
    showError('画像の挿入に失敗しました。Notionページをリロードしてお試しください。');
  }
});

// Download image
downloadBtn.addEventListener('click', () => {
  if (!currentImageData) {
    showError('画像がありません');
    return;
  }

  const link = document.createElement('a');
  link.href = currentImageData;
  link.download = `notion-diagram-${Date.now()}.png`;
  link.click();
});

// Utility functions
function showLoading(show) {
  loadingDiv.classList.toggle('hidden', !show);
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
}

function hideError() {
  errorMessage.classList.add('hidden');
}

function showStatus(element, message, type) {
  element.textContent = message;
  element.className = `status ${type}`;
  element.classList.remove('hidden');

  setTimeout(() => {
    element.classList.add('hidden');
  }, 3000);
}
