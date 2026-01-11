// pixelArt.js
// 图片转像素画核心逻辑
import { rgb_to_lab, diff } from 'color-diff';

// 获取原图像素数据
export function getImageData(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, img.width, img.height);
  return ctx.getImageData(0, 0, img.width, img.height);
}

// 获取缩放后像素数据（原方案）
export function getResizedImageData(img, pixelWidth, pixelHeight) {
  const canvas = document.createElement('canvas');
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, pixelWidth, pixelHeight);
  return ctx.getImageData(0, 0, pixelWidth, pixelHeight);
}

// 取主色
function getDominantColor(data, x0, y0, blockW, blockH, imgW, excludeEdge = false) {
  let sx = x0, sy = y0, ex = x0 + blockW, ey = y0 + blockH;
  if (excludeEdge) {
    const marginX = Math.max(1, Math.floor(blockW * 0.15));
    const marginY = Math.max(1, Math.floor(blockH * 0.15));
    sx += marginX; ex -= marginX; sy += marginY; ey -= marginY;
  }
  const colorCount = {};
  let maxCount = 0;
  let dominant = { r: 0, g: 0, b: 0 };
  for (let y = sy; y < ey; y++) {
    for (let x = sx; x < ex; x++) {
      const px = y * imgW + x;
      const i = px * 4;
      const key = `${data[i]},${data[i+1]},${data[i+2]}`;
      colorCount[key] = (colorCount[key] || 0) + 1;
      if (colorCount[key] > maxCount) {
        maxCount = colorCount[key];
        dominant = { r: data[i], g: data[i+1], b: data[i+2] };
      }
    }
  }
  return dominant;
}

// 取平均色
function getAverageColor(data, x0, y0, blockW, blockH, imgW, excludeEdge = false) {
  let sx = x0, sy = y0, ex = x0 + blockW, ey = y0 + blockH;
  if (excludeEdge) {
    const marginX = Math.max(1, Math.floor(blockW * 0.15));
    const marginY = Math.max(1, Math.floor(blockH * 0.15));
    sx += marginX; ex -= marginX; sy += marginY; ey -= marginY;
  }
  let r = 0, g = 0, b = 0, count = 0;
  for (let y = sy; y < ey; y++) {
    for (let x = sx; x < ex; x++) {
      const px = y * imgW + x;
      const i = px * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
  }
  return count > 0 ? {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count)
  } : { r: 0, g: 0, b: 0 };
}

// 取中心像素色
function getCenterColor(data, x0, y0, blockW, blockH, imgW, excludeEdge = false) {
  let cx = Math.floor(blockW / 2), cy = Math.floor(blockH / 2);
  if (excludeEdge) {
    // 取中心区域的中心像素
    const marginX = Math.max(1, Math.floor(blockW * 0.15));
    const marginY = Math.max(1, Math.floor(blockH * 0.15));
    cx = Math.floor((blockW - 2 * marginX) / 2) + marginX;
    cy = Math.floor((blockH - 2 * marginY) / 2) + marginY;
  }
  const px = (y0 + cy) * imgW + (x0 + cx);
  const i = px * 4;
  return {
    r: data[i],
    g: data[i + 1],
    b: data[i + 2]
  };
}

// 取对角线4/5处像素色
function getDiagonal45Color(data, x0, y0, blockW, blockH, imgW, excludeEdge = false) {
  // 计算4/5位置
  let px = Math.floor(blockW * 4 / 5);
  let py = Math.floor(blockH * 4 / 5);
  if (excludeEdge) {
    const marginX = Math.max(1, Math.floor(blockW * 0.15));
    const marginY = Math.max(1, Math.floor(blockH * 0.15));
    px = Math.floor((blockW - 2 * marginX) * 4 / 5) + marginX;
    py = Math.floor((blockH - 2 * marginY) * 4 / 5) + marginY;
  }
  const xx = x0 + px;
  const yy = y0 + py;
  const i = (yy * imgW + xx) * 4;
  return {
    r: data[i],
    g: data[i + 1],
    b: data[i + 2]
  };
}

// hex转rgb
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  };
}

// 计算颜色亮度（0-255），用于判断文字颜色
function getLuminance(r, g, b) {
  // 使用相对亮度公式：Y = 0.299*R + 0.587*G + 0.114*B
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// 生成像素画canvas
export function generatePixelArt({
  img,
  pixelWidth,
  pixelHeight,
  cellSize = 24,
  colorTable,
  showGrid = true,
  font = 'bold 12px sans-serif',
  colorMode = 'dominant',
  excludeEdge = false,
  showText = true,
  showReferenceLines = false,
  pixelData = null // 可选的已有像素数据，如果提供则直接使用
}) {
  let result;
  
  // 如果提供了pixelData，直接使用；否则重新计算
  if (pixelData) {
    result = pixelData;
  } else {
    let data, imgW, imgH, blockW, blockH;
    if (colorMode === 'original') {
      // 原方案：先缩放再取色
      const imageData = getResizedImageData(img, pixelWidth, pixelHeight);
      data = imageData.data;
      imgW = pixelWidth;
      imgH = pixelHeight;
      blockW = 1;
      blockH = 1;
    } else {
      // 新方案：原图分块（自适应，保证不裁剪）
      const imageData = getImageData(img);
      data = imageData.data;
      imgW = imageData.width;
      imgH = imageData.height;
      // blockW/blockH 改为浮点数，后续每格自适应
      blockW = imgW / pixelWidth;
      blockH = imgH / pixelHeight;
    }

    // 标准色准备
    const palette = colorTable.map(c => ({
      ...hexToRgb(c.hex),
      name: c.name,
      hex: c.hex
    }));
    const paletteLab = palette.map(c => ({
      ...rgb_to_lab(c),
      name: c.name,
      hex: c.hex
    }));

    // 生成像素画数据
    result = [];
    for (let y = 0; y < pixelHeight; y++) {
      const row = [];
      for (let x = 0; x < pixelWidth; x++) {
        let rgb;
        // 计算每个格子的实际像素区域，保证全图覆盖
        const x0 = Math.round(x * blockW);
        const y0 = Math.round(y * blockH);
        const x1 = Math.round((x + 1) * blockW);
        const y1 = Math.round((y + 1) * blockH);
        const w = Math.max(1, x1 - x0);
        const h = Math.max(1, y1 - y0);
        if (colorMode === 'diagonal45') {
          rgb = getDiagonal45Color(data, x0, y0, w, h, imgW, excludeEdge);
        } else if (colorMode === 'dominant') {
          rgb = getDominantColor(data, x0, y0, w, h, imgW, excludeEdge);
        } else if (colorMode === 'average') {
          rgb = getAverageColor(data, x0, y0, w, h, imgW, excludeEdge);
        } else if (colorMode === 'center') {
          rgb = getCenterColor(data, x0, y0, w, h, imgW, excludeEdge);
        } else if (colorMode === 'original') {
          // 直接取缩放后像素
          const i = (y * imgW + x) * 4;
          rgb = { r: data[i], g: data[i + 1], b: data[i + 2] };
        } else {
          rgb = getDominantColor(data, x0, y0, w, h, imgW, excludeEdge);
        }
        // 映射到标准色
        const lab = rgb_to_lab(rgb);
        let minDist = Infinity, minIdx = 0;
        for (let j = 0; j < paletteLab.length; j++) {
          const d = diff(lab, paletteLab[j]);
          if (d < minDist) {
            minDist = d;
            minIdx = j;
          }
        }
        row.push(palette[minIdx]);
      }
      result.push(row);
    }
  }

  // 统计用到的色号及其数量
  const colorCountMap = new Map();
  const colorHexMap = new Map();
  result.flat().forEach((c) => {
    const count = colorCountMap.get(c.name) || 0;
    colorCountMap.set(c.name, count + 1);
    if (!colorHexMap.has(c.name)) {
      colorHexMap.set(c.name, c.hex);
    }
  });
  
  const usedColors = [];
  colorCountMap.forEach((count, name) => {
    usedColors.push({ 
      name, 
      hex: colorHexMap.get(name), 
      count 
    });
  });
  // 按色号名称排序
  usedColors.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN', { numeric: true }));

  // 计算色号清单区域参数
  // 根据像素画的长宽数量动态调整色块大小
  const totalPixels = pixelWidth * pixelHeight;
  const pixelArtWidth = pixelWidth * cellSize;
  const pixelArtHeight = pixelHeight * cellSize;
  
  // 行号和列号参数（提前定义，用于计算canvas宽度）
  const rowColLabelSize = Math.max(20, Math.floor(cellSize * 0.6)); // 行号/列号区域大小，根据cellSize调整
  const pixelArtWithLabelsWidth = pixelWidth * cellSize + 2 * rowColLabelSize; // 左右各加一个行号区域
  
  // 原图预览区域参数（左侧区域）
  const originalImagePadding = Math.max(12, Math.floor(cellSize * 0.5)); // 原图预览区域的内边距
  const originalImageAreaWidth = Math.floor(pixelArtWithLabelsWidth * 0.35); // 原图预览区域占35%宽度
  const originalImageMaxWidth = originalImageAreaWidth - 2 * originalImagePadding;
  const originalImageMaxHeight = Math.floor(pixelArtHeight * 0.4); // 原图预览最大高度为像素画的40%
  
  // 计算原图预览的实际尺寸（保持宽高比）
  let originalImageWidth = originalImageMaxWidth;
  let originalImageHeight = (img.height / img.width) * originalImageWidth;
  if (originalImageHeight > originalImageMaxHeight) {
    originalImageHeight = originalImageMaxHeight;
    originalImageWidth = (img.width / img.height) * originalImageHeight;
  }
  
  // 颜色列表区域宽度（右侧区域，占剩余空间）
  // 减去原图预览区域宽度和一个padding（用于分隔）
  const colorListAreaWidth = pixelArtWithLabelsWidth - originalImageAreaWidth - originalImagePadding;
  
  // 基础色块大小，根据像素画规模调整（增大色块尺寸）
  // 小图（<100格）：20px，中图（100-400格）：28px，大图（>400格）：32px
  // 同时考虑颜色列表区域宽度，确保色块不会太小
  let colorSquareSize;
  if (totalPixels < 100) {
    colorSquareSize = Math.max(20, Math.floor(colorListAreaWidth / 25));
  } else if (totalPixels < 400) {
    colorSquareSize = Math.max(28, Math.floor(colorListAreaWidth / 18));
  } else {
    colorSquareSize = Math.max(32, Math.floor(colorListAreaWidth / 15));
  }
  // 设置上限，避免色块过大
  colorSquareSize = Math.min(colorSquareSize, 50);
  
  // 文字大小根据色块大小调整
  const colorTextSize = Math.max(8, Math.floor(colorSquareSize * 0.5));
  const colorItemSpacing = Math.max(6, Math.floor(colorSquareSize * 0.4)); // 色号项之间的间距
  const colorListPadding = Math.max(12, Math.floor(colorSquareSize * 0.8)); // 色号清单区域的内边距
  const colorItemHeight = colorSquareSize + colorTextSize + Math.max(6, Math.floor(colorTextSize * 0.75)) + 8; // 每个色号项的高度（色块+色号文字+数量文字+间距）
  
  // 计算色号清单区域需要的高度
  const itemsPerRow = Math.floor((colorListAreaWidth - 2 * colorListPadding) / (colorSquareSize + colorItemSpacing));
  const colorListRows = Math.ceil(usedColors.length / itemsPerRow);
  const colorListHeight = Math.max(
    colorListRows * colorItemHeight + 2 * colorListPadding,
    originalImageHeight + 2 * originalImagePadding + 40 // 确保至少能容纳原图预览+标题
  );

  // 顶部横条参数
  const headerHeight = 70; // 横条高度
  const headerBgColor = '#2c3e50'; // 深色背景，符合页面颜色
  const headerTextColor = '#ffffff'; // 白色文字
  const headerSubTextColor = '#cccccc'; // 浅灰色文字

  // 行号和列号参数（使用前面已定义的 rowColLabelSize 和 pixelArtWithLabelsWidth）
  const rowColLabelFontSize = Math.max(10, Math.floor(cellSize * 0.35)); // 行号/列号字体大小
  const rowColLabelBgColor = '#e0e0e0'; // 灰色背景
  const rowColLabelTextColor = '#000000'; // 黑色文字

  // 计算包含行号列号后的实际像素画区域高度
  const pixelArtWithLabelsHeight = pixelHeight * cellSize + 2 * rowColLabelSize; // 上下各加一个列号区域

  // 创建canvas，高度包括顶部横条、行号列号区域、像素画和色号清单
  const canvas = document.createElement('canvas');
  canvas.width = pixelArtWithLabelsWidth;
  canvas.height = headerHeight + pixelArtWithLabelsHeight + colorListHeight;
  const ctx = canvas.getContext('2d');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font;

  // 绘制顶部深色横条
  ctx.fillStyle = headerBgColor;
  ctx.fillRect(0, 0, pixelArtWithLabelsWidth, headerHeight);
  
  // 在横条上绘制文字（左对齐）
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  
  // 绘制"鹤林爱拼图"（第一行，较大字体，白色）
  ctx.font = 'bold 28px "zh-cn-full", sans-serif';
  ctx.fillStyle = headerTextColor;
  ctx.fillText('鹤林爱拼图', 16, headerHeight / 2 - 12);
  
  // 绘制当前页面网址（第二行，较小字体，浅灰色）
  const currentUrl = window.location.href;
  ctx.font = '14px "zh-cn-full", sans-serif';
  ctx.fillStyle = headerSubTextColor;
  ctx.fillText(currentUrl, 16, headerHeight / 2 + 12);
  
  // 恢复默认字体设置
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 像素画起始坐标（在横条下方，考虑行号列号区域）
  const pixelArtStartX = rowColLabelSize; // 左边留出行号区域
  const pixelArtStartY = headerHeight + rowColLabelSize; // 上边留出列号区域

  // 绘制行号和列号背景区域
  // 左边行号区域（从pixelArtStartY开始，与像素画区域对齐）
  ctx.fillStyle = rowColLabelBgColor;
  ctx.fillRect(0, pixelArtStartY, rowColLabelSize, pixelHeight * cellSize);
  // 右边行号区域（从pixelArtStartY开始，与像素画区域对齐）
  ctx.fillRect(pixelArtStartX + pixelWidth * cellSize, pixelArtStartY, rowColLabelSize, pixelHeight * cellSize);
  // 上边列号区域
  ctx.fillRect(pixelArtStartX, headerHeight, pixelWidth * cellSize, rowColLabelSize);
  // 下边列号区域
  ctx.fillRect(pixelArtStartX, pixelArtStartY + pixelHeight * cellSize, pixelWidth * cellSize, rowColLabelSize);

  // 绘制行号（左边和右边）
  ctx.fillStyle = rowColLabelTextColor;
  ctx.font = `${rowColLabelFontSize}px "zh-cn-full", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let y = 0; y < pixelHeight; y++) {
    const rowNum = y + 1;
    const centerY = pixelArtStartY + y * cellSize + cellSize / 2;
    // 左边行号
    ctx.fillText(rowNum.toString(), rowColLabelSize / 2, centerY);
    // 右边行号
    ctx.fillText(rowNum.toString(), pixelArtStartX + pixelWidth * cellSize + rowColLabelSize / 2, centerY);
  }

  // 绘制列号（上边和下边）
  for (let x = 0; x < pixelWidth; x++) {
    const colNum = x + 1;
    const centerX = pixelArtStartX + x * cellSize + cellSize / 2;
    // 上边列号
    ctx.fillText(colNum.toString(), centerX, headerHeight + rowColLabelSize / 2);
    // 下边列号
    ctx.fillText(colNum.toString(), centerX, pixelArtStartY + pixelHeight * cellSize + rowColLabelSize / 2);
  }

  // 恢复默认字体设置
  ctx.font = font;

  // 绘制像素画
  for (let y = 0; y < pixelHeight; y++) {
    for (let x = 0; x < pixelWidth; x++) {
      const c = result[y][x];
      ctx.fillStyle = c.hex;
      ctx.fillRect(pixelArtStartX + x * cellSize, pixelArtStartY + y * cellSize, cellSize, cellSize);
      
      // 如果启用显示文字，则绘制色号
      if (showText) {
        // 根据背景色亮度决定文字颜色
        const luminance = getLuminance(c.r, c.g, c.b);
        ctx.fillStyle = luminance < 128 ? '#fff' : '#222'; // 深色背景用白色文字，浅色背景用黑色文字
        ctx.fillText(c.name, pixelArtStartX + x * cellSize + cellSize / 2, pixelArtStartY + y * cellSize + cellSize / 2);
      }
    }
  }
  if (showGrid) {
    // 绘制普通网格线
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    for (let x = 0; x <= pixelWidth; x++) {
      ctx.beginPath();
      ctx.moveTo(pixelArtStartX + x * cellSize, pixelArtStartY);
      ctx.lineTo(pixelArtStartX + x * cellSize, pixelArtStartY + pixelArtHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= pixelHeight; y++) {
      ctx.beginPath();
      ctx.moveTo(pixelArtStartX, pixelArtStartY + y * cellSize);
      ctx.lineTo(pixelArtStartX + pixelWidth * cellSize, pixelArtStartY + y * cellSize);
      ctx.stroke();
    }
    
    // 如果启用参考线，每5格绘制更粗的线
    if (showReferenceLines) {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 3;
      // 绘制垂直参考线（每5格）
      for (let x = 0; x <= pixelWidth; x += 5) {
        ctx.beginPath();
        ctx.moveTo(pixelArtStartX + x * cellSize, pixelArtStartY);
        ctx.lineTo(pixelArtStartX + x * cellSize, pixelArtStartY + pixelArtHeight);
        ctx.stroke();
      }
      // 绘制水平参考线（每5格）
      for (let y = 0; y <= pixelHeight; y += 5) {
        ctx.beginPath();
        ctx.moveTo(pixelArtStartX, pixelArtStartY + y * cellSize);
        ctx.lineTo(pixelArtStartX + pixelWidth * cellSize, pixelArtStartY + y * cellSize);
        ctx.stroke();
      }
    }
  }

  // 绘制色号清单区域
  const colorListStartY = pixelArtStartY + pixelArtHeight;
  // 绘制分隔线
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, colorListStartY);
  ctx.lineTo(pixelArtWithLabelsWidth, colorListStartY);
  ctx.stroke();

  // 绘制背景（可选，白色背景）
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, colorListStartY, pixelArtWithLabelsWidth, colorListHeight);

  // 绘制原图预览（左侧区域）
  const originalImageStartX = originalImagePadding;
  // 增加上边距，避免被像素画覆盖（从分隔线往下留出更多空间）
  const originalImageTopMargin = Math.max(20, Math.floor(colorListHeight * 0.05));
  const originalImageStartY = colorListStartY + originalImageTopMargin;
  const originalImageCenterX = originalImageStartX + originalImageAreaWidth / 2;
  
  // 绘制"原图预览"标题
  const titleFontSize = Math.max(12, Math.floor(colorTextSize * 1.2));
  ctx.font = `bold ${titleFontSize}px "zh-cn-full", sans-serif`;
  ctx.fillStyle = '#2c3e50';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('原图预览', originalImageCenterX, originalImageStartY);
  
  // 绘制原图（增加标题和原图之间的间距，避免覆盖标题）
  const originalImageX = originalImageCenterX - originalImageWidth / 2;
  const originalImageY = originalImageStartY + titleFontSize + 15; // 标题高度 + 额外间距
  ctx.drawImage(img, originalImageX, originalImageY, originalImageWidth, originalImageHeight);
  
  // 绘制原图边框
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 2;
  ctx.strokeRect(originalImageX, originalImageY, originalImageWidth, originalImageHeight);
  
  // 绘制原图尺寸信息
  ctx.font = `${Math.max(10, Math.floor(colorTextSize * 0.9))}px "zh-cn-full", sans-serif`;
  ctx.fillStyle = '#666';
  ctx.fillText(
    `${img.width} × ${img.height}`,
    originalImageCenterX,
    originalImageY + originalImageHeight + 8
  );

  // 绘制原图预览和颜色列表之间的垂直分隔线
  const dividerX = originalImageAreaWidth;
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(dividerX, colorListStartY);
  ctx.lineTo(dividerX, colorListStartY + colorListHeight);
  ctx.stroke();

  // 绘制色号清单（右侧区域）
  const colorListAreaStartX = originalImageAreaWidth + originalImagePadding;
  ctx.font = `${colorTextSize}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  usedColors.forEach((color, index) => {
    const row = Math.floor(index / itemsPerRow);
    const col = index % itemsPerRow;
    const startX = colorListAreaStartX + colorListPadding + col * (colorSquareSize + colorItemSpacing);
    const startY = colorListStartY + colorListPadding + row * colorItemHeight;
    
    // 绘制色块
    ctx.fillStyle = color.hex;
    ctx.fillRect(startX, startY, colorSquareSize, colorSquareSize);
    // 绘制色块边框
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.strokeRect(startX, startY, colorSquareSize, colorSquareSize);
    
    // 绘制色号名称和数量
    ctx.fillStyle = '#222';
    ctx.textAlign = 'center';
    // 色号名称
    ctx.fillText(
      color.name,
      startX + colorSquareSize / 2,
      startY + colorSquareSize + 2
    );
    // 数量（拼豆个数）
    ctx.fillStyle = '#666';
    ctx.font = `${Math.max(6, Math.floor(colorTextSize * 0.75))}px sans-serif`;
    ctx.fillText(
      `${color.count}个`,
      startX + colorSquareSize / 2,
      startY + colorSquareSize + colorTextSize + 4
    );
    // 恢复字体大小
    ctx.font = `${colorTextSize}px sans-serif`;
    ctx.textAlign = 'left';
  });

  // 最后重新绘制所有行号和列号，确保显示在最上层
  // 重新绘制行号和列号背景区域
  ctx.fillStyle = rowColLabelBgColor;
  // 左边行号背景区域
  ctx.fillRect(0, pixelArtStartY, rowColLabelSize, pixelHeight * cellSize);
  // 右边行号背景区域
  ctx.fillRect(pixelArtStartX + pixelWidth * cellSize, pixelArtStartY, rowColLabelSize, pixelHeight * cellSize);
  // 上边列号背景区域
  ctx.fillRect(pixelArtStartX, headerHeight, pixelWidth * cellSize, rowColLabelSize);
  // 下边列号背景区域
  ctx.fillRect(pixelArtStartX, pixelArtStartY + pixelHeight * cellSize, pixelWidth * cellSize, rowColLabelSize);

  // 重新绘制行号文字（左边和右边）
  ctx.fillStyle = rowColLabelTextColor;
  ctx.font = `${rowColLabelFontSize}px "zh-cn-full", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let y = 0; y < pixelHeight; y++) {
    const rowNum = y + 1;
    const centerY = pixelArtStartY + y * cellSize + cellSize / 2;
    // 左边行号
    ctx.fillText(rowNum.toString(), rowColLabelSize / 2, centerY);
    // 右边行号
    ctx.fillText(rowNum.toString(), pixelArtStartX + pixelWidth * cellSize + rowColLabelSize / 2, centerY);
  }

  // 重新绘制列号文字（上边和下边）
  for (let x = 0; x < pixelWidth; x++) {
    const colNum = x + 1;
    const centerX = pixelArtStartX + x * cellSize + cellSize / 2;
    // 上边列号
    ctx.fillText(colNum.toString(), centerX, headerHeight + rowColLabelSize / 2);
    // 下边列号
    ctx.fillText(colNum.toString(), centerX, pixelArtStartY + pixelHeight * cellSize + rowColLabelSize / 2);
  }

  return { canvas, result, usedColors };
} 