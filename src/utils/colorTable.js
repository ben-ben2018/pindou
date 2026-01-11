// colorTable.js
// 读取public/color_cards.json，解析为厂商和色卡数据

export async function loadColorCards() {
  const response = await fetch(process.env.PUBLIC_URL + '/color_cards.json');
  const data = await response.json();
  return data; // { mard: [...], hama: [...], ... }
}

// 加载所有色号（扁平化，用于兼容旧代码）
export async function loadColorTable() {
  const cards = await loadColorCards();
  const result = [];
  Object.keys(cards).forEach((brand) => {
    cards[brand].forEach((item) => {
      result.push({
        name: item.name,
        hex: '#' + item.color.toUpperCase(),
        brand: brand
      });
    });
  });
  return result;
}

// 转为色号->色值映射对象
export async function getColorMap() {
  const table = await loadColorTable();
  const map = {};
  table.forEach(({ name, hex }) => {
    map[name] = hex;
  });
  return map;
} 