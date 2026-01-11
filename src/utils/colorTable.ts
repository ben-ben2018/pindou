// colorTable.ts
// 读取public/color_cards.json，解析为厂商和色卡数据

export interface ColorItem {
  name: string;
  color: string;
}

export interface ColorCard {
  name: string;
  hex: string;
  brand: string;
}

export interface ColorCards {
  [brand: string]: ColorItem[];
}

export interface ColorMap {
  [name: string]: string;
}

export async function loadColorCards(): Promise<ColorCards> {
  // 在 Vite 中，public 目录下的文件可以直接通过根路径访问
  // 但在生产环境（base: '/pindou/'）中，需要使用正确的路径
  const basePath = import.meta.env.BASE_URL || '/';
  const response = await fetch(`${basePath}color_cards.json`);
  if (!response.ok) {
    throw new Error(`Failed to load color_cards.json: ${response.status} ${response.statusText}`);
  }
  const data = await response.json();
  return data; // { mard: [...], hama: [...], ... }
}

// 加载所有色号（扁平化，用于兼容旧代码）
export async function loadColorTable(): Promise<ColorCard[]> {
  const cards = await loadColorCards();
  const result: ColorCard[] = [];
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
export async function getColorMap(): Promise<ColorMap> {
  const table = await loadColorTable();
  const map: ColorMap = {};
  table.forEach(({ name, hex }) => {
    map[name] = hex;
  });
  return map;
}

