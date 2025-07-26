const dns = require('dns').promises;
const { promisify } = require('util');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.validDomains = new Set();
    this.invalidDomains = new Set();
  }

  // Validate email format
  validateEmailFormat(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Extract domain from email
  extractDomain(email) {
    return email.split('@')[1];
  }

  // Check if domain has MX records (indicates it can receive email)
  async checkDomainMX(domain) {
    try {
      const mxRecords = await dns.resolveMx(domain);
      return mxRecords.length > 0;
    } catch (error) {
      logger.warn(`No MX records found for domain: ${domain}`);
      return false;
    }
  }

  // Check if domain has A records (basic connectivity)
  async checkDomainA(domain) {
    try {
      const aRecords = await dns.resolve4(domain);
      return aRecords.length > 0;
    } catch (error) {
      logger.warn(`No A records found for domain: ${domain}`);
      return false;
    }
  }

  // Comprehensive email validation
  async validateEmail(email) {
    try {
      // Step 1: Basic format validation
      if (!this.validateEmailFormat(email)) {
        return {
          valid: false,
          reason: 'Invalid email format'
        };
      }

      const domain = this.extractDomain(email);
      
      // Step 2: Check cache for known valid/invalid domains
      if (this.validDomains.has(domain)) {
        return { valid: true };
      }
      
      if (this.invalidDomains.has(domain)) {
        return {
          valid: false,
          reason: 'Domain does not exist or cannot receive email'
        };
      }

      // Step 3: Check if domain has MX records (can receive email)
      const hasMX = await this.checkDomainMX(domain);
      if (!hasMX) {
        this.invalidDomains.add(domain);
        return {
          valid: false,
          reason: 'Domain does not have email servers (MX records)'
        };
      }

      // Step 4: Check if domain has A records (basic connectivity)
      const hasA = await this.checkDomainA(domain);
      if (!hasA) {
        this.invalidDomains.add(domain);
        return {
          valid: false,
          reason: 'Domain does not exist'
        };
      }

      // Step 5: Additional checks for common fake email providers
      const fakeProviders = [
        '10minutemail.com',
        'tempmail.org',
        'guerrillamail.com',
        'mailinator.com',
        'throwaway.email',
        'temp-mail.org',
        'fakeinbox.com',
        'sharklasers.com',
        'grr.la',
        'guerrillamailblock.com',
        'pokemail.net',
        'spam4.me',
        'bccto.me',
        'chacuo.net',
        'dispostable.com',
        'mailnesia.com',
        'maildrop.cc',
        'mailmetrash.com',
        'trashmail.net',
        'tempr.email',
        'minuteinbox.com',
        'getairmail.com',
        'mailcatch.com',
        'yopmail.com',
        'yopmail.net',
        'yopmail.org',
        'cool.fr.nf',
        'jetable.fr.nf',
        'nospam.ze.tc',
        'nomail.xl.cx',
        'mega.zik.dj',
        'speed.1s.fr',
        'courriel.fr.nf',
        'moncourrier.fr.nf',
        'monemail.fr.nf',
        'monmail.fr.nf',
        'example.com',
        'test.com',
        'test.org',
        'test.net',
        'fake.com',
        'fake.org',
        'fake.net',
        'invalid.com',
        'invalid.org',
        'invalid.net'
      ];

      if (fakeProviders.includes(domain.toLowerCase())) {
        this.invalidDomains.add(domain);
        return {
          valid: false,
          reason: 'Temporary or fake email providers are not allowed'
        };
      }

      // Step 6: Check for disposable email patterns
      const disposablePatterns = [
        /^temp/,
        /^tmp/,
        /^test/,
        /^fake/,
        /^disposable/,
        /^throwaway/,
        /^trash/,
        /^spam/,
        /^junk/,
        /^dummy/,
        /^example/,
        /^sample/,
        /^demo/,
        /^temporary/,
        /^trial/,
        /^free/,
        /^anonymous/,
        /^noreply/,
        /^no-reply/,
        /^donotreply/,
        /^do-not-reply/
      ];

      const localPart = email.split('@')[0].toLowerCase();
      for (const pattern of disposablePatterns) {
        if (pattern.test(localPart)) {
          return {
            valid: false,
            reason: 'Email appears to be temporary or fake'
          };
        }
      }

      // If all checks pass, cache the domain as valid
      this.validDomains.add(domain);
      
      return { valid: true };
    } catch (error) {
      logger.error('Error validating email:', error);
      return {
        valid: false,
        reason: 'Error validating email'
      };
    }
  }

  // Validate admin email specifically
  async validateAdminEmail(email) {
    const validation = await this.validateEmail(email);
    
    if (!validation.valid) {
      return validation;
    }

    // Additional checks for admin email
    const domain = this.extractDomain(email);
    
    // Ensure admin email is from a reputable domain
    const reputableDomains = [
      'gmail.com',
      'yahoo.com',
      'outlook.com',
      'hotmail.com',
      'protonmail.com',
      'icloud.com',
      'aol.com',
      'live.com',
      'msn.com',
      'yandex.com',
      'mail.com',
      'gmx.com',
      'zoho.com',
      'fastmail.com',
      'tutanota.com'
    ];

    if (!reputableDomains.includes(domain.toLowerCase())) {
      return {
        valid: false,
        reason: 'Admin email must be from a reputable email provider'
      };
    }

    return { valid: true };
  }

  // Clear cache (useful for testing)
  clearCache() {
    this.validDomains.clear();
    this.invalidDomains.clear();
  }
}

module.exports = new EmailService(); 