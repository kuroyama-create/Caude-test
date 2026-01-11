// Notion Diagram Generator - Background Service Worker
// Handles Gemini 3 Pro Image (Nano Banana Pro) for AI-powered diagram image generation

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateDiagram') {
    generateDiagram(request.text, request.style, request.apiKey)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }
});

// Generate diagram using Gemini 3 Pro Image (Nano Banana Pro)
async function generateDiagram(text, style, apiKey) {
  try {
    // Create a detailed prompt for diagram generation
    const imagePrompt = createImagePrompt(text, style);

    // Generate image using Imagen 3
    const imageData = await generateImageWithImagen3(imagePrompt, apiKey);

    return { success: true, imageData };
  } catch (error) {
    console.error('Diagram generation error:', error);
    return { success: false, error: error.message };
  }
}

// Create detailed prompt for image generation
function createImagePrompt(text, style) {
  const styleDescriptions = {
    flowchart: 'a clean professional flowchart diagram with boxes connected by arrows, showing the process flow',
    mindmap: 'a colorful mind map diagram with a central topic and branching subtopics radiating outward',
    infographic: 'a modern infographic with icons, numbers, and visual elements highlighting key points',
    timeline: 'a horizontal timeline diagram with events marked along a line with dates and descriptions'
  };

  const styleDesc = styleDescriptions[style] || styleDescriptions.flowchart;

  // Truncate text if too long
  const truncatedText = text.length > 500 ? text.substring(0, 500) + '...' : text;

  return `Create ${styleDesc} that visualizes the following content.
Make it professional, clean, and easy to understand.
Use a white background with colorful accents.
The diagram should be in Japanese if the content is in Japanese.

Content to visualize:
${truncatedText}

Style: Professional business diagram, clean design, high contrast, readable text`;
}

// Generate image using Gemini 3 Pro Image (Nano Banana Pro) with native image generation
async function generateImageWithImagen3(prompt, apiKey) {
  // Gemini 3 Pro Image (Nano Banana Pro) - AI画像生成モデル
  const geminiImageModels = [
    'gemini-3-pro-image-preview',  // Nano Banana Pro
    'gemini-2.0-flash-exp',
    'gemini-2.0-flash'
  ];

  for (const model of geminiImageModels) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              responseModalities: ['image', 'text'],
              responseMimeType: 'image/png'
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();

        // Check for inline image data in response
        const parts = data.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            const mimeType = part.inlineData.mimeType || 'image/png';
            return `data:${mimeType};base64,${part.inlineData.data}`;
          }
        }
      }

      console.log(`Model ${model} did not return image, trying next...`);
    } catch (e) {
      console.log(`Model ${model} failed: ${e.message}, trying next...`);
    }
  }

  // Fallback: Generate SVG diagram using text analysis
  console.log('Image generation not available, falling back to SVG diagram');
  return await generateWithGeminiFlash(prompt, apiKey);
}

// Fallback: Generate with Gemini 2.0 Flash (creates SVG diagram)
async function generateWithGeminiFlash(prompt, apiKey) {
  // First analyze text with Gemini
  const style = prompt.includes('flowchart') ? 'flowchart' :
                prompt.includes('mind map') ? 'mindmap' :
                prompt.includes('infographic') ? 'infographic' :
                prompt.includes('timeline') ? 'timeline' : 'flowchart';

  // Extract the original text from prompt
  const textMatch = prompt.match(/Content to visualize:\n([\s\S]*?)\n\nStyle:/);
  const text = textMatch ? textMatch[1].trim() : prompt;

  const diagramStructure = await analyzeTextWithGemini(text, style, apiKey);
  const svgContent = generateSVGDiagram(diagramStructure, style);
  return await svgToPng(svgContent);
}

// Analyze text with Gemini API (fallback for diagram structure)
async function analyzeTextWithGemini(text, style, apiKey) {
  const stylePrompts = {
    flowchart: 'フローチャート形式で、処理の流れをステップごとに示す',
    mindmap: 'マインドマップ形式で、中心トピックから放射状に関連項目を配置する',
    infographic: 'インフォグラフィック形式で、重要なポイントを視覚的に強調する',
    timeline: 'タイムライン形式で、時系列順にイベントを配置する'
  };

  const prompt = `以下のテキストを分析し、${stylePrompts[style]}構造に変換してください。

テキスト:
${text}

以下のJSON形式で出力してください（JSONのみ、他のテキストは含めないでください）:
{
  "title": "図解のタイトル",
  "nodes": [
    {
      "id": "node1",
      "label": "ノードのラベル",
      "type": "main|sub|detail",
      "color": "#hexcolor"
    }
  ],
  "connections": [
    {
      "from": "node1",
      "to": "node2",
      "label": "接続ラベル（オプション）"
    }
  ],
  "layout": "${style}"
}

重要:
- ノードは3〜8個程度に要約してください
- ラベルは簡潔に（10文字以内推奨）
- 色は視認性の良い色を選んでください
- 必ず有効なJSONのみを出力してください`;

  // Try multiple Gemini models
  const geminiModels = [
    'gemini-2.0-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash'
  ];

  let lastError = null;

  for (const model of geminiModels) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        lastError = new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        console.log(`Model ${model} failed: ${lastError.message}, trying next...`);
        continue;
      }

      const data = await response.json();
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textContent) {
        lastError = new Error('Gemini APIからの応答が空です');
        continue;
      }

      // Parse JSON from response
      try {
        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = textContent;
        const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1];
        }
        return JSON.parse(jsonStr.trim());
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Response:', textContent);
        // Return a fallback structure
        return createFallbackStructure(text, style);
      }
    } catch (e) {
      lastError = e;
      console.log(`Model ${model} failed with exception, trying next...`);
    }
  }

  // All models failed, throw last error or return fallback
  if (lastError) {
    console.error('All Gemini models failed:', lastError);
  }
  return createFallbackStructure(text, style);
}

// Create fallback structure when Gemini response fails
function createFallbackStructure(text, style) {
  const sentences = text.split(/[。.!！?？\n]/).filter(s => s.trim().length > 0);
  const nodes = sentences.slice(0, 6).map((sentence, index) => ({
    id: `node${index + 1}`,
    label: sentence.trim().substring(0, 15) + (sentence.length > 15 ? '...' : ''),
    type: index === 0 ? 'main' : 'sub',
    color: getDefaultColor(index)
  }));

  const connections = nodes.slice(1).map((node, index) => ({
    from: nodes[index].id,
    to: node.id
  }));

  return {
    title: text.substring(0, 30) + '...',
    nodes,
    connections,
    layout: style
  };
}

// Get default colors
function getDefaultColor(index) {
  const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#43e97b'];
  return colors[index % colors.length];
}

// Generate SVG diagram
function generateSVGDiagram(structure, style) {
  const width = 800;
  const height = 600;
  const padding = 40;

  let svgContent = '';

  switch (style) {
    case 'flowchart':
      svgContent = generateFlowchartSVG(structure, width, height, padding);
      break;
    case 'mindmap':
      svgContent = generateMindmapSVG(structure, width, height, padding);
      break;
    case 'infographic':
      svgContent = generateInfographicSVG(structure, width, height, padding);
      break;
    case 'timeline':
      svgContent = generateTimelineSVG(structure, width, height, padding);
      break;
    default:
      svgContent = generateFlowchartSVG(structure, width, height, padding);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-opacity="0.2"/>
    </filter>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f7f6f3"/>
      <stop offset="100%" style="stop-color:#ffffff"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bgGradient)"/>
  ${svgContent}
</svg>`;
}

// Generate Flowchart SVG
function generateFlowchartSVG(structure, width, height, padding) {
  const nodes = structure.nodes || [];
  const connections = structure.connections || [];
  const title = structure.title || '';

  const nodeWidth = 160;
  const nodeHeight = 50;
  const verticalGap = 80;

  let svg = '';

  // Title
  svg += `<text x="${width / 2}" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="#37352f">${escapeXml(title)}</text>`;

  // Calculate positions
  const startY = 60;
  const positions = nodes.map((node, index) => ({
    x: width / 2,
    y: startY + index * (nodeHeight + verticalGap)
  }));

  // Draw connections
  connections.forEach(conn => {
    const fromIndex = nodes.findIndex(n => n.id === conn.from);
    const toIndex = nodes.findIndex(n => n.id === conn.to);
    if (fromIndex >= 0 && toIndex >= 0) {
      const from = positions[fromIndex];
      const to = positions[toIndex];
      svg += `<line x1="${from.x}" y1="${from.y + nodeHeight / 2}" x2="${to.x}" y2="${to.y - nodeHeight / 2}" stroke="#9b9b9b" stroke-width="2" marker-end="url(#arrowhead)"/>`;
    }
  });

  // Arrow marker
  svg += `<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#9b9b9b"/></marker></defs>`;

  // Draw nodes
  nodes.forEach((node, index) => {
    const pos = positions[index];
    const color = node.color || getDefaultColor(index);
    const x = pos.x - nodeWidth / 2;
    const y = pos.y - nodeHeight / 2;

    svg += `<rect x="${x}" y="${y}" width="${nodeWidth}" height="${nodeHeight}" rx="8" fill="${color}" filter="url(#shadow)"/>`;
    svg += `<text x="${pos.x}" y="${pos.y + 5}" text-anchor="middle" font-size="13" fill="white" font-weight="500">${escapeXml(node.label)}</text>`;
  });

  return svg;
}

// Generate Mindmap SVG
function generateMindmapSVG(structure, width, height, padding) {
  const nodes = structure.nodes || [];
  const title = structure.title || '';

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 3;

  let svg = '';

  // Central node
  const mainNode = nodes[0] || { label: title, color: '#667eea' };
  svg += `<circle cx="${centerX}" cy="${centerY}" r="60" fill="${mainNode.color || '#667eea'}" filter="url(#shadow)"/>`;
  svg += `<text x="${centerX}" y="${centerY + 5}" text-anchor="middle" font-size="14" fill="white" font-weight="bold">${escapeXml(mainNode.label.substring(0, 12))}</text>`;

  // Satellite nodes
  const satelliteNodes = nodes.slice(1);
  satelliteNodes.forEach((node, index) => {
    const angle = (index / satelliteNodes.length) * Math.PI * 2 - Math.PI / 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    const color = node.color || getDefaultColor(index + 1);

    // Connection line
    svg += `<line x1="${centerX}" y1="${centerY}" x2="${x}" y2="${y}" stroke="${color}" stroke-width="3" opacity="0.5"/>`;

    // Node
    svg += `<ellipse cx="${x}" cy="${y}" rx="70" ry="35" fill="${color}" filter="url(#shadow)"/>`;
    svg += `<text x="${x}" y="${y + 5}" text-anchor="middle" font-size="12" fill="white" font-weight="500">${escapeXml(node.label.substring(0, 15))}</text>`;
  });

  return svg;
}

// Generate Infographic SVG
function generateInfographicSVG(structure, width, height, padding) {
  const nodes = structure.nodes || [];
  const title = structure.title || '';

  let svg = '';

  // Title
  svg += `<text x="${width / 2}" y="40" text-anchor="middle" font-size="20" font-weight="bold" fill="#37352f">${escapeXml(title)}</text>`;

  // Cards layout
  const cardWidth = 200;
  const cardHeight = 100;
  const cols = 3;
  const startY = 80;
  const gapX = 30;
  const gapY = 20;

  nodes.forEach((node, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const totalWidth = cols * cardWidth + (cols - 1) * gapX;
    const startX = (width - totalWidth) / 2;

    const x = startX + col * (cardWidth + gapX);
    const y = startY + row * (cardHeight + gapY);
    const color = node.color || getDefaultColor(index);

    // Card background
    svg += `<rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="12" fill="white" stroke="${color}" stroke-width="3" filter="url(#shadow)"/>`;

    // Color accent bar
    svg += `<rect x="${x}" y="${y}" width="8" height="${cardHeight}" rx="4" fill="${color}"/>`;

    // Number badge
    svg += `<circle cx="${x + 30}" cy="${y + 25}" r="15" fill="${color}"/>`;
    svg += `<text x="${x + 30}" y="${y + 30}" text-anchor="middle" font-size="14" fill="white" font-weight="bold">${index + 1}</text>`;

    // Label
    svg += `<text x="${x + 55}" y="${y + 30}" font-size="12" fill="#37352f" font-weight="600">${escapeXml(node.label.substring(0, 18))}</text>`;

    // Type indicator
    const typeLabel = node.type === 'main' ? '重要' : node.type === 'detail' ? '詳細' : '';
    if (typeLabel) {
      svg += `<text x="${x + 55}" y="${y + 55}" font-size="10" fill="#9b9b9b">${typeLabel}</text>`;
    }
  });

  return svg;
}

// Generate Timeline SVG
function generateTimelineSVG(structure, width, height, padding) {
  const nodes = structure.nodes || [];
  const title = structure.title || '';

  let svg = '';

  // Title
  svg += `<text x="${width / 2}" y="35" text-anchor="middle" font-size="18" font-weight="bold" fill="#37352f">${escapeXml(title)}</text>`;

  // Timeline line
  const lineY = height / 2;
  const startX = padding + 50;
  const endX = width - padding - 50;

  svg += `<line x1="${startX}" y1="${lineY}" x2="${endX}" y2="${lineY}" stroke="#e0ddd8" stroke-width="4" stroke-linecap="round"/>`;

  // Timeline nodes
  const nodeSpacing = (endX - startX) / Math.max(nodes.length - 1, 1);

  nodes.forEach((node, index) => {
    const x = startX + index * nodeSpacing;
    const isAbove = index % 2 === 0;
    const yOffset = isAbove ? -80 : 80;
    const color = node.color || getDefaultColor(index);

    // Connector line
    svg += `<line x1="${x}" y1="${lineY}" x2="${x}" y2="${lineY + yOffset * 0.6}" stroke="${color}" stroke-width="2"/>`;

    // Circle on timeline
    svg += `<circle cx="${x}" cy="${lineY}" r="12" fill="${color}" stroke="white" stroke-width="3"/>`;

    // Node card
    const cardY = isAbove ? lineY + yOffset - 40 : lineY + yOffset - 20;
    svg += `<rect x="${x - 60}" y="${cardY}" width="120" height="50" rx="8" fill="${color}" filter="url(#shadow)"/>`;
    svg += `<text x="${x}" y="${cardY + 30}" text-anchor="middle" font-size="11" fill="white" font-weight="500">${escapeXml(node.label.substring(0, 14))}</text>`;

    // Step number
    svg += `<text x="${x}" y="${lineY + 5}" text-anchor="middle" font-size="10" fill="white" font-weight="bold">${index + 1}</text>`;
  });

  return svg;
}

// Convert SVG to data URL (Service Worker compatible)
async function svgToPng(svgString) {
  // Service Worker doesn't support URL.createObjectURL or Image
  // Return SVG as base64 data URL instead
  const base64 = btoa(unescape(encodeURIComponent(svgString)));
  return `data:image/svg+xml;base64,${base64}`;
}

// Escape XML special characters
function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Log when service worker starts
console.log('Notion Diagram Generator background service worker loaded');
