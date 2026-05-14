/**
 * One file for remote clipboard operations (in-memory; no local path required).
 */
export interface ClipboardRemoteFile {
  /** Suggested file name; only the base name is used (path segments stripped). */
  fileName: string
  /** File contents. */
  data: Uint8Array
}

/**
 * Configuration for creating remote clipboard files on the renderer side.
 */
export interface RendererClipboardConfig {
  /** Maximum total size of all files in bytes (default: 500MB) */
  maxTotalSize?: number
  /** Maximum number of files (default: 64) */
  maxFileCount?: number
}

/**
 * Helper class for renderer process to manage remote clipboard operations.
 * Simplifies working with in-memory files received from network or other sources.
 */
export class RendererRemoteClipboardHelper {
  private maxTotalSize: number
  private maxFileCount: number

  constructor(config: RendererClipboardConfig = {}) {
    this.maxTotalSize = config.maxTotalSize ?? 500 * 1024 * 1024 // 500MB
    this.maxFileCount = config.maxFileCount ?? 64
  }

  /**
   * Creates a remote clipboard file from a Blob.
   *
   * @param fileName Name of the file
   * @param blob Blob to convert
   * @returns Promise resolving to clipboard file object
   */
  async createFileFromBlob(fileName: string, blob: Blob): Promise<ClipboardRemoteFile> {
    const buffer = await blob.arrayBuffer()
    return {
      fileName: this.sanitizeFileName(fileName),
      data: new Uint8Array(buffer)
    }
  }

  /**
   * Creates remote clipboard files from multiple Blobs.
   *
   * @param files Array of [fileName, blob] tuples
   * @returns Promise resolving to array of clipboard file objects
   */
  async createFilesFromBlobs(files: Array<[string, Blob]>): Promise<ClipboardRemoteFile[]> {
    const results: ClipboardRemoteFile[] = []

    for (const [fileName, blob] of files) {
      if (results.length >= this.maxFileCount) break
      results.push(await this.createFileFromBlob(fileName, blob))
    }

    return results
  }

  /**
   * Creates a remote clipboard file from an ArrayBuffer.
   *
   * @param fileName Name of the file
   * @param buffer ArrayBuffer containing file data
   * @returns Clipboard file object
   */
  createFileFromArrayBuffer(fileName: string, buffer: ArrayBuffer): ClipboardRemoteFile {
    return {
      fileName: this.sanitizeFileName(fileName),
      data: new Uint8Array(buffer)
    }
  }

  /**
   * Creates a remote clipboard file from a URL (fetches the data).
   *
   * @param url URL to fetch
   * @param fileName Optional custom file name (extracted from URL if not provided)
   * @returns Promise resolving to clipboard file object
   */
  async createFileFromUrl(url: string, fileName?: string): Promise<ClipboardRemoteFile> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`)
    }

    const blob = await response.blob()
    const name = fileName || this.extractFileNameFromUrl(url)
    return this.createFileFromBlob(name, blob)
  }

  /**
   * Creates remote clipboard files from multiple URLs.
   *
   * @param urls Array of URLs or [URL, fileName] tuples
   * @returns Promise resolving to array of clipboard file objects
   */
  async createFilesFromUrls(
    urls: Array<string | [string, string]>
  ): Promise<ClipboardRemoteFile[]> {
    const results: ClipboardRemoteFile[] = []
    const promises: Promise<ClipboardRemoteFile>[] = []

    for (const item of urls) {
      if (results.length >= this.maxFileCount) break

      const [url, customName] = Array.isArray(item) ? item : [item, undefined]
      promises.push(this.createFileFromUrl(url, customName))
    }

    const files = await Promise.all(promises)
    results.push(...files)
    return results
  }

  /**
   * Converts a File object to a remote clipboard file.
   *
   * @param file File object from input[type=file]
   * @returns Promise resolving to clipboard file object
   */
  async createFileFromFile(file: File): Promise<ClipboardRemoteFile> {
    return this.createFileFromBlob(file.name, file)
  }

  /**
   * Converts multiple File objects to remote clipboard files.
   *
   * @param files Array of File objects
   * @returns Promise resolving to array of clipboard file objects
   */
  async createFilesFromFileList(files: File[] | FileList): Promise<ClipboardRemoteFile[]> {
    const fileArray = Array.from(files)
    const results: ClipboardRemoteFile[] = []

    for (const file of fileArray) {
      if (results.length >= this.maxFileCount) break
      results.push(await this.createFileFromFile(file))
    }

    return results
  }

  /**
   * Creates a remote clipboard file from text content.
   *
   * @param fileName Name for the text file
   * @param text Text content
   * @returns Clipboard file object
   */
  createFileFromText(fileName: string, text: string): ClipboardRemoteFile {
    const encoder = new TextEncoder()
    return {
      fileName: this.sanitizeFileName(fileName),
      data: encoder.encode(text)
    }
  }

  /**
   * Creates remote clipboard files from JSON data.
   *
   * @param fileName Name for the JSON file
   * @param data Any JSON-serializable data
   * @returns Clipboard file object
   */
  createFileFromJson(fileName: string, data: unknown): ClipboardRemoteFile {
    const json = JSON.stringify(data, null, 2)
    const withExtension = fileName.endsWith('.json') ? fileName : `${fileName}.json`
    return this.createFileFromText(withExtension, json)
  }

  /**
   * Validates files before sending to clipboard.
   *
   * @param files Files to validate
   * @returns Validation result
   */
  validateFiles(files: ClipboardRemoteFile[]): {
    valid: boolean
    error?: string
  } {
    if (!Array.isArray(files) || files.length === 0) {
      return { valid: false, error: 'Files array must not be empty' }
    }

    if (files.length > this.maxFileCount) {
      return { valid: false, error: `Too many files: ${files.length}` }
    }

    let totalSize = 0
    for (const file of files) {
      totalSize += file.data?.byteLength ?? 0
      if (totalSize > this.maxTotalSize) {
        return { valid: false, error: 'Total file size exceeds limit' }
      }
    }

    return { valid: true }
  }

  /**
   * Sanitizes a file name.
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
   * Extracts file name from URL.
   *
   * @param url URL string
   * @returns Extracted file name
   */
  private extractFileNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      const path = urlObj.pathname
      const fileName = path.split('/').pop() || 'download'
      return fileName || 'file'
    } catch {
      return 'file'
    }
  }
}

/**
 * Default instance of RendererRemoteClipboardHelper.
 */
export const rendererRemoteClipboardHelper = new RendererRemoteClipboardHelper()
