export class HttpError extends Error {
  public readonly status: number
  public readonly data: unknown

  constructor(status: number, data: unknown, message = 'Błąd sieci') {
    super(message)
    this.status = status
    this.data = data
    this.name = 'HttpError'
  }
}
