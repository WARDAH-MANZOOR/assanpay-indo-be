import * as https from 'https';
import * as querystring from 'querystring';

interface BusinessSmsApiConfig {
  id: string;
  pass: string;
}

interface SendSmsParams {
  to: string;
  mask: string;
  msg: string;
  lang?: 'English' | 'Urdu';
  type?: 'Xml' | 'Json';
}

export class BusinessSmsApi {
  private id: string;
  private pass: string;
  private hostname: string;

  constructor({ id, pass }: BusinessSmsApiConfig) {
    if (!id || !pass) throw new Error('Account ID and Password are required');
    this.id = id;
    this.pass = pass;
    this.hostname = 'fastsmsalerts.com';
  }

  async sendSms({ to, mask, msg, lang = 'English', type = 'Xml' }: SendSmsParams): Promise<{ success: boolean; data: string }> {
    if (!to || !mask || !msg) throw new Error('Parameters to, mask, and msg are required');
    const params = {
      id: this.id,
      pass: this.pass,
      to,
      mask,
      msg,
      lang,
      type
    };
    const path = '/index.php?path_gen=quicksms&' + querystring.stringify(params);
    return this._makeRequest(path);
  }

  async getBalance(): Promise<{ success: boolean; data: string }> {
    const params = {
      id: this.id,
      pass: this.pass,
      type: 'xml'
    };
    const path = '/api/balance&' + querystring.stringify(params);
    return this._makeRequest(path);
  }

  private _makeRequest(path: string): Promise<{ success: boolean; data: string }> {
    return new Promise((resolve, reject) => {
      const options: https.RequestOptions = {
        hostname: this.hostname,
        port: 443,
        path,
        method: 'GET',
        headers: {
          'User-Agent': 'Node.js BusinessSmsApi Client'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.setEncoding('utf8');

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (data.includes('<code>300</code>')) {
            resolve({ success: true, data });
          } else {
            reject(new Error(`API Error Response: ${data}`));
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.end();
    });
  }
}
