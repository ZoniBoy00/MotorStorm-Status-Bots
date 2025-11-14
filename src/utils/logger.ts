import { LogType } from '../types';

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Text colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  
  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

/**
 * Enhanced logging utility with timestamps and colored output
 */
export class Logger {
  private prefix: string;
  private prefixColor: string;

  constructor(botName: string) {
    this.prefix = botName;
    this.prefixColor = this.getBotColor(botName);
  }

  /**
   * Get a unique color for each bot
   */
  private getBotColor(botName: string): string {
    const colorMap: Record<string, string> = {
      'MotorStorm-AE': colors.cyan,
      'MotorStorm-Apoc': colors.magenta,
      'MotorStorm-PR': colors.green,
      'MotorStorm-MV': colors.yellow,
    };
    return colorMap[botName] || colors.white;
  }

  private getTimestamp(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  private getIcon(type: LogType): string {
    const icons: Record<LogType, string> = {
      info: '●',
      success: '✓',
      error: '✗',
      status: '→',
      warning: '⚠',
    };
    return icons[type] || '•';
  }

  private getColor(type: LogType): string {
    const typeColors: Record<LogType, string> = {
      info: colors.blue,
      success: colors.green,
      error: colors.red,
      status: colors.cyan,
      warning: colors.yellow,
    };
    return typeColors[type] || colors.white;
  }

  public log(message: string, type: LogType = 'info'): void {
    const timestamp = this.getTimestamp();
    const icon = this.getIcon(type);
    const color = this.getColor(type);
    
    console.log(
      `${colors.gray}[${timestamp}]${colors.reset} ` +
      `${this.prefixColor}${colors.bright}[${this.prefix}]${colors.reset} ` +
      `${color}${icon}${colors.reset} ${message}`
    );
  }

  public info(message: string): void {
    this.log(message, 'info');
  }

  public success(message: string): void {
    this.log(message, 'success');
  }

  public error(message: string, error?: Error): void {
    this.log(message, 'error');
    if (error && error.stack) {
      console.error(`${colors.dim}${error.stack}${colors.reset}`);
    }
  }

  public status(message: string): void {
    this.log(message, 'status');
  }

  public warning(message: string): void {
    this.log(message, 'warning');
  }
}
