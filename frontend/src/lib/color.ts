export function isHexColor(value: string): boolean {
  return /^#(?:[0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value.trim())
}

export function normalizeHex(value: string): string {
  const hex = value.trim()
  if (/^#[0-9A-Fa-f]{3}$/.test(hex)) {
    return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`.toUpperCase()
  }
  return hex.toUpperCase()
}

export function readableInk(value: string): string {
  const hex = normalizeHex(value).slice(1)
  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)
  const yiq = (red * 299 + green * 587 + blue * 114) / 1000
  return yiq >= 160 ? '#1C1915' : '#F6F1E7'
}

export function pickerValue(value: string): string {
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
    return value
  }
  if (/^#[0-9A-Fa-f]{3}$/.test(value)) {
    return normalizeHex(value)
  }
  return '#000000'
}
