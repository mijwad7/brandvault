import type { Folder } from '../../types/index.ts'

export const MAX_FOLDER_DEPTH = 3

export function folderMap(folders: Folder[]): Map<string, Folder> {
  return new Map(folders.map((folder) => [folder.id, folder]))
}

export function folderDepth(folder: Folder | null, byId: Map<string, Folder>): number {
  if (!folder) {
    return 0
  }
  let depth = 1
  let current = folder
  const seen = new Set<string>()
  while (current.parent) {
    if (seen.has(current.id)) {
      break
    }
    seen.add(current.id)
    const parent = byId.get(current.parent)
    if (!parent) {
      break
    }
    current = parent
    depth += 1
  }
  return depth
}

export function folderPath(folder: Folder, byId: Map<string, Folder>): string {
  const names = [folder.name]
  let current = folder
  const seen = new Set<string>()
  while (current.parent) {
    if (seen.has(current.id)) {
      break
    }
    seen.add(current.id)
    const parent = byId.get(current.parent)
    if (!parent) {
      break
    }
    names.unshift(parent.name)
    current = parent
  }
  return names.join(' / ')
}

export function childFolders(
  folders: Folder[],
  parentId: string | null,
): Folder[] {
  return folders.filter((folder) => folder.parent === parentId)
}

export function breadcrumbs(
  folderId: string | null,
  byId: Map<string, Folder>,
): Folder[] {
  if (!folderId) {
    return []
  }
  const trail: Folder[] = []
  let current = byId.get(folderId)
  const seen = new Set<string>()
  while (current) {
    if (seen.has(current.id)) {
      break
    }
    seen.add(current.id)
    trail.unshift(current)
    current = current.parent ? byId.get(current.parent) : undefined
  }
  return trail
}
