import type { Asset, AssetType } from '../../types/index.ts'

export type AssetFormState = {
  name: string
  type: AssetType
  url: string
  folder: string
}

export const emptyAssetForm: AssetFormState = {
  name: '',
  type: 'image',
  url: '',
  folder: '',
}

export function assetToForm(asset: Asset): AssetFormState {
  return {
    name: asset.name,
    type: asset.type,
    url: asset.url,
    folder: asset.folder ?? '',
  }
}
