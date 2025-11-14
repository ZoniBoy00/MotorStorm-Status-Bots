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

  constructor(botName: string, retries: number = 3, retryDelay: number = 10000) {
    this.axios = axios.create({
      timeout: 30000,
    });
    this.logger = new Logger(`${botName}-API`);
    this.retries = retries;
    this.retryDelay = retryDelay;
  }

  /**
   * Parse XML string to JavaScript object
   */
  protected async parseXML(xmlString: string): Promise<any> {
    return new Promise((resolve, reject) => {
      parseString(xmlString, { explicitArray: false }, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Fetch data with retry logic
   */
  protected async fetchWithRetry<T>(
    url: string,
    retries: number = this.retries
  ): Promise<T | null> {
    try {
      const response = await this.axios.get<T>(url);
      return response.data;
    } catch (error) {
      if (retries > 0) {
        this.logger.warning(`Retrying fetch... Retries left: ${retries}`);
        await this.delay(this.retryDelay);
        return this.fetchWithRetry<T>(url, retries - 1);
      } else {
        const err = error as any;
        this.logger.error(
          `Error fetching data: ${err.response ? err.response.data : err.message}`
        );
        return null;
      }
    }
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
