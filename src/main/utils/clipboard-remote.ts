import type { ClipboardRemoteFile } from '@maciejwojs/input-bridge'

/**
 * Configuration for creating remote clipboard files.
 */
export interface RemoteClipboardConfig {
  /** Maximum total size of all files in bytes (default: 500MB) */
  maxTotalSize?: number
  /** Maximum number of files (default: 64) */
  maxFileCount?: number
  /** Maximum size per file in bytes (default: 100MB) */
  maxFileSize?: number
}

/**
 * Helper class for managing remote clipboard file operations.
 * Useful for WebRTC DataChannel file transfers and in-memory file handling.
 */
export class RemoteClipboardHelper {
  private maxTotalSize: number
  private maxFileCount: number
  private maxFileSize: number

  constructor(config: RemoteClipboardConfig = {}) {
    this.maxTotalSize = config.maxTotalSize ?? 500 * 1024 * 1024 // 500MB
    this.maxFileCount = config.maxFileCount ?? 64
    this.maxFileSize = config.maxFileSize ?? 100 * 1024 * 1024 // 100MB
  }

  /**
   * Validates an array of remote clipboard files before setting to clipboard.
   *
   * @param files Array of files to validate
   * @returns Validation result with valid files and error message if any
   */
  validateFiles(files: ClipboardRemoteFile[]): {
    valid: boolean
    files: ClipboardRemoteFile[]
    error?: string
  } {
    if (!Array.isArray(files) || files.length === 0) {
      return { valid: false, files: [], error: 'Files array must not be empty' }
    }

    if (files.length > this.maxFileCount) {
      return {
        valid: false,
        files: [],
        error: `Too many files: ${files.length} > ${this.maxFileCount}`
      }
    }

    let totalSize = 0
    const validatedFiles: ClipboardRemoteFile[] = []

    for (const file of files) {
      if (!file || typeof file.fileName !== 'string') {
        continue
      }

      if (!file.data || !(file.data instanceof Buffer || file.data instanceof Uint8Array)) {
        continue
      }

      const size = file.data.byteLength
      if (size > this.maxFileSize) {
        return {
          valid: false,
          files: [],
          error: `File "${file.fileName}" exceeds max size: ${size} > ${this.maxFileSize}`
        }
      }

      totalSize += size
      if (totalSize > this.maxTotalSize) {
        return {
          valid: false,
          files: [],
          error: `Total size exceeds limit: ${totalSize} > ${this.maxTotalSize}`
        }
      }

      validatedFiles.push({
        fileName: this.sanitizeFileName(file.fileName),
        data: file.data
      })

      if (validatedFiles.length >= this.maxFileCount) {
        break
      }
    }

    if (validatedFiles.length === 0) {
      return { valid: false, files: [], error: 'No valid files found' }
    }

    return { valid: true, files: validatedFiles }
  }

  /**
   * Creates a remote clipboard file from raw data.
   *
   * @param fileName Name of the file
   * @param data File contents as Buffer or Uint8Array
   * @returns Clipboard file object
   */
  createFile(fileName: string, data: Buffer | Uint8Array): ClipboardRemoteFile {
    return {
      fileName: this.sanitizeFileName(fileName),
      data
    }
  }

  /**
   * Creates multiple remote clipboard files from data entries.
   *
   * @param files Array of [fileName, data] tuples
   * @returns Array of clipboard file objects
   */
  createFiles(files: Array<[string, Buffer | Uint8Array]>): ClipboardRemoteFile[] {
    return files.map(([fileName, data]) => this.createFile(fileName, data))
  }

  /**
   * Sanitizes a file name to contain only the base name (no path segments).
   *
   * @param fileName Original file name
   * @returns Sanitized file name
   */
  private sanitizeFileName(fileName: string): string {
    if (typeof fileName !== 'string') {
      return 'file'
    }

    // Remove all path separators
    let sanitized = fileName.replace(/[/\\:]/g, '_')

    // Remove leading dots and invalid characters
    sanitized = sanitized.replace(/^[.\s]+/, '')

    // Limit length
    if (sanitized.length > 255) {
      sanitized = sanitized.substring(0, 255)
    }

    // Fallback if empty
    return sanitized || 'file'
  }

  /**
   * Merges multiple file chunks into a single file.
   * Useful for reassembling files received in chunks via DataChannel.
   *
   * @param fileName Name for the resulting file
   * @param chunks Array of data chunks
   * @returns Combined file object
   */
  mergeChunks(fileName: string, chunks: (Buffer | Uint8Array)[]): ClipboardRemoteFile {
    if (chunks.length === 0) {
      return this.createFile(fileName, Buffer.alloc(0))
    }

    // Calculate total size
    let totalSize = 0
    for (const chunk of chunks) {
      totalSize += chunk.byteLength
    }

    // Allocate buffer
    const buffer = Buffer.allocUnsafe(totalSize)

    // Copy chunks
    let offset = 0
    for (const chunk of chunks) {
      const chunkBuffer = chunk instanceof Buffer ? chunk : Buffer.from(chunk)
      chunkBuffer.copy(buffer, offset)
      offset += chunk.byteLength
    }

    return this.createFile(fileName, buffer)
  }

  /**
   * Splits a file into chunks of specified size.
   * Useful for sending large files over DataChannel with size limits.
   *
   * @param file File to split
   * @param chunkSize Size of each chunk in bytes
   * @returns Array of buffer chunks
   */
  splitFile(file: ClipboardRemoteFile, chunkSize: number): Buffer[] {
    const chunks: Buffer[] = []
    const data = file.data instanceof Buffer ? file.data : Buffer.from(file.data)

    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize))
    }

    return chunks
  }

  /**
   * Estimates the size of files when serialized (approximately).
   *
   * @param files Files to measure
   * @returns Estimated size in bytes
   */
  estimateSize(files: ClipboardRemoteFile[]): number {
    let size = 0
    for (const file of files) {
      // Rough estimate: fileName + data + overhead
      size += (file.fileName?.length ?? 0) + (file.data?.byteLength ?? 0) + 100
    }
    return size
  }
}

/**
 * Default instance of RemoteClipboardHelper with standard configuration.
 */
export const remoteClipboardHelper = new RemoteClipboardHelper()
