// shared/types/ipc.ts

export type ValidationErrorCause = { field: string; error: string }

export type IpcResponse<TData = void> =
  | { success: true; data: TData; message?: string }
  | { success: false; message: string; cause?: ValidationErrorCause[] }

export type LoginRendererResponse = IpcResponse<{ accessTokenSaved: boolean }>
export type RegisterRendererResponse = IpcResponse
export type LogoutRendererResponse = IpcResponse
