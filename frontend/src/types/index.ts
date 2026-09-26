export type Me = {
  email: string
  workspace_id: string
  supabase_user_id: string
  storage_bucket: string
  storage_prefix: string
}

export type Brand = {
  id: string
  name: string
  primary_color: string
  secondary_color: string
  logo_url: string
  default_font: string
  created_at: string
  updated_at: string
}

export const ASSET_TYPES = ['image', 'video', 'logo', 'document', 'font'] as const
export type AssetType = (typeof ASSET_TYPES)[number]

export type Folder = {
  id: string
  name: string
  parent: string | null
  created_at: string
  updated_at: string
}

export type Asset = {
  id: string
  name: string
  type: AssetType
  url: string
  storage_bucket: string
  storage_path: string
  source: 'url' | 'upload'
  folder: string | null
  tags: string[]
  description: string
  usage_suggestion: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}
