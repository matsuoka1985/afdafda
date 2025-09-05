// 共通型定義
export interface User {
  id: number
  name: string
}

export interface Post {
  id: number
  body: string
  user: User
  likes_count: number
  created_at: string
  is_liked: boolean
  is_owner: boolean
  comments_count?: number
}

export interface Comment {
  id: number
  body: string
  user: User
  created_at: string
}

export interface Pagination {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface CommentsResponse {
  success: boolean
  comments: Comment[]
  pagination: Pagination
  error?: string
}

export interface LoginResponse {
  success: boolean
  user?: {
    uid: string
    email: string
    name?: string
  }
  error?: string
}

export interface PostResponse {
  success: boolean
  post?: Post
  error?: string
}

export interface RegisterResponse {
  success: boolean
  user?: {
    id: number
    name: string
    email: string
    firebase_uid: string
    created_at: string
    updated_at: string
  }
  error?: string
}

export interface VerifyTokenResponse {
  success: boolean
  user?: {
    uid: string
    email: string
    name?: string
  }
  error?: string
}

export interface AuthCheckResponse {
  authenticated: boolean
  message?: string
  user?: {
    uid: string
    email: string
    name?: string
  }
  error?: string
}

export interface LikeResponse {
  success: boolean
  post_id?: string
  is_liked?: boolean
  likes_count?: number
  error?: string
}

export interface DeleteResponse {
  success: boolean
  message?: string
  error?: string
}

export interface RestoreResponse {
  success: boolean
  message?: string
  error?: string
}

export interface CreatePostResponse {
  success: boolean
  post?: Post
  error?: string
}

export interface PostDetailResponse {
  success: boolean
  post: Post
  current_user_id: number
  error?: string
}

export interface CommentsSectionComponent extends HTMLElement {
  commentsHeaderRef?: HTMLElement
  commentFormRef?: HTMLElement
}

export interface ErrorWithStatus {
  message?: string
  status?: number
  stack?: string
}

export interface PostsListResponse {
  success: boolean
  posts: Post[]
  current_user_id: number
  pagination: Pagination
  error?: string
}

export interface PostsListComponent extends HTMLElement {
  scrollRef?: HTMLElement
}