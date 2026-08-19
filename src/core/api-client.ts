import axios, { AxiosInstance } from 'axios';
import { parseString } from 'xml2js';
import { Logger } from '../utils';

/**
 * Base API client for fetching MotorStorm server data
 */
export class ApiClient {
  private axios: AxiosInstance;
  private logger: Logger;
  private retries: number;
  private retryDelay: number;
  private readonly maxXmlBytes = 2 * 1024 * 1024;

  constructor(botName: string, retries: number = 3, retryDelay: number = 1000) {
    this.axios = axios.create({
      timeout: 15000,
      maxContentLength: this.maxXmlBytes,
      maxBodyLength: this.maxXmlBytes,
    });
    this.logger = new Logger(`${botName}-API`);
    this.retries = Math.max(0, Math.min(5, Math.floor(retries)));
    this.retryDelay = Math.max(250, Math.min(30000, retryDelay));
  }

  /**
   * Parse XML string to JavaScript object with a bounded input size.
   */
  protected async parseXML(xmlString: string): Promise<any> {
    if (typeof xmlString !== 'string' || Buffer.byteLength(xmlString, 'utf8') > this.maxXmlBytes) {
      throw new Error('XML response exceeded the maximum allowed size');
    }

    return new Promise((resolve, reject) => {
      parseString(xmlString, {
        explicitArray: false,
        trim: true,
        strict: true,
        async: true,
      }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  /**
   * Fetch data with bounded retries for transient failures only.
   */
  protected async fetchWithRetry<T>(
    url: string,
    retries: number = this.retries
  ): Promise<T | null> {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Unsupported URL protocol');
    } catch {
      this.logger.error('Rejected invalid API URL');
      return null;
    }

    const attempts = Math.max(0, Math.min(this.retries, Math.floor(retries)));
    for (let attempt = 0; attempt <= attempts; attempt += 1) {
      try {
        const response = await this.axios.get<T>(parsedUrl.toString());
        return response.data;
      } catch (error) {
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        const transient = status === undefined || status === 408 || status === 425 || status === 429 || status >= 500;
        if (!transient || attempt >= attempts) {
          const suffix = status ? ` (HTTP ${status})` : '';
          this.logger.error(`API request failed${suffix}`);
          return null;
        }

        const retryAfter = axios.isAxiosError(error) ? error.response?.headers?.['retry-after'] : undefined;
        const retryAfterMs = Number(retryAfter) > 0 ? Number(retryAfter) * 1000 : 0;
        const backoff = Math.min(30000, this.retryDelay * 2 ** attempt);
        const jitter = Math.floor(Math.random() * 250);
        this.logger.warning(`Transient API failure; retry ${attempt + 1}/${attempts}`);
        await this.delay(Math.max(backoff + jitter, retryAfterMs));
      }
    }

    return null;
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
